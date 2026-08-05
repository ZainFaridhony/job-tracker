'use client'

import { useActionState } from 'react'
import { Button, Card, FormError, Input } from '@job-tracker/ui'
import { updatePasswordAction, type AuthState } from '@/lib/actions/auth'

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePasswordAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Set new password</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Choose something you have not used here before.
      </p>

      <form action={action} aria-label="Set new password" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <Input label="New Password" name="password" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Input label="Confirm Password" name="confirmPassword" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Button type="submit" pending={pending}>
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </Card>
  )
}
