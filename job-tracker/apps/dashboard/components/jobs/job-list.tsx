import Link from 'next/link'
import { SearchX } from 'lucide-react'
import type { Job } from '@/lib/jobs/data'
import { activeCount, type FilterState } from '@/lib/jobs/filters'
import { Panel } from '@/components/dashboard/primitives'
import { JobCard } from './job-card'

/**
 * The result count, the grid, and what an empty result looks like.
 *
 * Two columns from md up, which is what the reference's screenshot shows: it
 * captures cards 1, 3 and 5 down the visible left half with 2, 4 and 6 hidden
 * behind the open drawer.
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
  if (jobs.length === 0) {
    return (
      <Panel className="flex flex-col items-center gap-4 p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-text">
          <SearchX aria-hidden className="size-6" strokeWidth={1.5} />
        </span>
        <div className="flex max-w-[420px] flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight text-text">No listings match</h2>
          <p className="text-sm leading-relaxed text-text-muted">
            {activeCount(filters)} filters are narrowing six sample listings. Remove one, or
            clear them all and start again.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center rounded bg-ink px-4 py-2.5 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Clear all filters
        </Link>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-text-muted">
        {jobs.length} {jobs.length === 1 ? 'listing' : 'listings'}
      </p>
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
    </div>
  )
}
