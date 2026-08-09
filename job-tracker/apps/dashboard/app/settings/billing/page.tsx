import { SettingsShell } from '@/components/settings/settings-shell'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Billing · Job Tracker AI' }

export default async function BillingSettingsPage() {
  const { display, email } = await viewer()

  return (
    <SettingsShell
      current="/settings/billing"
      name={display}
      email={email}
      title="Billing"
      description="Plans, invoices and payment method."
    >
      <p className="max-w-[520px] text-sm leading-relaxed text-text-muted">
        There is nothing to bill for. Job Tracker AI has no paid plan yet, so this
        section is a placeholder that exists to keep the settings menu honest
        rather than to imply a subscription you might already have.
      </p>
    </SettingsShell>
  )
}
