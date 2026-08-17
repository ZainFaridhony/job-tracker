import {
  JOBS,
  LEVEL_LABEL,
  MODE_LABEL,
  WORK_MODES,
  type Job,
  type SeniorityLevel,
  type WorkMode,
} from './data'
import { applyFilters, EMPTY_FILTERS, jobsHref } from './filters'
import { BASE_CURRENCY, formatFigure, isSalaryCurrency, type SalaryCurrency } from './salary'
import { bandFor } from '../onboarding/steps'

/**
 * Turning the saved preferences into a seeded /jobs link.
 *
 * The nav's Jobs tab points at `/jobs` for everyone by default. With
 * `autofill_job_filters` on, it points at `/jobs?...` carrying the filters the
 * profile already implies, so the screen opens on the work someone said they
 * wanted instead of on all of it. This is the second consumer of onboarding
 * step 3 — the Skills facet's CV grouping was the first — and the columns it
 * reads were listed in CLAUDE.md under "store data nothing reads".
 *
 * It produces a URL rather than a `FilterState` because the filters ARE the URL
 * on that screen: seeding by link means the reader can see what was applied, can
 * remove any of it with the chips that appear, and can bookmark or share the
 * result. Seeding through a default inside `parseFilters` instead would create a
 * filter with no chip and no way to clear it, which is exactly the failure the
 * "unknown values are dropped" rule in `filters.ts` exists to prevent.
 *
 * FOUR THINGS ARE SEEDED: work location, target salary, years of experience (via
 * the seniority band it falls in) and skills. Only the first two are direct
 * mappings; the other two each needed a decision recorded below — `levelsFor` for
 * why two bands map to no level at all, and `fitSkills` for why a whole CV's worth
 * of skills is not applied at once.
 *
 * SKILLS ARE BOUNDED, NOT DROPPED. An earlier version refused to seed them, on the
 * grounds that `applyFilters` treats several skills as AND — a listing has to want
 * every one — so a full CV opens the screen on nothing. That reasoning was right
 * about the hazard and wrong about the remedy: `fitSkills` adds them most-wanted
 * first and stops before the result set would empty, which keeps the feature and
 * cannot produce a dead screen.
 *
 * Career goal and target roles are still left out. Neither maps onto a facet: the
 * goal is a trajectory rather than a filter, and the roles are free text that
 * would have to go through `q`, which matches substrings across title, company
 * and skills — so "Product Manager" would also match a company called Product.
 *
 * NOTE ON EMPTY RESULTS FROM A REAL PROFILE. Seeding can legitimately produce
 * nothing to apply: a business-development CV against this corpus of design and
 * engineering listings has an empty skill intersection, and six years maps to a
 * level the corpus does hold but need not combine with the rest. `hasSeed` is what
 * the sidebar uses to avoid offering a control that would visibly do nothing.
 *
 * Pure, and in lib/, so the node-only vitest can reach it. The row it reads comes
 * from `navPreferences()` in `profile.ts`, which is the impure half.
 */

export type SeedPreferences = {
  autofill: boolean
  /** `profiles.work_location`. Free-form text in Postgres, so it is checked here
   *  rather than trusted. */
  workLocation: string | null
  /** `profiles.salary_target`. Digits as a string, denominated in
   *  `salaryCurrency` and expressed per `salaryPeriod`. */
  salaryTarget: string | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  /** `profiles.skills`. Free-form `text[]`, so most entries will not be facets. */
  skills: readonly string[]
  /** `profiles.years_experience`. Mapped through EXPERIENCE_BANDS, not through
   *  thresholds invented here. */
  yearsExperience: number | null
}

function isWorkMode(value: string): value is WorkMode {
  return (WORK_MODES as readonly string[]).includes(value)
}

/** What the preferences amount to, in the jobs screen's own terms. */
type Seeded = {
  mode: WorkMode | null
  /** Several, because levels are alternatives in `applyFilters` and one band maps
   *  to two of them. */
  levels: SeniorityLevel[]
  /** Corpus spellings, and only as many as still return work — see `fitSkills`. */
  skills: string[]
  /** Per YEAR, whatever period the profile stored, and denominated in `currency`. */
  salaryMin: number | null
  currency: SalaryCurrency
}

/**
 * Years of experience to the levels this corpus actually holds.
 *
 * Keyed off `bandFor` rather than off thresholds written here, because
 * EXPERIENCE_BANDS already names the seniority it means — Entry, Intermediate,
 * Senior, Expert — and a second set of numbers would be free to disagree with the
 * band the settings screen shows for the same figure.
 *
 * The two junior bands map to NOTHING on purpose. `SENIORITY_LEVELS` lost 'mid'
 * when no listing could honestly carry it, so there is no level for three years of
 * experience and seeding one would open the screen empty. Expert maps to two,
 * which is coherent because several levels are alternatives rather than an
 * intersection.
 */
function levelsFor(years: number | null): SeniorityLevel[] {
  switch (bandFor(years)?.value) {
    case '6':
      return ['senior']
    case '10':
      return ['lead', 'principal']
    default:
      return []
  }
}

/**
 * As many of the reader's skills as the corpus can still satisfy together.
 *
 * Skills are AND in `applyFilters` — a listing has to want every one ticked — so
 * seeding a whole CV's worth opens the screen on an empty list, which reads as a
 * broken page rather than a helpful default. This adds them one at a time, most
 * widely wanted first, and stops before the result set would empty.
 *
 * Ordering by how many listings want each skill is what makes the truncation
 * defensible rather than arbitrary: the skills that survive are the ones with the
 * most work behind them, and the reader can always tick the rest by hand.
 *
 * Case-insensitive against the corpus, because extracted skills come from a model
 * and "react" must find "React" — but the CORPUS spelling is what gets seeded, or
 * `parseFilters` would drop it as an unknown facet.
 */
