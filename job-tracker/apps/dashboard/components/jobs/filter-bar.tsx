import Link from 'next/link'
import { X } from 'lucide-react'
import { SegmentedField } from '@job-tracker/ui'
import { activeChips, clearAllHref, jobsHref, withoutChip, type FilterState } from '@/lib/jobs/filters'
import { STICKY_BAR } from '@/lib/jobs/layout'
import { SALARY_PERIODS } from '@/lib/jobs/salary'
import { FILTER_FORM_ID } from './search-header'

/**
 * The sticky bar: what unit salaries are in on the left, what is filtering on
 * the right.
 *
 * The count is `chips.length`, not a number typed beside them — the reference
 * prints "12 Active Filters:" above four chips and one ticked checkbox, which
 * is what happens when the two are written separately.
 *
 * The period toggle is in the bar and NOT counted as a filter, because it is a
 * unit: it changes how every salary reads and never changes which listings
 * survive. It posts into the same form as everything else.
 *
 * Each chip's remove link is `withoutChip` applied to the current state, so
 * removing one filter cannot disturb the others — including the second value of
 * the same facet.
 *
 * The row is `flex-nowrap overflow-x-auto` rather than wrapping. `h-10` is a
 * hard height — BAR_HEIGHT's arithmetic and STICKY_SIDEBAR's top-[136px] both
 * depend on it — so a second line has nowhere to grow into and would spill
 * out of the bar over the results below it instead. Scrolling sideways is
 * also how the reference design's own filter row handles overflow. Every
 * child that could shrink or wrap on its own (the chip list, each chip, the
 * count, Clear all) is pinned with `shrink-0`/`flex-nowrap` too, so the whole
 * row scrolls as one line instead of individual pieces wrapping inside a
 * fixed-height box.
 */
export function FilterBar({ filters }: { filters: FilterState }) {
  const chips = activeChips(filters)

  return (
    <div className={STICKY_BAR}>
      {/* h-10: this is the 40px control row BAR_HEIGHT's comment counts on top
          of the bar's own py-3. STICKY_SIDEBAR's top-[136px] depends on this
          row being exactly this tall, so it is set here rather than left to
          the shortest control inside it (SegmentedField size="compact"). Pinned
          by layout.test.ts, which reads this file for the literal string. */}
      <div className="flex h-10 flex-nowrap items-center gap-x-4 overflow-x-auto">
        <div className="shrink-0">
          <SegmentedField
            name="period"
            legend="Show salaries as"
            legendHidden
            size="compact"
            form={FILTER_FORM_ID}
            value={filters.period}
            options={SALARY_PERIODS}
          />
        </div>

        {chips.length > 0 && (
          <>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {chips.length} active
            </span>

            <ul className="flex flex-nowrap items-center gap-2">
              {chips.map((chip) => (
                <li key={chip.key} className="shrink-0">
                  <Link
                    href={jobsHref(withoutChip(filters, chip.key))}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 rounded-full border border-outline bg-surface px-3 py-1 text-xs font-medium text-text transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {chip.label}
                    <X aria-hidden className="size-3" strokeWidth={2.5} />
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={clearAllHref(filters)}
              scroll={false}
              className="ml-auto shrink-0 rounded text-xs font-semibold text-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Clear all
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
