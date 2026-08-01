import { EMPTY_PROFILE, type ExtractedProfile } from './types'

/** Sent to Groq as a strict json_schema. Verified supported by openai/gpt-oss-120b. */
export const PROFILE_JSON_SCHEMA = {
  name: 'extracted_profile',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['targetRoles', 'skills', 'yearsExperience'],
    properties: {
      targetRoles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Job titles the person has actually held, most recent first. Empty if none stated.',
      },
      skills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Technologies and skills named in the CV. Empty if none stated.',
      },
      yearsExperience: {
        type: ['integer', 'null'],
        description: 'Total years of professional experience if the CV states or clearly implies it by dates. Null otherwise — never estimate.',
      },
    },
  },
} as const

const MAX_ITEMS = 20
const MAX_LEN = 60

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const s = raw.trim().slice(0, MAX_LEN)
    const key = s.toLowerCase()
    if (!s || seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length === MAX_ITEMS) break
  }
  return out
}

/**
 * Last line of defence between the model and the database. Strict json_schema
 * makes malformed output unlikely, not impossible, and a model can still return
 * an absurd yearsExperience or a hundred duplicate skills.
 *
 * Never throws: a bad response degrades to an empty profile so the user gets a
 * blank field to fill rather than an error page mid-onboarding.
 */
export function validateProfile(raw: unknown): ExtractedProfile {
  if (typeof raw !== 'object' || raw === null) return EMPTY_PROFILE
  const o = raw as Record<string, unknown>

  const years = o['yearsExperience']
  const yearsOk =
    typeof years === 'number' && Number.isInteger(years) && years >= 0 && years <= 60

  return {
    targetRoles: cleanList(o['targetRoles']),
    skills: cleanList(o['skills']),
    yearsExperience: yearsOk ? years : null,
  }
}
