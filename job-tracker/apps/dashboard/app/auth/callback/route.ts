import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@job-tracker/db/server'
import { safeNext } from '@/lib/validation'

/** OAuth only. Email links use ?token_hash and are handled by /auth/confirm. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
