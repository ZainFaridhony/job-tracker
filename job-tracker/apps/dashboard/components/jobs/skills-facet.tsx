'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { SearchIcon } from 'lucide-react'
import { Checkbox } from '@job-tracker/ui'
import type { SkillGroup } from '@/lib/jobs/skills'

/**
 * The Skills facet: grouped rows, a per-skill listing count, and a search box.
 *
 * The only client component in the sidebar, and it holds exactly one piece of
 * state — the query. Every decision about WHICH skills exist, which group each
 * belongs to, what each count is and what order they come in was already made on
 * the server by `skillFacetGroups`, so this file cannot disagree with the URL
 * about anything that matters.
 *
 * TWO RULES THAT LOOK LIKE STYLE AND ARE NOT:
 *
 * 1. A row filtered out by the query is hidden with `hidden`, never unmounted.
 *    An unmounted checkbox contributes no value to its form, so unmounting a
 *    TICKED skill would silently drop `skill=React` from the next submit — the
 *    reader types four characters in a search box and a filter they set earlier
 *    disappears. Hiding keeps the input in `form.elements`, which also keeps
 *    `FilterFormBehaviour`'s URL resync able to see it.
 *
 * 2. The search input carries no `form` attribute and is not inside the form.
 *    `FilterFormBehaviour` submits on any `change` whose target belongs to
 *    `FILTER_FORM_ID`; associating this box would make leaving it navigate, and
 *    a query that only narrows the OPTIONS has no business changing the results.
 *    It is also why nothing here ends up in the URL: this is a way of finding a
 *    checkbox, not a filter, and a shared /jobs link should not open with a
 *    sidebar narrowed for reasons the recipient cannot see.
 *
 * Without JavaScript the box is absent and every row renders, so a no-JS reader
 * loses only the box. `enhanced` comes from `useSyncExternalStore` with a server
 * snapshot of `false` rather than an effect, the same mechanism onboarding step 1
 * uses — a lazy `useState` initialiser would answer `true` during SSR and ship
 * HTML containing a control that cannot work.
 */

const subscribe = () => () => {}

function useEnhanced(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

function matches(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.trim().toLowerCase())
}

export function SkillsFacet({
  groups,
  formId,
}: {
  groups: readonly SkillGroup[]
  /** A prop rather than an import of `FILTER_FORM_ID`, matching
   *  `FilterFormBehaviour` — importing it would pull `search-header.tsx` and its
   *  whole import tree into this module's client graph to read one string. */
  formId: string
}) {
  const [query, setQuery] = useState('')
  const enhanced = useEnhanced()

  // Which rows survive the query, and therefore whether a group has anything
  // left to show. Computed rather than read off the DOM so the "no matches" line
  // and the group headers agree with what is visible.
  const visible = useMemo(() => {
    const shown = new Set<string>()
    for (const group of groups) {
      for (const skill of group.skills) {
        if (matches(skill.name, query)) shown.add(skill.name)
      }
    }
    return shown
  }, [groups, query])

  const nothingMatches = query.trim() !== '' && visible.size === 0

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {enhanced && (
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
            strokeWidth={1.75}
          />
          <input
            type="search"
            // Not `name`, and no `form` — see rule 2 above. Nothing about this
            // control should ever reach a form submission or the URL.
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search skills"
            placeholder="Search skills"
            className="h-9 w-full rounded border border-outline bg-surface-subtle pl-8 pr-2 text-sm text-text placeholder:text-text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>
      )}

      {/* Every skill renders — nothing is truncated to a "first N" budget — and
          the list absorbs its own height instead of growing the sidebar.
          `max-h-64` is about eight rows, enough that the grouping is visible
          without the Skills section pushing Posted and Sources off the screen.

          The search box sits OUTSIDE this container on purpose: it is what you
          reach for when the list is long, so scrolling it out of view at exactly
          the moment it becomes useful would be the same mistake as the onboarding
          footer that used to scroll away inside its own Card.

          `overscroll-contain` stops a flick at the end of the list from chaining
          into the sidebar's own scroll, and `pr-1` keeps the 2px focus outline on
          a checkbox from being clipped by the scroll container's edge. */}
      <div className="max-h-64 overflow-y-auto overscroll-contain pr-1 flex flex-col gap-3">
        {groups.map((group) => {
          const anyVisible = group.skills.some((s) => visible.has(s.name))
          return (
            <div key={group.key} className={anyVisible ? 'flex flex-col gap-2' : 'hidden'}>
              {/* Empty for the ungrouped case, which deliberately makes no claim
                  about the reader — see SKILL_GROUP_LABEL. */}
              {group.label && (
                <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  {group.label}
                </span>
              )}
              {group.skills.map((skill) => (
                <div key={skill.name} className={visible.has(skill.name) ? undefined : 'hidden'}>
                  {/* The listing count is deliberately not shown. It still decides
                      the ORDER — most-wanted skill first, see byCountThenName — but
                      a column of small numbers down the side of a filter list is
                      noise the reader has to parse on every row to use none of it. */}
                  <Checkbox
                    name="skill"
                    value={skill.name}
                    form={formId}
                    defaultChecked={skill.checked}
                    label={skill.name}
                  />
                </div>
              ))}
            </div>
          )
        })}

        {nothingMatches && (
          <p className="text-sm text-text-subtle">No skill here matches “{query.trim()}”.</p>
        )}
      </div>
    </div>
  )
}
