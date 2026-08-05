import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY

if (!URL || !SERVICE || !PUBLISHABLE) {
  throw new Error(
    'Missing local Supabase env. Run: pnpm dlx supabase@2.111.0 status -o env > .env.test',
  )
}

const NO_PERSIST = { auth: { autoRefreshToken: false, persistSession: false } }
export const DEFAULT_PASSWORD = 'Test-Passw0rd!'

/** Service-role client. Bypasses RLS. Tests and scripts only, never app code. */
export const admin: SupabaseClient = createClient(URL, SERVICE, NO_PERSIST)

/** An unauthenticated client, subject to RLS as the anon role. */
export function anonClient(): SupabaseClient {
  return createClient(URL!, PUBLISHABLE!, NO_PERSIST)
}

export async function createUser(
  email: string,
  password: string = DEFAULT_PASSWORD,
  opts: { fullName?: string; acceptedTerms?: boolean; confirmed?: boolean } = {},
): Promise<User> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: opts.confirmed ?? true,
    user_metadata: {
      full_name: opts.fullName ?? 'Test User',
      accepted_terms: (opts.acceptedTerms ?? true) ? 'true' : 'false',
    },
  })
  if (error) throw error
  return data.user
}

export async function promoteToAdmin(userId: string): Promise<void> {
  const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', userId)
  if (error) throw error
}

/** A client authenticated as this user — subject to RLS and column grants. */
export async function clientFor(
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<SupabaseClient> {
  const c = createClient(URL!, PUBLISHABLE!, NO_PERSIST)
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
  return c
}

export async function deleteUser(userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId)
}

/** Unique address per run, so tests never collide on a shared database. */
export function uniqueEmail(tag: string): string {
  return `${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`
}
