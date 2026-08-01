/**
 * Marks that the current session came from a verified password-recovery link.
 *
 * verifyOtp({ type: 'recovery' }) mints an ordinary session, indistinguishable
 * from a password sign-in at the claims level. Without this marker
 * /reset-password would accept ANY live session, letting anyone holding a
 * stolen cookie — or sitting at an unlocked machine — change the password
 * without knowing the current one.
 *
 * httpOnly, so only /auth/confirm can set it, and reaching /auth/confirm
 * requires the emailed token. Short-lived, so a recovery link does not leave a
 * standing password-change capability on the session.
 */
export const RECOVERY_COOKIE = 'jt-recovery'
export const RECOVERY_WINDOW_SECONDS = 15 * 60

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: RECOVERY_WINDOW_SECONDS,
  secure: process.env.NODE_ENV === 'production',
} as const
