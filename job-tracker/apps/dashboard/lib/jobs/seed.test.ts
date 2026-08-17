import { describe, expect, it } from 'vitest'
import { JOBS } from './data'
import { applyFilters, parseFilters, rawFromQuery } from './filters'
import { hasSeed, seedJobsHref, seedSummary, type SeedPreferences } from './seed'

const OFF: SeedPreferences = {
  autofill: false,
  workLocation: null,
  salaryTarget: null,
  salaryCurrency: null,
  salaryPeriod: null,
  skills: [],
  yearsExperience: null,
}

const prefs = (over: Partial<SeedPreferences> = {}): SeedPreferences => ({
  ...OFF,
  autofill: true,
  ...over,
})

/** What the link would parse back to, which is what the Jobs page actually sees. */
const filtersFrom = (href: string) =>
  parseFilters(rawFromQuery(href.includes('?') ? href.slice(href.indexOf('?') + 1) : ''))

describe('seedJobsHref', () => {
  it('returns a bare /jobs when the preference is off', () => {
    expect(seedJobsHref({ ...OFF, workLocation: 'remote', salaryTarget: '200000' })).toBe('/jobs')
  })

  it('returns a bare /jobs when the preference is on but the profile says nothing', () => {
    expect(seedJobsHref(prefs())).toBe('/jobs')
  })

  it('seeds the work mode from the saved work location', () => {
    expect(filtersFrom(seedJobsHref(prefs({ workLocation: 'hybrid' }))).modes).toEqual(['hybrid'])
  })

  it('seeds a yearly salary target straight through as the floor', () => {
    const f = filtersFrom(seedJobsHref(prefs({ salaryTarget: '200000', salaryPeriod: 'yearly' })))
    expect(f.salaryMin).toBe(200_000)
  })

  it('multiplies a monthly target by twelve, because the jobs floor is per year', () => {
    // The profile stores the target in whatever period the user chose; the jobs
    // filter's floor is annual and its label says so. Seeding a monthly figure
    // unconverted would set a floor twelve times too low and filter nothing out.
    const f = filtersFrom(seedJobsHref(prefs({ salaryTarget: '20000000', salaryPeriod: 'monthly' })))
    expect(f.salaryMin).toBe(240_000_000)
  })

  it('carries the saved currency, so the floor is read in the unit it was typed in', () => {
    const f = filtersFrom(
      seedJobsHref(prefs({ salaryTarget: '600000000', salaryCurrency: 'IDR', salaryPeriod: 'yearly' })),
    )
    expect(f.currency).toBe('IDR')
    expect(f.salaryMin).toBe(600_000_000)
  })

  it('drops a work location outside the vocabulary rather than writing it', () => {
    // These columns are free-form text in Postgres, so nothing guarantees the
    // stored value is one the jobs screen knows. An unrecognised value must not
    // reach the URL, or the seeded link carries a parameter that parses to
    // nothing and the reader sees a filter chip they cannot explain.
    expect(seedJobsHref(prefs({ workLocation: 'moon' }))).toBe('/jobs')
  })

  it('drops an unknown currency but keeps the amount, in the base currency', () => {
    const f = filtersFrom(
      seedJobsHref(prefs({ salaryTarget: '200000', salaryCurrency: 'XYZ', salaryPeriod: 'yearly' })),
    )
    expect(f.currency).toBe('USD')
    expect(f.salaryMin).toBe(200_000)
  })

  it('ignores a non-numeric or zero target rather than writing salaryMin=0', () => {
    expect(seedJobsHref(prefs({ salaryTarget: '0', salaryPeriod: 'yearly' }))).toBe('/jobs')
    expect(seedJobsHref(prefs({ salaryTarget: 'abc', salaryPeriod: 'yearly' }))).toBe('/jobs')
  })

  it('never seeds a skill filter', () => {
    // Deliberate. `applyFilters` treats several skills as AND — a listing must
    // want every one of them — so seeding a CV's worth of skills would open the
    // screen on an empty result set and read as a broken page. The Skills facet
    // already uses the CV for grouping, which is the useful half.
    const f = filtersFrom(seedJobsHref(prefs({ workLocation: 'remote', salaryTarget: '150000' })))
    expect(f.skills).toEqual([])
  })

  it('seeds both fields at once', () => {
    const href = seedJobsHref(
      prefs({ workLocation: 'remote', salaryTarget: '180000', salaryPeriod: 'yearly' }),
    )
    const f = filtersFrom(href)
    expect(f.modes).toEqual(['remote'])
    expect(f.salaryMin).toBe(180_000)
    expect(href.startsWith('/jobs?')).toBe(true)
  })
})

describe('hasSeed', () => {
  it('is false when the profile records nothing a filter could use', () => {
    // Career goal and years of experience are real profile facts that map onto no
    // facet, so a profile holding only those has nothing to seed.
    expect(hasSeed(prefs())).toBe(false)
  })

  it('is true when either field is usable on its own', () => {
    expect(hasSeed(prefs({ workLocation: 'remote' }))).toBe(true)
    expect(hasSeed(prefs({ salaryTarget: '150000', salaryPeriod: 'yearly' }))).toBe(true)
  })

  it('ignores the toggle, because it answers "is there anything to apply"', () => {
    // The sidebar needs this to decide whether to offer the control at all, which
    // is a different question from whether the reader has switched it on.
    expect(hasSeed({ ...OFF, workLocation: 'remote' })).toBe(true)
  })

  it('is false for a value outside the vocabulary', () => {
    expect(hasSeed(prefs({ workLocation: 'moon' }))).toBe(false)
  })
})

