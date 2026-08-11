import { MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { Input, Select } from '@job-tracker/ui'
import { Panel } from '@/components/dashboard/primitives'
import { MODE_LABEL, TRENDING, WORK_MODES } from '@/lib/jobs/data'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { AutoSubmit } from './auto-submit'

/**
 * The search card, and the <form> element the whole screen submits through.
 *
 * `method="GET"` is the point. Filter state is the URL, so submitting this form
 * IS applying the filters: no client state, no server action, and the screen
 * works with JavaScript off — which is the standard the onboarding wizard
 * already holds. AutoSubmit below is a pure enhancement on top.
 *
 * The sidebar is rendered further down the page, inside the results grid, so it
 * cannot be a descendant of this element. Its controls carry
 * `form={FILTER_FORM_ID}` instead — the same association-by-id that lets the
 * account menu submit a sign-out form it does not contain.
 */
export const FILTER_FORM_ID = 'job-filters'

export function SearchHeader({ filters }: { filters: FilterState }) {
  return (
    <Panel className="p-6 sm:p-8" delay={70}>
      <form
        id={FILTER_FORM_ID}
        method="GET"
        action="/jobs"
        className="grid grid-cols-1 items-end gap-4 md:grid-cols-5"
      >
        <AutoSubmit formId={FILTER_FORM_ID} />

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
            With JavaScript, AutoSubmit has usually already run — but the button
            stays visible because a search field without a search button reads
            as broken, and a keyboard Enter needs a default submit anyway. */}
        <button
          type="submit"
          className="h-12 rounded bg-ink px-6 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Search
        </button>
      </form>

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
            className="rounded-full border border-outline-subtle bg-surface px-3 py-1 text-xs font-medium text-text-muted transition-colors duration-150 hover:border-outline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {term}
          </Link>
        ))}
      </div>
    </Panel>
  )
}
