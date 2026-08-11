import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { JOBS, type Job } from '@/lib/jobs/data'
import { activeCount, clearAllHref, type FilterState } from '@/lib/jobs/filters'
import { Panel } from '@/components/dashboard/primitives'
import { JobCard } from './job-card'

/** What an empty result looks like. Pulled out of `JobList` so the live region
 *  above it is the only thing shared between the two branches — see the note
 *  on `JobList` itself. */
function EmptyResults({ filters }: { filters: FilterState }) {
  // Derived, not typed: a hardcoded "six" starts lying the day JOBS gains a
  // seventh entry, and this branch is the most-reached one in the whole
  // screen (any narrowing filter reaches it), so it is the worst place to
  // let copy drift from the data.
  const filterCount = activeCount(filters)
  const filterWord = filterCount === 1 ? 'filter is' : 'filters are'
  const listingWord = JOBS.length === 1 ? 'listing' : 'listings'

  return (
    <Panel className="flex flex-col items-center gap-4 p-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-text">
        <SearchX aria-hidden className="size-6" strokeWidth={1.5} />
      </span>
      <div className="flex max-w-[420px] flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight text-text">No listings match</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          {`${filterCount} ${filterWord} narrowing ${JOBS.length} sample ${listingWord}. Remove one, or clear them all and start again.`}
        </p>
      </div>
      <Link
        href={clearAllHref(filters)}
        scroll={false}
        className="inline-flex items-center rounded bg-ink px-4 py-2.5 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Clear all filters
      </Link>
    </Panel>
  )
}

/**
 * The result count, the grid, and what an empty result looks like.
 *
 * Two columns from md up, which is what the reference's screenshot shows: it
 * captures cards 1, 3 and 5 down the visible left half with 2, 4 and 6 hidden
 * behind the open drawer.
 *
 * The `aria-live="polite"` count sits above both branches rather than inside
 * the populated one. Filtering to zero results is routine now that the
 * sidebar and bar exist to do exactly that, so an announcer that only exists
 * in the populated branch would unmount itself right when there is finally
 * something to say — a single element whose text changes, present either way,
 * announces both directions.
 */
export function JobList({
  jobs,
  filters,
  selectedId,
}: {
  jobs: readonly Job[]
  filters: FilterState
  selectedId?: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-text-muted">
        {jobs.length} {jobs.length === 1 ? 'listing' : 'listings'}
      </p>

      {jobs.length === 0 ? (
        <EmptyResults filters={filters} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {jobs.map((job, i) => (
            <JobCard
              key={job.id}
              job={job}
              filters={filters}
              selected={job.id === selectedId}
              delay={i * 60}
            />
          ))}
        </div>
      )}
    </div>
  )
}
