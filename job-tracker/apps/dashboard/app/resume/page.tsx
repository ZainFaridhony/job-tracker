import { FileText } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard/nav'
import { SectionPlaceholder } from '@/components/dashboard/section-placeholder'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Resume · Job Tracker AI' }

export default async function ResumePage() {
  const { display, email } = await viewer()
  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/resume" name={display} email={email} />
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
