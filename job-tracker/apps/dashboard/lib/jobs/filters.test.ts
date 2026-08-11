import { describe, expect, it } from 'vitest'
import { JOBS } from './data'
import {
  activeChips,
  activeCount,
  applyFilters,
  EMPTY_FILTERS,
  jobsHref,
  parseFilters,
  rawFromQuery,
  toQuery,
  withoutChip,
} from './filters'

describe('parseFilters', () => {
  it('reads nothing out of nothing', () => {
    expect(parseFilters({})).toEqual(EMPTY_FILTERS)
  })

  it('accepts one value or many for a repeated parameter', () => {
    expect(parseFilters({ mode: 'remote' }).modes).toEqual(['remote'])
    expect(parseFilters({ mode: ['remote', 'hybrid'] }).modes).toEqual(['remote', 'hybrid'])
  })

  it('drops values outside the vocabulary, because the URL is user-editable', () => {
    // An unrecognised mode would otherwise render a chip that nothing removes.
    expect(parseFilters({ mode: ['remote', 'moon'] }).modes).toEqual(['remote'])
    expect(parseFilters({ fn: 'Astrology' }).fn).toBe('')
    expect(parseFilters({ period: 'weekly' }).period).toBe('yearly')
  })

  it('deduplicates, so ?mode=remote&mode=remote is one filter not two', () => {
    expect(parseFilters({ mode: ['remote', 'remote'] }).modes).toEqual(['remote'])
  })

  it('keeps only digits in the salary floor', () => {
    expect(parseFilters({ salaryMin: '$160,000' }).salaryMin).toBe(160000)
    expect(parseFilters({ salaryMin: '' }).salaryMin).toBeNull()
    expect(parseFilters({ salaryMin: 'abc' }).salaryMin).toBeNull()
  })

  it('accepts only a posted window it actually offers', () => {
    expect(parseFilters({ posted: '168' }).postedWithinHours).toBe(168)
    expect(parseFilters({ posted: '3' }).postedWithinHours).toBeNull()
  })

  it('bounds the free-text fields', () => {
    expect(parseFilters({ q: 'x'.repeat(500) }).q).toHaveLength(100)
  })
})

describe('applyFilters', () => {
  it('returns everything when nothing is set', () => {
    expect(applyFilters(JOBS, EMPTY_FILTERS)).toHaveLength(JOBS.length)
  })

  it('matches the query against title, company and skills', () => {
    expect(applyFilters(JOBS, parseFilters({ q: 'designer' })).length).toBeGreaterThan(0)
    expect(applyFilters(JOBS, parseFilters({ q: 'ACME' })).map((j) => j.company)).toEqual([
      'Acme Corp',
    ])
    expect(applyFilters(JOBS, parseFilters({ q: 'terraform' })).map((j) => j.company)).toEqual([
      'CloudScale',
    ])
  })

  it('treats several values of one facet as OR', () => {
    const remote = applyFilters(JOBS, parseFilters({ mode: 'remote' }))
    const both = applyFilters(JOBS, parseFilters({ mode: ['remote', 'onsite'] }))
    expect(both.length).toBeGreaterThan(remote.length)
  })

  it('treats several skills as AND, because a skill filter is a requirement', () => {
    const one = applyFilters(JOBS, parseFilters({ skill: 'Python' }))
    const two = applyFilters(JOBS, parseFilters({ skill: ['Python', 'Kubernetes'] }))
    expect(two.length).toBeLessThan(one.length)
    for (const j of two) {
      expect(j.skills).toContain('Python')
      expect(j.skills).toContain('Kubernetes')
    }
  })

  it('reads a salary floor against the top of the band, not the bottom', () => {
    // "pays at least 200k" should keep a 165k-205k listing: the band reaches it.
    const kept = applyFilters(JOBS, parseFilters({ salaryMin: '200000' }))
    expect(kept.map((j) => j.company).sort()).toEqual(['CloudScale', 'GlobalPay', 'Nexus AI', 'SecureNet'])
  })

  it('filters by how long ago a listing was posted', () => {
    const day = applyFilters(JOBS, parseFilters({ posted: '24' }))
    expect(day.every((j) => j.postedHoursAgo <= 24)).toBe(true)
    expect(day.length).toBeLessThan(JOBS.length)
  })

  it('narrows, never widens, as facets are added', () => {
    const a = applyFilters(JOBS, parseFilters({ mode: 'remote' }))
    const b = applyFilters(JOBS, parseFilters({ mode: 'remote', level: 'lead' }))
    expect(b.length).toBeLessThanOrEqual(a.length)
  })

  it('can return nothing, which the empty state has to handle', () => {
    expect(applyFilters(JOBS, parseFilters({ q: 'zzzz' }))).toEqual([])
  })
})

