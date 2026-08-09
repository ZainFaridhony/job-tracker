import { voteProfile } from './merge'
import { SYSTEM_PROMPT, VERIFY_PROMPT, verifyUserMessage } from './prompt'
import { parseResponse, PROFILE_JSON_SCHEMA } from './schema'
import { EMPTY_PROFILE, type ExtractedProfile, type ProfileExtractor } from './types'

const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions'

/**
 * The same weights this ran on under Groq, which is the point: keeping the model
 * fixed across the provider move means the eval evidence behind DEFAULT_STRATEGY
 * still describes what ships. Note the id has no `openai/` prefix here — Groq
 * namespaces third-party weights, Cerebras does not, and the wrong id is a 404
 * that reads like an outage.
 */
export const MODEL = 'gpt-oss-120b'

/** Enough CV text to be worth sending; below this the file is likely a scan. */
export const MIN_USEFUL_CHARS = 200

/** Keeps one oversized CV from blowing the context window or the bill. */
const MAX_CHARS = 24_000

/**
 * Completion budget, and it has to cover THINKING as well as the answer.
 *
 * gpt-oss-120b is a reasoning model and `max_completion_tokens` bounds reasoning
 * plus content together, not content alone. This was 1600, chosen against the
 * ~160 tokens of JSON the schema actually produces — which is right about the
 * answer and forgets the other term entirely.
 *
 * Measured, same prompt, same model:
 *
 *   repetitive filler, 6.8k chars ->   311 reasoning tokens
 *   dense synthetic,   2.3k chars ->   925
 *   a real CV,         5.5k chars -> 1,575   <-- over budget at 1600
 *
 * Reasoning scales with how much there is to think about, not with length, so
 * the old ceiling was never comfortable — it was one dense document away from
 * failing, and it failed silently: content came back truncated at 72 characters,
 * `JSON.parse` threw, `callModel` returned null, and the user got "Couldn't read
 * the details" over a CV the model reads perfectly at a higher budget.
 *
 * 4000 leaves ~2.2k of headroom over the worst case observed. It is not simply
 * set as high as possible because Cerebras meters rate limits on *estimated*
 * consumption — input tokens plus this number, whether or not they are spent — so
 * an 8000 budget against a ~3k prompt would bill 11k of the 30k/minute allowance
 * per call and throttle at under three requests a minute. At 4000 the estimate is
 * ~7k, which lands just under the 5 requests/minute ceiling that binds first.
 *
 * Raising this is safe for correctness and costs throughput. Lowering it risks
 * the truncation above — which now throws rather than returning empty.
 */
const MAX_COMPLETION_TOKENS = 4_000

/** Samples the `vote` strategy takes. Three is the smallest useful majority. */
const VOTE_SAMPLES = 3

/**
 * How hard to work at one extraction.
 *
 * Extraction runs once per user lifetime, not once per job, so spending two or
 * three calls here is cheap in a way that per-application analysis never is. The
 * cost that matters is latency: it lands inside step 1's "Understanding your
 * experience" stage, which the user is watching.
 *
 * - `single` — one call. Fastest, and the baseline everything else is measured
 *   against.
 * - `vote` — three samples in parallel, keeping what a majority found. Targets
 *   list-membership variance, which is the failure mode for two list fields.
 *   Latency stays near one call because the samples are concurrent.
 * - `verify` — extract, then hand the document and the result back and ask what
 *   is unsupported and what was missed. Catches omissions and consistently
 *   repeated hallucinations, neither of which voting can see. Roughly doubles
 *   the wait.
 *
 * Which one ships is a question for `eval/`, not for taste.
 */
export type ExtractionStrategy = 'single' | 'vote' | 'verify'

