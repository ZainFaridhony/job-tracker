/**
 * The detail panel's tabs, as data.
 *
 * THE TAB IS THE URL, for the same reason the filters are (see filters.ts) and
 * one more that is specific to this panel: it is deliberately not a Dialog and
 * renders inline rather than through a portal, so that it opens, animates and
 * closes with no JavaScript at all. A tab widget built on client state would put
 * four of the five panes behind a script the panel does not otherwise need. As a
 * URL parameter they cost nothing — a shared link opens on the right pane, a
 * reload keeps it, and every bit of the logic sits in lib/ where this
 * workspace's node-only vitest can reach it.
 *
 * Opening a DIFFERENT listing resets to the summary for free: a card links with
 * no tab, so no parameter is written, so `readTab` answers the default. There is
 * no reset to remember to perform.
 */
import type { Job } from './data'
import type { RawParams } from './filters'

export const JOB_TABS = ['summary', 'description', 'required', 'preferred', 'about'] as const

export type JobTab = (typeof JOB_TABS)[number]

export const DEFAULT_TAB: JobTab = 'summary'

export const TAB_LABEL: Record<JobTab, string> = {
  summary: 'Summary',
  description: 'Job description',
  required: 'Required quals',
  preferred: 'Preferred',
  about: 'About',
}

/**
 * The pane for a tab. A union rather than one shape with optional fields,
 * because prose and a bullet list are different renderings and a component
 * branching on `items?.length` is how an empty list becomes a bare heading.
 */
export type TabPane =
  | { kind: 'prose'; heading: string; body: string }
  | { kind: 'list'; heading: string; items: readonly string[] }

/**
 * Unknown values fall back rather than throwing or rendering nothing: the
 * listing is still valid, only the pane selector is stale. Reads the first of a
 * repeated parameter, matching `one()` in filters.ts.
 */
export function readTab(raw: RawParams): JobTab {
  const value = raw['tab']
  const first = (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
  return (JOB_TABS as readonly string[]).includes(first) ? (first as JobTab) : DEFAULT_TAB
}

/**
 * The role and its responsibilities are one tab each.
 *
 * The reference's Summary pane shows both, which would leave the Job Description
 * tab beside it holding nothing — the same class of self-contradiction as its
 * 22% over a chart ending at 15. Splitting them is the reading where all five
 * tabs have content, and `tabs.test.ts` asserts every pane of every listing is
 * non-empty so a new listing cannot ship with a dead tab.
 */
export function tabPane(job: Job, tab: JobTab): TabPane {
  switch (tab) {
    case 'summary':
      return { kind: 'prose', heading: 'The role', body: job.summary }
    case 'description':
      return { kind: 'list', heading: 'Key responsibilities', items: job.responsibilities }
    case 'required':
      return { kind: 'list', heading: 'Requirements', items: job.requirements }
    case 'preferred':
      return { kind: 'list', heading: 'Nice to have', items: job.preferred }
    case 'about':
      return { kind: 'prose', heading: `About ${job.company}`, body: job.about }
  }
}
