import { headers } from 'next/headers'

/**
 * The origin the user is actually browsing, taken from the request rather than
 * from a hardcoded env var.
 *
 * This matters more than it looks. 127.0.0.1 and localhost are different hosts
 * to a browser, so cookies set on one are not sent to the other. Hardcoding one
 * of them in redirectTo meant a user who opened 127.0.0.1 was sent back to
 * localhost, where the PKCE code verifier cookie did not exist — and the code
 * exchange failed with nothing obviously wrong. Deriving the origin keeps the
 * whole round trip on one host, whichever the user picked.
 *
 * x-forwarded-* first, for Vercel and any proxy in front of the app.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}
