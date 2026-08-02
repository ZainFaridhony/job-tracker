'use client'

import { cn } from './cn'

/**
 * A radio rendered as a full-width selectable card.
 *
 * Still a real `<input type="radio">` underneath — keyboard arrows, form
 * submission and screen-reader semantics all come for free, which a div with an
 * onClick would have to reimplement badly.
 */
export function OptionCard({
  name,
  value,
  label,
  hint,
  defaultChecked,
}: {
  name: string
  value: string
  label: string
  hint?: string
  defaultChecked?: boolean
}) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-md border border-outline-subtle',
        'bg-surface px-5 py-4 transition-colors',
        'hover:border-outline',
        'has-[:checked]:border-ink has-[:checked]:bg-surface-subtle',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 shrink-0 accent-ink"
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-text">{label}</span>
        {hint && <span className="mt-0.5 text-xs text-text-muted">{hint}</span>}
      </span>
    </label>
  )
}
