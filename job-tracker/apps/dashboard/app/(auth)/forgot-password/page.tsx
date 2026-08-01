import { AuthShell } from '@job-tracker/ui'
import { ForgotForm } from './forgot-form'

export const metadata = { title: 'Reset your password · Job Tracker AI' }

export default function ForgotPasswordPage() {
  return (
    <AuthShell headline="Land your dream role faster." sub="One workspace for every application, from first save to signed offer.">
      <ForgotForm />
    </AuthShell>
  )
}
