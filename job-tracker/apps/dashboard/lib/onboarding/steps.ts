/**
 * The wizard, grouped by who knows the answer rather than by topic.
 *
 * Step 2 is everything the CV told us, so the user's job there is to scan and
 * correct. Step 3 is everything a CV cannot say — what you want next, not what
 * you have done — so career goal belongs there and not beside the roles Groq
 * read off your history.
 *
 * This replaced six steps (resume / goals / roles / skills / work / done). The
 * same nine columns are collected; the regrouping exists because four of those
 * six steps were one or two controls each, and a stranger was being asked for
 * ~6 minutes before reaching anything (PRD §5 J1). Retired slugs are redirected
 * rather than 404'd — see RETIRED_SLUGS in gate.ts.
 */
export const STEPS = [
  {
    slug: 'resume',
    n: 1,
    title: 'Upload your CV',
    sub: 'We read it once to fill in the rest.',
    /** For the step list beside the form. Deliberately not the title: the list
     *  names the stage, the heading asks the question, and printing near-identical
     *  strings twice in one viewport reads as a bug. */
    short: 'Your CV',
  },
  {
    slug: 'profile',
    n: 2,
    title: "Here's what we read",
    sub: 'Correct anything we got wrong.',
    short: 'What we read',
    /**
     * Shown instead of `sub` when the CV produced nothing — a Groq outage, or a
     * CV whose text yielded no facts. The old wizard said "We pulled these from
     * your CV" unconditionally, so a failed extraction left that sentence
     * sitting above empty fields. page.tsx picks between the two on
     * `profiles.cv_prefilled_at`.
     */
    subNoPrefill: "We couldn't pull details from your CV, so add them here.",
  },
  {
    slug: 'preferences',
    n: 3,
    title: 'What are you looking for?',
    sub: "Things your CV can't tell us.",
    short: 'What you want',
  },
  {
    slug: 'done',
    n: 4,
    title: 'Your profile is set',
    sub: "Here's what we've got.",
    short: 'Done',
  },
] as const

export type StepSlug = (typeof STEPS)[number]['slug']
export const TOTAL_STEPS = STEPS.length

export function stepBySlug(slug: string) {
  return STEPS.find((s) => s.slug === slug)
}

export function stepByNumber(n: number) {
  return STEPS.find((s) => s.n === n)
}

/** The slug a user sitting on `n` belongs on. Clamps, so nobody skips ahead. */
export function slugForStep(n: number): StepSlug {
  const clamped = Math.min(Math.max(n, 1), TOTAL_STEPS)
  return stepByNumber(clamped)!.slug
}

/**
 * `icon` names a glyph the form maps to a component. A name rather than the
 * component itself, because this module is imported by the server and the icon
 * set lives in the client bundle — and because `packages/ui` must not gain an
 * icon dependency to render a choice card.
 */
export const CAREER_GOALS = [
  { value: 'first-job', label: 'Land my first role', icon: 'graduation' },
  { value: 'switch-company', label: 'Move to a better company', icon: 'trending' },
  { value: 'switch-field', label: 'Change field or specialism', icon: 'switch' },
  { value: 'level-up', label: 'Step up to a senior level', icon: 'medal' },
] as const

export type CareerGoalIcon = (typeof CAREER_GOALS)[number]['icon']

export const WORK_LOCATIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
] as const

export const SALARY_PERIODS = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
] as const

/**
 * The amount and its currency are separate columns, so the symbol is presentation
 * and the code is the stored value. IDR leads because it is the home market.
 *
 * Mirrored by profiles_salary_currency_check in the database — extend both or a
 * new code fails as an unexplained 400 mid-wizard.
 */
export const SALARY_CURRENCIES = [
  { value: 'IDR', label: 'IDR', symbol: 'Rp' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'SGD', label: 'SGD', symbol: 'S$' },
  { value: 'MYR', label: 'MYR', symbol: 'RM' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
  { value: 'AUD', label: 'AUD', symbol: 'A$' },
  { value: 'JPY', label: 'JPY', symbol: '¥' },
] as const

export const DEFAULT_CURRENCY = 'IDR'

export function isCurrency(code: string): boolean {
  return SALARY_CURRENCIES.some((c) => c.value === code)
}

/**
 * Experience as a band rather than an exact figure. "Do I count the internship?"
 * has no right answer, so the spinner was asking for a precision nobody has.
 *
 * The stored value is the band's lower bound, which keeps years_experience an
 * int and needs no migration. `min` only, and no `max`: two bounds could drift
 * out of partition, and a band that claims 6-10 next to one that claims 10+
 * leaves ten years belonging to both.
 *
 * Deliberately NOT mirrored by a check constraint, unlike SALARY_CURRENCIES
 * above. uploadCvAction stores the precise figure Groq read from the CV, so the
 * column legitimately holds values that are not lower bounds — 7 is common. A
 * whitelist here would reject our own AI pre-fill. bandFor buckets on read
 * instead, which is what makes an arbitrary stored integer displayable.
 */
export const EXPERIENCE_BANDS = [
  { value: '0', label: '0-2 years (Entry)', min: 0 },
  { value: '3', label: '3-5 years (Intermediate)', min: 3 },
  { value: '6', label: '6-9 years (Senior)', min: 6 },
  { value: '10', label: '10+ years (Expert)', min: 10 },
] as const

export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number]

/** The band containing a count — including a precise one the model wrote. */
export function bandFor(years: number | null | undefined): ExperienceBand | undefined {
  if (years === null || years === undefined) return undefined
  if (!Number.isFinite(years) || years < 0) return undefined
  // Last band whose floor the count clears, so the top band is open-ended.
  return [...EXPERIENCE_BANDS].reverse().find((b) => years >= b.min)
}

