import { describe, expect, it } from 'vitest'
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  INDUSTRIES,
  JOBS,
  JOB_FUNCTIONS,
  JOB_SOURCES,
  POSTED_WINDOWS,
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

  it('covers every facet vocabulary, so no filter is a permanent dead end', () => {
    // A facet value nothing in the corpus holds is a checkbox that can only
    // ever empty the list when ticked. One table, one loop, rather than a
    // separate test per facet, so a new vocabulary is guarded by construction
    // instead of by remembering to add another test for it.
    const facets: ReadonlyArray<
      readonly [string, readonly string[], (j: (typeof JOBS)[number]) => string]
    > = [
      ['WORK_MODES', WORK_MODES, (j) => j.mode],
      ['EMPLOYMENT_TYPES', EMPLOYMENT_TYPES, (j) => j.type],
      ['SENIORITY_LEVELS', SENIORITY_LEVELS, (j) => j.level],
      ['COMPANY_SIZES', COMPANY_SIZES, (j) => j.size],
      ['JOB_SOURCES', JOB_SOURCES, (j) => j.source],
      ['JOB_FUNCTIONS', JOB_FUNCTIONS, (j) => j.fn],
      ['INDUSTRIES', INDUSTRIES, (j) => j.industry],
    ]
    for (const [name, vocabulary, read] of facets) {
      const held = new Set(JOBS.map(read))
      for (const value of vocabulary) expect(held, `${name}: ${value}`).toContain(value)
    }
  })

  it('gives every posted window at least one listing within it, so it is not a permanent dead end', () => {
    // POSTED_WINDOWS is a threshold, not an exact-match vocabulary like the
    // table above, so it needs its own shape of check: some listing must be
    // at or under every window's hour count. On this corpus "Past 7 days" and
    // "Past 30 days" happen to return the same six listings — the oldest
    // posting is 168h, exactly the 7-day threshold — which is a fact about
    // this corpus, not a bug to fix by inventing an older listing.
    for (const w of POSTED_WINDOWS) {
      expect(
        JOBS.some((j) => j.postedHoursAgo <= w.hours),
        `POSTED_WINDOWS: ${w.label}`,
      ).toBe(true)
    }
  })

  it('finds a listing by id and nothing by a bad one', () => {
    expect(jobById(JOBS[0]!.id)?.title).toBe(JOBS[0]!.title)
    expect(jobById('nope')).toBeUndefined()
  })
})
