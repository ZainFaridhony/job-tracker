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
  const { data: row } = await supabase
    .from('profiles')
    .select(
      'career_goal, target_roles, skills, years_experience, work_location, salary_period, salary_target, salary_currency',
    )
    .eq('id', String(claims?.claims.sub ?? ''))
    .maybeSingle()

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
      <PreferencesForm profile={profile} />
    </SettingsShell>
  )
}
