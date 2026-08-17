import { Send } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard/nav'
import { SectionPlaceholder } from '@/components/dashboard/section-placeholder'
import { viewer } from '@/lib/dashboard/viewer'
import { navPreferences } from '@/lib/jobs/profile'
import { seedJobsHref } from '@/lib/jobs/seed'

export const metadata = { title: 'Applications · Job Tracker AI' }

export default async function ApplicationsPage() {
  // Concurrent, not serial: the seeded Jobs link needs the preference row and
  // there is no reason for it to wait on the identity query.
  const [{ display, email }, prefs] = await Promise.all([viewer(), navPreferences()])
  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav
        current="/applications"
        name={display}
        email={email}
        jobsHref={seedJobsHref(prefs)}
      />
      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-12">
        <SectionPlaceholder
          icon={<Send aria-hidden className="size-6" strokeWidth={1.5} />}
          title="Applications"
          description="The application board arrives with Phase 1.0. Every figure on the dashboard today is placeholder data, and this is where the real ones will come from."
        />
      </main>
    </div>
  )
}
