import { describe, it, expect } from 'vitest'
import { validateProfile, PROFILE_JSON_SCHEMA } from './schema'
import { EMPTY_PROFILE } from './types'

describe('validateProfile', () => {
  it('passes through a well-formed response', () => {
    expect(
      validateProfile({ targetRoles: ['Backend Engineer'], skills: ['Go', 'SQL'], yearsExperience: 7 }),
    ).toEqual({ targetRoles: ['Backend Engineer'], skills: ['Go', 'SQL'], yearsExperience: 7 })
  })

  it('degrades to an empty profile rather than throwing', () => {
    for (const bad of [null, undefined, 'nope', 42, []]) {
      expect(validateProfile(bad)).toEqual(EMPTY_PROFILE)
    }
  })

  it('drops a missing or non-array list instead of inventing one', () => {
    expect(validateProfile({ yearsExperience: 3 })).toEqual({
      targetRoles: [],
      skills: [],
      yearsExperience: 3,
    })
  })

  it('nulls an implausible yearsExperience rather than storing it', () => {
    for (const y of [-1, 61, 4.5, '7', null, NaN]) {
      expect(validateProfile({ targetRoles: [], skills: [], yearsExperience: y }).yearsExperience)
        .toBeNull()
    }
  })

  it('accepts the boundaries', () => {
    expect(validateProfile({ yearsExperience: 0 }).yearsExperience).toBe(0)
    expect(validateProfile({ yearsExperience: 60 }).yearsExperience).toBe(60)
  })

  it('dedupes case-insensitively and keeps first spelling', () => {
    expect(validateProfile({ skills: ['Go', 'go', 'GO', 'SQL'] }).skills).toEqual(['Go', 'SQL'])
  })

  it('trims, drops blanks and non-strings', () => {
    expect(validateProfile({ skills: ['  Go  ', '', '   ', 5, null, 'SQL'] }).skills)
      .toEqual(['Go', 'SQL'])
  })

  it('caps list length and item length, so one bad response cannot flood the UI', () => {
    const many = Array.from({ length: 50 }, (_, i) => `skill-${i}`)
    expect(validateProfile({ skills: many }).skills).toHaveLength(20)
    expect(validateProfile({ skills: ['x'.repeat(200)] }).skills[0]).toHaveLength(60)
  })
})

describe('PROFILE_JSON_SCHEMA', () => {
  it('is strict and forbids extra properties, so the model cannot add fields', () => {
    expect(PROFILE_JSON_SCHEMA.strict).toBe(true)
    expect(PROFILE_JSON_SCHEMA.schema.additionalProperties).toBe(false)
  })

  it('requires every field, so absence is explicit rather than missing', () => {
    expect(PROFILE_JSON_SCHEMA.schema.required).toEqual([
      'targetRoles', 'skills', 'yearsExperience',
    ])
  })

  it('allows null years, which is how "not stated" is expressed', () => {
    expect(PROFILE_JSON_SCHEMA.schema.properties.yearsExperience.type).toContain('null')
  })
})
