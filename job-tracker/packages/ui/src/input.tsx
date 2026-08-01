'use client'

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Keeps the label in the accessibility tree while hiding it visually. */
  labelHidden?: boolean
  error?: string
  icon?: ReactNode
  revealable?: boolean
}

export function Input({
  label,
  labelHidden,
  error,
  icon,
  revealable,
  className,
  type,
  id,
  ...rest
}: Props) {
  const generated = useId()
  const inputId = id ?? generated
  const errorId = `${inputId}-error`
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className={
          labelHidden ? 'sr-only' : 'text-xs font-medium tracking-wide text-text-muted'
        }
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">
            {icon}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-12 w-full rounded border bg-surface-subtle text-sm text-text',
            'transition-[border-color,background-color] duration-150 hover:border-text-subtle',
            'placeholder:text-text-subtle focus:outline-2 focus:outline-offset-2 focus:outline-ink',
            icon ? 'pl-10 pr-3' : 'px-3',
            revealable && 'pr-16',
            // `outline`, not `outline-subtle`: a control boundary must clear
            // WCAG 1.4.11 at 3:1. See PRD Appendix A.
            error ? 'border-error' : 'border-outline',
            className,
          )}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-subtle hover:text-text"
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  )
}
