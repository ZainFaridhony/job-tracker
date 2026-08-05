import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'
import { CONTROL_BASE, CONTROL_VARIANT } from './control'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  pending?: boolean
}

// Geometry and variants are shared with the wizard's Back link, which is an
// anchor; see control.ts. What is added here is button-only.
const BASE =
  CONTROL_BASE +
  ' w-full disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'

const VARIANT = CONTROL_VARIANT

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
