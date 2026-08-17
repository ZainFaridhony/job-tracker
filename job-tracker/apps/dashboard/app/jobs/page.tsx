import { DashboardNav } from '@/components/dashboard/nav'
import { DetailPanel } from '@/components/jobs/detail-panel'
import { FilterBar } from '@/components/jobs/filter-bar'
import { FilterSidebar } from '@/components/jobs/filter-sidebar'
import { JobList } from '@/components/jobs/job-list'
import { SearchHeader } from '@/components/jobs/search-header'
import { JOBS, jobById } from '@/lib/jobs/data'
import { activeCount, applyFilters, parseFilters, type RawParams } from '@/lib/jobs/filters'
import { cvSkills, navPreferences } from '@/lib/jobs/profile'
import { skillFacetGroups } from '@/lib/jobs/skills'
import { readTab } from '@/lib/jobs/tabs'
import { PAGE_SHELL } from '@/lib/jobs/layout'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Jobs · Job Tracker AI' }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>
}) {
  // Three awaits in one gate rather than in sequence: `cvSkills()` is a second
  // round trip to Postgres and there is no reason for it to wait on `viewer()`,
  // which is why the CV read is its own function instead of a column bolted onto
  // the identity query three other routes also run.
  const [{ display, email }, skills, prefs, raw] = await Promise.all([
    viewer(),
    cvSkills(),
    // For the sidebar's autofill toggle, which mirrors the settings checkbox.
    navPreferences(),
    searchParams,
  ])
  const filters = parseFilters(raw)
  const results = applyFilters(JOBS, filters)

  // Grouped by whether the CV already records each skill, and counted with the
  // Skills facet excluded from its own count so each figure says what ticking
  // would do. Built from JOBS rather than from `results` for that same reason —
  // see facetCounts.
  const skillGroups = skillFacetGroups(JOBS, filters, skills)

  // An unknown ?job= is ignored rather than 404ing the whole screen: the id is
  // one parameter among a dozen, and losing the list because one of them went
  // stale would be a worse trade than quietly showing the list.
  //
  // A repeated ?job=a&job=b takes the first value, matching filters.ts's own
  // `one()` helper — the two modules would otherwise disagree about what a
  // repeated parameter means.
  const selectedId = Array.isArray(raw.job) ? raw.job[0] : raw.job
  const selected = selectedId ? jobById(selectedId) : undefined

  // The bar holds only chips, so it is absent whenever nothing is filtering —
  // and the sidebar parks 64px higher when it is. One decision, read by both,
  // rather than each component deciding for itself and drifting.
  const hasBar = activeCount(filters) > 0

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/jobs" name={display} email={email} />

      <main className={PAGE_SHELL}>
        <h1 className="animate-rise text-3xl font-bold tracking-tight text-text lg:text-4xl">
          Jobs
        </h1>

        <SearchHeader filters={filters} />
        <FilterBar filters={filters} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
          <FilterSidebar
            filters={filters}
            hasBar={hasBar}
            skillGroups={skillGroups}
            prefs={prefs}
          />
          <div className="lg:col-span-3">
            <JobList jobs={results} filters={filters} selectedId={selected?.id} />
          </div>
        </div>

        {selected && <DetailPanel job={selected} filters={filters} tab={readTab(raw)} />}
      </main>
    </div>
  )
}
