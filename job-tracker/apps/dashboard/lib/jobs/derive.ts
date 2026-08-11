/**
 * What a listing's raw fields mean, computed rather than stored.
 *
 * Three derivations that the reference hardcodes and then contradicts:
 *
 *   - competition, printed as a Low/Medium/High label beside an applicant
 *     count, with no stated rule. The six pairs it does state imply thresholds
 *     at 25 and 100, and derive.test.ts asserts those thresholds reproduce all
 *     six labels — so the rule is checkable rather than remembered;
 *   - freshness, printed as "2h ago" against no timestamp;
 *   - the match ring, drawn at dasharray 150 / dashoffset 15 — a 90% arc —
 *     underneath the number 94%.
 *
 * COLOUR. The reference paints competition green, amber and red. There is no
 * success token in this palette and inventing one ships a colour no contrast
 * test covers; the reference's own DESIGN.md says to hold the monochrome line
 * "unless absolutely necessary for error handling". So the meter is the
 * encoding: an ordinal quantity gets an ordinal shape, one to three filled
 * segments, beside the word. The error pair is deliberately NOT used — high
 * competition is a fact about the market, not a failure, and the dashboard
 * reserved error for Rejected and Missing skills, which are.
 */

export type CompetitionBand = 'low' | 'medium' | 'high'

/** Lower bound of each band, in applicants. */
export const COMPETITION_THRESHOLDS = { medium: 25, high: 100 } as const

export const COMPETITION_LABEL: Record<CompetitionBand, string> = {
  low: 'Low competition',
  medium: 'Medium competition',
  high: 'High competition',
}

/** How many bars the meter draws. Also the ceiling on `competitionFilled`. */
export const COMPETITION_SEGMENTS = 3

export function competitionFor(applicants: number): CompetitionBand {
  if (applicants >= COMPETITION_THRESHOLDS.high) return 'high'
  if (applicants >= COMPETITION_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export function competitionFilled(band: CompetitionBand): number {
  return band === 'high' ? 3 : band === 'medium' ? 2 : 1
}

/**
 * A duration, not a date.
 *
 * The corpus stores `postedHoursAgo` so the mock does not rot — a hardcoded ISO
 * date reads "posted 7 months ago" a season after it is written, which is the
 * same drift the dashboard's start date has and cannot avoid. Taking hours also
 * keeps every clock out of this module, so nothing here needs a fake timer.
 */
export function postedAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return 'just now'
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ago`
  const days = Math.floor(hoursAgo / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function verdictFor(score: number): string {
  if (score >= 90) return 'Excellent match'
  if (score >= 80) return 'Strong match'
  if (score >= 70) return 'Fair match'
  return 'Weak match'
}

/** Radius and stroke of the drawer's score ring, in user units. */
export const RING = { r: 24, stroke: 4 } as const

export function ringDash(score: number): { dasharray: number; dashoffset: number } {
  const circumference = 2 * Math.PI * RING.r
  const clamped = Math.min(100, Math.max(0, score))
  return { dasharray: circumference, dashoffset: circumference * (1 - clamped / 100) }
}
