import { describe, expect, it } from 'vitest'
import {
  APPLIED,
  barHeights,
  daysSince,
  delta,
  INTERVIEWED,
  PERFORMANCE_SUMMARY,
  PIPELINE,
  rate,
  SCHEDULED,
  THIS_WEEK,
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

  it('returns zero rather than Infinity when there is no baseline', () => {
    expect(delta(5, 0)).toBe(0)
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
