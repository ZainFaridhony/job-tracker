import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createCerebrasExtractor,
  createFakeExtractor,
  MIN_USEFUL_CHARS,
  MODEL,
  retryAfterMs,
} from './extract-profile'
import { EMPTY_PROFILE } from './types'

const CV = 'Senior Go Engineer. '.repeat(30) // comfortably over the threshold
const TODAY = new Date('2026-08-05T00:00:00Z')

afterEach(() => vi.unstubAllGlobals())

function stubFetch(impl: (url: string, init: RequestInit) => unknown) {
  const spy = vi.fn(async (url: string, init: RequestInit) => impl(url, init))
  vi.stubGlobal('fetch', spy)
  return spy
}

/** A well-formed model response in the current schema shape. */
function response(over: Record<string, unknown> = {}) {
  return {
    roles: [{ title: 'Go Engineer', start: '2018', end: 'present' }],
    skills: ['Go'],
    statedYearsExperience: null,
    ...over,
  }
}

function ok(content: unknown) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  }
}

function bodyOf(spy: ReturnType<typeof stubFetch>, call = 0) {
  return JSON.parse((spy.mock.calls[call]![1] as RequestInit).body as string)
}

/** What the API returns when the completion budget ran out mid-answer. */
function truncated(completionTokens = 4000, reasoningTokens = 3900) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ finish_reason: 'length', message: { content: '{"roles":[{"title":"Go En' } }],
      usage: {
        completion_tokens: completionTokens,
        completion_tokens_details: { reasoning_tokens: reasoningTokens },
      },
    }),
  }
}

describe('a truncated completion', () => {
  // The bug this whole branch exists for: gpt-oss-120b spends the budget on
  // reasoning before it writes any JSON, so the answer arrives cut in half. It
  // used to reach JSON.parse, fail, and return null — indistinguishable from a
  // CV the model could not read, which is precisely the wrong thing to tell a
  // user whose CV is fine.
  it('throws rather than degrading to an empty profile', async () => {
    stubFetch(() => truncated())
    await expect(createCerebrasExtractor({ apiKey: 'k' }).extract(CV)).rejects.toThrow(
      /truncated at 4000 completion tokens/,
    )
  })

  it('names the reasoning share, which is what makes the number actionable', async () => {
    stubFetch(() => truncated(4000, 3900))
    await expect(createCerebrasExtractor({ apiKey: 'k' }).extract(CV)).rejects.toThrow(
      /3900 of them reasoning/,
    )
  })

  it('never puts the partial content in the message, which is CV text (P3)', async () => {
    stubFetch(() => truncated())
    await expect(createCerebrasExtractor({ apiKey: 'k' }).extract(CV)).rejects.not.toThrow(
      /Go En/,
    )
  })

  it('leaves a complete response alone', async () => {
    stubFetch(() => ({
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(response()) } }],
      }),
    }))
    const out = await createCerebrasExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(out.skills).toEqual(['Go'])
  })
})

describe('the completion budget', () => {
  it('leaves room for reasoning, not just for the JSON', async () => {
    // ~160 tokens of JSON, but a real CV was measured at 1,575 reasoning tokens.
    // A budget sized to the answer alone is what truncated it.
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k' }).extract(CV)
    expect(bodyOf(spy).max_completion_tokens).toBeGreaterThanOrEqual(4000)
  })
})

describe('the request', () => {
  it('sends the CV to the right model with strict structured output', async () => {
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k', today: TODAY }).extract(CV)

    const body = bodyOf(spy)
    expect(body.model).toBe(MODEL)
    expect(body.response_format.type).toBe('json_schema')
    expect(body.response_format.json_schema.strict).toBe(true)
  })

  it('instructs the model not to invent, since that is the whole risk', async () => {
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k' }).extract(CV)
    const body = bodyOf(spy)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toMatch(/never infer, estimate, embellish/i)
  })

  it('tells the model the document is data, not instruction', async () => {
    // The CV is user-uploaded, so it is a prompt-injection surface.
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k' }).extract(CV)
    expect(bodyOf(spy).messages[0].content).toMatch(/data, not instruction/i)
  })

  it('carries worked examples, so the rules have something to bind to', async () => {
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k' }).extract(CV)
    const system = bodyOf(spy).messages[0].content
    expect(system).toMatch(/EXAMPLE 1/)
    expect(system).toMatch(/EXAMPLE 2/)
  })

  it('truncates a very long CV so one upload cannot blow the context or the bill', async () => {
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k' }).extract('a'.repeat(100_000))
    expect(bodyOf(spy).messages[1].content.length).toBeLessThanOrEqual(24_000)
  })

  it('accepts a bare key, so existing callers keep working', async () => {
    stubFetch(() => ok(response()))
    const out = await createCerebrasExtractor('k').extract(CV)
    expect(out.skills).toEqual(['Go'])
  })
})

