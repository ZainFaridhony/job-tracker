'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Card, FormError, Input } from '@job-tracker/ui'
import { requestResetAction, type AuthState } from '@/lib/actions/auth'

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestResetAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Reset your password</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Enter your email and we will send you a link to choose a new one.
      </p>

      <form action={action} aria-label="Reset password" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <Input label="Email Address" name="email" type="email" autoComplete="email"
               placeholder="you@example.com" required />
        <Button type="submit" pending={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        <Link href="/sign-in" className="font-semibold text-text hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  )
}
