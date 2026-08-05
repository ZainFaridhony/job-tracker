import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createGroqExtractor,
  createFakeExtractor,
  MIN_USEFUL_CHARS,
  MODEL,
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

describe('the request', () => {
  it('sends the CV to the right model with strict structured output', async () => {
    const spy = stubFetch(() => ok(response()))
    await createGroqExtractor({ apiKey: 'k', today: TODAY }).extract(CV)

    const body = bodyOf(spy)
    expect(body.model).toBe(MODEL)
    expect(body.response_format.type).toBe('json_schema')
    expect(body.response_format.json_schema.strict).toBe(true)
  })

  it('instructs the model not to invent, since that is the whole risk', async () => {
    const spy = stubFetch(() => ok(response()))
    await createGroqExtractor({ apiKey: 'k' }).extract(CV)
    const body = bodyOf(spy)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toMatch(/never infer, estimate, embellish/i)
  })

  it('tells the model the document is data, not instruction', async () => {
    // The CV is user-uploaded, so it is a prompt-injection surface.
    const spy = stubFetch(() => ok(response()))
    await createGroqExtractor({ apiKey: 'k' }).extract(CV)
    expect(bodyOf(spy).messages[0].content).toMatch(/data, not instruction/i)
  })

  it('carries worked examples, so the rules have something to bind to', async () => {
    const spy = stubFetch(() => ok(response()))
    await createGroqExtractor({ apiKey: 'k' }).extract(CV)
    const system = bodyOf(spy).messages[0].content
    expect(system).toMatch(/EXAMPLE 1/)
    expect(system).toMatch(/EXAMPLE 2/)
  })

  it('truncates a very long CV so one upload cannot blow the context or the bill', async () => {
    const spy = stubFetch(() => ok(response()))
    await createGroqExtractor({ apiKey: 'k' }).extract('a'.repeat(100_000))
    expect(bodyOf(spy).messages[1].content.length).toBeLessThanOrEqual(24_000)
  })

  it('accepts a bare key, so existing callers keep working', async () => {
    stubFetch(() => ok(response()))
    const out = await createGroqExtractor('k').extract(CV)
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
    const out = await createGroqExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
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
    const out = await createGroqExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
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
    const out = await createGroqExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(out.yearsExperience).toBe(2)
  })

  it('degrades to empty on malformed JSON instead of failing onboarding', async () => {
    stubFetch(() => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    }))
    expect(await createGroqExtractor({ apiKey: 'k' }).extract(CV)).toEqual(EMPTY_PROFILE)
  })

  it('degrades to empty when the response has no content', async () => {
    stubFetch(() => ({ ok: true, json: async () => ({ choices: [] }) }))
    expect(await createGroqExtractor({ apiKey: 'k' }).extract(CV)).toEqual(EMPTY_PROFILE)
  })
})

describe('refusing to call', () => {
  it('does not call the API at all for too-little text (a likely scan)', async () => {
    const spy = stubFetch(() => ok(response()))
    const out = await createGroqExtractor({ apiKey: 'k' }).extract('x'.repeat(MIN_USEFUL_CHARS - 1))
    expect(spy).not.toHaveBeenCalled()
    expect(out).toEqual(EMPTY_PROFILE)
  })

  it('throws without a key rather than sending an unauthenticated request', async () => {
    const spy = stubFetch(() => ok(response()))
    await expect(createGroqExtractor({ apiKey: undefined }).extract(CV)).rejects.toThrow(
      /GROQ_API_KEY/,
    )
    expect(spy).not.toHaveBeenCalled()
  })

  it('never puts the response body in the error, because it can echo the CV', async () => {
    // Deliberately headerless: a stub without `headers` must not crash the error
    // path, which is exactly what it did the first time.
    stubFetch(() => ({ ok: false, status: 429, json: async () => ({ error: CV }) }))
    const extractor = createGroqExtractor({ apiKey: 'k', maxRetries: 0 })
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

    const out = await createGroqExtractor({
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
    await createGroqExtractor({ apiKey: 'k', strategy: 'vote' }).extract(CV)
    expect(bodyOf(spy).temperature).toBeGreaterThan(0)
  })

  it('still votes when one sample fails', async () => {
    let call = 0
    stubFetch(() => {
      call += 1
      if (call === 2) throw new Error('network')
      return ok(response({ skills: ['Go', 'Kafka'] }))
    })

    const out = await createGroqExtractor({
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
    const out = await createGroqExtractor({ apiKey: 'k', strategy: 'vote' }).extract(CV)
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

    const out = await createGroqExtractor({
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

    const out = await createGroqExtractor({
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

    const out = await createGroqExtractor({
      apiKey: 'k',
      strategy: 'verify',
      today: TODAY,
    }).extract(CV)
    expect(out.skills).toEqual(['Go', 'Kafka'])
  })

  it('does not make a second call when the first returned nothing', async () => {
    const spy = stubFetch(() => ({ ok: true, json: async () => ({ choices: [] }) }))
    await createGroqExtractor({ apiKey: 'k', strategy: 'verify' }).extract(CV)
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

    const out = await createGroqExtractor({ apiKey: 'k', today: TODAY }).extract(CV)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(out.skills).toEqual(['Go'])
  })

  it('gives up after the allowance and reports the limit, never the body', async () => {
    // Response headers carry the account's own limits and no prompt content, so
    // they are safe to surface. The body can echo the CV (P3), so it never is.
    stubFetch(() =>
      limited({
        'retry-after': '0',
        'x-ratelimit-limit-tokens': '6000',
        'x-ratelimit-remaining-tokens': '0',
      }),
    )
    const extractor = createGroqExtractor({ apiKey: 'k', maxRetries: 0 })
    await expect(extractor.extract(CV)).rejects.toThrow(/429/)
    await expect(extractor.extract(CV)).rejects.toThrow(/token limit 6000/)
    await expect(extractor.extract(CV)).rejects.not.toThrow(/Senior Go Engineer/)
  })

  it('can be told not to retry at all', async () => {
    const spy = stubFetch(() => limited({ 'retry-after': '0' }))
    await expect(
      createGroqExtractor({ apiKey: 'k', maxRetries: 0 }).extract(CV),
    ).rejects.toThrow(/429/)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not retry a status a retry cannot fix', async () => {
    const spy = stubFetch(() => ({ ok: false, status: 400, json: async () => ({}) }))
    await expect(createGroqExtractor({ apiKey: 'k' }).extract(CV)).rejects.toThrow(/400/)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('survives a 429 with no rate-limit headers at all', async () => {
    let call = 0
    stubFetch(() => {
      call += 1
      return call === 1 ? limited() : ok(response())
    })
    const out = await createGroqExtractor({ apiKey: 'k', today: TODAY, maxRetries: 1 }).extract(CV)
    expect(out.skills).toEqual(['Go'])
  })
})
