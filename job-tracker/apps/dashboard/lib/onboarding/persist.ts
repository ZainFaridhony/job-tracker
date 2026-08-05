import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import type { TablesUpdate } from '@job-tracker/db/types'
import { slugForStep, TOTAL_STEPS } from './steps'

/**
 * Shared server-side helpers for advancing the wizard.
 *
 * Deliberately NOT a `'use server'` module. Every export of one of those becomes
 * an RPC endpoint the browser can call, and `persistStep` takes a user id and a
 * bag of column values — exactly the shape you do not want reachable from the
 * client, even with RLS behind it. actions.ts and the ingest route both import
 * from here instead.
 */

export async function currentUserId(): Promise<string> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims.sub
  if (!id) redirect('/sign-in')
  return id as string
}

/**
 * `onboarding_step` records the furthest step reached, not where the user is
 * standing. The Back link means an earlier step can be resubmitted at any time,
 * and rewinding the marker would make someone who fixed a typo on step 2 walk
 * step 3 again — and would make the gate refuse the steps they had already
 * finished.
 */
async function furthestStep(userId: string, atLeast: number): Promise<number> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_step')
    .eq('id', userId)
    .maybeSingle()
  return Math.min(Math.max(data?.onboarding_step ?? 1, atLeast), TOTAL_STEPS)
}

/**
 * Saves one step's answers, advances the marker, and returns where the user
 * belongs next — the following step on the way through, and the step they came
 * from when they had gone back to correct something.
 *
 * Returns rather than redirects because `redirect()` throws. The ingest route is
 * mid-stream when it persists and has to write a final line afterwards, so
 * unwinding here would abort the response instead of finishing it.
 */
export async function persistStep(
  userId: string,
  from: number,
  values: TablesUpdate<'profiles'>,
): Promise<string> {
  const supabase = await createServerSupabase()
  const next = await furthestStep(userId, from + 1)
  await supabase
    .from('profiles')
    .update({ ...values, onboarding_step: next })
    .eq('id', userId)
  return `/onboarding/${slugForStep(next)}`
}
