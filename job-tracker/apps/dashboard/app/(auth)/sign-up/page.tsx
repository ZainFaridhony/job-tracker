import { AuthShell } from '@job-tracker/ui'
import { SignUpForm } from './sign-up-form'

export const metadata = { title: 'Create your account · Job Tracker AI' }

export default function SignUpPage() {
  return (
    <AuthShell headline="Land your next opportunity with AI." sub="Organize applications, generate tailored resumes, create cover letters, prepare for interviews, and track every opportunity from one beautiful workspace.">
      <SignUpForm />
    </AuthShell>
  )
}
