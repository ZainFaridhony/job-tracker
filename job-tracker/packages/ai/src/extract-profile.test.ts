import { describe, it, expect, vi, afterEach } from 'vitest'
import { createGroqExtractor, createFakeExtractor, MIN_USEFUL_CHARS, MODEL } from './extract-profile'
import { EMPTY_PROFILE } from './types'

const CV = 'Senior Go Engineer. '.repeat(30) // comfortably over the threshold

afterEach(() => vi.unstubAllGlobals())

function stubFetch(impl: (url: string, init: RequestInit) => unknown) {
  const spy = vi.fn(async (url: string, init: RequestInit) => impl(url, init))
  vi.stubGlobal('fetch', spy)
  return spy
}

function ok(content: unknown) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  }
}

describe('createGroqExtractor', () => {
  it('sends the CV to the right model with strict structured output', async () => {
    const spy = stubFetch(() => ok({ targetRoles: ['Go Engineer'], skills: ['Go'], yearsExperience: 7 }))
    await createGroqExtractor('k').extract(CV)

    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.model).toBe(MODEL)
    expect(body.response_format.type).toBe('json_schema')
    expect(body.response_format.json_schema.strict).toBe(true)
  })

  it('instructs the model not to invent, since that is the whole risk', async () => {
    const spy = stubFetch(() => ok(EMPTY_PROFILE))
    await createGroqExtractor('k').extract(CV)
    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toMatch(/never invent/i)
  })

  it('validates what comes back rather than trusting it', async () => {
    stubFetch(() => ok({ targetRoles: ['A', 'a'], skills: [], yearsExperience: 999 }))
    const out = await createGroqExtractor('k').extract(CV)
    expect(out.targetRoles).toEqual(['A'])
    expect(out.yearsExperience).toBeNull()
  })

  it('does not call the API at all for too-little text (a likely scan)', async () => {
    const spy = stubFetch(() => ok(EMPTY_PROFILE))
    const out = await createGroqExtractor('k').extract('x'.repeat(MIN_USEFUL_CHARS - 1))
    expect(spy).not.toHaveBeenCalled()
    expect(out).toEqual(EMPTY_PROFILE)
  })

  it('throws without a key rather than sending an unauthenticated request', async () => {
    const spy = stubFetch(() => ok(EMPTY_PROFILE))
    await expect(createGroqExtractor(undefined).extract(CV)).rejects.toThrow(/GROQ_API_KEY/)
    expect(spy).not.toHaveBeenCalled()
  })

  it('never puts the response body in the error, because it can echo the CV', async () => {
    stubFetch(() => ({ ok: false, status: 429, json: async () => ({ error: CV }) }))
    await expect(createGroqExtractor('k').extract(CV)).rejects.toThrow(/failed with 429/)
    await expect(createGroqExtractor('k').extract(CV)).rejects.not.toThrow(/Senior Go Engineer/)
  })

  it('degrades to empty on malformed JSON instead of failing onboarding', async () => {
    stubFetch(() => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    }))
    expect(await createGroqExtractor('k').extract(CV)).toEqual(EMPTY_PROFILE)
  })

  it('degrades to empty when the response has no content', async () => {
    stubFetch(() => ({ ok: true, json: async () => ({ choices: [] }) }))
    expect(await createGroqExtractor('k').extract(CV)).toEqual(EMPTY_PROFILE)
  })

  it('truncates a very long CV so one upload cannot blow the context or the bill', async () => {
    const spy = stubFetch(() => ok(EMPTY_PROFILE))
    await createGroqExtractor('k').extract('a'.repeat(100_000))
    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.messages[1].content.length).toBeLessThanOrEqual(24_000)
  })
})

describe('createFakeExtractor', () => {
  it('honours the same too-little-text rule as the real extractor', async () => {
    const fake = createFakeExtractor({ skills: ['Go'] })
    expect(await fake.extract('short')).toEqual(EMPTY_PROFILE)
    expect((await fake.extract(CV)).skills).toEqual(['Go'])
  })
})
