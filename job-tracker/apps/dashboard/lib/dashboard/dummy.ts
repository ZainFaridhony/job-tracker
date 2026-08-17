/**
 * Placeholder data for the dashboard, and the arithmetic that keeps it honest.
 *
 * Everything here is invented. What is NOT invented is the relationship between
 * the numbers: each headline figure is derived from one source rather than typed
 * out twice, because the reference design contradicts itself where it does the
 * latter, and a mock that disagrees with itself reads as a broken build during
 * review.
 *
 * The three disagreements, for the record:
 *
 *   - the stat row says "6 Scheduled Interviews" while the pipeline directly
 *     below it says "Scheduled 8";
 *   - the hero says "18 Applications This Week" while the six-week chart ends on
 *     15, with no seventh bar to be the current week;
 *   - the hero says "184 Days" and "Since Jan 12, 2026", which are 24 days apart.
 *
 * There is a fourth thing that looks like a contradiction and is not: "Interview
 * Conversion 3.5%" and "Interview Rate 5.6%" are two different measures —
 * interviewed/applied and scheduled/applied — sharing almost the same name. Both
 * are computed below and labelled so the difference is visible.
 *
 * Lives in lib/ rather than beside the components on purpose: this workspace's
 * vitest is node-only and scoped to lib/**, so anything here can be tested and
 * anything in components/ cannot. See the harness note in CLAUDE.md.
 */

export type PipelineTone = 'neutral' | 'current' | 'negative' | 'win'

export type PipelineStage = {
  key: string
  label: string
  count: number
  tone: PipelineTone
}

/**
 * The funnel, and the single source for every count on the page.
 *
 * Deliberately not a partition — the stages do not sum to `applied`, and should
 * not: an application sitting in Review has not left the 142, and Rejected spans
 * every stage it could have been rejected from. Anything asserting a sum here
 * would be asserting a fiction.
 */
export const PIPELINE: readonly PipelineStage[] = [
  { key: 'applied', label: 'Applied', count: 142, tone: 'neutral' },
  { key: 'review', label: 'Review', count: 24, tone: 'neutral' },
  { key: 'scheduled', label: 'Scheduled', count: 8, tone: 'current' },
  { key: 'interviewed', label: 'Interviewed', count: 5, tone: 'neutral' },
  { key: 'rejected', label: 'Rejected', count: 101, tone: 'negative' },
  { key: 'offers', label: 'Offers', count: 2, tone: 'win' },
]

function stage(key: string): number {
  const found = PIPELINE.find((s) => s.key === key)
  if (!found) throw new Error(`unknown pipeline stage: ${key}`)
  return found.count
}

export const APPLIED = stage('applied')
export const UNDER_REVIEW = stage('review')
export const SCHEDULED = stage('scheduled')
export const INTERVIEWED = stage('interviewed')
export const OFFERS = stage('offers')

/** One decimal, because 3.5% and 5.6% are the figures being distinguished. */
export function rate(part: number, whole: number): string {
  if (whole === 0) return '0%'
  return `${((part / whole) * 100).toFixed(1)}%`
}

/**
 * Whole percent, for deltas where a decimal is noise.
 *
 * `null` rather than 0 when there is nothing to compare against: 0 renders as
 * "no change", which is a different claim from "no previous week". The two were
 * indistinguishable while the badge showed only a percentage; once the tooltip
 * prints the baseline beside it, "+0%" above "Last week: 0 applications" is
 * visibly false.
 */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'none'

export type Trend = {
  current: number
  previous: number
  /** Signed count, because "+3 more" is the plain-language form of "+20%". */
  difference: number
  percent: number | null
  direction: TrendDirection
}

/**
 * A period against the one before it, with the working kept.
 *
 * Returns the counts and the difference as well as the percentage, because the
 * tooltip shows how the figure was reached — and a tooltip that recomputed its
 * own numbers would be the second literal this module exists to avoid.
 */
