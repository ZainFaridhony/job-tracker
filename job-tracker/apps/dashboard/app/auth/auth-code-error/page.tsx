import Link from 'next/link'
import { AuthShell, Button, Card } from '@job-tracker/ui'
import { ErrorReason } from './error-reason'

export const metadata = { title: 'That link did not work · Job Tracker AI' }

export default function AuthCodeErrorPage() {
  return (
    <AuthShell
      headline="Land your dream role faster."
      sub="One workspace for every application, from first save to signed offer."
    >
      <Card>
        <h2 className="text-center text-2xl font-semibold text-text">That link did not work</h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-text-muted">
          Email links can only be used once, and they expire. Request a fresh one and it will
          work.
        </p>
        <ErrorReason />
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/forgot-password"><Button>Send a new link</Button></Link>
          <Link href="/sign-in"><Button variant="secondary">Back to sign in</Button></Link>
        </div>
      </Card>
    </AuthShell>
  )
}
