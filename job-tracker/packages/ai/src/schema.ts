import { yearsOfExperience, type EmploymentPeriod } from './employment'
import { EMPTY_PROFILE, type ExtractedProfile } from './types'

/**
 * Sent to Groq as a strict json_schema.
 *
 * Roles carry their own dates rather than sitting in a parallel array. One entry
 * per position means the model never has to keep two lists aligned, and it makes
 * the promotion case natural: two titles, each with its own span.
 *
 * `statedYearsExperience` is only for a total the document writes in words. The
 * number that reaches the database is computed from the periods by
 * `yearsOfExperience`, because asking a model for date arithmetic is asking for
 * the one thing it is worst at.
 *
 * NOTE: this nests objects, where the previous version was flat and carried a
 * comment saying flat was verified against gpt-oss-120b. Nesting is verified by
 * `smoke/live.test.ts`, which is the only thing that can catch the model changing
 * how it honours strict mode. If nesting ever regresses, `parseResponse` degrades
 * to an empty profile and onboarding continues.
 */
export const PROFILE_JSON_SCHEMA = {
  name: 'extracted_profile',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['roles', 'skills', 'statedYearsExperience'],
    properties: {
      roles: {
        type: 'array',
        description:
          'Positions the person actually held, most recent first. Never an aspiration, never education. Empty if the document names none.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'start', 'end'],
          properties: {
            title: {
              type: 'string',
              description:
                'The job title, abbreviations expanded, without the employer or location.',
            },
            start: {
              type: ['string', 'null'],
              description:
                'Start date exactly as the document gives it: "YYYY-MM" with a month, "YYYY" without. Null if undated. Never calculated.',
            },
            end: {
              type: ['string', 'null'],
              description:
                'End date as "YYYY-MM" or "YYYY", or "present" for a current role. Null if undated. Never calculated.',
            },
          },
        },
      },
      skills: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Skills the document names as skills, normalised to their canonical name and without version numbers. Never derived from prose. Empty if the document names none.',
      },
      statedYearsExperience: {
        type: ['integer', 'null'],
        description:
          'A total the document states in words, such as "8 years of experience". Null otherwise. Never computed from the dates.',
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

/** A date bound is a non-empty string or nothing. Anything else is nothing. */
function dateOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** Titles and spans out of one `roles` array, each validated on its own terms. */
function readRoles(value: unknown): { titles: string[]; periods: EmploymentPeriod[] } {
  if (!Array.isArray(value)) return { titles: [], periods: [] }

  const titles: string[] = []
  const periods: EmploymentPeriod[] = []
  const seen = new Set<string>()

  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const role = raw as Record<string, unknown>

    // A period counts toward the total even when its title duplicates an earlier
    // one: a promotion is two titles over two real spans, and the merge in
    // yearsOfExperience is what stops the overlap being double-counted.
    periods.push({ start: dateOrNull(role['start']), end: dateOrNull(role['end']) })

    const title = typeof role['title'] === 'string' ? role['title'].trim().slice(0, MAX_LEN) : ''
    const key = title.toLowerCase()
    if (!title || seen.has(key) || titles.length >= MAX_ITEMS) continue
    seen.add(key)
    titles.push(title)
  }

  return { titles, periods }
}

export type ParseOptions = {
  /** Injected so the year total is testable and does not move with the clock. */
  today?: Date
}

/**
 * Last line of defence between the model and the database. Strict json_schema
 * makes malformed output unlikely, not impossible, and a model can still return
 * an absurd date or a hundred duplicate skills.
 *
 * Never throws: a bad response degrades to an empty profile so the user gets a
 * blank field to fill rather than an error page mid-onboarding.
 */
export function parseResponse(raw: unknown, options: ParseOptions = {}): ExtractedProfile {
  if (typeof raw !== 'object' || raw === null) return EMPTY_PROFILE
  const o = raw as Record<string, unknown>

  const { titles, periods } = readRoles(o['roles'])
  const stated = o['statedYearsExperience']

  return {
    targetRoles: titles,
    skills: cleanList(o['skills']),
    yearsExperience: yearsOfExperience({
      periods,
      stated: typeof stated === 'number' ? stated : null,
      today: options.today,
    }),
  }
}
