import { describe, expect, it } from 'vitest'
import { JOBS } from './data'
import {
  activeChips,
  activeCount,
  applyFilters,
  clearAllHref,
  EMPTY_FILTERS,
  jobsHref,
  parseFilters,
  rawFromQuery,
  toQuery,
  withoutChip,
} from './filters'
import { toBaseCurrency } from './salary'

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

  it('accepts only a competition band it actually offers', () => {
    expect(parseFilters({ comp: 'high' }).competition).toEqual(['high'])
    expect(parseFilters({ comp: ['low', 'nuclear'] }).competition).toEqual(['low'])
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
    // Asserted as a property rather than as an exact list of companies. Naming
    // the matches makes this a test about the corpus, which then fails whenever a
    // listing is added — a change that cannot break the matching rule. The rule
    // is that every survivor contains the query in one of the three fields, and
    // that a real term finds something.
    for (const [term, field] of [
      ['designer', 'title'],
      ['acme', 'company'],
      ['terraform', 'skills'],
    ] as const) {
      const kept = applyFilters(JOBS, parseFilters({ q: term }))
      expect(kept.length, `${term} (${field})`).toBeGreaterThan(0)
      expect(kept.length, `${term} (${field})`).toBeLessThan(JOBS.length)
      for (const j of kept) {
        const haystack = `${j.title} ${j.company} ${j.skills.join(' ')}`.toLowerCase()
        expect(haystack, `${j.id} matched ${term}`).toContain(term)
      }
    }
  })

  it('matches nothing outside those three fields', () => {
    // The city is deliberately not searched by `q` — that is what `location` is
    // for — so a query naming only a city must not narrow on the wrong field.
    const kept = applyFilters(JOBS, parseFilters({ q: 'Atlanta' }))
    for (const j of kept) {
      expect(`${j.title} ${j.company} ${j.skills.join(' ')}`.toLowerCase()).toContain('atlanta')
    }
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
    // Stated as the rule rather than as a list of companies, so adding a listing
    // cannot fail a test about which end of the range is compared.
    const floor = 200_000
    const kept = applyFilters(JOBS, parseFilters({ salaryMin: String(floor) }))

    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(JOBS.length)
    for (const j of kept) expect(j.salary.max, j.id).toBeGreaterThanOrEqual(floor)

    // The whole point: at least one survivor starts BELOW the floor, which is
    // only possible if `max` is what gets compared. Comparing `min` would drop it.
    expect(kept.some((j) => j.salary.min < floor)).toBe(true)
  })

  it('filters by competition band, derived from the applicant count', () => {
    const low = applyFilters(JOBS, parseFilters({ comp: 'low' }))
    expect(low.length).toBeGreaterThan(0)
    expect(low.every((j) => j.applicants < 25)).toBe(true)
  })

  it('treats several competition bands as alternatives, not as an intersection', () => {
    // Unlike skills — where ticking two asks for a listing wanting both — a
    // listing has exactly ONE band, so AND semantics here could only ever
    // return nothing.
    const either = applyFilters(JOBS, parseFilters({ comp: ['low', 'high'] }))
    const low = applyFilters(JOBS, parseFilters({ comp: 'low' }))
    const high = applyFilters(JOBS, parseFilters({ comp: 'high' }))
    expect(either).toHaveLength(low.length + high.length)
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

  it('names a competition chip for the applicant load it means', () => {
    // "High" alone would be a chip that does not say what is high.
    expect(activeChips(parseFilters({ comp: 'high' }))[0]).toEqual({
      key: 'comp:high',
      label: 'High competition',
    })
  })
})

