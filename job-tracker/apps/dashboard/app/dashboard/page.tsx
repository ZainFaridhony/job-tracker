import { createServerSupabase } from '@job-tracker/db/server'
import { Logo } from '@job-tracker/ui'
import { signOutAction } from '@/lib/actions/auth'

export const metadata = { title: 'Dashboard · Job Tracker AI' }

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()

  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between">
        <Logo className="h-8 w-auto text-ink" />
        <form action={signOutAction}>
          <button type="submit" className="text-sm text-text-muted hover:text-text">
            Sign out
          </button>
        </form>
      </div>
      <div className="mx-auto mt-16 max-w-[1200px]">
        <h1 className="text-3xl font-bold tracking-tight text-text">You are signed in</h1>
        <p className="mt-3 text-sm text-text-muted">
          Signed in as {String(data?.claims.email ?? 'unknown')}. The board arrives in Phase 1.0.
        </p>
      </div>
    </main>
  )
}
