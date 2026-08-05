import { AuthShell } from '@job-tracker/ui'
import { safeNext } from '@/lib/validation'
import { SignInForm } from './sign-in-form'

export const metadata = { title: 'Sign in · Job Tracker AI' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthShell headline="Land your next opportunity with AI." sub="Organize applications, generate tailored resumes, create cover letters, prepare for interviews, and track every opportunity from one beautiful workspace.">
      <SignInForm next={safeNext(next)} />
    </AuthShell>
  )
}
