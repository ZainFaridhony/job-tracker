/**
 * Years of experience, computed rather than asked for.
 *
 * The model used to be asked for `yearsExperience` directly, "if the CV states or
 * clearly implies it by dates". Models are unreliable at date arithmetic, and
 * that phrasing invited exactly the estimate the rest of the prompt forbids. So
 * the model now reports the employment periods it can read, and the arithmetic
 * happens here: deterministic, testable, and with no hallucination surface.
 *
 * Overlaps are merged instead of summed. People hold concurrent roles, freelance
 * alongside employment, and get promoted mid-month with both rows dated the same
 * year — adding those up double-counts. Gaps are preserved, so a two-year career
 * break is not counted as experience, which is the answer last-start-minus-today
 * gets wrong.
 */

/** What the model reports per role. Strings because a CV writes dates as prose. */
export type EmploymentPeriod = {
  /** `YYYY` or `YYYY-MM`. Null when the CV gives no start. */
  start: string | null
  /** `YYYY`, `YYYY-MM`, or `present`. Null when the CV gives no end. */
  end: string | null
}

/** Absolute month index, so arithmetic is integer subtraction. */
type Span = { from: number; to: number }

const MAX_YEARS = 60

/** Rejects a year outside the range a working life can occupy. */
function plausibleYear(year: number): boolean {
  return year >= 1950 && year <= 2100
}

/**
 * `YYYY-MM` keeps its month. A bare `YYYY` resolves to the edge that makes the
 * range inclusive of the whole year: January when it starts one, December when it
 * ends one. So "2018 - 2021" counts as four calendar years of employment, which
 * is what the CV is claiming, rather than the 36 months a January-to-January
 * reading would give.
 */
function monthIndex(value: string, edge: 'start' | 'end'): number | null {
  const withMonth = /^(\d{4})-(\d{1,2})$/.exec(value)
  if (withMonth) {
    const year = Number(withMonth[1])
    const month = Number(withMonth[2])
    if (!plausibleYear(year) || month < 1 || month > 12) return null
    return year * 12 + (month - 1)
  }

  const yearOnly = /^(\d{4})$/.exec(value)
  if (yearOnly) {
    const year = Number(yearOnly[1])
    if (!plausibleYear(year)) return null
    return year * 12 + (edge === 'start' ? 0 : 11)
  }

  return null
}

/** Anything the model marks as ongoing. Case and padding are not its strength. */
function isPresent(value: string): boolean {
  return /^(present|current|now|ongoing|today)$/i.test(value.trim())
}

/**
 * Null when the period cannot be trusted: no start, an unparseable bound, or an
 * end before its start. A period we cannot read contributes nothing rather than
 * contributing a guess.
 */
function toSpan(period: EmploymentPeriod, todayIndex: number): Span | null {
  if (!period.start) return null

  const from = monthIndex(period.start.trim(), 'start')
  if (from === null) return null

  let to: number | null
  if (!period.end || isPresent(period.end)) {
    to = todayIndex
  } else {
    to = monthIndex(period.end.trim(), 'end')
  }
  if (to === null) return null

  // A start in the future, or an end before the start, is a misread date.
  if (from > todayIndex) return null
  if (to < from) return null

  // An ongoing role cannot extend past today even if the model says otherwise.
  return { from, to: Math.min(to, todayIndex) }
}

/**
 * Adjacent counts as continuous: leaving a job in June and starting the next in
 * July is not a career break, and `next.from <= current.to + 1` is what stops a
 * clean handover from reading as a one-month gap.
 */
function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.from - b.from || a.to - b.to)
  const merged: Span[] = []

  for (const span of sorted) {
    const last = merged[merged.length - 1]
    if (last && span.from <= last.to + 1) {
      last.to = Math.max(last.to, span.to)
      continue
    }
    merged.push({ ...span })
  }

  return merged
}

/** Months in a span, counting both endpoints. A single month is one month. */
function months(span: Span): number {
  return span.to - span.from + 1
}

export type YearsInput = {
  periods: readonly EmploymentPeriod[]
  /**
   * Only when the CV literally states a total, such as "8 years of experience".
   * Used when the periods yield nothing, so a summary line is not thrown away
   * just because the CV omitted dates.
   */
  stated?: number | null
  /** Injected so the result is testable and does not move with the clock. */
  today?: Date
}

/**
 * Total years of employment, floored. Null when nothing usable was found.
 *
 * Floored rather than rounded, deliberately: the prompt's whole posture is never
 * to overstate, and eleven months of work is not a year of experience. The user
 * corrects it on step 2 anyway, and `bandFor` buckets it on the way out.
 */
export function yearsOfExperience({ periods, stated, today }: YearsInput): number | null {
  const now = today ?? new Date()
  const todayIndex = now.getFullYear() * 12 + now.getMonth()

  const spans = periods
    .map((period) => toSpan(period, todayIndex))
    .filter((span): span is Span => span !== null)

  if (spans.length > 0) {
    const total = mergeSpans(spans).reduce((sum, span) => sum + months(span), 0)
    const years = Math.floor(total / 12)
    // A handful of months is real work but not a year of experience. Zero is a
    // legitimate answer for a fresh graduate and must not become null.
    return Math.min(years, MAX_YEARS)
  }

  // Fall back to what the CV said in words, if anything.
  if (typeof stated === 'number' && Number.isInteger(stated) && stated >= 0 && stated <= MAX_YEARS) {
    return stated
  }

  return null
}
