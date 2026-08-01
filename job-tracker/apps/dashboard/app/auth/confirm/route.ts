import { NextResponse, type NextRequest } from 'next/server'

import { createServerSupabase, type EmailOtpType } from '@job-tracker/db/server'
import { safeNext } from '@/lib/validation'

/**
 * Verifies emailed links: signup confirmation and password recovery.
 *
 * Both arrive as ?token_hash=&type= and must go through verifyOtp. They do NOT
 * carry ?code=, so exchangeCodeForSession — which /auth/callback uses for OAuth
 * — fails here. Keeping the two handlers apart is deliberate.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  if (tokenHash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
