import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  pending?: boolean
}

const BASE =
  'inline-flex h-12 w-full items-center justify-center rounded text-sm font-medium ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60'

// The three ink tokens are the logo mark's three tonal facets, so the button's
// states are the brand's own geometry rather than arbitrary tints of it.
const VARIANT = {
  primary: 'bg-ink text-text-on-ink hover:bg-ink-hover active:bg-ink-pressed',
  secondary: 'border border-outline-subtle bg-surface-subtle text-text hover:bg-surface',
} as const

export function Button({ variant = 'primary', pending, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled ?? pending}
      aria-busy={pending ? 'true' : undefined}
      className={cn(BASE, VARIANT[variant], className)}
    >
      {children}
    </button>
  )
}
