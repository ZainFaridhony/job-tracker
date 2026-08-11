import Link from 'next/link'
import { Share2, Sparkles, TrendingUp, Users, X } from 'lucide-react'
import { Tile } from '@/components/dashboard/primitives'
import { LEVEL_LABEL, MODE_LABEL, type Job } from '@/lib/jobs/data'
import { postedAgo, verdictFor } from '@/lib/jobs/derive'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { formatRange } from '@/lib/jobs/salary'
import { CompanyMark, CompetitionMeter, MatchRing, Pill, VerifiedTick } from './primitives'
import { PanelBehaviour } from './panel-behaviour'

/**
 * The listing, in full.
 *
 * A fixed overlay rendered inline by the server component, NOT a portalled
 * dialog. React's createPortal produces nothing during server rendering, so a
 * Base UI Dialog here would be a panel that simply does not exist without
 * JavaScript. `position: fixed` needs no portal — it escapes layout flow on its
 * own — so this renders, animates and closes on a plain URL. Base UI's Drawer
 * was also considered and set aside: it is built for snap points and swipe,
 * defaulting to `swipeDirection: 'down'` with snap points as fractions of
 * viewport height, which is the bottom-sheet case rather than a side panel.
 *
 * The backdrop is a link to the same close href, so clicking away works
 * without a handler.
 *
 * The reference's five content tabs (Summary / Job Description / Required
 * Quals / Preferred / About) are rendered as five stacked sections instead.
 * Tabs would need client state to hide four-fifths of a panel that already
 * scrolls, and hiding the requirements behind a tab is the opposite of what
 * someone reads a job ad for.
 */
export function DetailPanel({ job, filters }: { job: Job; filters: FilterState }) {
  const closeHref = jobsHref(filters)
  const panelId = `job-detail-panel-${job.id}`

  return (
    <>
      <PanelBehaviour closeHref={closeHref} panelId={panelId} />

      {/* aria-hidden: the same action is on a real, named button inside the
          panel, so this must not be a second announced control. */}
      <Link
        href={closeHref}
        scroll={false}
        aria-hidden
        tabIndex={-1}
        className="animate-fade fixed inset-0 z-50 bg-surface-inverse/20 backdrop-blur-sm motion-reduce:animate-none"
      />

      <aside
        id={panelId}
        tabIndex={-1}
        aria-label={`${job.title} at ${job.company}`}
        className="animate-slide-in fixed inset-y-0 right-0 z-[60] flex w-full flex-col overflow-hidden border-l border-outline-subtle bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.08)] motion-reduce:animate-none md:w-[560px] md:rounded-l-xl"
      >
        <header className="flex flex-col gap-4 border-b border-outline-subtle p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <CompanyMark mark={job.mark} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-text">{job.company}</span>
                  {job.verified && <VerifiedTick />}
                </span>
                <span className="truncate text-xs text-text-muted">
                  {job.city} ({MODE_LABEL[job.mode]}) • {postedAgo(job.postedHoursAgo)}
                </span>
              </div>
            </div>

            <Link
              href={closeHref}
              scroll={false}
              aria-label="Close listing"
              className="rounded p-2 text-text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <X aria-hidden className="size-5" strokeWidth={2} />
            </Link>
          </div>

          <h2 className="text-2xl font-bold leading-tight tracking-tight text-text">{job.title}</h2>

          <div className="flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
            {job.activelyHiring && (
              <Pill>
                {/* An ink dot, where the reference uses a green one. The
                    reference's own DESIGN.md prescribes exactly this: small
                    solid dots, monochrome, for status. */}
                <span aria-hidden className="size-1.5 rounded-full bg-ink" />
                Actively hiring
              </Pill>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-6">
          <section className="flex items-center justify-between gap-4 rounded-md bg-surface-inverse p-5">
            <div className="flex items-center gap-4">
              <MatchRing score={job.match} />
              <div>
                <h3 className="text-base font-semibold text-text-on-ink">
                  {verdictFor(job.match)}
                </h3>
                <p className="text-xs text-text-on-ink/70">Matched with {job.resumeVersion}</p>
              </div>
            </div>
            {/* Inert and labelled as such, in the same voice as the card's
                bookmark: resume optimisation is not built. The aria-label's
                visible-text prefix keeps it satisfying WCAG 2.5.3 even though
                the button also carries visible text. */}
            <button
              type="button"
              disabled
              aria-label="Optimise resume (not available on sample data)"
              className="flex shrink-0 items-center gap-2 rounded bg-surface px-4 py-2 text-xs font-bold text-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles aria-hidden className="size-4" strokeWidth={1.75} />
              Optimise resume
            </button>
          </section>

          <section className="flex flex-col gap-4 rounded-md border border-outline-subtle bg-surface p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text">
              <TrendingUp aria-hidden className="size-4" strokeWidth={1.75} />
              Salary insight
            </h3>

            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  Market estimate
                </span>
                <span className="text-base font-bold text-text">
                  {formatRange(job.marketSalary, filters.period)}
                </span>
              </div>
              <span aria-hidden className="h-10 w-px bg-outline-subtle" />
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  This listing
                </span>
                <span className="text-base font-bold text-text">
                  {formatRange(job.salary, filters.period)}
                </span>
              </div>
            </div>

            {/* A Tile, where the reference uses a blue box. Same translation
                InsightCard already made on the dashboard. */}
            <Tile>
              <p className="text-xs leading-relaxed text-text-muted">
                <span className="font-bold text-text">Insight:</span> {job.insight}
              </p>
            </Tile>
          </section>

          <section className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-outline-subtle pb-6">
            {[
              { label: 'Location', value: `${job.city} (${MODE_LABEL[job.mode]})` },
              { label: 'Experience', value: LEVEL_LABEL[job.level] },
              { label: 'Department', value: job.department },
              { label: 'Hiring manager', value: job.hiringManager },
            ].map((row) => (
              <div key={row.label} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">{row.label}</span>
                <span className="text-sm font-semibold text-text">{row.value}</span>
              </div>
            ))}
          </section>

          <section className="flex items-center gap-3">
            <Pill>
              <Users aria-hidden className="size-3.5" strokeWidth={1.75} />
              {job.applicants} applicants
            </Pill>
            <CompetitionMeter applicants={job.applicants} />
          </section>

          <article className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-text">The role</h3>
              <p className="text-sm leading-relaxed text-text-muted">{job.summary}</p>
            </div>

            {[
              { title: 'Responsibilities', items: job.responsibilities },
              { title: 'Requirements', items: job.requirements },
              { title: 'Nice to have', items: job.preferred },
            ].map((block) => (
              <div key={block.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-text">{block.title}</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text-muted">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-text">About {job.company}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{job.about}</p>
            </div>
          </article>
        </div>

        <footer className="flex flex-col gap-2 border-t border-outline-subtle bg-surface p-6">
          <div className="flex gap-3">
            <button
              type="button"
              disabled
              className="flex-1 rounded bg-ink py-3 text-sm font-bold text-text-on-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply now
            </button>
            <button
              type="button"
              disabled
              aria-label="Share listing (not available on sample data)"
              className="rounded border border-outline p-3 text-text-muted disabled:cursor-not-allowed"
            >
              <Share2 aria-hidden className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          {/* The one line that keeps the footer honest. A primary button that
              looks live and does nothing is worse than one that says why. */}
          <p className="text-xs text-text-muted">
            Sample listing — applying is not connected to anything yet.
          </p>
        </footer>
      </aside>
    </>
  )
}
