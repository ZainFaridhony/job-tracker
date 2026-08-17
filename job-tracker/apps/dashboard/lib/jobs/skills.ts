import type { Job } from './data'
import { facetCounts } from './facets'
import type { FilterState } from './filters'

/**
 * What the Skills facet offers, grouped by whether the reader's CV already has it.
 *
 * The screen this replaces rendered `SKILL_FACETS` flat and alphabetical, so it
 * opened on "Accessibility · Design Systems · Distributed Training · Evaluation"
 * — sixteen unrelated skills in an order that told the reader nothing, with no
 * indication which of them they already have or which the listings in front of
 * them actually want. Both facts are available, so both are used.
 *
 * WHERE THE LIST COMES FROM. Every offered skill is one at least one *surviving*
 * listing requires, which is what keeps `data.test.ts`'s rule — no facet no
 * listing has — true per request rather than only for the corpus as a whole. A
 * skill on the CV that nothing here asks for is therefore not shown at all: it
 * could only ever empty the list. The cost is that the screen never says "you
 * have 23 other skills nobody here wants", which is real information; it belongs
 * to a market-insight surface, not to a filter, because a filter row that cannot
 * filter is a broken control however true its label.
 *
 * WHAT "RECOMMENDED" MEANS, AND WHAT IT DOES NOT. The gap group is the skills
 * these listings require that the CV does not record — computed here, with no
 * model call at request time. The AI step already happened: Cerebras extracted
 * `profiles.skills` once, at onboarding. So the labels say "your CV", never "AI
 * recommended" — the same reason `cv_prefilled_at` records an event rather than
 * letting copy key off field values, and the same reason step 2 can honestly say
 * where its prefill came from.
 *
 * Pure, and in lib/, because this workspace's vitest is node-only and scoped to
 * lib/**. The client component that renders it holds nothing but a query string.
 */

export type SkillOption = {
  /** The corpus spelling, which is also the checkbox value — `parseFilters`
   *  validates `skill` against `SKILL_FACETS` and drops anything else. */
  name: string
  /**
   * Listings that would survive if this were ticked.
   *
   * Not rendered — a column of small numbers beside a filter list is noise on
   * every row. It earns its place twice anyway: it ORDERS the rows, so the skill
   * three listings want comes before the one a single listing wants, and 0 is how
   * `skills.ts` recognises a ticked skill nothing left matches, which must still
   * render. See the note on `offered`.
   */
  count: number
  checked: boolean
}

export type SkillGroup = {
  key: string
  /** Empty for `UNGROUPED`, whose whole point is that it makes no claim. */
  label: string
  skills: SkillOption[]
}

export const CV_GROUP = 'cv'
export const GAP_GROUP = 'gap'
/** One group making no claim about the reader, used when the CV records no
 *  skills at all. */
export const UNGROUPED = 'all'

export const SKILL_GROUP_LABEL: Record<string, string> = {
  [CV_GROUP]: 'On your CV',
  // "Missing" is deliberately about the listings, not about the person: these
  // are what the roles ask for and the CV does not mention, which is not the
  // same as a shortcoming.
  [GAP_GROUP]: 'Asked for, not on your CV',
  [UNGROUPED]: '',
}

function byCountThenName(a: SkillOption, b: SkillOption): number {
  return b.count - a.count || a.name.localeCompare(b.name)
}

export function skillFacetGroups(
  jobs: readonly Job[],
  filters: FilterState,
  cvSkills: readonly string[],
): SkillGroup[] {
  const counts = facetCounts(jobs, filters, 'skills', (j) => j.skills)

  /**
   * Every skill any listing anywhere in the corpus asks for, whatever else is
   * filtering — the vocabulary does not shrink as the results narrow.
   *
   * That is a deliberate reversal of what this did first, which offered only the
   * skills a *surviving* listing wanted. Hiding the rest kept every checkbox
   * guaranteed to return something, but it also meant the list silently changed
   * length whenever another facet moved, so a reader who ticked Remote watched
   * five of their own skills disappear with no explanation. Showing everything
   * costs the guarantee: a skill at 0 can now be ticked, and ticking it empties
   * the list. The count still orders the rows, so those sink to the bottom rather
   * than sitting among the useful ones.
   *
   * A ticked skill is unioned in regardless. `facetCounts` reports no entry for a
   * skill nothing matches, and dropping the row would unmount a *checked*
   * checkbox — an unmounted checkbox contributes no value to its form, so
   * `skill=Evaluation` would vanish from the URL the moment any other control was
   * touched. That is a filter deleting itself silently, the same class of desync
   * `filter-form-behaviour.tsx` exists to prevent. It cannot happen while the
   * whole vocabulary renders, but it is unioned anyway so the invariant does not
   * depend on that.
   */
  const offered = new Map<string, number>()
  for (const job of jobs) for (const s of job.skills) offered.set(s, counts.get(s) ?? 0)
  for (const s of filters.skills) if (!offered.has(s)) offered.set(s, 0)

  if (offered.size === 0) return []

  // Case-insensitive, because extracted skills come from a model: a CV yielding
  // "react" must still match the corpus's "React". The corpus spelling is what
  // gets displayed and submitted, so the lookup goes one way only.
  const onCv = new Set(cvSkills.map((s) => s.toLowerCase()))
  const ticked = new Set(filters.skills)

  const options = [...offered].map(([name, count]) => ({
    name,
    count,
    checked: ticked.has(name),
  }))

  // No CV skills — onboarding unfinished, or extraction found nothing — means
  // "Asked for, not on your CV" would assert knowledge we do not have about
  // every row. One group with no label makes no claim instead.
  if (onCv.size === 0) {
    return [{ key: UNGROUPED, label: SKILL_GROUP_LABEL[UNGROUPED]!, skills: options.sort(byCountThenName) }]
  }

  const groups: SkillGroup[] = [
    { key: CV_GROUP, label: SKILL_GROUP_LABEL[CV_GROUP]!, skills: [] },
    { key: GAP_GROUP, label: SKILL_GROUP_LABEL[GAP_GROUP]!, skills: [] },
  ]

  for (const option of options) {
    const group = onCv.has(option.name.toLowerCase()) ? groups[0]! : groups[1]!
    group.skills.push(option)
  }

  for (const group of groups) group.skills.sort(byCountThenName)

  // An emptied group is dropped rather than left as a bare header — the rule
  // `sectionItems` follows in the onboarding picker for the same reason.
  return groups.filter((g) => g.skills.length > 0)
}
