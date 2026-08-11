import Link from 'next/link'
import { X } from 'lucide-react'
import { activeChips, clearAllHref, jobsHref, withoutChip, type FilterState } from '@/lib/jobs/filters'
import { STICKY_BAR } from '@/lib/jobs/layout'

/**
 * The sticky bar: what is currently filtering, and how to stop it.
 *
 * Chips only. The salary period and currency toggles used to ride on the left
 * here, and they moved into the sidebar's own Salary section — a unit belongs
 * beside the figure it describes and beside the threshold typed in it, not in a
 * separate bar two hundred pixels away that also holds unrelated controls.
 *
 * With the toggles gone the bar has nothing to show on an untouched screen, so
 * it renders nothing rather than an empty 64px strip. That makes it a
 * conditional layer, which is why the sidebar's sticky offset is now
 * `stickySidebar(hasBar)` rather than a constant — see lib/jobs/layout.ts.
 *
 * The count is `chips.length`, not a number typed beside them — the reference
 * prints "12 Active Filters:" above four chips and one ticked checkbox, which
 * is what happens when the two are written separately.
 *
 * Each chip's remove link is `withoutChip` applied to the current state, so
 * removing one filter cannot disturb the others — including the second value of
 * the same facet.
 *
 * The row is `flex-nowrap overflow-x-auto` rather than wrapping. `h-10` is a
 * hard height — BAR_HEIGHT's arithmetic and STICKY_SIDEBAR's top-[136px] both
 * depend on it — so a second line has nowhere to grow into and would spill out
 * of the bar over the results below it instead. Scrolling sideways is also how
 * the reference design's own filter row handles overflow. Every child that
 * could shrink or wrap on its own is pinned with `shrink-0`/`flex-nowrap` too,
 * so the whole row scrolls as one line instead of individual pieces wrapping
 * inside a fixed-height box.
 */
export function FilterBar({ filters }: { filters: FilterState }) {
  const chips = activeChips(filters)
  if (chips.length === 0) return null

  return (
    <div className={STICKY_BAR}>
      {/* h-10: this is the 40px control row BAR_HEIGHT's comment counts on top
          of the bar's own py-3. STICKY_SIDEBAR's top-[136px] depends on this
          row being exactly this tall, so it is set here rather than left to the
          tallest chip inside it. Pinned by layout.test.ts, which reads this
          file for the literal string. */}
      <div className="flex h-10 flex-nowrap items-center gap-x-4 overflow-x-auto">
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
      </div>
    </div>
  )
}
