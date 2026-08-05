'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Button, Card } from '@job-tracker/ui'
import { acceptTermsAction } from '@/lib/actions/auth'

export function AcceptForm() {
  const [, action, pending] = useActionState(async () => {
    await acceptTermsAction()
  }, undefined)

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">One last thing</h2>
      <p className="mt-4 text-center text-sm leading-relaxed text-text-muted">
        Before you start, please confirm you agree to our{' '}
        <Link href="/terms" className="text-text underline hover:no-underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-text underline hover:no-underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-4 text-center text-xs leading-relaxed text-text-subtle">
        Job Tracker AI sends your CV to Anthropic to extract its text and compare it against job
        postings. Nobody else can see it.
      </p>
      <form action={action} className="mt-8">
        <Button type="submit" pending={pending}>
          {pending ? 'Saving…' : 'Agree and continue'}
        </Button>
      </form>
    </Card>
  )
}
