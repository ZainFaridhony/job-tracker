import { describe, expect, it } from 'vitest'
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  INDUSTRIES,
  JOBS,
  JOB_FUNCTIONS,
  JOB_SOURCES,
  SENIORITY_LEVELS,
  SKILL_FACETS,
  WORK_MODES,
  jobById,
} from './data'

describe('the corpus', () => {
  it('gives every listing a distinct id', () => {
    expect(new Set(JOBS.map((j) => j.id)).size).toBe(JOBS.length)
  })

  it('orders every salary range low to high', () => {
    for (const j of JOBS) {
      expect(j.salary.max, j.id).toBeGreaterThan(j.salary.min)
      expect(j.marketSalary.max, j.id).toBeGreaterThan(j.marketSalary.min)
    }
  })

  it('keeps match scores and applicant counts in range', () => {
    for (const j of JOBS) {
      expect(j.match, j.id).toBeGreaterThanOrEqual(0)
      expect(j.match, j.id).toBeLessThanOrEqual(100)
      expect(j.applicants, j.id).toBeGreaterThanOrEqual(0)
      expect(j.postedHoursAgo, j.id).toBeGreaterThanOrEqual(0)
    }
  })

  it('draws every faceted field from its own vocabulary', () => {
    for (const j of JOBS) {
      expect(WORK_MODES, j.id).toContain(j.mode)
      expect(EMPLOYMENT_TYPES, j.id).toContain(j.type)
      expect(SENIORITY_LEVELS, j.id).toContain(j.level)
      expect(COMPANY_SIZES, j.id).toContain(j.size)
      expect(JOB_SOURCES, j.id).toContain(j.source)
      expect(JOB_FUNCTIONS, j.id).toContain(j.fn)
      expect(INDUSTRIES, j.id).toContain(j.industry)
    }
  })

  it('offers no skill facet that no listing has', () => {
    // The sidebar renders SKILL_FACETS. A facet nothing matches is a filter
    // that can only ever empty the list, which reads as a broken screen.
    const held = new Set(JOBS.flatMap((j) => j.skills))
    for (const s of SKILL_FACETS) expect(held, s).toContain(s)
  })

  it('covers every work mode, so the mode filter is demonstrable', () => {
    const modes = new Set(JOBS.map((j) => j.mode))
    for (const m of WORK_MODES) expect(modes, m).toContain(m)
  })

  it('finds a listing by id and nothing by a bad one', () => {
    expect(jobById(JOBS[0]!.id)?.title).toBe(JOBS[0]!.title)
    expect(jobById('nope')).toBeUndefined()
  })
})
