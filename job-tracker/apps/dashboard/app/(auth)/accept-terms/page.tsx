import { redirect } from 'next/navigation'
import { AuthShell } from '@job-tracker/ui'
import { createServerSupabase } from '@job-tracker/db/server'
import { AcceptForm } from './accept-form'

export const metadata = { title: 'Agree to continue · Job Tracker AI' }

export default async function AcceptTermsPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims.sub) redirect('/sign-in')

  // Already accepted - nothing to ask.
  const { data: profile } = await supabase
    .from('profiles')
    .select('accepted_terms_at')
    .eq('id', data.claims.sub as string)
    .maybeSingle()
  if (profile?.accepted_terms_at) redirect('/dashboard')

  return (
    <AuthShell
      headline="Land your dream role faster."
      sub="One workspace for every application, from first save to signed offer."
    >
      <AcceptForm />
    </AuthShell>
  )
}
