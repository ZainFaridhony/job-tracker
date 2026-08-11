import type { SalaryRange } from './data'

/**
 * One stored yearly range, shown at whichever period the reader picked.
 *
 * The reference puts a Yearly | Monthly | Hourly toggle above six cards that
 * every one of them label "/ yr" — the control is decoration. Storing yearly
 * and computing the rest is what makes the toggle do something, and it is the
 * same reason the dashboard derives its headline figures from PIPELINE rather
 * than repeating them.
 *
 * Rounding differs by period on purpose. At whole thousands a monthly band of
 * $140k–$145k collapses to "$12k – $12k", which reads as a bug; one decimal
 * keeps the band visible. Hourly is small enough that thousands are useless and
 * whole dollars are exact enough.
 */

export type SalaryPeriod = 'yearly' | 'monthly' | 'hourly'

export const SALARY_PERIODS = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'hourly', label: 'Hourly' },
] as const satisfies readonly { value: SalaryPeriod; label: string }[]

/** 40 hours x 52 weeks. The convention, not an estimate. */
export const HOURS_PER_YEAR = 2080

const SUFFIX: Record<SalaryPeriod, string> = {
  yearly: '/ yr',
  monthly: '/ mo',
  hourly: '/ hr',
}

export function isSalaryPeriod(value: string): value is SalaryPeriod {
  return value === 'yearly' || value === 'monthly' || value === 'hourly'
}

export function perPeriod(yearly: number, period: SalaryPeriod): number {
  if (period === 'monthly') return yearly / 12
  if (period === 'hourly') return yearly / HOURS_PER_YEAR
  return yearly
}

export function formatAmount(yearly: number, period: SalaryPeriod): string {
  const value = perPeriod(yearly, period)
  if (period === 'hourly') return `$${Math.round(value)}`
  // Round with integer-safe arithmetic first (value / 100, then round to nearest
  // tenth) before passing to toFixed for display. Deciding the rounding in binary
  // floating point — (value / 1000).toFixed(1) — loses ties: 43800/12/1000 is
  // exactly 3.65, and toFixed rounds it to "3.6" instead of "3.7".
  if (period === 'monthly') return `$${(Math.round(value / 100) / 10).toFixed(1)}k`
  return `$${Math.round(value / 1000)}k`
}

/** En dash with spaces, which is the range dash — a hyphen here reads as a
 *  minus sign against currency. */
export function formatRange(range: SalaryRange, period: SalaryPeriod): string {
  return `${formatAmount(range.min, period)} – ${formatAmount(range.max, period)} ${SUFFIX[period]}`
}
