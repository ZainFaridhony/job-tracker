import { describe, expect, it } from 'vitest'
import {
  COMPETITION_BANDS,
  COMPETITION_FILTER_LABEL,
  COMPETITION_SEGMENTS,
  competitionFilled,
  competitionFor,
  postedAgo,
  RING,
  ringDash,
  verdictFor,
} from './derive'

describe('COMPETITION_BANDS', () => {
  it('lists every band competitionFor can return, in ascending order', () => {
    // The filter sidebar renders this vocabulary. A band missing from it would
    // be an unreachable filter; a band in it that competitionFor never returns
    // would be a checkbox that can only ever empty the list.
    expect(COMPETITION_BANDS).toEqual(['low', 'medium', 'high'])
    const reachable = new Set([0, 25, 100].map(competitionFor))
    for (const band of COMPETITION_BANDS) expect(reachable, band).toContain(band)
  })

  it('labels a checkbox with the bare band, not the meter caption', () => {
    // COMPETITION_LABEL is written for the meter, where it reads "Low
    // competition" beside an applicant count. Reusing it under a section
    // already titled "Applicant competition" gives "Low competition
    // competition", so the filter gets its own shorter labels.
    expect(COMPETITION_FILTER_LABEL).toEqual({ low: 'Low', medium: 'Medium', high: 'High' })
  })
})

describe('competitionFor', () => {
  it('reproduces the label the reference prints for each of its six cards', () => {
    // The reference never states a rule; it states six pairs. These thresholds
    // are the rule those pairs imply, and this test is what keeps the two
    // agreeing if the corpus is ever re-tuned.
    const reference: Array<[number, string]> = [
      [24, 'low'],
      [12, 'low'],
      [42, 'medium'],
      [67, 'medium'],
      [156, 'high'],
      [186, 'high'],
    ]
    for (const [applicants, band] of reference) {
      expect(competitionFor(applicants), String(applicants)).toBe(band)
    }
  })

  it('places the boundaries themselves', () => {
    expect(competitionFor(0)).toBe('low')
    expect(competitionFor(24)).toBe('low')
    expect(competitionFor(25)).toBe('medium')
    expect(competitionFor(99)).toBe('medium')
    expect(competitionFor(100)).toBe('high')
  })
})

describe('competitionFilled', () => {
  it('fills one segment per band, so the meter is ordinal without colour', () => {
    expect(competitionFilled('low')).toBe(1)
    expect(competitionFilled('medium')).toBe(2)
    expect(competitionFilled('high')).toBe(3)
  })

  it('never fills more segments than the meter draws', () => {
    for (const band of ['low', 'medium', 'high'] as const) {
      expect(competitionFilled(band)).toBeLessThanOrEqual(COMPETITION_SEGMENTS)
    }
  })
})

describe('postedAgo', () => {
  it('steps through the units the card needs', () => {
    expect(postedAgo(0)).toBe('just now')
    expect(postedAgo(2)).toBe('2h ago')
    expect(postedAgo(23)).toBe('23h ago')
    expect(postedAgo(24)).toBe('1d ago')
    expect(postedAgo(96)).toBe('4d ago')
    expect(postedAgo(168)).toBe('1w ago')
    expect(postedAgo(400)).toBe('2w ago')
  })

  it('reads a negative duration as new rather than as the future', () => {
    // Nothing produces one, but "in -3h" on a job card would be worse than
    // rounding it down.
    expect(postedAgo(-3)).toBe('just now')
  })
})

describe('verdictFor', () => {
  it('calls 94% an excellent match, as the reference drawer does', () => {
    expect(verdictFor(94)).toBe('Excellent match')
  })

  it('bands the rest', () => {
    expect(verdictFor(90)).toBe('Excellent match')
    expect(verdictFor(89)).toBe('Strong match')
    expect(verdictFor(80)).toBe('Strong match')
    expect(verdictFor(79)).toBe('Fair match')
    expect(verdictFor(70)).toBe('Fair match')
    expect(verdictFor(69)).toBe('Weak match')
  })
})

describe('ringDash', () => {
  const circumference = 2 * Math.PI * RING.r

  it('draws the arc the score actually says', () => {
    // The reference hardcodes dasharray 150 / dashoffset 15, which is a 90%
    // ring underneath the number 94%.
    const { dasharray, dashoffset } = ringDash(94)
    expect(dasharray).toBeCloseTo(circumference, 5)
    expect(dashoffset).toBeCloseTo(circumference * 0.06, 5)
  })

  it('closes the ring at 100 and empties it at 0', () => {
    expect(ringDash(100).dashoffset).toBeCloseTo(0, 5)
    expect(ringDash(0).dashoffset).toBeCloseTo(circumference, 5)
  })

  it('clamps rather than drawing an arc longer than the circle', () => {
    expect(ringDash(140).dashoffset).toBeCloseTo(0, 5)
    expect(ringDash(-20).dashoffset).toBeCloseTo(circumference, 5)
  })
})
