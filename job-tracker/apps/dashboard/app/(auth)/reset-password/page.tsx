import { redirect } from 'next/navigation'
import { AuthShell } from '@job-tracker/ui'
import { createServerSupabase } from '@job-tracker/db/server'
import { ResetForm } from './reset-form'

export const metadata = { title: 'Set new password · Job Tracker AI' }

export default async function ResetPasswordPage() {
  // Reaching this page without a session means the recovery link was never
  // verified. Send them back for a fresh one rather than showing a form whose
  // submit could only fail.
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/forgot-password')

  return (
    <AuthShell headline="Land your dream role faster." sub="One workspace for every application, from first save to signed offer.">
      <ResetForm />
    </AuthShell>
  )
}
