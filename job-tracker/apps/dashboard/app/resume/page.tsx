import { FileText } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard/nav'
import { SectionPlaceholder } from '@/components/dashboard/section-placeholder'
import { viewer } from '@/lib/dashboard/viewer'
import { navPreferences } from '@/lib/jobs/profile'
import { seedJobsHref } from '@/lib/jobs/seed'

export const metadata = { title: 'Resume · Job Tracker AI' }

export default async function ResumePage() {
  // Concurrent, not serial: the seeded Jobs link needs the preference row and
  // there is no reason for it to wait on the identity query.
  const [{ display, email }, prefs] = await Promise.all([viewer(), navPreferences()])
  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav
        current="/resume"
        name={display}
        email={email}
        jobsHref={seedJobsHref(prefs)}
      />
      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-12">
        <SectionPlaceholder
          icon={<FileText aria-hidden className="size-6" strokeWidth={1.5} />}
          title="Resume"
          description="Your CV is stored and its text extracted during onboarding, but there is no place to read or re-upload it yet. Resume health on the dashboard is placeholder data."
        />
      </main>
    </div>
  )
}
