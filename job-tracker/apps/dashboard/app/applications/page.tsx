import { Send } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard/nav'
import { SectionPlaceholder } from '@/components/dashboard/section-placeholder'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Applications · Job Tracker AI' }

export default async function ApplicationsPage() {
  const { display, email } = await viewer()
  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/applications" name={display} email={email} />
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
