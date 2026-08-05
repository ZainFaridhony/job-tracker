import { Button, Divider } from '@job-tracker/ui'
import { signInWithGoogleAction } from '@/lib/actions/auth'

/** Google's mark must keep its own colours; brand guidelines forbid recolouring
 *  it, so this is the one place in the app that is not monochrome. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16.2z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.8-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.6 10.4l7.8-5.7z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.5-2.1 15.3-5.6l-7.1-5.5c-2 1.4-4.6 2.2-8.2 2.2-6.3 0-11.7-3.7-13.6-9.1l-7.8 5.7C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/**
 * Rendered only when the provider is configured, so the layout never shows a
 * dead button. The client id and secret live in the Supabase dashboard; this
 * flag exists purely so the UI knows whether the round trip will work.
 */
export function GoogleButton() {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== '1') return null

  return (
    <>
      <div className="mt-6">
        <Divider label="Or continue with" />
      </div>
      <form action={signInWithGoogleAction} className="mt-6">
        <Button type="submit" variant="secondary">
          <GoogleMark />
          Google
        </Button>
      </form>
    </>
  )
}
