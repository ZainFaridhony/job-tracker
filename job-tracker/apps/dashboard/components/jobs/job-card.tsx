import Link from 'next/link'
import { Bookmark, Users } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import { MODE_LABEL, type Job } from '@/lib/jobs/data'
import { postedAgo } from '@/lib/jobs/derive'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { formatRange } from '@/lib/jobs/salary'
import { CompanyMark, CompetitionMeter, MatchPill, Pill, VerifiedTick } from './primitives'

/**
 * One listing.
 *
 * The whole card is the link, and the bookmark button sits outside it rather
 * than inside — a button nested in an anchor is invalid HTML and the browser's
 * recovery differs, so the two are siblings in a relative container with the
 * link stretched across it by an ::after.
 *
 * The bookmark button alone carries `relative z-10` — not the row around it:
 * the stretched link paints on top of the header in source order, which
 * would otherwise swallow the button's disabled cursor under the link's
 * pointer cursor. Scoping it to just the button, rather than the row, leaves
 * the match pill beside it inside the card's link target, where it visually
 * belongs — z-10 on the whole row made the pill a second dead zone with no
 * navigation of its own.
 *
 * `scroll={false}`: opening a listing is a same-page navigation, and scrolling
 * the list back to the top to show a panel that was already visible is a
 * regression rather than a feature.
 */
export function JobCard({
  job,
  filters,
  selected,
  delay,
}: {
  job: Job
  filters: FilterState
  selected: boolean
  delay?: number
}) {
  return (
    <div
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        'group relative flex animate-rise flex-col gap-6 rounded-xl border bg-surface p-6 sm:p-8',
        'shadow-[0_12px_40px_rgba(0,0,0,0.06)]',
        'transition-[transform,box-shadow,border-color] duration-300 ease-entrance',
        'hover:-translate-y-1 hover:shadow-[0_15px_45px_rgba(0,0,0,0.12)] hover:border-outline',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected ? 'border-ink' : 'border-outline-subtle',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyMark mark={job.mark} />
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1">
              <span className="truncate text-base font-bold text-text">{job.company}</span>
              {job.verified && <VerifiedTick />}
            </span>
            <span className="truncate text-xs text-text-muted">
              {job.city} • {MODE_LABEL[job.mode]} • {postedAgo(job.postedHoursAgo)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <MatchPill score={job.match} />
          {/* Inert, and shaped so that reads as deliberate: saving a listing
              needs a table nothing writes to yet. `disabled` rather than a
              button that swallows the click. `relative z-10` lives here, on
              the button itself, so its disabled cursor still wins over the
              stretched link beneath it without also lifting the pill next to
              it out of the card's click target. */}
          <button
            type="button"
            disabled
            aria-label="Save this listing (not available on sample data)"
            className="relative z-10 rounded p-2 text-text-subtle disabled:cursor-not-allowed"
          >
            <Bookmark aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-text">
          {/* The stretched link. `after:absolute inset-0` makes the whole card
              the hit target without nesting the button inside an anchor. */}
          <Link
            href={jobsHref(filters, job.id)}
            scroll={false}
            className="rounded outline-none after:absolute after:inset-0 after:content-['']"
          >
            {job.title}
          </Link>
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>{formatRange(job.salary, filters.period, filters.currency)}</Pill>
          <Pill>
            <Users aria-hidden className="size-3.5" strokeWidth={1.75} />
            {job.applicants} applicants
            <span aria-hidden className="mx-1 h-3 w-px bg-outline-subtle" />
            <CompetitionMeter applicants={job.applicants} />
          </Pill>
        </div>
      </div>
    </div>
  )
}
