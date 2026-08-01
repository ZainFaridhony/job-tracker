export type SignUpInput = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
}

export const MIN_PASSWORD_LENGTH = 8

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isPlausibleEmail(value: string): boolean {
  return EMAIL.test(value.trim())
}

export function validateSignUp(input: SignUpInput): string | null {
  if (!input.fullName.trim()) return 'Enter your full name.'
  if (!isPlausibleEmail(input.email)) return 'Enter a valid email address.'
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
  }
  if (input.password !== input.confirmPassword) return 'The two passwords do not match.'
  if (!input.terms) return 'Accept the Terms of Service to continue.'
  return null
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
  }
  if (password !== confirm) return 'The two passwords do not match.'
  return null
}

/**
 * Only ever redirect within this app.
 *
 * Checking `startsWith('//')` on the raw value is not enough. The WHATWG URL
 * parser strips tab, LF and CR before parsing and treats a backslash as a
 * slash for special schemes, so `/\evil.com` and `/<tab>/evil.com` both slip
 * past a naive check and then resolve to a different origin. Normalise first,
 * and return the normalised value so the sanitised string is what gets used.
 */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback
  const normalised = next.replace(/[\t\n\r]/g, '').replace(/\\/g, '/')
  if (!normalised.startsWith('/') || normalised.startsWith('//')) return fallback
  return normalised
}
