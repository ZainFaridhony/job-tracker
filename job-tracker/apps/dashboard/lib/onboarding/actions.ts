'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import type { TablesUpdate } from '@job-tracker/db/types'
import { ingestCv } from '../cv/ingest'
import { FAILURE_COPY } from '../cv/limits'
import { currentUserId, persistStep } from './persist'
import { DEFAULT_CURRENCY, isCurrency } from './steps'

/**
 * `field` names the control the message belongs to, so the form can render it
 * beneath that control instead of only at the top of the card. Left undefined
 * for failures that belong to no single field, like a storage error.
 */
export type StepState = { error?: string; field?: string }

/** persistStep, then hand the user there. Used by every no-JS form post. */
async function saveStep(from: number, values: TablesUpdate<'profiles'>): Promise<never> {
  const userId = await currentUserId()
  redirect(await persistStep(userId, from, values))
}

/**
 * Step 1 without JavaScript, and the fallback whenever the streaming route is
 * unavailable. Identical work to the route handler — both call ingestCv — but
 * with no progress reporting, because a plain form post has nowhere to put it.
 */
export async function uploadCvAction(_prev: StepState, form: FormData): Promise<StepState> {
  const file = form.get('cv')
  if (!(file instanceof File) || file.size === 0) {
    return { error: FAILURE_COPY['no-file'], field: 'cv' }
  }

  const userId = await currentUserId()
  const result = await ingestCv({ userId, file })
  if (!result.ok) return { error: FAILURE_COPY[result.reason], field: 'cv' }

  return saveStep(1, result.values)
}

/**
 * Step 2 — everything the CV told us. Roles and skills are free-form text[], so
 * there is nothing to validate them against beyond being non-empty; years is
 * bounded because it is an int column.
 */
export async function saveProfileAction(_prev: StepState, form: FormData): Promise<StepState> {
  const roles = form.getAll('target_roles').map(String).filter(Boolean)
  const skills = form.getAll('skills').map(String).filter(Boolean)
  const yearsRaw = String(form.get('years_experience') ?? '').trim()
  const years = yearsRaw === '' ? null : Number(yearsRaw)

  if (roles.length === 0) {
    return { error: 'Keep at least one role, or add your own.', field: 'target_roles' }
  }
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) {
    return {
      error: 'Enter years of experience as a whole number between 0 and 60.',
      field: 'years_experience',
    }
  }

  return saveStep(2, { target_roles: roles, skills, years_experience: years })
}

/** Step 3 — what the CV cannot say. Every value here is checked against a set. */
export async function savePreferencesAction(_prev: StepState, form: FormData): Promise<StepState> {
  const goal = String(form.get('career_goal') ?? '')
  const location = String(form.get('work_location') ?? '')
  const period = String(form.get('salary_period') ?? 'yearly')
  const currency = String(form.get('salary_currency') ?? DEFAULT_CURRENCY)
  // Digits only. AmountField groups them as you type, and with JavaScript off it
  // posts whatever was typed, so normalising here is what guarantees the column
  // holds a number either way. Currency lives in its own column.
  const target = String(form.get('salary_target') ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 15)

  if (!goal) return { error: 'Pick the one that fits best.', field: 'career_goal' }
  if (!['remote', 'hybrid', 'onsite'].includes(location)) {
    return { error: 'Pick a work location.', field: 'work_location' }
  }
  if (!['yearly', 'monthly'].includes(period)) {
    return { error: 'Pick yearly or monthly.', field: 'salary_period' }
  }
  // Eight codes is too many to restate here, so this one derives from the list
  // rather than repeating it. Mirrored by profiles_salary_currency_check.
  if (!isCurrency(currency)) return { error: 'Pick a currency.', field: 'salary_currency' }

  return saveStep(3, {
    career_goal: goal,
    work_location: location,
    salary_period: period,
    salary_currency: currency,
    salary_target: target || null,
  })
}

/**
 * Takes FormData it does not read, so it can be a form's `action` directly.
 * Wrapping it in a client closure instead would drop the progressive-
 * enhancement fields Next emits, and the last step would be the one step in the
 * wizard that needs JavaScript.
 */
export async function finishOnboardingAction(_form?: FormData): Promise<void> {
  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId)
  redirect('/dashboard')
}