describe('reading the response', () => {
  it('derives titles and the year total from the roles array', async () => {
    stubFetch(() =>
      ok(
        response({
          roles: [
            { title: 'Senior Backend Engineer', start: '2021-03', end: 'present' },
            { title: 'Backend Engineer', start: '2018-01', end: '2021-02' },
          ],
        }),
      ),
    )
    const out = await createCerebrasExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(out.targetRoles).toEqual(['Senior Backend Engineer', 'Backend Engineer'])
    // Jan 2018 to Aug 2026, continuous across the handover.
    expect(out.yearsExperience).toBe(8)
  })

  it('validates what comes back rather than trusting it', async () => {
    stubFetch(() =>
      ok(
        response({
          roles: [
            { title: 'A', start: '2020', end: '2021' },
            { title: 'a', start: '2020', end: '2021' },
          ],
          skills: ['Go', 'go'],
        }),
      ),
    )
    const out = await createCerebrasExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(out.targetRoles).toEqual(['A'])
    expect(out.skills).toEqual(['Go'])
  })

  it('ignores a total the model computed against instruction', async () => {
    // The dates say two years; the model claims thirty. The dates win.
    stubFetch(() =>
      ok(
        response({
          roles: [{ title: 'Engineer', start: '2024-09', end: '2026-08' }],
          statedYearsExperience: 30,
        }),
      ),
    )
    const out = await createCerebrasExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(out.yearsExperience).toBe(2)
  })

  it('degrades to empty on malformed JSON instead of failing onboarding', async () => {
    stubFetch(() => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    }))
    expect(await createCerebrasExtractor({ apiKey: 'k' }).extract(CV)).toEqual(EMPTY_PROFILE)
  })

  it('degrades to empty when the response has no content', async () => {
    stubFetch(() => ({ ok: true, json: async () => ({ choices: [] }) }))
    expect(await createCerebrasExtractor({ apiKey: 'k' }).extract(CV)).toEqual(EMPTY_PROFILE)
  })
})

describe('refusing to call', () => {
  it('does not call the API at all for too-little text (a likely scan)', async () => {
    const spy = stubFetch(() => ok(response()))
    const out = await createCerebrasExtractor({ apiKey: 'k' }).extract('x'.repeat(MIN_USEFUL_CHARS - 1))
    expect(spy).not.toHaveBeenCalled()
    expect(out).toEqual(EMPTY_PROFILE)
  })

  it('throws without a key rather than sending an unauthenticated request', async () => {
    const spy = stubFetch(() => ok(response()))
    await expect(createCerebrasExtractor({ apiKey: undefined }).extract(CV)).rejects.toThrow(
      /CEREBRAS_API_KEY/,
    )
    expect(spy).not.toHaveBeenCalled()
  })

  it('never puts the response body in the error, because it can echo the CV', async () => {
    // Deliberately headerless: a stub without `headers` must not crash the error
    // path, which is exactly what it did the first time.
    stubFetch(() => ({ ok: false, status: 429, json: async () => ({ error: CV }) }))
    const extractor = createCerebrasExtractor({ apiKey: 'k', maxRetries: 0 })
    await expect(extractor.extract(CV)).rejects.toThrow(/failed with 429/)
    await expect(extractor.extract(CV)).rejects.not.toThrow(/Senior Go Engineer/)
  })
})

