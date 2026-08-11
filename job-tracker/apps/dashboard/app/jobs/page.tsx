import { DashboardNav } from '@/components/dashboard/nav'
import { DetailPanel } from '@/components/jobs/detail-panel'
import { FilterBar } from '@/components/jobs/filter-bar'
import { FilterSidebar } from '@/components/jobs/filter-sidebar'
import { JobList } from '@/components/jobs/job-list'
import { SampleBadge } from '@/components/jobs/primitives'
import { SearchHeader } from '@/components/jobs/search-header'
import { JOBS, jobById } from '@/lib/jobs/data'
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

  // An unknown ?job= is ignored rather than 404ing the whole screen: the id is
  // one parameter among a dozen, and losing the list because one of them went
  // stale would be a worse trade than quietly showing the list.
  const selectedId = typeof raw.job === 'string' ? raw.job : undefined
  const selected = selectedId ? jobById(selectedId) : undefined

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/jobs" name={display} email={email} />

      <main className={PAGE_SHELL}>
        <div className="flex animate-rise flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-text lg:text-4xl">Jobs</h1>
          <SampleBadge />
        </div>

        <SearchHeader filters={filters} />
        <FilterBar filters={filters} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
          <FilterSidebar filters={filters} />
          <div className="lg:col-span-3">
            <JobList jobs={results} filters={filters} selectedId={selected?.id} />
          </div>
        </div>

        {selected && <DetailPanel job={selected} filters={filters} />}
      </main>
    </div>
  )
}
