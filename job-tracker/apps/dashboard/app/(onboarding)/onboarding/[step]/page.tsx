import { notFound, redirect } from 'next/navigation'
import { WizardShell } from '@job-tracker/ui'
import { createServerSupabase } from '@job-tracker/db/server'
import { ResumeForm } from '@/components/resume-upload'
import { onboardingRedirect } from '@/lib/onboarding/gate'
import { slugForStep, stepBySlug, STEPS, TOTAL_STEPS } from '@/lib/onboarding/steps'
import { DoneForm, PreferencesForm, ProfileForm, type Profile } from './forms'

export const metadata = { title: 'Get started · Job Tracker AI' }

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step: slug } = await params
  const step = stepBySlug(slug)
  if (!step) notFound()

  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub
  if (!userId) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'career_goal, target_roles, skills, years_experience, work_location, salary_period, salary_target, salary_currency, onboarding_step, onboarding_complete, cv_prefilled_at',
    )
    .eq('id', userId as string)
    .maybeSingle()

  if (!profile) redirect('/sign-in')

  // Same rules the proxy applies, so a soft client navigation and a cold load
  // cannot disagree about which step is reachable.
  const target = onboardingRedirect(`/onboarding/${slug}`, {
    complete: profile.onboarding_complete,
    step: profile.onboarding_step,
  })
  if (target) redirect(target)

  const p: Profile = {
    career_goal: profile.career_goal,
    target_roles: profile.target_roles ?? [],
    skills: profile.skills ?? [],
    years_experience: profile.years_experience,
    work_location: profile.work_location,
    salary_period: profile.salary_period,
    salary_target: profile.salary_target,
    salary_currency: profile.salary_currency,
  }

  // The `cvs` query that used to live here is gone with the filename row it fed.
  // Step 4 now confirms what the profile holds, and every one of those values is
  // already on `profiles` — so no step reads the CV table, and the wizard costs
  // one query on every step instead of two on the last.

  // "Here's what we read" is a lie over empty fields, which is what a Cerebras
  // outage leaves behind. cv_prefilled_at records whether the model actually
  // returned anything, so the copy follows the event rather than the field
  // values — which the user may since have edited by hand.
  const sub =
    step.slug === 'profile' && !profile.cv_prefilled_at ? step.subNoPrefill : step.sub

  // Undefined on step 1, where there is nothing behind. Each form renders it
  // beside its own submit button, so the two directions sit together.
  const backHref = step.n > 1 ? `/onboarding/${slugForStep(step.n - 1)}` : undefined

  return (
    <WizardShell
      step={step.n}
      total={TOTAL_STEPS}
      steps={STEPS}
      title={step.title}
      sub={sub}
    >
      {step.slug === 'resume' && <ResumeForm backHref={backHref} />}
      {step.slug === 'profile' && <ProfileForm profile={p} backHref={backHref} />}
      {step.slug === 'preferences' && <PreferencesForm profile={p} backHref={backHref} />}
      {step.slug === 'done' && <DoneForm profile={p} backHref={backHref} />}
    </WizardShell>
  )
}
