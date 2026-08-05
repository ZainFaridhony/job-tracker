import { describe, expect, it } from 'vitest'
import {
  bandFor,
  CAREER_GOALS,
  DEFAULT_CURRENCY,
  EXPERIENCE_BANDS,
  isCurrency,
  SALARY_CURRENCIES,
  SALARY_PERIODS,
  slugForStep,
  stepByNumber,
  stepBySlug,
  STEPS,
  TOTAL_STEPS,
  WORK_LOCATIONS,
} from './steps'

describe('STEPS', () => {
  it('numbers the steps 1..4 with no gaps', () => {
    expect(STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4])
    expect(TOTAL_STEPS).toBe(4)
  })

  it('has a unique slug per step', () => {
    expect(new Set(STEPS.map((s) => s.slug)).size).toBe(STEPS.length)
  })

  it('resolves a slug back to its step', () => {
    expect(stepBySlug('profile')?.n).toBe(2)
    expect(stepBySlug('nope')).toBeUndefined()
  })

  it('resolves a number back to its step', () => {
    expect(stepByNumber(1)?.slug).toBe('resume')
    expect(stepByNumber(5)).toBeUndefined()
  })

  it('does not still offer a retired slug', () => {
    // These four are handled by RETIRED_SLUGS in gate.ts. If one ever comes
    // back as a real step, that redirect would shadow it.
    for (const slug of ['goals', 'roles', 'skills', 'work']) {
      expect(stepBySlug(slug)).toBeUndefined()
    }
  })

  it('stays within the range the onboarding_step check constraint allows', () => {
    // profiles_onboarding_step_check pins 1..4. Adding a step without widening
    // it is a runtime 400 on the last Continue, not a validation message.
    expect(TOTAL_STEPS).toBeLessThanOrEqual(4)
  })

  it('gives the confirm step a copy variant for when the CV yielded nothing', () => {
    const profile = stepBySlug('profile')!
    expect('subNoPrefill' in profile && profile.subNoPrefill.length).toBeGreaterThan(0)
    expect(profile.sub).not.toBe((profile as { subNoPrefill: string }).subNoPrefill)
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
    // The value the six-step wizard would have stored, if a row escaped the
    // migration's remap.
    expect(slugForStep(6)).toBe('done')
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

  it('offers only currencies the database accepts', () => {
    expect(SALARY_CURRENCIES.map((c) => c.value)).toEqual([
      'IDR',
      'USD',
      'SGD',
      'MYR',
      'EUR',
      'GBP',
      'AUD',
      'JPY',
    ])
  })

  it('gives every currency a symbol to display', () => {
    expect(SALARY_CURRENCIES.every((c) => c.symbol.length > 0)).toBe(true)
  })

  it('accepts only the codes it offers', () => {
    expect(isCurrency('IDR')).toBe(true)
    expect(isCurrency('XYZ')).toBe(false)
    expect(isCurrency('idr')).toBe(false)
  })

  it('defaults to a currency that is on the list', () => {
    expect(isCurrency(DEFAULT_CURRENCY)).toBe(true)
  })

  it('gives every option a distinct value and a label', () => {
    for (const set of [
      CAREER_GOALS,
      WORK_LOCATIONS,
      SALARY_PERIODS,
      SALARY_CURRENCIES,
      EXPERIENCE_BANDS,
    ]) {
      expect(new Set(set.map((o) => o.value)).size).toBe(set.length)
      expect(set.every((o) => o.label.length > 0)).toBe(true)
    }
  })
})

describe('EXPERIENCE_BANDS', () => {
  it('partitions the range with no gap and no overlap', () => {
    // The bands as first drawn were 0-2 / 3-5 / 6-10 / 10+, which gives ten
    // years two homes and forces bandFor to contradict one of the two labels.
    const floors = EXPERIENCE_BANDS.map((b) => b.min)
    expect(floors).toEqual([...floors].sort((a, b) => a - b))
    expect(new Set(floors).size).toBe(floors.length)

    // Each label's stated range must start at its own floor and stop just below
    // the next one, so the printed ranges agree with the arithmetic.
    EXPERIENCE_BANDS.forEach((band, i) => {
      const next = EXPERIENCE_BANDS[i + 1]
      const first = Number(band.label.match(/^(\d+)/)![1])
      expect(first).toBe(band.min)
      if (!next) return
      const last = Number(band.label.match(/^\d+-(\d+)/)![1])
      expect(last).toBe(next.min - 1)
    })
  })

  it('stores the floor, so the column stays an int and needs no migration', () => {
    for (const band of EXPERIENCE_BANDS) expect(band.value).toBe(String(band.min))
  })

  it('starts at zero, so nobody with no experience is unrepresented', () => {
    expect(EXPERIENCE_BANDS[0]!.min).toBe(0)
  })
})

describe('bandFor', () => {
  it.each([
    [0, '0-2 years (Entry)'],
    [2, '0-2 years (Entry)'],
    [3, '3-5 years (Intermediate)'],
    [5, '3-5 years (Intermediate)'],
    [6, '6-9 years (Senior)'],
    [9, '6-9 years (Senior)'],
    [10, '10+ years (Expert)'],
    [40, '10+ years (Expert)'],
  ])('buckets %i into %s', (years, label) => {
    expect(bandFor(years)?.label).toBe(label)
  })

  it('buckets the precise figure the model reads from a CV', () => {
    // uploadCvAction stores what Groq read — 7 is the fixture's value — and no
    // band has a floor of 7, so an equality lookup would find nothing.
    expect(bandFor(7)?.value).toBe('6')
  })

  it('has no answer when the question was not answered', () => {
    expect(bandFor(null)).toBeUndefined()
    expect(bandFor(undefined)).toBeUndefined()
  })

  it('refuses a count that is not a real number of years', () => {
    expect(bandFor(-1)).toBeUndefined()
    expect(bandFor(Number.NaN)).toBeUndefined()
  })
})

