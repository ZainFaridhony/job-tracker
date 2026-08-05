import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthShell } from '@job-tracker/ui'
import { createServerSupabase } from '@job-tracker/db/server'
import { RECOVERY_COOKIE } from '@/lib/auth-cookies'
import { ResetForm } from './reset-form'

export const metadata = { title: 'Set new password · Job Tracker AI' }

export default async function ResetPasswordPage() {
  // A live session is not sufficient. verifyOtp mints an ordinary one, so
  // without the recovery marker any signed-in visitor — including someone on a
  // stolen cookie — could change the password without knowing the current one.
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  const cookieStore = await cookies()
  if (!data?.claims || cookieStore.get(RECOVERY_COOKIE)?.value !== '1') {
    redirect('/forgot-password')
  }

  return (
    <AuthShell
      headline="Land your dream role faster."
      sub="One workspace for every application, from first save to signed offer."
    >
      <ResetForm />
    </AuthShell>
  )
}
