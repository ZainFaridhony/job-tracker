import type { TablesUpdate } from '@job-tracker/db/types'
import { DEFAULT_CURRENCY, isCurrency } from './steps'

/**
 * Reading and checking the profile fields, separated from what happens next.
 *
 * The wizard and the settings screen collect the same columns and disagree only
 * about the ending: onboarding validates, writes, advances `onboarding_step` and
 * redirects; settings validates, writes, and stays where it is. Leaving the
 * checks inside the wizard's actions would have meant a second copy of "is this
 * a currency" and "is 61 years allowed" living in a second file, drifting the
 * first time one of them was corrected.
 *
 * Pure, and in lib/, so it is reachable by this workspace's node-only vitest.
 * The `'use server'` modules stay thin wrappers around it — which also keeps
 * them from exporting anything that is not an action, since every export of one
 * of those files becomes an endpoint the browser can call.
 */

/** `field` names the control the message belongs to, so a form can render the
 *  message under that control rather than only at the top of the card. */
export type FieldError = { error: string; field: string }

export type Read<T> = { ok: true; values: T } | ({ ok: false } & FieldError)

/**
 * Step 2's columns. Roles and skills are free-form `text[]`, so there is nothing
 * to check them against beyond being present; years is bounded because it is an
 * int column and the check constraint is not the place to find that out.
 */
export function readProfileFields(form: FormData): Read<TablesUpdate<'profiles'>> {
  const roles = form.getAll('target_roles').map(String).filter(Boolean)
  const skills = form.getAll('skills').map(String).filter(Boolean)
  const yearsRaw = String(form.get('years_experience') ?? '').trim()
  const years = yearsRaw === '' ? null : Number(yearsRaw)

  if (roles.length === 0) {
    return { ok: false, error: 'Keep at least one role, or add your own.', field: 'target_roles' }
  }
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) {
    return {
      ok: false,
      error: 'Enter years of experience as a whole number between 0 and 60.',
      field: 'years_experience',
    }
  }

  return { ok: true, values: { target_roles: roles, skills, years_experience: years } }
}

/** Step 3's columns. Every value here is checked against a set. */
export function readPreferenceFields(form: FormData): Read<TablesUpdate<'profiles'>> {
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

  if (!goal) return { ok: false, error: 'Pick the one that fits best.', field: 'career_goal' }
  if (!['remote', 'hybrid', 'onsite'].includes(location)) {
    return { ok: false, error: 'Pick a work location.', field: 'work_location' }
  }
  if (!['yearly', 'monthly'].includes(period)) {
    return { ok: false, error: 'Pick yearly or monthly.', field: 'salary_period' }
  }
  // Eight codes is too many to restate here, so this derives from the list
  // rather than repeating it. Mirrored by profiles_salary_currency_check.
  if (!isCurrency(currency)) {
    return { ok: false, error: 'Pick a currency.', field: 'salary_currency' }
  }

  return {
    ok: true,
    values: {
      career_goal: goal,
      work_location: location,
      salary_period: period,
      salary_currency: currency,
      salary_target: target || null,
    },
  }
}

/**
 * Both halves at once, for the settings screen, which shows one form where the
 * wizard shows two steps.
 *
 * Preferences are checked first, and that is NOT the order the controls appear
 * in — the page runs career goal, roles, skills, years, location, salary, so a
 * bad location outranks an empty role list here while sitting below it on
 * screen. It does not matter, and the reason is worth stating so nobody
 * "fixes" it into something more complicated: only one message is returned, it
 * carries the name of its own field, and the form renders it under that
 * control. The user sees the message in the right place either way; all this
 * decides is which of two simultaneous mistakes they are told about first.
 */
export function readAllProfileFields(form: FormData): Read<TablesUpdate<'profiles'>> {
  const preferences = readPreferenceFields(form)
  if (!preferences.ok) return preferences
  const profile = readProfileFields(form)
  if (!profile.ok) return profile
  return { ok: true, values: { ...preferences.values, ...profile.values } }
}
