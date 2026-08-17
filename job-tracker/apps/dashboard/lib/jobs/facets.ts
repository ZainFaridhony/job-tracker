import type { Job } from './data'
import { applyFilters, type FilterState } from './filters'

/**
 * How many listings each value of one facet would return.
 *
 * The one rule that makes these numbers mean anything is that a facet is excluded
 * from its own count. Counting against the *displayed* results instead reports
 * every unticked option as 0 the moment anything is ticked — because those
 * listings were removed by the very facet being counted — which would rank every
 * remaining option identically and drop them all as dead ends. Excluding it keeps
 * each figure answering the only useful question: how many listings would I get
 * if I ticked this?
 *
 * The Skills facet does not print these numbers; it sorts by them, and treats 0
 * as "ticked but nothing left matches". A caller that ever does print one is
 * making a claim about the result set, so it needs to be this figure and not a
 * count taken over the filtered results.
 *
 * It is generic rather than skills-specific because it is the same operation for
 * every facet, and because going through `applyFilters` keeps ONE definition of
 * what a filter means. A hand-rolled second copy that counted "remote listings
 * with this skill" would be a near-duplicate free to drift from the real filter.
 *
 * `read` is what a listing holds for the facet, as a list. Stored facets return
 * the field (`j => j.skills`); a derived one returns a computed single-element
 * list (`j => [competitionFor(j.applicants)]`), which is what lets competition
 * be counted by the same function despite having no column of its own.
 *
 * Values absent from every surviving listing are absent from the Map rather than
 * present at 0 — so the caller renders no dead-end row without having to filter
 * the result. A value the reader has already ticked is the one exception the
 * CALLER must handle: see `skills.ts`, where dropping a ticked row would delete
 * the filter on the next submit.
 */
export function facetCounts<T extends string>(
  jobs: readonly Job[],
  filters: FilterState,
  /** The facet being counted, and therefore the one NOT applied. Restricted to
   *  the multi-valued facets, since those are the only ones an option list is
   *  ever drawn for. */
  facet: 'modes' | 'types' | 'levels' | 'sizes' | 'sources' | 'skills' | 'competition',
  read: (job: Job) => readonly T[],
): Map<T, number> {
  const others = applyFilters(jobs, { ...filters, [facet]: [] })
  const counts = new Map<T, number>()

  for (const job of others) {
    // A Set per listing, so a listing that somehow repeated a value counts once.
    for (const value of new Set(read(job))) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return counts
}