function fitSkills(
  wanted: readonly string[],
  jobs: readonly Job[],
  base: Omit<Seeded, 'skills'>,
): string[] {
  const demand = new Map<string, number>()
  for (const job of jobs) {
    for (const skill of new Set(job.skills)) demand.set(skill, (demand.get(skill) ?? 0) + 1)
  }

  const byName = new Map([...demand.keys()].map((s) => [s.toLowerCase(), s]))
  const known = [...new Set(wanted.map((s) => byName.get(s.trim().toLowerCase())).filter(Boolean))]
    .sort((a, b) => demand.get(b!)! - demand.get(a!)! || a!.localeCompare(b!)) as string[]

  const kept: string[] = []
  for (const skill of known) {
    const next = [...kept, skill]
    const filters = {
      ...EMPTY_FILTERS,
      modes: base.mode ? [base.mode] : [],
      levels: base.levels,
      skills: next,
      salaryMin: base.salaryMin,
      currency: base.currency,
    }
    if (applyFilters(jobs, filters).length > 0) kept.push(skill)
  }
  return kept
}

/**
 * The single derivation every export here reads.
 *
 * It exists so the summary the control prints and the link the control points at
 * cannot disagree — the failure the whole Jobs screen was built to avoid, where
 * the reference prints 22% above a chart ending at 15. Computing the figure twice,
 * once for the label and once for the URL, is exactly how that happens.
 *
 * Deliberately does NOT consider `prefs.autofill`: this answers "what would be
 * applied", which `hasSeed` needs in order to decide whether the control is worth
 * offering at all, and that is a different question from whether it is switched on.
 */
function seeded(prefs: SeedPreferences, jobs: readonly Job[] = JOBS): Seeded {
  // The three values happen to be identical to WORK_MODES, but the column is
  // free-form text and this is the boundary, so it is validated rather than cast.
  const location = prefs.workLocation ?? ''
  const mode = isWorkMode(location) ? location : null

  const digits = (prefs.salaryTarget ?? '').replace(/\D/g, '')
  const target = digits === '' ? 0 : Number(digits)

  // The profile stores the target per `salary_period`; the jobs floor is per year
  // and its label says so. Seeding a monthly figure unconverted would set a floor
  // twelve times too low, which filters nothing out and looks like the preference
  // did nothing.
  const salaryMin = target > 0 ? (prefs.salaryPeriod === 'monthly' ? target * 12 : target) : null

  const currency = prefs.salaryCurrency ?? ''
  const base = {
    mode,
    levels: levelsFor(prefs.yearsExperience),
    salaryMin,
    currency: isSalaryCurrency(currency) ? currency : BASE_CURRENCY,
  }

  // Skills last, because how many of them fit depends on everything above.
  return { ...base, skills: fitSkills(prefs.skills, jobs, base) }
}

/** Whether the profile holds anything this screen can filter on. The sidebar hides
 *  the control entirely when it does not: a toggle that provably changes nothing is
 *  worse than no toggle, the same reasoning that keeps the stepper unclickable. */
export function hasSeed(prefs: SeedPreferences, jobs: readonly Job[] = JOBS): boolean {
  const s = seeded(prefs, jobs)
  return s.mode !== null || s.salaryMin !== null || s.levels.length > 0 || s.skills.length > 0
}

/** The filters the toggle would apply, named the way the chips name them, so the
 *  control can show its own consequences before it is used. */
export function seedSummary(prefs: SeedPreferences, jobs: readonly Job[] = JOBS): string[] {
  const s = seeded(prefs, jobs)
  const out: string[] = []
  if (s.mode) out.push(MODE_LABEL[s.mode])
  // "Lead or Principal", because several levels are alternatives — "Lead ·
  // Principal" would read as both at once, which is not what gets applied.
  if (s.levels.length) out.push(s.levels.map((l) => LEVEL_LABEL[l]).join(' or '))
  for (const skill of s.skills) out.push(skill)
  // `formatFigure`, not `formatAmount`: the floor is already denominated in
  // `s.currency`, so converting again would print a figure nobody chose. Same
  // reason `activeChips` uses it for the salary chip.
  if (s.salaryMin !== null) out.push(`${formatFigure(s.salaryMin, s.currency)}+`)
  return out
}

export function seedJobsHref(prefs: SeedPreferences, jobs: readonly Job[] = JOBS): string {
  if (!prefs.autofill) return '/jobs'

  const s = seeded(prefs, jobs)
  const filters = { ...EMPTY_FILTERS }
  if (s.mode) filters.modes = [s.mode]
  filters.levels = s.levels
  filters.skills = s.skills
  if (s.salaryMin !== null) {
    filters.salaryMin = s.salaryMin
    // Only alongside an amount. `currency` is a display unit, so on its own it
    // would change how every salary on the screen reads while filtering nothing —
    // a seeded link that silently reinterprets the corpus and shows no chip saying
    // so, since `activeChips` deliberately does not count a unit.
    filters.currency = s.currency
  }

  // `period` is left at its default deliberately. It changes how every figure on
  // the screen reads and nothing else, and the profile's own period has already
  // been consumed above to put the floor into yearly terms — carrying it here too
  // would show monthly figures against a threshold labelled "per year".
  return jobsHref(filters)
}