/**
 * `single`, decided by the eval on 2026-08-05 rather than by preference.
 *
 * Over the nine labelled CVs, `single` scored 100% roles F1 on eight of nine (67%
 * on the deliberately garbled two-column layout, which is the case where degrading
 * honestly is the right answer) and 100% skills F1 on all nine. There is no
 * measured headroom left for a strategy costing two or three times as much to earn.
 *
 * `verify` also cost more than tokens. Run against the injection case it ADDED
 * "Chief Technology Officer" from a planted "IMPORTANT INSTRUCTIONS FOR THE READER"
 * block that the first pass had correctly ignored, because completing an extraction
 * and obeying an injected claim are the same act to a model hunting for omissions.
 * VERIFY_PROMPT now bounds where an addition may come from and the case passes, but
 * the surface is structural: a completion instruction over user-supplied text is a
 * standing risk that `single` simply does not have.
 *
 * Both alternatives stay in the codebase. They are tested, they cost nothing when
 * unused, and the injection regression test guarding VERIFY_PROMPT is worth keeping
 * on its own. Re-run `pnpm --filter @job-tracker/ai eval` before changing this: a
 * harder CV corpus or a different model could move the answer.
 */
export const DEFAULT_STRATEGY: ExtractionStrategy = 'single'

export type ExtractorOptions = {
  apiKey?: string | undefined
  strategy?: ExtractionStrategy
  /**
   * Sampling temperature. Zero for the deterministic paths; `vote` needs spread
   * or its three samples are one sample billed three times.
   */
  temperature?: number
  /** Injected so the computed year total is testable. */
  today?: Date
  /**
   * How many times to retry a 429. One by default: extraction runs once per user
   * and the alternative is empty fields because their upload landed in a busy
   * minute. The eval raises it, because a whole run otherwise dies on one limit.
   */
  maxRetries?: number
}

type Message = { role: 'system' | 'user'; content: string }

/**
 * Cerebras suffixes its rate-limit headers with the window they measure, where
 * Groq did not: `x-ratelimit-remaining-tokens-minute`, not
 * `x-ratelimit-remaining-tokens`. Reading the Groq names against Cerebras is not
 * an error, it is `null` — every 429 would go back to carrying no reason at all,
 * which is exactly the blindness the ingest logging was added to end.
 *
 * Requests are the other window: Cerebras meters those per *day*, not per minute.
 */
const TOKENS_REMAINING = 'x-ratelimit-remaining-tokens-minute'
const TOKENS_LIMIT = 'x-ratelimit-limit-tokens-minute'
const TOKENS_RESET = 'x-ratelimit-reset-tokens-minute'

/**
 * Requests are metered too, and on Cerebras they are what actually binds here.
 *
 * Measured from this account: 30,000 tokens/minute but only 5 requests/minute.
 * One extraction is ~3.6k tokens, so tokens allow about eight a minute and
 * requests stop it at five. Under Groq it was the other way round — 8,000
 * tokens/minute against a request ceiling nothing here could reach — so a 429
 * that reported only the token window used to say everything and now says
 * nothing. `vote` is the sharp edge: three concurrent samples spend three of
 * the five in one extraction.
 */
const REQUESTS_REMAINING = 'x-ratelimit-remaining-requests-minute'
const REQUESTS_LIMIT = 'x-ratelimit-limit-requests-minute'
const REQUESTS_RESET = 'x-ratelimit-reset-requests-minute'

/**
 * Rate-limit metadata from a 429, for the error message.
 *
 * Headers only, never the body. A provider error body can echo the prompt and the
 * prompt is the user's CV (P3), but `retry-after` and the `x-ratelimit-*` family
 * carry no prompt content — they are the account's own limits. Withholding them
 * made a 429 indistinguishable from any other failure, which cost real time
 * chasing what looked like a quality regression in the eval.
 */
