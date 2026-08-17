import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { SettingsShell } from '@/components/settings/settings-shell'
import { viewer } from '@/lib/dashboard/viewer'
import type { Profile } from '@/app/(onboarding)/onboarding/[step]/forms'

export const metadata = { title: 'Preferences · Job Tracker AI' }

export default async function PreferencesPage() {
  const { display, email } = await viewer()

  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims.sub ?? '')

  // One select again, now that 20260817132659_autofill_job_filters is applied.
  // It was briefly split in two: an unapplied migration made the whole row null,
  // and the redirect below read that as "no profile" and bounced a valid session
  // to /sign-in, where the proxy forwarded it to /dashboard. What survives from
  // that is the `error` branch under this, not the split — a failed query and an
  // absent row need opposite responses and must not share one.
  const { data: row, error } = await supabase
    .from('profiles')
    .select(
      'career_goal, target_roles, skills, years_experience, work_location, salary_period, salary_target, salary_currency, autofill_job_filters',
    )
    .eq('id', userId)
    .maybeSingle()

  // Distinguished, because they need opposite responses. A failed query is a
  // server fault and must be visible; no row for a valid session means the signup
  // trigger never fired, which the sign-in redirect is the right answer to.
  if (error) {
    // Codes and column names only — never a row's contents (P3).
    console.warn(`[settings] profile read failed for user ${userId}: ${error.code} ${error.message}`)
    throw new Error('Could not load your preferences.')
  }
  if (!row) redirect('/sign-in')

  const profile: Profile = {
    career_goal: row.career_goal,
    target_roles: row.target_roles ?? [],
    skills: row.skills ?? [],
    years_experience: row.years_experience,
    work_location: row.work_location,
    salary_period: row.salary_period,
    salary_target: row.salary_target,
    salary_currency: row.salary_currency,
  }

  return (
    <SettingsShell
      current="/settings/preferences"
      name={display}
      email={email}
      title="Preferences"
      description="What we know about the work you are looking for. Change any of it, any time."
    >
      {/* A separate prop rather than a field on `Profile`, which is the shape the
          onboarding wizard shares — the wizard has no toggle, and widening that
          type would imply it does. */}
      <PreferencesForm profile={profile} autofill={row.autofill_job_filters} />
    </SettingsShell>
  )
}