describe('the vote strategy', () => {
  it('samples three times in parallel and keeps what a majority found', async () => {
    const skillsPerCall = [
      ['Go', 'Kafka', 'Docker'],
      ['Go', 'Kafka'],
      ['Go', 'Kafka', 'Redis'],
    ]
    let call = 0
    const spy = stubFetch(() => ok(response({ skills: skillsPerCall[call++] })))

    const out = await createCerebrasExtractor({
      apiKey: 'k',
      strategy: 'vote',
      today: TODAY,
    }).extract(CV)

    expect(spy).toHaveBeenCalledTimes(3)
    // Docker and Redis each appear once of three, which is what invention looks like.
    expect(out.skills).toEqual(['Go', 'Kafka'])
  })

  it('raises the temperature, or the three samples are one sample billed thrice', async () => {
    const spy = stubFetch(() => ok(response()))
    await createCerebrasExtractor({ apiKey: 'k', strategy: 'vote' }).extract(CV)
    expect(bodyOf(spy).temperature).toBeGreaterThan(0)
  })

  it('still votes when one sample fails', async () => {
    let call = 0
    stubFetch(() => {
      call += 1
      if (call === 2) throw new Error('network')
      return ok(response({ skills: ['Go', 'Kafka'] }))
    })

    const out = await createCerebrasExtractor({
      apiKey: 'k',
      strategy: 'vote',
      today: TODAY,
    }).extract(CV)
    // Two survivors agreeing is a majority of two.
    expect(out.skills).toEqual(['Go', 'Kafka'])
  })

  it('degrades to empty when every sample fails, rather than throwing', async () => {
    stubFetch(() => {
      throw new Error('network')
    })
    const out = await createCerebrasExtractor({ apiKey: 'k', strategy: 'vote' }).extract(CV)
    expect(out).toEqual(EMPTY_PROFILE)
  })
})

