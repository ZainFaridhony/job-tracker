import { describe, expect, it } from 'vitest'
import { formatAmount, formatRange, isSalaryPeriod, perPeriod } from './salary'

describe('perPeriod', () => {
  it('divides a yearly figure by the right denominator', () => {
    expect(perPeriod(120_000, 'yearly')).toBe(120_000)
    expect(perPeriod(120_000, 'monthly')).toBe(10_000)
    // 2080 = 40 hours x 52 weeks, the convention every US posting uses.
    expect(perPeriod(208_000, 'hourly')).toBe(100)
  })
})

describe('formatAmount', () => {
  it('rounds yearly to whole thousands, because the cents are noise', () => {
    expect(formatAmount(140_000, 'yearly')).toBe('$140k')
    expect(formatAmount(195_000, 'yearly')).toBe('$195k')
  })

  it('keeps one decimal monthly, where whole thousands would collapse the band', () => {
    // 140k and 145k are both "$12k" at zero decimals, which loses the range.
    expect(formatAmount(140_000, 'monthly')).toBe('$11.7k')
    expect(formatAmount(180_000, 'monthly')).toBe('$15.0k')
  })

  it('shows whole dollars hourly', () => {
    expect(formatAmount(140_000, 'hourly')).toBe('$67')
    expect(formatAmount(180_000, 'hourly')).toBe('$87')
  })
})

describe('formatRange', () => {
  it('renders the card chip at each period from one stored range', () => {
    const range = { min: 140_000, max: 180_000 }
    expect(formatRange(range, 'yearly')).toBe('$140k – $180k / yr')
    expect(formatRange(range, 'monthly')).toBe('$11.7k – $15.0k / mo')
    expect(formatRange(range, 'hourly')).toBe('$67 – $87 / hr')
  })
})

describe('isSalaryPeriod', () => {
  it('accepts the three periods and rejects anything else', () => {
    expect(isSalaryPeriod('monthly')).toBe(true)
    expect(isSalaryPeriod('weekly')).toBe(false)
    expect(isSalaryPeriod('')).toBe(false)
  })
})
