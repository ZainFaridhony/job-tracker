import { describe, expect, it } from 'vitest'
import {
  APPLIED,
  barHeights,
  daysSince,
  delta,
  healthBand,
  INTERVIEWED,
  PERFORMANCE_SUMMARY,
  PIPELINE,
  rate,
  RESUME_HEALTH,
  SCHEDULED,
  THIS_WEEK,
  trendSummary,
  weekOverWeek,
  WEEKS,
} from './dummy'

describe('the pipeline is the single source', () => {
  it('exposes each headline figure from the funnel rather than a second literal', () => {
    // The reference prints "6 Scheduled Interviews" above a pipeline reading
    // "Scheduled 8". Deriving is what stops that reappearing the next time
    // someone edits one of the two.
    const byKey = Object.fromEntries(PIPELINE.map((s) => [s.key, s.count]))
    expect(APPLIED).toBe(byKey['applied'])
    expect(SCHEDULED).toBe(byKey['scheduled'])
    expect(INTERVIEWED).toBe(byKey['interviewed'])
  })

  it('names every stage distinctly and counts nothing negative', () => {
    expect(new Set(PIPELINE.map((s) => s.key)).size).toBe(PIPELINE.length)
    expect(PIPELINE.every((s) => s.count >= 0)).toBe(true)
  })

  it('marks exactly one stage as the win and one as negative', () => {
    expect(PIPELINE.filter((s) => s.tone === 'win')).toHaveLength(1)
    expect(PIPELINE.filter((s) => s.tone === 'negative')).toHaveLength(1)
  })
})

describe('rate', () => {
  it('keeps the decimal that distinguishes 3.5% from 5.6%', () => {
    expect(rate(5, 142)).toBe('3.5%')
    expect(rate(8, 142)).toBe('5.6%')
  })

  it('does not divide by zero', () => {
    expect(rate(3, 0)).toBe('0%')
  })
})

describe('delta', () => {
  it('reports whole-percent change against the previous value', () => {
    expect(delta(18, 15)).toBe(20)
    expect(delta(9, 28)).toBe(-68)
  })

  it('reports no percentage at all when there is no baseline to compare against', () => {
    // It used to return 0, which reads as "no change" rather than "no previous
    // week". Invisible until the tooltip started printing the baseline beside
    // it, at which point "+0%" over "Last week: 0 applications" is a lie.
    expect(delta(5, 0)).toBeNull()
  })
})

describe('weekOverWeek', () => {
  it('carries both counts and the signed difference, not only the percentage', () => {
    // The tooltip shows the working, so the working has to be in the value.
    expect(weekOverWeek(18, 15)).toEqual({
      current: 18,
      previous: 15,
      difference: 3,
      percent: 20,
      direction: 'up',
    })
  })

  it('reads a fall as down, with the difference and percentage both negative', () => {
    expect(weekOverWeek(9, 28)).toEqual({
      current: 9,
      previous: 28,
      difference: -19,
      percent: -68,
      direction: 'down',
    })
  })

  it('calls an unchanged week flat rather than a rise of nothing', () => {
    expect(weekOverWeek(15, 15)).toMatchObject({ direction: 'flat', percent: 0, difference: 0 })
  })

  it('has no direction and no percentage when there is no previous week', () => {
    expect(weekOverWeek(5, 0)).toMatchObject({ direction: 'none', percent: null, difference: 5 })
  })

  it('agrees with delta, so the badge and the tooltip cannot print different numbers', () => {
    expect(weekOverWeek(18, 15).percent).toBe(delta(18, 15))
    expect(weekOverWeek(9, 28).percent).toBe(delta(9, 28))
  })

  it('summarises the change in words, so the badge has an accessible name', () => {
    expect(trendSummary(weekOverWeek(18, 15), 'application')).toBe(
      '3 more applications than last week',
    )
    expect(trendSummary(weekOverWeek(9, 28), 'application')).toBe(
      '19 fewer applications than last week',
    )
  })

  it('says one application, not one applications', () => {
    expect(trendSummary(weekOverWeek(16, 15), 'application')).toBe(
      '1 more application than last week',
    )
  })

  it('does not dress an unchanged week up as a change', () => {
    expect(trendSummary(weekOverWeek(15, 15), 'application')).toBe('the same as last week')
  })

  it('says plainly that there is nothing to compare against', () => {
    expect(trendSummary(weekOverWeek(5, 0), 'application')).toBe('no previous week to compare')
  })

  it('compares this week against the last completed week of the chart', () => {
    // The reference prints 22%, a tooltip reading "vs 14 apps last week", and a
    // chart whose final bar is 15 — three figures, no two of which agree. The
    // baseline is the chart's own last week, so the card and the chart cannot
    // drift apart the way those did.
    const trend = weekOverWeek(THIS_WEEK, WEEKS.at(-1)!.count)
    expect(trend.previous).toBe(WEEKS.at(-1)!.count)
    expect(trend.percent).toBe(20)
  })
})

