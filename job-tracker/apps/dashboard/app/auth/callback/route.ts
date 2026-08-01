import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@job-tracker/db/server'
import { noStore } from '@job-tracker/db/proxy'
import { safeNext } from '@/lib/validation'

/** OAuth only. Email links use ?token_hash and are handled by /auth/confirm. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // FR-44: a Google user never ticked the terms box, so the signup trigger
      // left accepted_terms_at null. Park them on the interstitial rather than
      // letting an unaccepted account reach the product.
      const { data } = await supabase.auth.getClaims()
      const userId = data?.claims.sub
      let destination = next
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('accepted_terms_at')
          .eq('id', userId)
          .maybeSingle()
        if (!profile?.accepted_terms_at) destination = '/accept-terms'
      }
      // noStore: sets a session cookie, so it must never be shared-cached (NFR-12).
      return noStore(NextResponse.redirect(`${origin}${destination}`))
    }
  }

  return noStore(NextResponse.redirect(`${origin}/auth/auth-code-error`))
}