function limitDetail(response: Response): string {
  const parts = [
    ['retry after', response.headers?.get('retry-after')],
    // Both windows, because either can be the one that refused: reporting only
    // tokens is how a request-limited 429 arrives with no number attached.
    ['requests left', response.headers?.get(REQUESTS_REMAINING)],
    ['request limit', response.headers?.get(REQUESTS_LIMIT)],
    ['tokens left', response.headers?.get(TOKENS_REMAINING)],
    ['token limit', response.headers?.get(TOKENS_LIMIT)],
    ['resets in', response.headers?.get(TOKENS_RESET)],
  ].filter(([, v]) => v)
  return parts.length === 0 ? '' : ` (${parts.map(([k, v]) => `${k} ${v}`).join(', ')})`
}

/** Milliseconds to wait as a number of seconds, or null when it is unreadable. */
function parseSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null
  // Cerebras sends bare seconds as a float ("11.382867097854614"). Groq sent a
  // duration ("7.66s", "2m59.56s"). This pattern reads both, because the trailing
  // `s` and the minutes group are each optional — worth keeping that way rather
  // than narrowing it to today's provider.
  const m = /^(?:(\d+)m)?([\d.]+)s?$/.exec(raw.trim())
  if (!m) return null
  const minutes = Number(m[1] ?? 0)
  const seconds = Number(m[2] ?? 0)
  const ms = (minutes * 60 + seconds) * 1000
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

/**
 * How long to wait before retrying a 429.
 *
 * `retry-after` wins when the server sends it. Otherwise take the LONGER of the
 * two reset windows rather than the first one found: a request-limited 429 whose
 * token window resets in two seconds would otherwise be retried immediately and
 * refused again, burning the one retry the user gets on a limit that had not
 * moved. Waiting for the window that actually refused is the only wait that ends
 * in an answer.
 */
export function retryAfterMs(response: Response): number | null {
  const explicit = parseSeconds(response.headers?.get('retry-after'))
  if (explicit !== null) return explicit

  const tokens = parseSeconds(response.headers?.get(TOKENS_RESET))
  const requests = parseSeconds(response.headers?.get(REQUESTS_RESET))
  if (tokens === null) return requests
  if (requests === null) return tokens
  return Math.max(tokens, requests)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * One Cerebras call. Returns the raw parsed JSON, or null when the response carried
 * nothing usable — a distinction the callers need, because `verify` must keep the
 * first pass rather than replace it with an empty second pass.
 *
 * Retries a 429 the number of times the caller allows, waiting as long as the
 * server asks. Only a 429: every other status is either permanent or something a
 * retry would make worse. One retry is worth it in production, where the
 * alternative is a user seeing empty fields because their upload happened to land
 * in a busy minute.
 */
async function callModel(
  apiKey: string,
  messages: Message[],
  temperature: number,
  maxRetries: number,
): Promise<unknown | null> {
  let attempt = 0

  for (;;) {
    const response = await fetch(CEREBRAS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: 'json_schema', json_schema: PROFILE_JSON_SCHEMA },
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        temperature,
      }),
    })

    if (response.status === 429 && attempt < maxRetries) {
      attempt += 1
      // Cap it: a limit that resets in three minutes is not worth blocking a
      // signup for, and ingestCv continues happily without a pre-fill.
      await sleep(Math.min(retryAfterMs(response) ?? 2_000 * attempt, 30_000))
      continue
    }

    if (!response.ok) {
      throw new Error(
        `Cerebras request failed with ${response.status}${
          response.status === 429 ? limitDetail(response) : ''
        }`,
      )
    }

    const body = (await response.json()) as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>
      usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } }
    }
    const choice = body.choices?.[0]

    // Running out of budget is a configuration fault, not an unreadable CV, and
    // it must not be reported as one. Truncated JSON reaches the `catch` below
    // and looks identical to a model that answered with nonsense — which is how
    // a 1600-token ceiling spent entirely on reasoning presented as "we couldn't
    // read your CV" for a document the model handles fine with more room.
    //
    // Counts only: how many tokens were spent and how many of those were
    // reasoning. No content, so P3 holds and the message is safe to log.
    if (choice?.finish_reason === 'length') {
      const spent = body.usage?.completion_tokens ?? MAX_COMPLETION_TOKENS
      const reasoning = body.usage?.completion_tokens_details?.reasoning_tokens
      throw new Error(
        `Cerebras response truncated at ${spent} completion tokens` +
          (reasoning === undefined ? '' : ` (${reasoning} of them reasoning)`) +
          ` — raise MAX_COMPLETION_TOKENS, currently ${MAX_COMPLETION_TOKENS}`,
      )
    }

    const content = choice?.message?.content
    if (!content) return null

    try {
      return JSON.parse(content)
    } catch {
      // Malformed JSON despite strict mode. The caller decides what that means.
      return null
    }
  }
}

