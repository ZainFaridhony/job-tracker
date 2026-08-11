import { MapPin, Search } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { Input, Select } from '@job-tracker/ui'
import { Panel } from '@/components/dashboard/primitives'
import { MODE_LABEL, TRENDING, WORK_MODES } from '@/lib/jobs/data'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { FilterFormBehaviour } from './filter-form-behaviour'

/**
 * The search card, and the `<Form>` the whole screen submits through.
 *
 * `next/form`'s `<Form>` renders a real `<form action="/jobs">` — the no-JS
 * path is unchanged, a submit still becomes `GET /jobs?...` on the URL, and
 * that is still the point: filter state is the URL, so submitting this form
 * IS applying the filters, with no client state and no server action.
 *
 * What changes from a plain `<form>` is that, with JavaScript, `<Form>`
 * intercepts the submit and does a client-side navigation instead of a full
 * document load. That was not a nicety — a full reload was an actual bug: it
 * snapped every `<details>` section in the sidebar shut (only "Job
 * information" starts open, so ticking a second skill meant reopening Skills
 * every time), lost focus, replayed every `animate-rise`, and tore down and
 * rebuilt D2's live region in a fresh document — where a screen reader does
 * not announce content that was already there at load, so the announcer only
 * ever fired on chip removal and never on the sidebar interactions that
 * actually empty the list.
 *
 * Scroll position is a separate claim, not one this switch settles. A
 * client-side navigation still calls Next's router with `scroll` undefined,
 * and Next resets `scrollTop` to 0 whenever the changed segment's top edge
 * isn't already in view — so without more, ticking a checkbox at the bottom
 * of the sidebar would throw the page back to the top exactly as a full
 * reload would. What actually preserves scroll here is `scroll={false}`,
 * carried on every same-page link and on this `<Form>` itself: opening or
 * closing a listing, removing a chip, Clear All, a Trending term, and
 * submitting a filter change all stay where they were.
 *
 * `<Form>` has no `method` prop to set — passing one is a type error. That is
 * not a gap: this component only ever does the one kind of navigation a GET
 * form does (fold the fields into a URL), which is exactly what this screen
 * needs.
 *
 * The sidebar is rendered further down the page, inside the results grid, so it
 * cannot be a descendant of this element. Its controls carry
 * `form={FILTER_FORM_ID}` instead — the same association-by-id that lets the
 * account menu submit a sign-out form it does not contain.
 *
 * `FilterFormBehaviour` (formerly `AutoSubmit`, before it also took on
 * resyncing controls to the URL after a client-side navigation — see its own
 * doc comment) submits this form on change and keeps every control honest
 * afterwards.
 */
export const FILTER_FORM_ID = 'job-filters'

export function SearchHeader({ filters }: { filters: FilterState }) {
  return (
    <Panel className="p-6 sm:p-8" delay={70}>
      <Form
        id={FILTER_FORM_ID}
        action="/jobs"
        scroll={false}
        className="grid grid-cols-1 items-end gap-4 md:grid-cols-5"
      >
        <FilterFormBehaviour formId={FILTER_FORM_ID} />

        <div className="md:col-span-2">
          <Input
            label="Job title, keywords"
            name="q"
            defaultValue={filters.q}
            placeholder="e.g. Senior Product Designer"
            icon={<Search aria-hidden className="size-4" strokeWidth={1.75} />}
          />
        </div>

        <Input
          label="Location"
          name="location"
          defaultValue={filters.location}
          placeholder="Remote or city"
          icon={<MapPin aria-hidden className="size-4" strokeWidth={1.75} />}
        />

        <Select
          label="Work mode"
          name="mode"
          value={filters.modes[0] ?? null}
          placeholder="Any"
          options={WORK_MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        />

        {/* Present for the no-JS path, where nothing else applies the form.
            With JavaScript, FilterFormBehaviour has usually already run — but
            the button stays visible because a search field without a search
            button reads as broken, and a keyboard Enter needs a default
            submit anyway. */}
        <button
          type="submit"
          className="h-12 rounded bg-ink px-6 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Search
        </button>
      </Form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Trending
        </span>
        {/* Real queries against the corpus, so none of them lands on an empty
            state — a "trending" chip that finds nothing is worse than no chip. */}
        {TRENDING.map((term) => (
          <Link
            key={term}
            href={jobsHref({ ...filters, q: term })}
            scroll={false}
            className="rounded-full border border-outline bg-surface px-3 py-1 text-xs font-medium text-text-muted transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {term}
          </Link>
        ))}
      </div>
    </Panel>
  )
}
