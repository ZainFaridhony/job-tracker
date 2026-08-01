'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Card, FormError, Input } from '@job-tracker/ui'
import { signInAction, type AuthState } from '@/lib/actions/auth'

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Welcome back</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Sign in to continue to Job Tracker AI
      </p>

      <form action={action} aria-label="Sign in" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <input type="hidden" name="next" value={next} />
        <Input label="Email" name="email" type="email" autoComplete="email"
               placeholder="you@example.com" required />
        <div className="flex flex-col gap-2">
          {/* The reference design puts "Forgot password?" on the label's line, so
              the visible label lives here and Input keeps its own for a11y. */}
          <div className="flex items-baseline justify-between">
            <span aria-hidden className="text-xs font-medium tracking-wide text-text-muted">
              Password
            </span>
            <Link href="/forgot-password" className="text-xs font-semibold text-text hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input label="Password" labelHidden name="password" type="password" revealable
                 autoComplete="current-password" placeholder="••••••••" required />
        </div>
        <Button type="submit" pending={pending}>{pending ? 'Signing in…' : 'Sign In'}</Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-semibold text-text hover:underline">Create Account</Link>
      </p>
    </Card>
  )
}