describe('seedSummary', () => {
  it('names each filter it would apply, so the control says what it does', () => {
    expect(seedSummary(prefs({ workLocation: 'remote', salaryTarget: '200000', salaryPeriod: 'yearly' }))).toEqual([
      'Remote',
      '$200k+',
    ])
  })

  it('uses the display label, not the stored value', () => {
    expect(seedSummary(prefs({ workLocation: 'onsite' }))).toEqual(['On-site'])
  })

  it('reads the salary in the saved currency', () => {
    expect(
      seedSummary(prefs({ salaryTarget: '600000000', salaryCurrency: 'IDR', salaryPeriod: 'yearly' })),
    ).toEqual(['Rp600M+'])
  })

  it('shows the converted yearly figure for a monthly target', () => {
    // The same conversion seedJobsHref applies, so the summary cannot promise one
    // floor while the link sets another.
    expect(seedSummary(prefs({ salaryTarget: '20000000', salaryPeriod: 'monthly' }))).toEqual([
      '$240M+',
    ])
  })

  it('is empty when there is nothing to apply', () => {
    expect(seedSummary(prefs())).toEqual([])
  })
})

describe('seeding experience level from years', () => {
  // Derived from EXPERIENCE_BANDS, whose labels already name the seniority —
  // Entry / Intermediate / Senior / Expert — rather than from new thresholds
  // invented here. The corpus carries only senior, lead and principal, because
  // 'mid' was removed when no listing could honestly hold it, so the two junior
  // bands map to no level at all.
  const levelsFor = (years: number | null) =>
    filtersFrom(seedJobsHref(prefs({ yearsExperience: years }))).levels

  it('maps the Senior band to senior', () => {
    expect(levelsFor(6)).toEqual(['senior'])
    expect(levelsFor(9)).toEqual(['senior'])
  })

  it('maps the Expert band to lead and principal, which are alternatives', () => {
    // Levels are OR in applyFilters, so offering both is one request rather than
    // a contradiction — and an Expert would take either.
    expect(levelsFor(10)).toEqual(['lead', 'principal'])
    expect(levelsFor(25)).toEqual(['lead', 'principal'])
  })

  it('maps the two junior bands to nothing, because no listing is junior', () => {
    // Seeding a level the corpus never holds would open the screen empty.
    expect(levelsFor(0)).toEqual([])
    expect(levelsFor(3)).toEqual([])
    expect(levelsFor(5)).toEqual([])
  })

  it('seeds no level when the CV never said', () => {
    expect(levelsFor(null)).toEqual([])
  })

  it('names the level in the summary', () => {
    expect(seedSummary(prefs({ yearsExperience: 6 }))).toEqual(['Senior'])
    expect(seedSummary(prefs({ yearsExperience: 12 }))).toEqual(['Lead or Principal'])
  })
})

describe('seeding skills', () => {
  it('seeds nothing for a profile whose skills no listing asks for', () => {
    // The real case that prompted this: a business-development CV against a corpus
    // of design and engineering listings has an empty intersection, so there is
    // nothing to tick and the screen must not pretend otherwise.
    const f = filtersFrom(
      seedJobsHref(prefs({ skills: ['B2B Sales', 'Lead Generation', 'English'] })),
    )
    expect(f.skills).toEqual([])
  })

  it('seeds the skills the corpus actually asks for', () => {
    const f = filtersFrom(seedJobsHref(prefs({ skills: ['React', 'B2B Sales'] })))
    expect(f.skills).toEqual(['React'])
  })

  it('matches case-insensitively but seeds the corpus spelling', () => {
    // Extracted skills come from a model. `parseFilters` validates against
    // SKILL_FACETS, so the wrong casing would be dropped as unknown.
    expect(filtersFrom(seedJobsHref(prefs({ skills: ['react'] }))).skills).toEqual(['React'])
  })

  it('stops adding skills before the result set empties', () => {
    // Skills are AND in applyFilters — a listing must want every one ticked — so a
    // whole CV's worth would open the screen on nothing. Seeding as many as still
    // return work is the only version that cannot produce a dead screen.
    const many = ['Python', 'React', 'Figma', 'Kubernetes', 'Terraform']
    const href = seedJobsHref(prefs({ skills: many }))
    const f = filtersFrom(href)
    expect(f.skills.length).toBeGreaterThan(0)
    expect(f.skills.length).toBeLessThan(many.length)
    expect(applyFilters(JOBS, f).length).toBeGreaterThan(0)
  })

  it('never seeds a combination that returns nothing', () => {
    for (const skills of [
      ['Python', 'Figma'],
      ['React', 'Terraform', 'PyTorch'],
      ['Accessibility', 'Airflow', 'Go', 'Statistics'],
    ]) {
      const f = filtersFrom(seedJobsHref(prefs({ skills })))
      expect(applyFilters(JOBS, f).length, skills.join('+')).toBeGreaterThan(0)
    }
  })

  it('counts skills towards hasSeed', () => {
    expect(hasSeed(prefs({ skills: ['React'] }))).toBe(true)
    expect(hasSeed(prefs({ skills: ['B2B Sales'] }))).toBe(false)
  })
})
