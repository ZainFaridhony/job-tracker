import { voteProfile } from './merge'
import { SYSTEM_PROMPT, VERIFY_PROMPT, verifyUserMessage } from './prompt'
import { parseResponse, PROFILE_JSON_SCHEMA } from './schema'
import { EMPTY_PROFILE, type ExtractedProfile, type ProfileExtractor } from './types'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const MODEL = 'openai/gpt-oss-120b'

/** Enough CV text to be worth sending; below this the file is likely a scan. */
export const MIN_USEFUL_CHARS = 200

/** Keeps one oversized CV from blowing the context window or the bill. */
const MAX_CHARS = 24_000

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
 * Rate-limit metadata from a 429, for the error message.
 *
 * Headers only, never the body. A Groq error body can echo the prompt and the
 * prompt is the user's CV (P3), but `retry-after` and the `x-ratelimit-*` family
 * carry no prompt content — they are the account's own limits. Withholding them
 * made a 429 indistinguishable from any other failure, which cost real time
 * chasing what looked like a quality regression in the eval.
 */
function limitDetail(response: Response): string {
  const parts = [
    ['retry after', response.headers?.get('retry-after')],
    ['tokens left', response.headers?.get('x-ratelimit-remaining-tokens')],
    ['token limit', response.headers?.get('x-ratelimit-limit-tokens')],
    ['resets in', response.headers?.get('x-ratelimit-reset-tokens')],
  ].filter(([, v]) => v)
  return parts.length === 0 ? '' : ` (${parts.map(([k, v]) => `${k} ${v}`).join(', ')})`
}

/** Seconds the server asked us to wait, or null when it did not say. */
function retryAfterMs(response: Response): number | null {
  const raw =
    response.headers?.get('retry-after') ?? response.headers?.get('x-ratelimit-reset-tokens')
  if (!raw) return null
  // Groq sends either plain seconds or a duration like "7.66s" / "2m59.56s".
  const m = /^(?:(\d+)m)?([\d.]+)s?$/.exec(raw.trim())
  if (!m) return null
  const minutes = Number(m[1] ?? 0)
  const seconds = Number(m[2] ?? 0)
  const ms = (minutes * 60 + seconds) * 1000
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * One Groq call. Returns the raw parsed JSON, or null when the response carried
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
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: 'json_schema', json_schema: PROFILE_JSON_SCHEMA },
        max_completion_tokens: 1600,
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
        `Groq request failed with ${response.status}${
          response.status === 429 ? limitDetail(response) : ''
        }`,
      )
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = body.choices?.[0]?.message?.content
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
export function createGroqExtractor(
  options: ExtractorOptions | string = {},
): ProfileExtractor {
  // A bare string stays valid so existing callers and tests keep working.
  const opts: ExtractorOptions = typeof options === 'string' ? { apiKey: options } : options
  const apiKey = 'apiKey' in opts ? opts.apiKey : process.env.GROQ_API_KEY
  const strategy = opts.strategy ?? DEFAULT_STRATEGY
  const today = opts.today

  // `vote` needs the samples to differ or it is one answer billed three times.
  const temperature = opts.temperature ?? (strategy === 'vote' ? 0.4 : 0)
  const maxRetries = opts.maxRetries ?? 1

  return {
    async extract(cvText: string): Promise<ExtractedProfile> {
      if (!apiKey) throw new Error('GROQ_API_KEY is not set')
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
