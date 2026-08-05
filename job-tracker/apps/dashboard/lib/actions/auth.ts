'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import { isPlausibleEmail, safeNext, validateNewPassword, validateSignUp } from '../validation'
import { RECOVERY_COOKIE } from '../auth-cookies'
import { requestOrigin } from '../origin'

export type AuthState = { error?: string }



export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = {
    fullName: String(form.get('fullName') ?? ''),
    email: String(form.get('email') ?? '').trim(),
    password: String(form.get('password') ?? ''),
    confirmPassword: String(form.get('confirmPassword') ?? ''),
    terms: form.get('terms') === 'on',
  }

  const invalid = validateSignUp(input)
  if (invalid) return { error: invalid }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${await requestOrigin()}/auth/confirm`,
      data: { full_name: input.fullName.trim(), accepted_terms: 'true' },
    },
  })

  // FR-46: an already-registered address must be indistinguishable from a new
  // one. Supabase notifies the existing owner rather than creating a duplicate,
  // so the only correct response here is the same one as success.
  if (error && !/already registered/i.test(error.message)) {
    return { error: 'Could not create your account. Try again shortly.' }
  }

  redirect(`/check-email?email=${encodeURIComponent(input.email)}&reason=confirm`)
}

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const next = safeNext(String(form.get('next') ?? ''))

  if (!email || !password) return { error: 'Enter your email and password.' }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // PRD §12.1 routes an unconfirmed account to the resend affordance. That
    // does reveal the address exists — a knowing narrowing of FR-46 limited to
    // unconfirmed accounts, chosen in the PRD over strict opacity. Do not
    // "fix" this into a generic message without revisiting §12.1.
    if (/email not confirmed/i.test(error.message)) {
      redirect(`/check-email?email=${encodeURIComponent(email)}&reason=confirm`)
    }
    // Everything else collapses to one message naming neither field.
    return { error: 'Email or password is incorrect.' }
  }

  redirect(next)
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/sign-in')
}

export async function requestResetAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  if (!isPlausibleEmail(email)) return { error: 'Enter a valid email address.' }

  const supabase = await createServerSupabase()
  // Recovery mail carries ?token_hash=&type=recovery, so it lands on
  // /auth/confirm — not /auth/callback, which only handles OAuth codes.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/auth/confirm?next=/reset-password`,
  })

  // FR-46: unknown addresses get the same answer as known ones, and no mail.
  redirect(`/check-email?email=${encodeURIComponent(email)}&reason=recovery`)
}

export async function updatePasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '')
  const confirm = String(form.get('confirmPassword') ?? '')

  const invalid = validateNewPassword(password, confirm)
  if (invalid) return { error: invalid }

  // Same gate as the page. A session alone is not proof of a recovery link,
  // and this action is reachable without rendering the page.
  const cookieStore = await cookies()
  if (cookieStore.get(RECOVERY_COOKIE)?.value !== '1') {
    redirect('/forgot-password')
  }

  const supabase = await createServerSupabase()
  // verifyOtp already put a recovery session in cookies, so this needs no token.
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    // Not every failure is expiry. Reusing the current password, failing the
    // strength policy and needing reauthentication are all distinct, and
    // reporting them all as "expired" sends the user round the recovery loop
    // forever with no path to the real fix.
    if (/different from the old password/i.test(error.message)) {
      return { error: 'Choose a password you have not used here before.' }
    }
    if (/password/i.test(error.message) && /weak|short|strength|characters/i.test(error.message)) {
      return { error: error.message }
    }
    return { error: 'That link has expired. Request a new one and try again.' }
  }

  // One recovery link, one password change.
  cookieStore.delete(RECOVERY_COOKIE)
  redirect('/dashboard')
}

export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // PKCE: Google returns ?code=, which /auth/callback exchanges. Email links
    // use ?token_hash and go to /auth/confirm instead.
    options: { redirectTo: `${await requestOrigin()}/auth/callback` },
  })

  if (error || !data.url) redirect('/auth/auth-code-error')
  redirect(data.url)
}

/**
 * FR-44 for OAuth accounts. A Google user never ticks the terms box, so the
 * signup trigger leaves accepted_terms_at null and /auth/callback parks them
 * here. This is the only place that timestamp gets set after the fact.
 */
export async function acceptTermsAction(): Promise<void> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (!userId) redirect('/sign-in')

  // accepted_terms_at is in the column grant, so this runs under the user's own
  // RLS policy - no elevated client involved.
  await supabase
    .from('profiles')
    .update({ accepted_terms_at: new Date().toISOString() })
    .eq('id', userId)

  redirect('/dashboard')
}
