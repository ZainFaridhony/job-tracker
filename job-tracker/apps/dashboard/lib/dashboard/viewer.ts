import { createServerSupabase } from '@job-tracker/db/server'

export type Viewer = {
  /** Full name where we have one, else the email — for the avatar's initials. */
  display: string
  /** First name only: "Welcome back, Ofi Novyanti" reads like a system notice. */
  greeting: string
  /** Shown in the account menu — the one place that answers "who am I?". */
  email: string
}

/** First word of a name, or a capitalised email local part, or a neutral word. */
export function greetingFrom(fullName: string | null, email: string): string {
  const first = fullName?.trim().split(/\s+/)[0]
  if (first) return first
  const local = email.split('@')[0] ?? ''
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'there'
}

/**
 * Who is looking at the page.
 *
 * Extracted because four routes now render the same top bar, and each of them
 * needing a name was about to become the same twelve lines of Supabase calls
 * four times over. The pure half is `greetingFrom`, which is what the tests can
 * reach — this half needs a request context.
 */
export async function viewer(): Promise<Viewer> {
  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()
  const email = String(claims?.claims.email ?? '')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', String(claims?.claims.sub ?? ''))
    .maybeSingle()

  const fullName = profile?.full_name ?? null
  return { display: fullName ?? email, greeting: greetingFrom(fullName, email), email }
}
