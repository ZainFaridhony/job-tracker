'use client'

import { useSyncExternalStore } from 'react'

/**
 * Supabase reports auth failures in the URL *fragment*
 * (#error=access_denied&error_code=otp_expired&...), which never reaches the
 * server — so this page could only ever show generic copy while the real cause
 * sat unread in the address bar. This surfaces it.
 *
 * useSyncExternalStore rather than useState + useEffect: the fragment is
 * browser-only state, and this is the pattern that reads it without a
 * setState-in-effect or a hydration mismatch. The server snapshot is empty, so
 * nothing renders until hydration.
 */
const REASONS: Record<string, string> = {
  otp_expired:
    'That email link had already expired. Links last about an hour and can only be used once.',
  access_denied: 'The sign-in was cancelled or refused before it completed.',
  invalid_request: 'The link was malformed. Request a fresh one rather than editing the URL.',
  server_error: 'The provider returned an error. Trying again usually clears it.',
}

const subscribe = () => () => {}

export function ErrorReason() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )

  if (!hash) return null

  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const code = params.get('error_code') ?? params.get('error')
  if (!code) return null

  const reason =
    REASONS[code] ?? params.get('error_description')?.replace(/\+/g, ' ') ?? null
  if (!reason) return null

  return (
    <div className="mt-6 rounded bg-surface-subtle px-4 py-3">
      <p className="text-sm leading-relaxed text-text-muted">{reason}</p>
      <p className="mt-2 font-mono text-xs text-text-subtle">{code}</p>
    </div>
  )
}
