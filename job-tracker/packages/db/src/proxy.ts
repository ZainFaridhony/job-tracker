import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

export type JwtClaims = { sub: string; email?: string; [key: string]: unknown }

/**
 * Refreshes the Supabase session for one request and reports its verified claims.
 *
 * Use the returned `redirect` for any redirect: a bare NextResponse.redirect()
 * discards the refreshed auth cookies, logging the user out on the very request
 * that renewed their token.
 */
export async function refreshSession(request: NextRequest) {
  const response = NextResponse.next({ request })
  let authHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
          // NFR-12. @supabase/ssr supplies Cache-Control: private, no-store here.
          // Dropping these lets a CDN cache a response carrying one user's
          // session cookie and serve it to somebody else.
          authHeaders = headers
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
        },
      },
    },
  )

  // Verified locally against the JWT signature; refreshes the token when expired.
  // getClaims() resolves to { claims, header, signature } — the payload is
  // data.claims, not data.
  const { data } = await supabase.auth.getClaims()
  const claims = (data?.claims as JwtClaims | undefined) ?? null

  function redirect(url: URL) {
    const r = NextResponse.redirect(url)
    for (const c of response.cookies.getAll()) r.cookies.set(c)
    for (const [k, v] of Object.entries(authHeaders)) r.headers.set(k, v)
    return r
  }

  return { response, claims, redirect }
}

/**
 * Headers @supabase/ssr attaches when it writes auth cookies (NFR-12).
 * refreshSession propagates them automatically; GET Route Handlers that mint a
 * session build their own response and must apply them with noStore().
 */
export const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
}

/** Marks a response as uncacheable by any shared cache. */
export function noStore<T extends NextResponse>(response: T): T {
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) response.headers.set(k, v)
  return response
}
