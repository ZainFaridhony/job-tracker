import { Clock, Send, Sparkles, Users } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard/nav'
import { WeeklyActivity } from '@/components/dashboard/activity'
import { PerformanceSummary } from '@/components/dashboard/performance'
import { ConversionPipeline } from '@/components/dashboard/pipeline'
import { DeltaTooltip } from '@/components/dashboard/delta-tooltip'
import { Eyebrow, Panel, StatCard } from '@/components/dashboard/primitives'
import { ResumeHealth } from '@/components/dashboard/resume-health'
import { viewer } from '@/lib/dashboard/viewer'
import {
  APPLIED,
  daysSince,
  HUNT_STARTED_ON,
  SCHEDULED,
  THIS_WEEK,
  TOP_MATCH,
  UNDER_REVIEW,
  weekOverWeek,
  WEEKS,
} from '@/lib/dashboard/dummy'

export const metadata = { title: 'Dashboard · Job Tracker AI' }

export default async function DashboardPage() {
  // The one real value on the page. Everything else is in lib/dashboard/dummy.
  const { display, greeting, email } = await viewer()
  const days = daysSince(HUNT_STARTED_ON, new Date())
  const started = new Date(`${HUNT_STARTED_ON}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const lastWeek = WEEKS.at(-1)!.count

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/dashboard" name={display} email={email} />

      {/* 1600px, from the reference's own Tailwind config. DESIGN.md says 1200px
          in prose and 1600px in the token block; the built markup uses 1600, so
          that is what the layout was actually designed against. */}
      <main className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-8 md:px-12">
        <section className="flex animate-rise flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text lg:text-4xl">
              Welcome back, {greeting}
            </h1>
            <p className="mt-1 text-base text-text-muted lg:text-lg">
              Your career overview and performance analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-auto">
            <Panel className="flex flex-col justify-center gap-1 p-5" delay={70}>
              <Eyebrow>Total job hunt duration</Eyebrow>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-2xl font-bold tracking-tight text-text">
                  {days} days
                </span>
                <span className="text-xs text-text-muted">Since {started}</span>
              </div>
            </Panel>

            <Panel className="flex flex-col justify-center gap-1 p-5" delay={140}>
              <Eyebrow>This week</Eyebrow>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-2xl font-bold tracking-tight text-text">
                  {THIS_WEEK} applications
                </span>
                <DeltaTooltip trend={weekOverWeek(THIS_WEEK, lastWeek)} noun="application" />
              </div>
            </Panel>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            delay={210}
            icon={<Send aria-hidden className="size-4" strokeWidth={1.75} />}
            value={String(APPLIED)}
            label="Total applications"
          />
          <StatCard
            delay={250}
            icon={<Clock aria-hidden className="size-4" strokeWidth={1.75} />}
            value={String(UNDER_REVIEW)}
            label="Under review"
          />
          <StatCard
            delay={290}
            icon={<Users aria-hidden className="size-4" strokeWidth={1.75} />}
            value={String(SCHEDULED)}
            label="Scheduled interviews"
          />
          <StatCard
            delay={330}
            icon={<Sparkles aria-hidden className="size-4" strokeWidth={1.75} />}
            value={`${TOP_MATCH.score}%`}
            badge={
              <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-on-ink">
                Highest match
              </span>
            }
            label={
              <>
                From <span className="font-semibold text-text">{TOP_MATCH.company}</span> —{' '}
                {TOP_MATCH.role}
              </>
            }
          />
        </section>

        <ConversionPipeline delay={380} />

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WeeklyActivity delay={430} />
          </div>
          <ResumeHealth delay={470} />
        </section>

        <PerformanceSummary delay={510} />
      </main>
    </div>
  )
}
