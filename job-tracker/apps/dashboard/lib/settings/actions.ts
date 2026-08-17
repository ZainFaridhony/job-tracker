'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@job-tracker/db/server'
import { readAllProfileFields } from '../onboarding/fields'
import { currentUserId } from '../onboarding/persist'

/**
 * Saving the preferences screen.
 *
 * The same columns the wizard writes, and the same checks — `readAllProfileFields`
 * is shared — but three deliberate differences from `saveProfileAction`:
 *
 *   - `onboarding_step` is not touched. It records the furthest step reached,
 *     and editing a salary two months later is not a step;
 *   - nothing redirects. The wizard's job is to move you along; this screen's
 *     job is to stay where it is and tell you it worked;
 *   - `cv_prefilled_at` is left alone. It records that the model once found
 *     something, which stays true however much the user edits afterwards — that
 *     is the whole reason step 2's copy keys off an event rather than off the
 *     field values.
 *
 * `savedAt` rather than `saved: true` so two saves in a row are two distinct
 * states; a boolean would leave the confirmation stuck on from the first one.
 */
export type SettingsState = { error?: string; field?: string; savedAt?: number }

export async function savePreferencesSettingsAction(
  _prev: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  const read = readAllProfileFields(form)
  if (!read.ok) return { error: read.error, field: read.field }

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  const { error } = await supabase.from('profiles').update(read.values).eq('id', userId)

  // The provider's message is not shown: it can name columns and constraints,
  // which is detail for a log rather than for the person who mistyped a salary.
  if (error) {
    console.warn(`[settings] save failed for user ${userId}: ${error.code} ${error.message}`)
    return { error: 'Could not save your preferences. Try again.' }
  }

  // So a reload — or the dashboard, which reads the same row — shows the new
  // values rather than the render that was cached before the update.
  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')

  return { savedAt: Date.now() }
}
