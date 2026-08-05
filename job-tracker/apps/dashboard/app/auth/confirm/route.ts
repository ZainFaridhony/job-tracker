import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase, type EmailOtpType } from '@job-tracker/db/server'
import { noStore } from '@job-tracker/db/proxy'
import { safeNext } from '@/lib/validation'
import { requestOrigin } from '@/lib/origin'
import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/auth-cookies'

/**
 * Verifies emailed links: signup confirmation and password recovery.
 *
 * Both arrive as ?token_hash=&type= and must go through verifyOtp. They do NOT
 * carry ?code=, so exchangeCodeForSession — which /auth/callback uses for OAuth
 * — fails here. Keeping the two handlers apart is deliberate.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Not new URL(request.url).origin: Next normalises 127.0.0.1 to localhost in
  // dev, which would bounce the user across a cookie boundary mid-flow.
  const origin = await requestOrigin()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  if (tokenHash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      // noStore: this response carries a Set-Cookie for a fresh session, so no
      // shared cache may keep it (NFR-12).
      const response = noStore(NextResponse.redirect(`${origin}${next}`))
      if (type === 'recovery') {
        response.cookies.set(RECOVERY_COOKIE, '1', recoveryCookieOptions)
      }
      return response
    }
  }

  return noStore(NextResponse.redirect(`${origin}/auth/auth-code-error`))
}