describe('the verify strategy', () => {
  it('makes a second call carrying the document and the candidate', async () => {
    let call = 0
    const spy = stubFetch(() => {
      call += 1
      return ok(call === 1 ? response({ skills: ['Go', 'Telepathy'] }) : response({ skills: ['Go'] }))
    })

    const out = await createCerebrasExtractor({
      apiKey: 'k',
      strategy: 'verify',
      today: TODAY,
    }).extract(CV)

    expect(spy).toHaveBeenCalledTimes(2)
    const second = bodyOf(spy, 1)
    expect(second.messages[0].content).toMatch(/checking an extraction/i)
    expect(second.messages[1].content).toMatch(/CANDIDATE EXTRACTION/)
    expect(second.messages[1].content).toMatch(/Telepathy/)
    // The second pass pruned what the document does not support.
    expect(out.skills).toEqual(['Go'])
  })

  it('keeps the first pass when the second one fails', async () => {
    // A verify that cannot run is not a reason to lose a good extraction.
    let call = 0
    stubFetch(() => {
      call += 1
      if (call === 2) throw new Error('network')
      return ok(response({ skills: ['Go', 'Kafka'] }))
    })

    const out = await createCerebrasExtractor({
      apiKey: 'k',
      strategy: 'verify',
      today: TODAY,
    }).extract(CV)
    expect(out.skills).toEqual(['Go', 'Kafka'])
  })

  it('keeps the first pass when the second returns nothing usable', async () => {
    let call = 0
    stubFetch(() => {
      call += 1
      if (call === 2) return { ok: true, json: async () => ({ choices: [] }) }
      return ok(response({ skills: ['Go', 'Kafka'] }))
    })

    const out = await createCerebrasExtractor({
      apiKey: 'k',
      strategy: 'verify',
      today: TODAY,
    }).extract(CV)
    expect(out.skills).toEqual(['Go', 'Kafka'])
  })

  it('does not make a second call when the first returned nothing', async () => {
    const spy = stubFetch(() => ({ ok: true, json: async () => ({ choices: [] }) }))
    await createCerebrasExtractor({ apiKey: 'k', strategy: 'verify' }).extract(CV)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('createFakeExtractor', () => {
  it('honours the same too-little-text rule as the real extractor', async () => {
    const fake = createFakeExtractor({ skills: ['Go'] })
    expect(await fake.extract('short')).toEqual(EMPTY_PROFILE)
    expect((await fake.extract(CV)).skills).toEqual(['Go'])
  })
})

describe('rate limits', () => {
  function limited(headers: Record<string, string> = {}) {
    return {
      ok: false,
      status: 429,
      headers: new Headers(headers),
      json: async () => ({ error: CV }),
    }
  }

  it('retries a 429 once by default', async () => {
    let call = 0
    const spy = stubFetch(() => {
      call += 1
      return call === 1 ? limited({ 'retry-after': '0' }) : ok(response())
    })

    const out = await createCerebrasExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(out.skills).toEqual(['Go'])
  })

  it('gives up after the allowance and reports the limit, never the body', async () => {
    // Response headers carry the account's own limits and no prompt content, so
    // they are safe to surface. The body can echo the CV (P3), so it never is.
    //
    // The `-minute` suffix is Cerebras's, not a typo. Groq's names had no window
    // suffix, and reading the wrong ones yields null rather than an error — this
    // assertion is the only thing standing between a header rename and every 429
    // silently losing its reason again.
    stubFetch(() =>
      limited({
        'retry-after': '0',
        'x-ratelimit-limit-tokens-minute': '6000',
        'x-ratelimit-remaining-tokens-minute': '0',
      }),
    )
    const extractor = createCerebrasExtractor({ apiKey: 'k', maxRetries: 0 })
    await expect(extractor.extract(CV)).rejects.toThrow(/429/)
    await expect(extractor.extract(CV)).rejects.toThrow(/token limit 6000/)
    await expect(extractor.extract(CV)).rejects.not.toThrow(/Senior Go Engineer/)
  })

  describe('how long to wait', () => {
    // Exported to be reachable directly: the alternative is a test that really
    // sleeps for the twelve seconds being asserted.
    const wait = (headers: Record<string, string>) => retryAfterMs(new Response(null, { headers }))

    it('prefers retry-after over either window', () => {
      expect(
        wait({ 'retry-after': '3', 'x-ratelimit-reset-tokens-minute': '30' }),
      ).toBe(3000)
    })

    it('waits for the window that actually refused, not the first one it finds', () => {
      // The case this exists for: Cerebras meters 5 requests/minute against
      // 30,000 tokens/minute, so a request-limited 429 arrives with a token
      // window that has barely moved. Retrying on the short one burns the single
      // retry a user gets against a limit that had not reset.
      expect(
        wait({
          'x-ratelimit-reset-tokens-minute': '1.5',
          'x-ratelimit-reset-requests-minute': '11.382867097854614',
        }),
      ).toBe(11382.867097854614)
    })

    it('takes whichever window is present on its own', () => {
      expect(wait({ 'x-ratelimit-reset-requests-minute': '9' })).toBe(9000)
      expect(wait({ 'x-ratelimit-reset-tokens-minute': '4' })).toBe(4000)
    })

    it('reads Groq-style durations too, so the parser is not provider-locked', () => {
      expect(wait({ 'retry-after': '2m59.56s' })).toBe(179560)
      expect(wait({ 'retry-after': '7.66s' })).toBe(7660)
    })

    it('treats zero and nonsense as "we were not told"', () => {
      expect(wait({ 'retry-after': '0' })).toBeNull()
      expect(wait({ 'retry-after': 'soon' })).toBeNull()
      expect(wait({})).toBeNull()
    })
  })

  it('can be told not to retry at all', async () => {
    const spy = stubFetch(() => limited({ 'retry-after': '0' }))
    await expect(
      createCerebrasExtractor({ apiKey: 'k', maxRetries: 0 }).extract(CV),
    ).rejects.toThrow(/429/)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not retry a status a retry cannot fix', async () => {
    const spy = stubFetch(() => ({ ok: false, status: 400, json: async () => ({}) }))
    await expect(createCerebrasExtractor({ apiKey: 'k' }).extract(CV)).rejects.toThrow(/400/)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('survives a 429 with no rate-limit headers at all', async () => {
    let call = 0
    stubFetch(() => {
      call += 1
      return call === 1 ? limited() : ok(response())
    })
    const out = await createCerebrasExtractor({ apiKey: 'k', today: TODAY, maxRetries: 1 }).extract(CV)
    expect(out.skills).toEqual(['Go'])
  })
})
