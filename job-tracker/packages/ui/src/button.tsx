import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  pending?: boolean
}

const BASE =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-medium ' +
  'transition-[background-color,transform] duration-150 active:scale-[0.99] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'

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
      {pending && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
