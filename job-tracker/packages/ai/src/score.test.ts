import { describe, expect, it } from 'vitest'
import { normaliseTerm, scoreCase, scoreList, scoreYears, summarise } from './score'

describe('normaliseTerm', () => {
  it.each([
    ['Node.js', 'nodejs'],
    ['node js', 'nodejs'],
    ['NODEJS', 'nodejs'],
    ['  Go  ', 'go'],
    ['C++', 'c'],
    ['CI/CD', 'cicd'],
  ])('reduces %s to %s', (input, expected) => {
    expect(normaliseTerm(input)).toBe(expected)
  })

  it('does not punish punctuation when the meaning is identical', () => {
    expect(normaliseTerm('Node.js')).toBe(normaliseTerm('nodejs'))
  })

  it.each([
    ['Financial Modelling', 'Financial Modeling'],
    ['Data Visualisation', 'Data Visualization'],
    ['Fulfilment', 'Fulfillment'],
    ['Organisation', 'Organization'],
  ])('treats %s and %s as one skill', (uk, us) => {
    // Both spellings are the same skill, and a real run scored the difference as
    // a miss plus an invention. That is a scorer artefact, not a prompt problem.
    expect(normaliseTerm(uk)).toBe(normaliseTerm(us))
  })

  it('still tells genuinely different skills apart', () => {
    expect(normaliseTerm('Java')).not.toBe(normaliseTerm('JavaScript'))
    expect(normaliseTerm('React')).not.toBe(normaliseTerm('React Native'))
  })
})

describe('scoreList', () => {
  it('scores a perfect match', () => {
    const s = scoreList(['Go', 'SQL'], ['Go', 'SQL'])
    expect(s.precision).toBe(1)
    expect(s.recall).toBe(1)
    expect(s.f1).toBe(1)
    expect(s.spurious).toEqual([])
    expect(s.missed).toEqual([])
  })

  it('separates invention from omission', () => {
    // These fail differently and the fixes are opposite, so they never collapse.
    const s = scoreList(['Go', 'Telepathy'], ['Go', 'SQL'])
    expect(s.precision).toBe(0.5)
    expect(s.recall).toBe(0.5)
    expect(s.spurious).toEqual(['Telepathy'])
    expect(s.missed).toEqual(['SQL'])
  })

  it('matches across spelling differences the prompt calls canonical', () => {
    const s = scoreList(['node js', 'POSTGRESQL'], ['Node.js', 'PostgreSQL'])
    expect(s.f1).toBe(1)
  })

  it('treats a duplicate prediction as one item', () => {
    // Otherwise repeating a hit would inflate precision.
    const s = scoreList(['Go', 'go', 'GO'], ['Go'])
    expect(s.precision).toBe(1)
    expect(s.recall).toBe(1)
  })

  it('scores an empty prediction against an empty gold set as perfect', () => {
    // A CV that names no skills is correctly extracted as no skills.
    const s = scoreList([], [])
    expect(s.f1).toBe(1)
  })

  it('scores predicting nothing when there was something as total recall failure', () => {
    const s = scoreList([], ['Go'])
    expect(s.recall).toBe(0)
    expect(s.f1).toBe(0)
    expect(s.missed).toEqual(['Go'])
  })

  it('scores predicting something when there was nothing as total precision failure', () => {
    const s = scoreList(['Go'], [])
    expect(s.precision).toBe(0)
    expect(s.f1).toBe(0)
    expect(s.spurious).toEqual(['Go'])
  })
})

describe('scoreYears', () => {
  it('marks an exact hit both exact and close', () => {
    expect(scoreYears(7, 7)).toMatchObject({ exact: true, close: true })
  })

  it('marks off-by-one close but not exact', () => {
    // Off by one usually lands in the same band the user picks from anyway.
    expect(scoreYears(8, 7)).toMatchObject({ exact: false, close: true })
    expect(scoreYears(6, 7)).toMatchObject({ exact: false, close: true })
  })

  it('marks off-by-two as neither', () => {
    expect(scoreYears(9, 7)).toMatchObject({ exact: false, close: false })
  })

  it('counts agreeing on "not stated" as correct', () => {
    expect(scoreYears(null, null)).toMatchObject({ exact: true, close: true })
  })

  it('counts inventing a number, or missing one, as wrong', () => {
    expect(scoreYears(7, null)).toMatchObject({ exact: false, close: false })
    expect(scoreYears(null, 7)).toMatchObject({ exact: false, close: false })
  })

  it('treats zero as a real answer, not as absence', () => {
    expect(scoreYears(0, 0)).toMatchObject({ exact: true })
    expect(scoreYears(0, null)).toMatchObject({ exact: false })
  })
})

describe('summarise', () => {
  const perfect = scoreCase(
    'a',
    { targetRoles: ['Engineer'], skills: ['Go'], yearsExperience: 7 },
    { targetRoles: ['Engineer'], skills: ['Go'], yearsExperience: 7 },
  )
  const wrong = scoreCase(
    'b',
    { targetRoles: [], skills: ['Telepathy'], yearsExperience: 20 },
    { targetRoles: ['Engineer'], skills: ['Go'], yearsExperience: 7 },
  )

  it('averages each case equally, not each item', () => {
    // Macro, so one skill-heavy CV cannot outvote the fresh graduate and the
    // career switcher combined.
    const s = summarise([perfect, wrong])
    expect(s.cases).toBe(2)
    expect(s.skillsF1).toBe(0.5)
    expect(s.rolesF1).toBe(0.5)
  })

  it('reports precision and recall alongside F1, so a regression is diagnosable', () => {
    const s = summarise([wrong])
    expect(s.skillsPrecision).toBe(0)
    expect(s.skillsRecall).toBe(0)
  })

  it('reports the two year bars separately', () => {
    const s = summarise([perfect, wrong])
    expect(s.yearsExact).toBe(0.5)
    expect(s.yearsClose).toBe(0.5)
  })

  it('handles an empty run without dividing by zero', () => {
    expect(summarise([])).toMatchObject({ cases: 0, skillsF1: 0 })
  })
})