describe('healthBand', () => {
  it('calls the shipped 91 excellent, as the reference chip does', () => {
    expect(healthBand(RESUME_HEALTH.score)).toEqual({ label: 'Excellent', tone: 'success' })
  })

  it('bands on 80 and 50, inclusive at the top of each band', () => {
    // The boundaries are the whole risk in a banding function, so both sides of
    // both of them are pinned rather than sampled from the middle.
    expect(healthBand(80).label).toBe('Excellent')
    expect(healthBand(79).label).toBe('Warning')
    expect(healthBand(50).label).toBe('Warning')
    expect(healthBand(49).label).toBe('Critical')
  })

  it('holds at the ends of the scale', () => {
    expect(healthBand(100).tone).toBe('success')
    expect(healthBand(0).tone).toBe('error')
  })

  it('gives each band its own tone, so the colour cannot drift from the word', () => {
    expect(healthBand(91).tone).toBe('success')
    expect(healthBand(60).tone).toBe('warning')
    expect(healthBand(20).tone).toBe('error')
  })

  it('gives every optimisation tip a reason, since each one asks for real work', () => {
    // The tip is a recommendation the reader may act on for weeks. A tip with a
    // percentage and no stated reason is the screen asserting authority it has
    // not shown its working for, so the reason is required rather than optional.
    for (const tip of RESUME_HEALTH.tips) {
      expect(tip.reason, tip.label).toBeTruthy()
    }
  })

  it('keys the tips by a label that is actually unique', () => {
    const labels = RESUME_HEALTH.tips.map((t) => t.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('is the only source of the verdict, which is no longer stored beside the score', () => {
    // `score: 91` and `verdict: 'Excellent'` used to be two independent
    // literals; editing one left the other asserting the opposite.
    expect(RESUME_HEALTH).not.toHaveProperty('verdict')
  })
})

describe('barHeights', () => {
  it('scales to the tallest bar', () => {
    expect(barHeights([28, 14, 7])).toEqual([100, 50, 25])
  })

  it('floors the smallest bar so a quiet week is not mistaken for missing data', () => {
    const [small] = barHeights([1, 100], 8)
    expect(small).toBe(8)
  })

  it('survives an all-zero series', () => {
    expect(barHeights([0, 0])).toEqual([8, 8])
  })
})

describe('daysSince', () => {
  it('counts whole days between two dates', () => {
    expect(daysSince('2026-01-12', new Date('2026-08-08T13:00:00Z'))).toBe(208)
  })

  it('is zero on the start date, and never negative before it', () => {
    expect(daysSince('2026-01-12', new Date('2026-01-12T23:59:00Z'))).toBe(0)
    expect(daysSince('2026-01-12', new Date('2026-01-01T00:00:00Z'))).toBe(0)
  })

  it('ignores the time of day, so the figure does not move mid-afternoon', () => {
    const morning = daysSince('2026-01-12', new Date('2026-08-08T00:01:00Z'))
    const evening = daysSince('2026-01-12', new Date('2026-08-08T23:59:00Z'))
    expect(morning).toBe(evening)
  })
})

describe('the week series', () => {
  it('plots six completed weeks, with the current week outside them', () => {
    // The reference's "18 this week" over a chart ending at 15 only reconciles
    // if the current week is a seventh, not the sixth bar.
    expect(WEEKS).toHaveLength(6)
    expect(THIS_WEEK).not.toBe(WEEKS.at(-1)!.count)
  })

  it('labels every week uniquely', () => {
    expect(new Set(WEEKS.map((w) => w.label)).size).toBe(WEEKS.length)
  })
})

describe('the performance summary', () => {
  it('takes the interview rate from the pipeline, not from a literal', () => {
    const tile = PERFORMANCE_SUMMARY.find((t) => t.label === 'Interview rate')!
    expect(tile.value).toBe(rate(SCHEDULED, APPLIED))
  })

  it('gives every tile a distinct label', () => {
    expect(new Set(PERFORMANCE_SUMMARY.map((t) => t.label)).size).toBe(
      PERFORMANCE_SUMMARY.length,
    )
  })
})
