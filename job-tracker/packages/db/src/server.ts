import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

/** RSC / Server Action client, bound to the request's cookies. */
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot set cookies. proxy.ts refreshes the
            // session on every request, so there is nothing to recover here.
          }
        },
      },
    },
  )
}

/** Re-exported so apps need no direct dependency on supabase-js. */
export type { EmailOtpType } from '@supabase/supabase-js'
