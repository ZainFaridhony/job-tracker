'use server'

import { redirect } from 'next/navigation'
import { createGroqExtractor } from '@job-tracker/ai'
import { createServerSupabase } from '@job-tracker/db/server'
import { extractText, DOCX_MIME, PDF_MIME, MAX_BYTES } from '../cv/extract-text'
import { slugForStep } from './steps'

export type StepState = { error?: string }

/**
 * One message per named failure. The scan case earns the longest copy because
 * it is the only one the user can act on but cannot guess at: a text-only model
 * cannot read an image, and "nothing was found" would look like our bug.
 */
const FAILURE_COPY: Record<string, string> = {
  'unsupported-type': 'That file type is not supported. Upload a PDF or a Word document.',
  'too-large': 'That file is over 10 MB. Try exporting a smaller PDF.',
  'no-text-layer':
    'We could not find any selectable text in that file — it looks like a scan or an image. Export your CV as a text-based PDF, or upload the Word original.',
  corrupt: 'We could not open that file. It may be damaged or password-protected.',
}

async function currentUserId(): Promise<string> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims.sub
  if (!id) redirect('/sign-in')
  return id as string
}

export async function uploadCvAction(_prev: StepState, form: FormData): Promise<StepState> {
  const file = form.get('cv')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload.' }
  if (file.size > MAX_BYTES) return { error: FAILURE_COPY['too-large']! }
  if (file.type !== PDF_MIME && file.type !== DOCX_MIME) {
    return { error: FAILURE_COPY['unsupported-type']! }
  }

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  const buffer = Buffer.from(await file.arrayBuffer())

  // Extract before storing: no point keeping a file we cannot read.
  const extracted = await extractText(buffer, file.type)
  if (!extracted.ok) return { error: FAILURE_COPY[extracted.reason] ?? FAILURE_COPY['corrupt']! }

  // Namespaced by user id — the storage policy checks the first path segment.
  // Collapsing runs of dots matters as much as replacing the separator: `/`
  // alone leaves `..` intact, and a `..` segment is exactly what the policy's
  // first-segment check assumes cannot appear.
  const safeName = file.name
    .replace(/[^\w.\-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(-100)
  const path = `${userId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return { error: 'We could not save that file. Try again.' }

  // extracted_text sits outside the UPDATE grant, but INSERT is unrestricted at
  // column level, so this writes under the user's own RLS — no elevated client.
  const { error: rowError } = await supabase.from('cvs').insert({
    user_id: userId,
    storage_path: path,
    file_name: file.name,
    extracted_text: extracted.text,
    char_count: extracted.chars,
    is_primary: true,
  })
  if (rowError) return { error: 'We could not save that file. Try again.' }

  // Pre-fill steps 3 and 4. A Groq failure must never block onboarding — the
  // user just fills those in by hand.
  let targetRoles: string[] = []
  let skills: string[] = []
  let yearsExperience: number | null = null
  try {
    const profile = await createGroqExtractor().extract(extracted.text)
    targetRoles = profile.targetRoles
    skills = profile.skills
    yearsExperience = profile.yearsExperience
  } catch {
    // Swallowed on purpose: a provider error can echo the prompt, and the
    // prompt is the user's CV (P3).
  }

  await supabase
    .from('profiles')
    .update({
      target_roles: targetRoles,
      skills,
      years_experience: yearsExperience,
      onboarding_step: 2,
    })
    .eq('id', userId)

  redirect(`/onboarding/${slugForStep(2)}`)
}

export async function saveGoalAction(_prev: StepState, form: FormData): Promise<StepState> {
  const goal = String(form.get('career_goal') ?? '')
  if (!goal) return { error: 'Pick the one that fits best.' }

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  await supabase.from('profiles').update({ career_goal: goal, onboarding_step: 3 }).eq('id', userId)
  redirect(`/onboarding/${slugForStep(3)}`)
}

export async function saveRolesAction(_prev: StepState, form: FormData): Promise<StepState> {
  const roles = form.getAll('target_roles').map(String).filter(Boolean)
  if (roles.length === 0) return { error: 'Keep at least one role, or add your own.' }

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  await supabase
    .from('profiles')
    .update({ target_roles: roles, onboarding_step: 4 })
    .eq('id', userId)
  redirect(`/onboarding/${slugForStep(4)}`)
}

export async function saveSkillsAction(_prev: StepState, form: FormData): Promise<StepState> {
  const skills = form.getAll('skills').map(String).filter(Boolean)
  const yearsRaw = String(form.get('years_experience') ?? '').trim()
  const years = yearsRaw === '' ? null : Number(yearsRaw)
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) {
    return { error: 'Enter years of experience as a whole number between 0 and 60.' }
  }

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  await supabase
    .from('profiles')
    .update({ skills, years_experience: years, onboarding_step: 5 })
    .eq('id', userId)
  redirect(`/onboarding/${slugForStep(5)}`)
}

export async function saveWorkAction(_prev: StepState, form: FormData): Promise<StepState> {
  const location = String(form.get('work_location') ?? '')
  const period = String(form.get('salary_period') ?? 'yearly')
  const target = String(form.get('salary_target') ?? '').trim()
  if (!['remote', 'hybrid', 'onsite'].includes(location)) return { error: 'Pick a work location.' }
  if (!['yearly', 'monthly'].includes(period)) return { error: 'Pick yearly or monthly.' }

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  await supabase
    .from('profiles')
    .update({
      work_location: location,
      salary_period: period,
      salary_target: target || null,
      onboarding_step: 6,
    })
    .eq('id', userId)
  redirect(`/onboarding/${slugForStep(6)}`)
}

/**
 * Takes FormData it does not read, so it can be a form's `action` directly.
 * Wrapping it in a client closure instead would drop the progressive-
 * enhancement fields Next emits, and step 6 would be the one step in the
 * wizard that needs JavaScript.
 */
export async function finishOnboardingAction(_form?: FormData): Promise<void> {
  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId)
  redirect('/dashboard')
}