export function weekOverWeek(current: number, previous: number): Trend {
  const percent = delta(current, previous)
  const difference = current - previous
  const direction: TrendDirection =
    percent === null ? 'none' : difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
  return { current, previous, difference, percent, direction }
}

/**
 * The change as a sentence.
 *
 * Here rather than in the component because this workspace's vitest is node-only
 * and scoped to lib/**, and pluralisation is exactly the kind of thing that ships
 * broken. It does two jobs at once: the tooltip's closing line, and the badge's
 * accessible name — "+20%, button" is a percentage, not a name.
 */
export function trendSummary(trend: Trend, noun: string): string {
  if (trend.direction === 'none') return 'no previous week to compare'
  if (trend.difference === 0) return 'the same as last week'
  const size = Math.abs(trend.difference)
  const word = trend.difference > 0 ? 'more' : 'fewer'
  return `${size} ${word} ${size === 1 ? noun : `${noun}s`} than last week`
}

export type Week = { label: string; range: string; count: number }

/** The six completed weeks the chart plots. `thisWeek` below is the seventh. */
export const WEEKS: readonly Week[] = [
  { label: 'Week 1', range: 'Jan 6–12', count: 5 },
  { label: 'Week 2', range: 'Jan 13–19', count: 12 },
  { label: 'Week 3', range: 'Jan 20–26', count: 17 },
  { label: 'Week 4', range: 'Jan 27–Feb 2', count: 28 },
  { label: 'Week 5', range: 'Feb 3–9', count: 9 },
  { label: 'Week 6', range: 'Feb 10–16', count: 15 },
]

/** The current, in-progress week. The reference's "18 this week" with the chart
 *  ending at 15 only makes sense if this is a seventh week, so it is one. */
export const THIS_WEEK = 18

/**
 * Bar heights as a percentage of the tallest week.
 *
 * A floor, because a bar of 0% is invisible and reads as missing data rather
 * than as a quiet week — and the smallest week here is 5 against a peak of 28,
 * which is 18% and would otherwise be a sliver.
 */
export function barHeights(values: readonly number[], floor = 8): number[] {
  const max = Math.max(...values, 0)
  if (max === 0) return values.map(() => floor)
  return values.map((v) => Math.max(floor, Math.round((v / max) * 100)))
}

