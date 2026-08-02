import { describe, expect, it } from 'vitest'
import {
  CAREER_GOALS,
  SALARY_PERIODS,
  slugForStep,
  stepByNumber,
  stepBySlug,
  STEPS,
  TOTAL_STEPS,
  WORK_LOCATIONS,
} from './steps'

describe('STEPS', () => {
  it('numbers the steps 1..6 with no gaps', () => {
    expect(STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6])
    expect(TOTAL_STEPS).toBe(6)
  })

  it('has a unique slug per step', () => {
    expect(new Set(STEPS.map((s) => s.slug)).size).toBe(STEPS.length)
  })

  it('resolves a slug back to its step', () => {
    expect(stepBySlug('skills')?.n).toBe(4)
    expect(stepBySlug('nope')).toBeUndefined()
  })

  it('resolves a number back to its step', () => {
    expect(stepByNumber(1)?.slug).toBe('resume')
    expect(stepByNumber(7)).toBeUndefined()
  })
})

describe('slugForStep', () => {
  it('maps each valid step to its slug', () => {
    expect(STEPS.map((s) => slugForStep(s.n))).toEqual(STEPS.map((s) => s.slug))
  })

  it('clamps out-of-range input instead of returning undefined', () => {
    expect(slugForStep(0)).toBe('resume')
    expect(slugForStep(-4)).toBe('resume')
    expect(slugForStep(99)).toBe('done')
  })
})

describe('answer options', () => {
  // The check constraints in 20260801120000_cvs_and_onboarding.sql reject
  // anything outside these sets, so a drift here is a runtime 400, not a
  // validation message.
  it('offers only work locations the database accepts', () => {
    expect(WORK_LOCATIONS.map((l) => l.value)).toEqual(['remote', 'hybrid', 'onsite'])
  })

  it('offers only salary periods the database accepts', () => {
    expect(SALARY_PERIODS.map((p) => p.value)).toEqual(['yearly', 'monthly'])
  })

  it('gives every option a distinct value and a label', () => {
    for (const set of [CAREER_GOALS, WORK_LOCATIONS, SALARY_PERIODS]) {
      expect(new Set(set.map((o) => o.value)).size).toBe(set.length)
      expect(set.every((o) => o.label.length > 0)).toBe(true)
    }
  })
})