describe('activeChips', () => {
  it('counts what it shows — the reference says "12 Active Filters" over four chips', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'], level: 'lead', q: 'react' })
    expect(activeCount(f)).toBe(activeChips(f).length)
    expect(activeCount(f)).toBe(4)
  })

  it('does not count the display period, which is a unit and not a filter', () => {
    expect(activeCount(parseFilters({ period: 'monthly' }))).toBe(0)
    expect(activeChips(parseFilters({ period: 'monthly' }))).toEqual([])
  })

  it('labels each chip with its human name rather than its stored value', () => {
    const labels = activeChips(parseFilters({ mode: 'onsite', source: 'linkedin' })).map(
      (c) => c.label,
    )
    expect(labels).toContain('On-site')
    expect(labels).toContain('LinkedIn')
  })

  it('gives each chip a distinct key', () => {
    const chips = activeChips(parseFilters({ mode: ['remote', 'hybrid'], type: 'full-time' }))
    expect(new Set(chips.map((c) => c.key)).size).toBe(chips.length)
  })
})

describe('withoutChip', () => {
  it('removes one value of a facet and leaves its siblings', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'] })
    expect(withoutChip(f, 'mode:remote').modes).toEqual(['hybrid'])
  })

  it('clears a single-valued facet', () => {
    expect(withoutChip(parseFilters({ q: 'react' }), 'q:react').q).toBe('')
    expect(withoutChip(parseFilters({ salaryMin: '160000' }), 'salaryMin:160000').salaryMin).toBeNull()
  })

  it('leaves the state alone for a key it does not know', () => {
    const f = parseFilters({ mode: 'remote' })
    expect(withoutChip(f, 'nonsense:1')).toEqual(f)
  })

  it('removes exactly one chip per call', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'], q: 'react' })
    for (const chip of activeChips(f)) {
      expect(activeCount(withoutChip(f, chip.key))).toBe(activeCount(f) - 1)
    }
  })
})

describe('toQuery', () => {
  it('round-trips every field', () => {
    const f = parseFilters({
      q: 'react',
      location: 'austin',
      fn: 'Engineering',
      industry: 'SaaS',
      mode: ['remote', 'hybrid'],
      type: 'full-time',
      level: 'lead',
      size: 'startup',
      source: 'wellfound',
      skill: ['React', 'TypeScript'],
      salaryMin: '160000',
      posted: '168',
      period: 'monthly',
    })
    expect(parseFilters(rawFromQuery(toQuery(f)))).toEqual(f)
  })

  it('writes nothing for an empty state, so /jobs stays clean', () => {
    expect(toQuery(EMPTY_FILTERS)).toBe('')
  })

  it('omits the default period', () => {
    expect(toQuery(parseFilters({ period: 'yearly' }))).toBe('')
    expect(toQuery(parseFilters({ period: 'hourly' }))).toBe('period=hourly')
  })
})

describe('jobsHref', () => {
  it('is a bare path when there is nothing to carry', () => {
    expect(jobsHref(EMPTY_FILTERS)).toBe('/jobs')
  })

  it('keeps the filters when opening a listing, so closing returns to them', () => {
    const f = parseFilters({ mode: 'remote' })
    expect(jobsHref(f, 'acme-senior-product-designer')).toBe(
      '/jobs?mode=remote&job=acme-senior-product-designer',
    )
  })
})