/** Whole days between two dates, floored. Takes `today` so it can be tested. */
export function daysSince(startISO: string, today: Date): number {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

/** Rendered, not hardcoded: the reference prints a day count and a start date
 *  that disagree, which is what happens when both are typed by hand. */
export const HUNT_STARTED_ON = '2026-01-12'

export const TOP_MATCH = { score: 92, company: 'Stripe', role: 'Senior Backend Engineer' }

export type Insight = { icon: string; title: string; body: string }

export const CONVERSION_INSIGHTS: readonly Insight[] = [
  {
    icon: 'users',
    title: 'Interview conversion',
    body: `${rate(INTERVIEWED, APPLIED)} — ${INTERVIEWED} interviews from ${APPLIED} applications. Backend engineering roles currently produce the highest interview rate.`,
  },
  {
    icon: 'verified',
    title: 'Offer performance',
    body: `${OFFERS} offers received. The strongest conversion came from applications with a match score above 90%.`,
  },
  {
    icon: 'brain',
    title: 'Recommendation',
    body: 'Match scores above 88% are 2.4× more likely to reach an interview. Improve resume quality before increasing volume.',
  },
]

export const ACTIVITY_INSIGHTS: readonly Insight[] = [
  {
    icon: 'zap',
    title: 'Highest productivity',
    body: 'Week 4 was the peak: 28 applications and 3 interviews.',
  },
  {
    icon: 'clock',
    title: 'Best timing',
    body: 'Applications sent Tuesday and Wednesday get a response 31% faster.',
  },
  {
    icon: 'trending',
    title: 'Consistency',
    body: 'Avoid bursts. Holding 12–18 considered applications a week beats an uneven pace.',
  },
]

export type HealthRow = {
  label: string
  hint: string
  value: string
  tone?: 'negative'
  action?: string
}

export type HealthTone = 'success' | 'warning' | 'error'

export type HealthBand = { label: string; tone: HealthTone }

/**
 * The score, banded.
 *
 * Derived rather than stored: `score: 91` and `verdict: 'Excellent'` used to sit
 * beside each other as two independent literals, so editing the score left the
 * chip asserting the opposite — the same class of contradiction this module's
 * header is about. There is now one source, and the word and the colour come out
 * of it together, which is what stops a green chip ever reading "Critical".
 *
 * The thresholds are a judgement call: the reference states exactly one pairing
 * (91 is Excellent) and no rule. 80/50 treats this as a quality audit — a solid
 * resume reads green, amber means real gaps worth fixing, red means something is
 * structurally wrong. Deliberately NOT the 90/80/70 of `lib/jobs/derive.ts`,
 * which bands how well a person matches a job rather than how complete their CV
 * is, and which has four steps to this scale's three.
 */
export function healthBand(score: number): HealthBand {
  if (score >= 80) return { label: 'Excellent', tone: 'success' }
  if (score >= 50) return { label: 'Warning', tone: 'warning' }
  return { label: 'Critical', tone: 'error' }
}

export const RESUME_HEALTH = {
  score: 91,
  outOf: 100,
  rows: [
    { label: 'Keyword coverage', hint: 'Relevant keywords detected', value: '34 / 48' },
    {
      label: 'Skills coverage',
      hint: 'Detected in your master resume',
      value: '18 skills',
      action: 'View all',
    },
    { label: 'Missing skills', hint: 'High-impact gaps', value: '5 skills', tone: 'negative' },
    { label: 'Completeness', hint: 'Structural audit', value: '6 / 6' },
  ] satisfies HealthRow[],
  /**
   * Each tip states WHY, and the reason is required rather than optional —
   * `dummy.test.ts` fails a tip that ships without one. A percentage with no
   * stated reason asks the reader to take a recommendation on authority, and
   * this one can cost them a month of learning a new tool.
   *
   * THESE REASONS ARE INVENTED, and they are the most misleading thing on this
   * panel. The figures elsewhere here are fabricated too, but a statistic is
   * something a reader notes and a recommendation is something they act on —
   * "68% of the roles you've matched" reads as a computation over their own
   * history, and PRD NG2 means nothing computes it. When this screen gets a
   * real disclosure, these tooltips are the first thing that belongs behind it.
   */
  tips: [
    {
      label: 'Add Kubernetes',
      gain: '+7%',
      emphasis: true,
      reason:
        'Kubernetes appears in 68% of the senior backend roles you have matched above 85%, and it is the most common requirement missing from your resume. Listing it also reads as current: container orchestration is now assumed rather than specialist.',
    },
    {
      label: 'Improve project metrics',
      gain: '+12%',
      emphasis: false,
      reason:
        'Six of your project bullets say what you built but not what changed. A quantified outcome — latency cut, cost saved, users served — is the strongest signal recruiters screen for, and the cheapest gap here to close.',
    },
  ],
}

export type SummaryTile = { label: string; caption: string; value: string }

export const PERFORMANCE_SUMMARY: readonly SummaryTile[] = [
  { label: 'Highest match', caption: 'OpenAI', value: '97%' },
  { label: 'Best industry', caption: 'AI', value: '91%' },
  { label: 'Best version', caption: 'Resume v4', value: '94%' },
  { label: 'Best day', caption: 'Tuesday', value: '18%' },
  // Scheduled over applied, which is the 5.6% the reference prints beside a
  // 3.5% "interview conversion". Different measures, so both are labelled.
  { label: 'Interview rate', caption: 'Scheduled / applied', value: rate(SCHEDULED, APPLIED) },
]

export const STRATEGY_ANALYSIS =
  'Across your full application history, Resume v4 produces the highest match scores and the best interview rate. Applications sent early in the week convert fastest, and roles above an 88% match are where nearly all of your interviews come from. Narrow the target list before widening it.'
