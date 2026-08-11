import type { SalaryRange } from './data'
import { SALARY_CURRENCIES } from '../onboarding/steps'

/**
 * One stored yearly range, shown at whichever period and currency the reader
 * picked.
 *
 * The reference puts a Yearly | Monthly | Hourly toggle above six cards that
 * every one of them label "/ yr" — the control is decoration. Storing yearly
 * and computing the rest is what makes the toggle do something, and it is the
 * same reason the dashboard derives its headline figures from PIPELINE rather
 * than repeating them. Currency is the same kind of control: a display unit,
 * not a filter, so it changes how every figure reads and never changes which
 * listings survive.
 *
 * The currency vocabulary is imported rather than restated. `steps.ts` already
 * owns the eight codes and their symbols for the onboarding wizard, and a
 * second list here would be a second place to add the ninth.
 */

export type SalaryPeriod = 'yearly' | 'monthly' | 'hourly'

export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number]['value']

export const SALARY_PERIODS = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'hourly', label: 'Hourly' },
] as const satisfies readonly { value: SalaryPeriod; label: string }[]

/** The currency every listing in the corpus is denominated in. `RATES`
 *  converts out of it, so this is the one code that needs no conversion and
 *  the natural default for the display toggle. */
export const BASE_CURRENCY = 'USD' satisfies SalaryCurrency

/** 40 hours x 52 weeks. The convention, not an estimate. */
export const HOURS_PER_YEAR = 2080

/**
 * Units of each currency per 1 USD.
 *
 * INDICATIVE PLACEHOLDER RATES. Nothing fetches these, nothing updates them,
 * and no decision should rest on them. They exist so the currency toggle shows
 * plausible magnitudes over a corpus that is itself invented — they have
 * exactly the standing the listings do. A real implementation reads a rate feed
 * and records the date the rate was taken, because a salary converted at an
 * unstated rate on an unstated day is worse than one left in its own currency.
 *
 * Typed as an exhaustive `Record`, so adding a ninth code to SALARY_CURRENCIES
 * fails to compile until it has a rate here rather than silently converting it
 * at 1:1.
 */
const RATES: Record<SalaryCurrency, number> = {
  USD: 1,
  IDR: 15_800,
  SGD: 1.34,
  MYR: 4.45,
  EUR: 0.92,
  GBP: 0.78,
  AUD: 1.5,
  JPY: 151,
}

const SUFFIX: Record<SalaryPeriod, string> = {
  yearly: '/ yr',
  monthly: '/ mo',
  hourly: '/ hr',
}

/** Derived from the shared list rather than a second table, so a symbol cannot
 *  drift from the code it belongs to. */
function symbolFor(currency: SalaryCurrency): string {
  return SALARY_CURRENCIES.find((c) => c.value === currency)?.symbol ?? ''
}

export function isSalaryPeriod(value: string): value is SalaryPeriod {
  return value === 'yearly' || value === 'monthly' || value === 'hourly'
}

export function isSalaryCurrency(value: string): value is SalaryCurrency {
  return SALARY_CURRENCIES.some((c) => c.value === value)
}

export function perPeriod(yearly: number, period: SalaryPeriod): number {
  if (period === 'monthly') return yearly / 12
  if (period === 'hourly') return yearly / HOURS_PER_YEAR
  return yearly
}

/** Out of the base currency, for display. */
export function inCurrency(amount: number, currency: SalaryCurrency): number {
  return amount * RATES[currency]
}

/** Back into the base currency, for comparison against the corpus. The salary
 *  floor is typed in whatever currency is on screen, and every listing is
 *  stored in `BASE_CURRENCY`, so one side has to move before they can be
 *  compared — and moving the single threshold is cheaper and lossless-er than
 *  moving every listing. */
export function toBaseCurrency(amount: number, currency: SalaryCurrency): number {
  return amount / RATES[currency]
}

/**
 * One magnitude tier of the compact form.
 *
 * Below a mantissa of 100 it keeps one decimal, above it rounds whole. That is
 * what stops a band collapsing: 140k and 145k are both "$12k" a month at zero
 * decimals, which reads as a bug rather than as a range.
 *
 * The rounding decision is made on the ORIGINAL figure, never on the mantissa.
 * `Math.round(mantissa * 10)` reintroduces exactly the binary tie this avoids —
 * 3.65 is stored fractionally short of 3.65, so that expression answers 36 and
 * prints "3.6" where the honest answer is "3.7".
 */
function tier(value: number, unit: number, suffix: string): string {
  const mantissa = value / unit
  if (Math.abs(mantissa) >= 100) return `${Math.round(mantissa)}${suffix}`
  return `${(Math.round(value / (unit / 10)) / 10).toFixed(1)}${suffix}`
}

/**
 * A figure already denominated in `currency`, rendered.
 *
 * The unit is chosen by magnitude, not by period. The old rule keyed it off the
 * period — `k` for yearly and monthly, bare units hourly — which only held
 * because every figure was USD. One hour of a senior salary in IDR is about
 * 1,060,000, and "Rp1063461 / hr" is not a number anyone reads. Picking the
 * unit from the size of the number handles every currency with one rule.
 *
 * Exported because the salary floor is typed in the displayed currency and so
 * arrives here already converted; `formatAmount` below is for the other case,
 * a stored base-currency figure that still has to be converted.
 */
export function formatFigure(
  value: number,
  currency: SalaryCurrency = BASE_CURRENCY,
): string {
  const symbol = symbolFor(currency)
  const abs = Math.abs(value)

  if (abs >= 1_000_000_000) return symbol + tier(value, 1_000_000_000, 'B')
  if (abs >= 1_000_000) return symbol + tier(value, 1_000_000, 'M')
  if (abs >= 1_000) return symbol + tier(value, 1_000, 'k')
  // Below a thousand the fractions are noise — nobody negotiates an hourly rate
  // to the cent, and a decimal here only makes the chip wider.
  return symbol + String(Math.round(value))
}

/** A stored yearly base-currency figure, at the reader's period and currency. */
export function formatAmount(
  yearly: number,
  period: SalaryPeriod,
  currency: SalaryCurrency = BASE_CURRENCY,
): string {
  return formatFigure(inCurrency(perPeriod(yearly, period), currency), currency)
}

/** En dash with spaces, which is the range dash — a hyphen here reads as a
 *  minus sign against currency. */
export function formatRange(
  range: SalaryRange,
  period: SalaryPeriod,
  currency: SalaryCurrency = BASE_CURRENCY,
): string {
  return (
    `${formatAmount(range.min, period, currency)} – ` +
    `${formatAmount(range.max, period, currency)} ${SUFFIX[period]}`
  )
}
