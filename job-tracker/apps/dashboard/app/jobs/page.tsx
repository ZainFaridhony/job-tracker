import { DashboardNav } from '@/components/dashboard/nav'
import { JobList } from '@/components/jobs/job-list'
import { SampleBadge } from '@/components/jobs/primitives'
import { JOBS } from '@/lib/jobs/data'
import { applyFilters, parseFilters, type RawParams } from '@/lib/jobs/filters'
import { PAGE_SHELL } from '@/lib/jobs/layout'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Jobs · Job Tracker AI' }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>
}) {
  const [{ display, email }, raw] = await Promise.all([viewer(), searchParams])
  const filters = parseFilters(raw)
  const results = applyFilters(JOBS, filters)

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/jobs" name={display} email={email} />

      <main className={PAGE_SHELL}>
        <div className="flex animate-rise flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-text lg:text-4xl">Jobs</h1>
          <SampleBadge />
        </div>

        <JobList jobs={results} filters={filters} />
      </main>
    </div>
  )
}
