import { SettingsShell } from '@/components/settings/settings-shell'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Profile · Job Tracker AI' }

export default async function ProfileSettingsPage() {
  const { display, email } = await viewer()

  return (
    <SettingsShell
      current="/settings/profile"
      name={display}
      email={email}
      title="Profile"
      description="Your name, email and password."
    >
      <dl className="flex max-w-[520px] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-outline-subtle py-4">
          <dt className="text-sm font-medium text-text">Name</dt>
          <dd className="truncate text-sm text-text-muted">{display}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-outline-subtle py-4">
          <dt className="text-sm font-medium text-text">Email</dt>
          <dd className="truncate text-sm text-text-muted">{email}</dd>
        </div>
      </dl>

      {/* Read-only on purpose rather than by omission: changing an email is a
          re-verification flow, and email delivery is a known-broken area (see
          the templates note in CLAUDE.md). Shipping an input that silently
          failed would be worse than not shipping one. */}
      <p className="mt-6 max-w-[520px] text-sm leading-relaxed text-text-muted">
        Editing these is not built yet. Changing an email needs a verification
        round trip, and password changes go through the reset flow on the sign-in
        screen.
      </p>
    </SettingsShell>
  )
}
