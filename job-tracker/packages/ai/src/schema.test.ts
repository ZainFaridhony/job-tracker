import { describe, it, expect } from 'vitest'
import { parseResponse, PROFILE_JSON_SCHEMA } from './schema'
import { EMPTY_PROFILE } from './types'

const TODAY = new Date('2026-08-05T00:00:00Z')

function parse(raw: unknown) {
  return parseResponse(raw, { today: TODAY })
}

/** A well-formed response, overridable per test. */
function response(over: Record<string, unknown> = {}) {
  return {
    roles: [{ title: 'Backend Engineer', start: '2018', end: '2021' }],
    skills: ['Go', 'SQL'],
    statedYearsExperience: null,
    ...over,
  }
}

describe('parseResponse', () => {
  it('passes through a well-formed response', () => {
    expect(parse(response())).toEqual({
      targetRoles: ['Backend Engineer'],
      skills: ['Go', 'SQL'],
      yearsExperience: 4,
    })
  })

  it('degrades to an empty profile rather than throwing', () => {
    for (const bad of [null, undefined, 'nope', 42, []]) {
      expect(parse(bad)).toEqual(EMPTY_PROFILE)
    }
  })

  it('drops a missing or non-array list instead of inventing one', () => {
    expect(parse({ statedYearsExperience: 3 })).toEqual({
      targetRoles: [],
      skills: [],
      yearsExperience: 3,
    })
  })
})

describe('reading roles', () => {
  it('takes the titles in the order the model gave them', () => {
    // The prompt asks for most recent first, and that ordering is meaningful.
    const out = parse(
      response({
        roles: [
          { title: 'Senior Backend Engineer', start: '2021', end: 'present' },
          { title: 'Backend Engineer', start: '2018', end: '2021' },
        ],
      }),
    )
    expect(out.targetRoles).toEqual(['Senior Backend Engineer', 'Backend Engineer'])
  })

  it('dedupes titles case-insensitively but keeps both spans', () => {
    // A promotion recorded twice under one title still describes real time.
    const out = parse(
      response({
        roles: [
          { title: 'Engineer', start: '2018', end: '2020' },
          { title: 'engineer', start: '2021', end: '2022' },
        ],
      }),
    )
    expect(out.targetRoles).toEqual(['Engineer'])
    // 2018-2020 is 36 months, 2021-2022 is 24. Five years across a gap.
    expect(out.yearsExperience).toBe(5)
  })

  it('skips a role with no usable title but keeps its span', () => {
    const out = parse(
      response({
        roles: [
          { title: '', start: '2018', end: '2021' },
          { title: 'Engineer', start: '2022', end: '2023' },
        ],
      }),
    )
    expect(out.targetRoles).toEqual(['Engineer'])
    expect(out.yearsExperience).toBe(6)
  })

  it('ignores entries that are not objects', () => {
    const out = parse(response({ roles: ['Engineer', null, 42] }))
    expect(out.targetRoles).toEqual([])
    expect(out.yearsExperience).toBeNull()
  })

  it('treats a blank or non-string date as absent', () => {
    // An absent end means ongoing; an absent start means the span is unusable.
    expect(parse(response({ roles: [{ title: 'A', start: '  ', end: '2021' }] })).yearsExperience)
      .toBeNull()
    expect(parse(response({ roles: [{ title: 'A', start: '2024-08', end: 42 }] })).yearsExperience)
      .toBe(2)
  })

  it('caps titles, so one bad response cannot flood the picker', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      title: `Role ${i}`,
      start: null,
      end: null,
    }))
    expect(parse(response({ roles: many })).targetRoles).toHaveLength(20)
  })

  it('truncates an overlong title', () => {
    expect(parse(response({ roles: [{ title: 'x'.repeat(200), start: null, end: null }] }))
      .targetRoles[0]).toHaveLength(60)
  })
})

describe('reading skills', () => {
  it('dedupes case-insensitively and keeps first spelling', () => {
    expect(parse(response({ skills: ['Go', 'go', 'GO', 'SQL'] })).skills).toEqual(['Go', 'SQL'])
  })

  it('trims, drops blanks and non-strings', () => {
    expect(parse(response({ skills: ['  Go  ', '', '   ', 5, null, 'SQL'] })).skills).toEqual([
      'Go',
      'SQL',
    ])
  })

  it('caps list length and item length, so one bad response cannot flood the UI', () => {
    const many = Array.from({ length: 50 }, (_, i) => `skill-${i}`)
    expect(parse(response({ skills: many })).skills).toHaveLength(20)
    expect(parse(response({ skills: ['x'.repeat(200)] })).skills[0]).toHaveLength(60)
  })
})

describe('years of experience', () => {
  it('comes from the dates, not from the model claiming a total', () => {
    const out = parse(
      response({
        roles: [{ title: 'Engineer', start: '2024-09', end: '2026-08' }],
        statedYearsExperience: 30,
      }),
    )
    expect(out.yearsExperience).toBe(2)
  })

  it('falls back to a stated total when no date could be read', () => {
    const out = parse(response({ roles: [], statedYearsExperience: 8 }))
    expect(out.yearsExperience).toBe(8)
  })

  it('rejects an implausible stated total rather than storing it', () => {
    for (const stated of [-1, 61, 4.5, '7', null]) {
      expect(parse(response({ roles: [], statedYearsExperience: stated })).yearsExperience)
        .toBeNull()
    }
  })

  it('accepts the boundaries', () => {
    expect(parse(response({ roles: [], statedYearsExperience: 0 })).yearsExperience).toBe(0)
    expect(parse(response({ roles: [], statedYearsExperience: 60 })).yearsExperience).toBe(60)
  })
})

describe('PROFILE_JSON_SCHEMA', () => {
  it('is strict and forbids extra properties, so the model cannot add fields', () => {
    expect(PROFILE_JSON_SCHEMA.strict).toBe(true)
    expect(PROFILE_JSON_SCHEMA.schema.additionalProperties).toBe(false)
  })

  it('requires every field, so absence is explicit rather than missing', () => {
    expect(PROFILE_JSON_SCHEMA.schema.required).toEqual([
      'roles',
      'skills',
      'statedYearsExperience',
    ])
  })

  it('pairs each title with its own dates, so two lists cannot fall out of step', () => {
    const role = PROFILE_JSON_SCHEMA.schema.properties.roles.items
    expect(role.required).toEqual(['title', 'start', 'end'])
    expect(role.additionalProperties).toBe(false)
  })

  it('allows a null date, which is how "the CV gives none" is expressed', () => {
    const props = PROFILE_JSON_SCHEMA.schema.properties.roles.items.properties
    expect(props.start.type).toContain('null')
    expect(props.end.type).toContain('null')
  })

  it('allows a null stated total, which is the common case', () => {
    expect(PROFILE_JSON_SCHEMA.schema.properties.statedYearsExperience.type).toContain('null')
  })

  it('tells the model not to compute the total itself', () => {
    // The arithmetic happens in yearsOfExperience, and the description is what
    // stops the model doing it twice and disagreeing with itself.
    expect(PROFILE_JSON_SCHEMA.schema.properties.statedYearsExperience.description).toMatch(
      /never computed/i,
    )
  })
})