describe('withoutChip', () => {
  it('removes one value of a facet and leaves its siblings', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'] })
    expect(withoutChip(f, 'mode:remote').modes).toEqual(['hybrid'])
  })

  it('removes one competition band and leaves its siblings', () => {
    const f = parseFilters({ comp: ['low', 'high'] })
    expect(withoutChip(f, 'comp:low').competition).toEqual(['high'])
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
      comp: ['low', 'medium'],
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

describe('currency', () => {
  it('validates against the shared vocabulary and falls back to the base', () => {
    expect(parseFilters({ currency: 'IDR' }).currency).toBe('IDR')
    expect(parseFilters({ currency: 'XYZ' }).currency).toBe('USD')
    expect(parseFilters({}).currency).toBe('USD')
  })

  it('produces no chip and is not counted, because it is a unit not a filter', () => {
    // Same rule as `period`. Ticking a display unit should never make the
    // screen claim a filter is narrowing anything.
    expect(activeChips(parseFilters({ currency: 'IDR' }))).toEqual([])
    expect(activeCount(parseFilters({ currency: 'IDR', period: 'monthly' }))).toBe(0)
  })

  it('is omitted from the query when it is the base, and round-trips when it is not', () => {
    expect(toQuery(parseFilters({ currency: 'USD' }))).toBe('')
    expect(toQuery(parseFilters({ currency: 'IDR' }))).toBe('currency=IDR')

    const f = parseFilters({ currency: 'JPY', period: 'monthly', mode: 'remote' })
    expect(parseFilters(rawFromQuery(toQuery(f)))).toEqual(f)
  })

  it('survives Clear all, like the period does', () => {
    const f = parseFilters({ currency: 'IDR', period: 'monthly', mode: 'remote', q: 'react' })
    const cleared = parseFilters(rawFromQuery(clearAllHref(f).replace('/jobs?', '')))
    expect(cleared.currency).toBe('IDR')
    expect(cleared.period).toBe('monthly')
    expect(activeCount(cleared)).toBe(0)
  })

  it('renders the salary chip in the currency it was typed in', () => {
    // The stored figure IS the typed figure — converting it again for display
    // would show a number the reader never entered.
    expect(activeChips(parseFilters({ salaryMin: '3200000000', currency: 'IDR' }))[0]?.label).toBe(
      'Rp3.2B+',
    )
    expect(activeChips(parseFilters({ salaryMin: '160000' }))[0]?.label).toBe('$160k+')
  })
})

describe('applyFilters interprets the salary floor in the chosen currency', () => {
  it('converts the threshold into the corpus base before comparing', () => {
    // 3.2B IDR is about $202.5k. Asserted against the converted figure rather
    // than a list of companies: the corpus is placeholder data and the rate table
    // is invented, so both are free to change without the rule changing.
    const typed = 3_200_000_000
    const kept = applyFilters(JOBS, parseFilters({ salaryMin: String(typed), currency: 'IDR' }))
    const floor = toBaseCurrency(typed, 'IDR')

    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(JOBS.length)
    for (const j of kept) expect(j.salary.max, j.id).toBeGreaterThanOrEqual(floor)
    // Not converting would compare 3.2 BILLION against a USD band and keep nothing.
    expect(floor).toBeLessThan(typed)
  })

  it('reads the same number differently under a different currency', () => {
    // This is the consequence of the input being denominated in the displayed
    // currency, and why the field's label names it. 3.2 billion dollars is a
    // floor nothing reaches; 3.2 billion rupiah is an ordinary salary.
    const raw = { salaryMin: '3200000000' }
    expect(applyFilters(JOBS, parseFilters({ ...raw, currency: 'USD' }))).toEqual([])
    expect(applyFilters(JOBS, parseFilters({ ...raw, currency: 'IDR' })).length).toBeGreaterThan(0)
  })

  it('agrees with itself when one floor is expressed two ways', () => {
    const usd = applyFilters(JOBS, parseFilters({ salaryMin: '202600', currency: 'USD' }))
    const idr = applyFilters(JOBS, parseFilters({ salaryMin: '3201080000', currency: 'IDR' }))
    expect(idr.map((j) => j.id)).toEqual(usd.map((j) => j.id))
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

  it('encodes an id that needs it, and round-trips back through parseFilters', () => {
    const id = 'weird id/with?chars&stuff'
    const href = jobsHref(EMPTY_FILTERS, id)
    expect(href).toBe('/jobs?job=weird%20id%2Fwith%3Fchars%26stuff')

    const query = href.slice('/jobs?'.length)
    const raw = rawFromQuery(query)
    expect(raw.job).toBe(id)
  })
})

describe('clearAllHref', () => {
  it('clears every filter but keeps the chosen salary period', () => {
    const f = parseFilters({ mode: 'remote', level: 'lead', q: 'react', period: 'monthly' })
    expect(clearAllHref(f)).toBe('/jobs?period=monthly')
  })

  it('is a bare /jobs when the period is already the default', () => {
    expect(clearAllHref(parseFilters({ mode: 'remote', level: 'lead' }))).toBe('/jobs')
  })
})
