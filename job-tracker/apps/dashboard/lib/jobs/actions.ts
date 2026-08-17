'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import { currentUserId } from '../onboarding/persist'
import { EMPTY_FILTERS, jobsHref } from './filters'
import { navPreferences } from './profile'
import { isSalaryCurrency, isSalaryPeriod } from './salary'
import { seedJobsHref } from './seed'

/**
 * Switching "start with my preferences" from the Jobs sidebar.
 *
 * The same `profiles.autofill_job_filters` the settings screen edits — one stored
 * value, two places to change it, which is what "mirror it in both places" means.
 * Neither screen owns it, so neither can drift: both read the column and both
 * write it, and there is no second flag to keep in step.
 *
 * WHY THIS IS AN ACTION AND NOT PART OF THE FILTER FORM. The sidebar's controls
 * are associated by `form="job-filters"`, which is a GET form whose whole job is to
 * fold itself into a URL — it cannot write to Postgres. A nested `<form>` is also
 * invalid HTML, so the toggle gets its own POST form rendered as a sibling. That is
 * the same mechanism the account menu uses to submit a sign-out form it does not
 * contain, and it means the toggle works with JavaScript off: a real submit button
 * in a real form.
 *
 * It redirects rather than returning state, because the answer to "apply my
 * preferences" is a different URL — filter state IS the URL on this screen, so
 * anything else would leave the toggle saying one thing and the results showing
 * another.
 *
 * The only export here, deliberately. Every export of a `'use server'` module is an
 * endpoint the browser can call, which is why `navPreferences` and `seedJobsHref`
 * live in their own files rather than beside this.
 */
export async function toggleJobsAutofillAction(form: FormData): Promise<void> {
  // The DESIRED state, posted by the button, not a flip of whatever is stored.
  // Reading the current value and inverting it would race two rapid submits into
  // an unpredictable result, and would make the button's own markup a lie about
  // what pressing it does.
  const next = String(form.get('autofill') ?? '') === 'on'

  // Carried through so turning the toggle off does not also change the unit every
  // salary reads in — the rule `clearAllHref` exists to hold. Validated because
  // these arrive from a form and are therefore user-editable.
  const rawPeriod = String(form.get('period') ?? '')
  const rawCurrency = String(form.get('currency') ?? '')
  const period = isSalaryPeriod(rawPeriod) ? rawPeriod : EMPTY_FILTERS.period
  const currency = isSalaryCurrency(rawCurrency) ? rawCurrency : EMPTY_FILTERS.currency

  const userId = await currentUserId()
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('profiles')
    .update({ autofill_job_filters: next })
    .eq('id', userId)

  if (error) {
    // Never silent. The column and its UPDATE grant both exist now, so anything
    // here is a real fault rather than an unapplied migration — 42501 would mean
    // the column grant was dropped, which RLS alone would not catch. Codes and our
    // own text only, never a row's contents (P3).
    console.warn(
      `[jobs] autofill toggle failed for user ${userId}: ${error.code} ${error.message}`,
    )
  }

  // Both screens read this column, so both are stale now. The settings checkbox is
  // the mirror of this control and would otherwise keep showing the old state until
  // something else happened to rebuild it.
  revalidatePath('/jobs')
  revalidatePath('/settings/preferences')

  if (!next) {
    // Off clears what it had applied rather than leaving the filters behind. A
    // toggle that switches off and changes nothing visible reads as broken, and
    // the reader has no way to tell which of the active chips came from here.
    redirect(jobsHref({ ...EMPTY_FILTERS, period, currency }))
  }

  // On applies them immediately. `navPreferences()` is re-read rather than trusted
  // from the form: the seed is derived from profile columns, and the browser has no
  // business supplying them.
  const prefs = await navPreferences()
  redirect(seedJobsHref({ ...prefs, autofill: true }))
}
