import Link from 'next/link'
import { X } from 'lucide-react'
import { SegmentedField } from '@job-tracker/ui'
import {
  activeChips,
  activeCount,
  EMPTY_FILTERS,
  jobsHref,
  withoutChip,
  type FilterState,
} from '@/lib/jobs/filters'
import { STICKY_BAR } from '@/lib/jobs/layout'
import { SALARY_PERIODS } from '@/lib/jobs/salary'
import { FILTER_FORM_ID } from './search-header'

/**
 * The sticky bar: what unit salaries are in on the left, what is filtering on
 * the right.
 *
 * The count is `activeChips().length`, not a number typed beside them — the
 * reference prints "12 Active Filters:" above four chips and one ticked
 * checkbox, which is what happens when the two are written separately.
 *
 * The period toggle is in the bar and NOT counted as a filter, because it is a
 * unit: it changes how every salary reads and never changes which listings
 * survive. It posts into the same form as everything else.
 *
 * Each chip's remove link is `withoutChip` applied to the current state, so
 * removing one filter cannot disturb the others — including the second value of
 * the same facet.
 */
export function FilterBar({ filters }: { filters: FilterState }) {
  const chips = activeChips(filters)
  // Keeps the reader's chosen salary period — period is a display unit, not a
  // filter, and a bare href="/jobs" would silently reset it back to yearly.
  const clearAllHref = jobsHref({ ...EMPTY_FILTERS, period: filters.period })

  return (
    <div className={STICKY_BAR}>
      {/* h-10: this is the 40px control row BAR_HEIGHT's comment counts on top
          of the bar's own py-3. STICKY_SIDEBAR's top-[136px] depends on this
          row being exactly this tall, so it is set here rather than left to
          the shortest control inside it (SegmentedField size="compact"). */}
      <div className="flex h-10 flex-wrap items-center gap-x-4 gap-y-3">
        <SegmentedField
          name="period"
          legend="Show salaries as"
          legendHidden
          size="compact"
          form={FILTER_FORM_ID}
          value={filters.period}
          options={SALARY_PERIODS}
        />

        {chips.length > 0 && (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {activeCount(filters)} active
            </span>

            <ul className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <Link
                    href={jobsHref(withoutChip(filters, chip.key))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-outline-subtle bg-surface px-3 py-1 text-xs font-medium text-text transition-colors duration-150 hover:border-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {chip.label}
                    <X aria-hidden className="size-3" strokeWidth={2.5} />
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={clearAllHref}
              className="ml-auto rounded text-xs font-semibold text-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Clear all
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
