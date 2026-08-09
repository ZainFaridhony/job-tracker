import { Briefcase } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard/nav'
import { SectionPlaceholder } from '@/components/dashboard/section-placeholder'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Jobs · Job Tracker AI' }

export default async function JobsPage() {
  const { display, email } = await viewer()
  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/jobs" name={display} email={email} />
      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-12">
        <SectionPlaceholder
          icon={<Briefcase aria-hidden className="size-6" strokeWidth={1.5} />}
          title="Jobs"
          description="Job discovery is not built. PRD NG2 currently rules it out, so this tab exists to keep the navigation honest rather than to hint at a feature that is on its way."
        />
      </main>
    </div>
  )
}
