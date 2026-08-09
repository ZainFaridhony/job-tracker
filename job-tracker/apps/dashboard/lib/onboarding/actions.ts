'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import type { TablesUpdate } from '@job-tracker/db/types'
import { ingestCv } from '../cv/ingest'
import { FAILURE_COPY } from '../cv/limits'
import { readPreferenceFields, readProfileFields } from './fields'
import { currentUserId, persistStep } from './persist'

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
  const read = readProfileFields(form)
  if (!read.ok) return { error: read.error, field: read.field }
  return saveStep(2, read.values)
}

/** Step 3 — what the CV cannot say. Every value here is checked against a set. */
export async function savePreferencesAction(_prev: StepState, form: FormData): Promise<StepState> {
  const read = readPreferenceFields(form)
  if (!read.ok) return { error: read.error, field: read.field }
  return saveStep(3, read.values)
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
