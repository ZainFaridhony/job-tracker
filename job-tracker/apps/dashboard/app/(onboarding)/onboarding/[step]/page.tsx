import { notFound, redirect } from 'next/navigation'
import { WizardShell } from '@job-tracker/ui'
import { createServerSupabase } from '@job-tracker/db/server'
import { onboardingRedirect } from '@/lib/onboarding/gate'
import { stepBySlug, TOTAL_STEPS } from '@/lib/onboarding/steps'
import {
  DoneForm,
  GoalForm,
  ResumeForm,
  RolesForm,
  SkillsForm,
  WorkForm,
  type Profile,
} from './forms'

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
      'career_goal, target_roles, skills, years_experience, work_location, salary_period, salary_target, onboarding_step, onboarding_complete',
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
  }

  return (
    <WizardShell step={step.n} total={TOTAL_STEPS} title={step.title} sub={step.sub}>
      {step.slug === 'resume' && <ResumeForm />}
      {step.slug === 'goals' && <GoalForm profile={p} />}
      {step.slug === 'roles' && <RolesForm profile={p} />}
      {step.slug === 'skills' && <SkillsForm profile={p} />}
      {step.slug === 'work' && <WorkForm profile={p} />}
      {step.slug === 'done' && <DoneForm profile={p} />}
    </WizardShell>
  )
}
