import { describe, expect, it } from 'vitest'
import { SALARY_CURRENCIES } from '../onboarding/steps'
import {
  BASE_CURRENCY,
  formatAmount,
  formatRange,
  inCurrency,
  isSalaryCurrency,
  isSalaryPeriod,
  perPeriod,
  toBaseCurrency,
} from './salary'

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

  it('rounds a tie up, where binary floating point would round it down', () => {
    // (v / 1000).toFixed(1) decides the rounding in binary, and one-decimal
    // ties are almost never exactly representable — 43800/12/1000 is exactly
    // 3.65 and toFixed(1) answers "3.6". The integer-safe form is what makes
    // the decision before the value reaches toFixed.
    expect(formatAmount(43_800, 'monthly')).toBe('$3.7k')
    expect(formatAmount(142_200, 'monthly')).toBe('$11.9k')
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

describe('formatAmount, in a currency', () => {
  it('leaves the base currency alone, and defaults to it', () => {
    expect(formatAmount(140_000, 'yearly', 'USD')).toBe('$140k')
    expect(formatAmount(140_000, 'yearly')).toBe(formatAmount(140_000, 'yearly', 'USD'))
  })

  it('picks the unit from the magnitude, not from the period', () => {
    // This is the whole reason the rule changed. Keying the unit off the period
    // — k for yearly, bare units hourly — only held while every figure was USD.
    // The same salary in IDR is billions a year and still over a million an
    // hour, so that rule would print "Rp2212000k / yr" and "Rp1063462 / hr".
    expect(formatAmount(140_000, 'yearly', 'IDR')).toBe('Rp2.2B')
    expect(formatAmount(140_000, 'monthly', 'IDR')).toBe('Rp184M')
    expect(formatAmount(140_000, 'hourly', 'IDR')).toBe('Rp1.1M')
  })

  it('keeps one decimal below a mantissa of 100 and rounds whole above it', () => {
    // Both halves of one rule: 2.212B needs the decimal to stay distinct from
    // 2.8B, and 184.3M does not need it at all.
    expect(formatAmount(140_000, 'yearly', 'IDR')).toBe('Rp2.2B')
    expect(formatAmount(140_000, 'monthly', 'IDR')).toBe('Rp184M')
  })

  it('carries each currency its own symbol', () => {
    expect(formatAmount(140_000, 'yearly', 'JPY')).toBe('¥21.1M')
    expect(formatAmount(140_000, 'yearly', 'EUR')).toBe('€129k')
    expect(formatAmount(140_000, 'yearly', 'SGD')).toBe('S$188k')
  })

  it('renders a band at the reader’s currency without collapsing it', () => {
    const range = { min: 140_000, max: 180_000 }
    expect(formatRange(range, 'yearly', 'IDR')).toBe('Rp2.2B – Rp2.8B / yr')
  })
})

describe('inCurrency / toBaseCurrency', () => {
  it('round-trips every currency', () => {
    for (const c of SALARY_CURRENCIES) {
      expect(toBaseCurrency(inCurrency(160_000, c.value), c.value), c.value).toBeCloseTo(
        160_000,
        6,
      )
    }
  })

  it('is the identity for the base currency, exactly rather than nearly', () => {
    expect(inCurrency(160_000, BASE_CURRENCY)).toBe(160_000)
    expect(toBaseCurrency(160_000, BASE_CURRENCY)).toBe(160_000)
  })

  it('moves the threshold, not the corpus', () => {
    // A floor typed as 2_000_000_000 IDR is about $126.6k, which is what the
    // listings are compared against — see applyFilters.
    expect(toBaseCurrency(2_000_000_000, 'IDR')).toBeCloseTo(126_582.28, 2)
  })
})

describe('isSalaryCurrency', () => {
  it('accepts the shared vocabulary and rejects anything else', () => {
    expect(isSalaryCurrency('IDR')).toBe(true)
    expect(isSalaryCurrency('USD')).toBe(true)
    expect(isSalaryCurrency('XYZ')).toBe(false)
    expect(isSalaryCurrency('')).toBe(false)
  })

  it('agrees with the onboarding vocabulary it borrows, code for code', () => {
    // The list is imported rather than restated precisely so these cannot
    // drift; this is what would catch it if someone restated it anyway.
    for (const c of SALARY_CURRENCIES) expect(isSalaryCurrency(c.value), c.value).toBe(true)
  })
})
