import Link from 'next/link'
import { AuthShell, Card } from '@job-tracker/ui'

export const metadata = { title: 'Check your inbox · Job Tracker AI' }

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; reason?: string }>
}) {
  const { email, reason } = await searchParams
  const isRecovery = reason === 'recovery'

  return (
    <AuthShell headline="Land your dream role faster." sub="One workspace for every application, from first save to signed offer.">
      <Card>
        <h2 className="text-center text-2xl font-semibold text-text">Check your inbox</h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-text-muted">
          {isRecovery
            ? 'If that address has an account, we have sent a link to choose a new password.'
            : 'We have sent a confirmation link to finish setting up your account.'}
          {email ? <> It is on its way to <span className="text-text">{email}</span>.</> : null}
        </p>
        <p className="mt-6 text-center text-xs text-text-subtle">
          The link can only be used once and expires shortly. Check your spam folder if it has
          not arrived in a few minutes.
        </p>
        <p className="mt-8 text-center text-sm text-text-muted">
          <Link href="/sign-in" className="font-semibold text-text hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
