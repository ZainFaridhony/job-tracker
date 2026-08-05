import { describe, expect, it } from 'vitest'
import { majority, voteLists, voteProfile, voteYears } from './merge'
import type { ExtractedProfile } from './types'

describe('majority', () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
  ])('needs %i of %i samples', (samples, needed) => {
    expect(majority(samples)).toBe(needed)
  })
})

describe('voteLists', () => {
  const runs = [
    ['Go', 'PostgreSQL', 'Kafka', 'Redis', 'gRPC'],
    ['Go', 'PostgreSQL', 'Kafka', 'Redis'],
    ['Go', 'PostgreSQL', 'Kafka', 'gRPC', 'Docker'],
  ]

  it('keeps what a majority found and drops what one sample invented', () => {
    // Docker appears once out of three, which is the shape a hallucination takes.
    expect(voteLists(runs, 2)).toEqual(['Go', 'PostgreSQL', 'Kafka', 'Redis', 'gRPC'])
  })

  it('votes case-insensitively, so casing disagreement is not a split vote', () => {
    expect(voteLists([['PostgreSQL'], ['postgresql'], ['Postgres']], 2)).toEqual(['PostgreSQL'])
  })

  it('keeps the first spelling seen, since the prompt normalises meaning', () => {
    expect(voteLists([['Node.js'], ['NODE.JS'], ['Node.js']], 2)).toEqual(['Node.js'])
  })

  it('preserves first-appearance order rather than sorting by vote count', () => {
    // Roles come back most recent first, and that ordering is meaningful.
    const out = voteLists(
      [
        ['Senior Backend Engineer', 'Backend Engineer'],
        ['Senior Backend Engineer', 'Backend Engineer'],
      ],
      2,
    )
    expect(out).toEqual(['Senior Backend Engineer', 'Backend Engineer'])
  })

  it('counts a repeat within one run as one vote', () => {
    // Otherwise a single sample listing something twice could carry it alone.
    expect(voteLists([['Go', 'Go', 'go'], ['Rust']], 2)).toEqual([])
  })

  it('ignores blank and whitespace-only entries', () => {
    expect(voteLists([['', '  ', 'Go'], ['Go']], 2)).toEqual(['Go'])
  })

  it('trims when it keeps a spelling', () => {
    expect(voteLists([['  Go  '], ['Go']], 2)).toEqual(['Go'])
  })

  it('returns nothing when every run is empty', () => {
    expect(voteLists([[], [], []], 2)).toEqual([])
  })

  it('passes a single run straight through at threshold one', () => {
    expect(voteLists([['Go', 'Rust']], 1)).toEqual(['Go', 'Rust'])
  })
})

describe('voteYears', () => {
  it('takes the middle value, so one misread date cannot drag the answer', () => {
    expect(voteYears([7, 8, 20])).toBe(8)
  })

  it('drops nulls, so samples that found a number outvote one that did not', () => {
    expect(voteYears([null, 8, 8])).toBe(8)
  })

  it('returns null only when no sample found anything', () => {
    expect(voteYears([null, null, null])).toBeNull()
    expect(voteYears([])).toBeNull()
  })

  it('takes the lower of two when the samples disagree evenly', () => {
    // Never overstate: the same posture as flooring the year total.
    expect(voteYears([7, 9])).toBe(7)
  })

  it('keeps zero, which is a real answer for a fresh graduate', () => {
    expect(voteYears([0, 0, null])).toBe(0)
  })
})

describe('voteProfile', () => {
  const sample = (over: Partial<ExtractedProfile> = {}): ExtractedProfile => ({
    targetRoles: ['Backend Engineer'],
    skills: ['Go'],
    yearsExperience: 7,
    ...over,
  })

  it('votes every field together', () => {
    const out = voteProfile([
      sample(),
      sample({ skills: ['Go', 'Rust'] }),
      sample({ yearsExperience: 8 }),
    ])
    expect(out).toEqual({
      targetRoles: ['Backend Engineer'],
      skills: ['Go'],
      yearsExperience: 7,
    })
  })

  it('returns a single sample unchanged rather than voting against itself', () => {
    const only = sample({ skills: ['Go', 'Rust', 'Kafka'] })
    expect(voteProfile([only])).toEqual(only)
  })

  it('degrades to an empty profile with no samples at all', () => {
    // Every call failed. Onboarding continues with blank fields, as it must.
    expect(voteProfile([])).toEqual({ targetRoles: [], skills: [], yearsExperience: null })
  })

  it('requires both of two samples to agree', () => {
    const out = voteProfile([sample({ skills: ['Go'] }), sample({ skills: ['Rust'] })])
    expect(out.skills).toEqual([])
  })
})
