import { PROFILE_JSON_SCHEMA, validateProfile } from './schema'
import { EMPTY_PROFILE, type ExtractedProfile, type ProfileExtractor } from './types'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const MODEL = 'openai/gpt-oss-120b'

/** Enough CV text to be worth sending; below this the file is likely a scan. */
export const MIN_USEFUL_CHARS = 200

/** Keeps one oversized CV from blowing the context window or the bill. */
const MAX_CHARS = 24_000

const SYSTEM = [
  'You extract structured facts from a CV. You do not infer, estimate, or embellish.',
  'Only report what the CV states. If it does not state something, return an empty',
  'array or null for that field. Never invent an employer, title, skill, or date.',
  'Report job titles the person actually held, not titles they might want.',
].join(' ')

/** The real extractor. Plain fetch — the request shape is small and verified. */
export function createGroqExtractor(apiKey = process.env.GROQ_API_KEY): ProfileExtractor {
  return {
    async extract(cvText: string): Promise<ExtractedProfile> {
      if (!apiKey) throw new Error('GROQ_API_KEY is not set')
      if (cvText.trim().length < MIN_USEFUL_CHARS) return EMPTY_PROFILE

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: cvText.slice(0, MAX_CHARS) },
          ],
          response_format: { type: 'json_schema', json_schema: PROFILE_JSON_SCHEMA },
          max_completion_tokens: 1200,
        }),
      })

      if (!response.ok) {
        // Never include the response body: a Groq error can echo the prompt,
        // and the prompt is the user's CV (P3 — no CV content in logs).
        throw new Error(`Groq request failed with ${response.status}`)
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = body.choices?.[0]?.message?.content
      if (!content) return EMPTY_PROFILE

      try {
        return validateProfile(JSON.parse(content))
      } catch {
        // Malformed JSON despite strict mode: an empty profile leaves the user
        // blank fields to fill, which beats an error page mid-onboarding.
        return EMPTY_PROFILE
      }
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