/** The real extractor. Plain fetch — the request shape is small and verified. */
export function createCerebrasExtractor(
  options: ExtractorOptions | string = {},
): ProfileExtractor {
  // A bare string stays valid so existing callers and tests keep working.
  const opts: ExtractorOptions = typeof options === 'string' ? { apiKey: options } : options
  const apiKey = 'apiKey' in opts ? opts.apiKey : process.env.CEREBRAS_API_KEY
  const strategy = opts.strategy ?? DEFAULT_STRATEGY
  const today = opts.today

  // `vote` needs the samples to differ or it is one answer billed three times.
  const temperature = opts.temperature ?? (strategy === 'vote' ? 0.4 : 0)
  const maxRetries = opts.maxRetries ?? 1

  return {
    async extract(cvText: string): Promise<ExtractedProfile> {
      if (!apiKey) throw new Error('CEREBRAS_API_KEY is not set')
      if (cvText.trim().length < MIN_USEFUL_CHARS) return EMPTY_PROFILE

      const document = cvText.slice(0, MAX_CHARS)
      const first: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: document },
      ]

      if (strategy === 'vote') {
        // Parallel, so three samples cost one sample's latency. A sample that
        // throws is dropped rather than failing the whole extraction: two out of
        // three still votes.
        const settled = await Promise.allSettled(
          Array.from({ length: VOTE_SAMPLES }, () => callModel(apiKey, first, temperature, maxRetries)),
        )
        const samples = settled
          .filter(
            (r): r is PromiseFulfilledResult<unknown | null> =>
              r.status === 'fulfilled' && r.value !== null,
          )
          .map((r) => parseResponse(r.value, { today }))

        // Every sample failed. Rethrowing here would be a lie about which call
        // failed, and ingestCv treats a throw and an empty profile the same way.
        if (samples.length === 0) return EMPTY_PROFILE
        return voteProfile(samples)
      }

      const raw = await callModel(apiKey, first, temperature, maxRetries)
      if (raw === null) return EMPTY_PROFILE

      if (strategy !== 'verify') return parseResponse(raw, { today })

      // Second pass sees the document and the candidate. A failure here keeps the
      // first pass: a verify that cannot run is not a reason to lose an
      // extraction that already succeeded.
      let checked: unknown | null = null
      try {
        checked = await callModel(
          apiKey,
          [
            { role: 'system', content: `${SYSTEM_PROMPT}\n\n${VERIFY_PROMPT}` },
            { role: 'user', content: verifyUserMessage(document, JSON.stringify(raw)) },
          ],
          0,
          maxRetries,
        )
      } catch {
        // Swallowed for the same reason as above, and without the body (P3).
      }

      return parseResponse(checked ?? raw, { today })
    },
  }
}

/** Test double. Behaves like the real one at the boundaries that matter. */
export function createFakeExtractor(result: Partial<ExtractedProfile> = {}): ProfileExtractor {
  return {
    async extract(cvText: string) {
      if (cvText.trim().length < MIN_USEFUL_CHARS) return EMPTY_PROFILE
      return { ...EMPTY_PROFILE, ...result }
    },
  }
}
