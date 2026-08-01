'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Card, Checkbox, FormError, Input } from '@job-tracker/ui'
import { signUpAction, type AuthState } from '@/lib/actions/auth'
import { GoogleButton } from '../google-button'

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Create your account</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Start tracking every application in one place.
      </p>

      <form action={action} aria-label="Create account" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <Input label="Full Name" name="fullName" autoComplete="name" placeholder="John Doe" required />
        <Input label="Email Address" name="email" type="email" autoComplete="email"
               placeholder="you@example.com" required />
        <Input label="Password" name="password" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Input label="Confirm Password" name="confirmPassword" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Checkbox
          name="terms"
          required
          label={
            <>
              I agree to the{' '}
              <Link href="/terms" className="underline hover:text-text">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-text">Privacy Policy</Link>.
            </>
          }
        />
        <Button type="submit" pending={pending}>
          {pending ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <GoogleButton />

      <p className="mt-8 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-text hover:underline">Sign In</Link>
      </p>
    </Card>
  )
}
