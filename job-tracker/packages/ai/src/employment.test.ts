import { describe, expect, it } from 'vitest'
import { yearsOfExperience, type EmploymentPeriod } from './employment'

/** Fixed so the result never moves with the clock. */
const TODAY = new Date('2026-08-05T00:00:00Z')

function years(periods: EmploymentPeriod[], stated: number | null = null): number | null {
  return yearsOfExperience({ periods, stated, today: TODAY })
}

describe('yearsOfExperience', () => {
  it('counts a closed period inclusively, in whole years', () => {
    // Jan 2018 through Dec 2021 is four calendar years of employment, which is
    // what a CV writing "2018 - 2021" is claiming.
    expect(years([{ start: '2018', end: '2021' }])).toBe(4)
  })

  it('keeps the month when the CV gives one', () => {
    // Mar 2018 through Jun 2021 is 40 months.
    expect(years([{ start: '2018-03', end: '2021-06' }])).toBe(3)
  })

  it('counts a single year as a year, not as nothing', () => {
    expect(years([{ start: '2020', end: '2020' }])).toBe(1)
  })

  it('runs an ongoing role up to today', () => {
    // Mar 2018 through Aug 2026 is 102 months.
    expect(years([{ start: '2018-03', end: 'present' }])).toBe(8)
  })

  it.each(['present', 'Present', 'current', 'now', 'ongoing', ' Today '])(
    'treats %s as ongoing',
    (end) => {
      expect(years([{ start: '2024-08', end }])).toBe(2)
    },
  )

  it('treats a missing end as ongoing rather than as unreadable', () => {
    expect(years([{ start: '2024-08', end: null }])).toBe(2)
  })
})

describe('overlapping roles', () => {
  it('merges an overlap instead of double-counting it', () => {
    // A promotion recorded as two rows over the same span. Summing gives 8 years
    // for 4 years of work.
    expect(
      years([
        { start: '2018', end: '2021' },
        { start: '2018', end: '2021' },
      ]),
    ).toBe(4)
  })

  it('merges partial overlap to the union', () => {
    // Jan 2018 to Dec 2022 is five years, not the six that summing would give.
    expect(
      years([
        { start: '2018', end: '2021' },
        { start: '2020', end: '2022' },
      ]),
    ).toBe(5)
  })

  it('treats a clean handover as continuous employment', () => {
    // Left in June, started in July. That is not a one-month career break.
    expect(
      years([
        { start: '2018-01', end: '2021-06' },
        { start: '2021-07', end: '2024-12' },
      ]),
    ).toBe(7)
  })

  it('merges a role that sits entirely inside another', () => {
    expect(
      years([
        { start: '2015', end: '2025' },
        { start: '2018', end: '2020' },
      ]),
    ).toBe(11)
  })

  it('does not depend on the order the roles arrive in', () => {
    const a = years([
      { start: '2021-07', end: '2024-12' },
      { start: '2018-01', end: '2021-06' },
    ])
    const b = years([
      { start: '2018-01', end: '2021-06' },
      { start: '2021-07', end: '2024-12' },
    ])
    expect(a).toBe(b)
  })
})

describe('career gaps', () => {
  it('does not count a break as experience', () => {
    // Two years worked, two years out, two years worked. Last-start-minus-today
    // would say six; the answer is four.
    expect(
      years([
        { start: '2018-01', end: '2019-12' },
        { start: '2022-01', end: '2023-12' },
      ]),
    ).toBe(4)
  })
})

describe('input the model got wrong', () => {
  it('ignores a period with no start', () => {
    expect(years([{ start: null, end: '2021' }])).toBeNull()
  })

  it.each(['', 'nope', '20', '2018-13', '2018-00', 'Jan 2018', '18-03'])(
    'ignores an unparseable start (%s)',
    (start) => {
      expect(years([{ start, end: '2021' }])).toBeNull()
    },
  )

  it('ignores an unparseable end rather than treating it as today', () => {
    // Silently reading it as ongoing would invent years the CV never claimed.
    expect(years([{ start: '2018', end: 'sometime' }])).toBeNull()
  })

  it('ignores an end before its start', () => {
    expect(years([{ start: '2021', end: '2018' }])).toBeNull()
  })

  it('ignores a start in the future', () => {
    expect(years([{ start: '2030', end: 'present' }])).toBeNull()
  })

  it('clamps an ongoing role to today rather than to a future end date', () => {
    expect(years([{ start: '2024-08', end: '2099' }])).toBe(2)
  })

  it('rejects a year outside a working lifetime', () => {
    expect(years([{ start: '1849', end: '1900' }])).toBeNull()
  })

  it('keeps the readable periods when only some are broken', () => {
    expect(
      years([
        { start: 'nonsense', end: '2021' },
        { start: '2018', end: '2021' },
      ]),
    ).toBe(4)
  })
})

describe('falling back to a stated total', () => {
  it('uses the stated years when no period could be read', () => {
    // "8 years of experience" in a summary, with no dated history.
    expect(years([], 8)).toBe(8)
  })

  it('prefers the computed total over the stated one', () => {
    // The dates are evidence; the summary line is a claim.
    expect(years([{ start: '2018', end: '2021' }], 15)).toBe(4)
  })

  it.each([-1, 61, 4.5, Number.NaN])('rejects an implausible stated total (%s)', (stated) => {
    expect(years([], stated)).toBeNull()
  })

  it('returns null when there is neither a period nor a stated total', () => {
    expect(years([])).toBeNull()
  })
})

describe('bounds', () => {
  it('reports zero for a few months of work, not null', () => {
    // A fresh graduate with one internship has zero years, which is an answer.
    // Null would mean "unknown" and would clear the field.
    expect(years([{ start: '2026-06', end: '2026-08' }])).toBe(0)
  })

  it('caps at the ceiling the column and the bands allow', () => {
    expect(years([{ start: '1950', end: 'present' }])).toBe(60)
  })

  it('defaults to the real clock when no date is injected', () => {
    // Only that it produces something sane, since this one does move.
    const out = yearsOfExperience({ periods: [{ start: '2020-01', end: 'present' }] })
    expect(out).toBeGreaterThanOrEqual(5)
    expect(out).toBeLessThanOrEqual(60)
  })
})
