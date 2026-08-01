'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import { isPlausibleEmail, safeNext, validateNewPassword, validateSignUp } from '../validation'

export type AuthState = { error?: string }

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3001'
}

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
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
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
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  })

  // FR-46: unknown addresses get the same answer as known ones, and no mail.
  redirect(`/check-email?email=${encodeURIComponent(email)}&reason=recovery`)
}

export async function updatePasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '')
  const confirm = String(form.get('confirmPassword') ?? '')

  const invalid = validateNewPassword(password, confirm)
  if (invalid) return { error: invalid }

  const supabase = await createServerSupabase()
  // verifyOtp already put a recovery session in cookies, so this needs no token.
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'That link has expired. Request a new one and try again.' }

  redirect('/dashboard')
}
