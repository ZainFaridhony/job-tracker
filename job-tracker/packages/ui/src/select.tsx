import { cn } from './cn'
import { FieldError } from './field-error'
import { ChevronDown } from './icons'

/**
 * A native select dressed as one of our controls — the same 48px box, border and
 * focus ring as Input, so a picked answer and a typed one look like peers.
 *
 * Native because the platform's own picker is better than any listbox this
 * package would grow, it needs no client state, and it is reachable by keyboard
 * and touch without help. `appearance-none` removes the OS chrome so the chevron
 * can carry the affordance instead.
 *
 * Uncontrolled: `defaultValue` means React emits `selected` in the server HTML,
 * so the stored answer is right on first paint with no JavaScript and there is
 * no hydration mismatch to manage.
 */
export function Select({
  label,
  name,
  options,
  value,
  placeholder,
  error,
  className,
}: {
  label: string
  name: string
  options: readonly { readonly value: string; readonly label: string }[]
  /** The stored answer. Absent selects the placeholder. */
  value?: string | null
  /** The empty first option. Keeps "no answer" reachable, which matters when the
   *  column is nullable — without it a blind submit posts the first option as
   *  though it had been chosen. */
  placeholder?: string
  /** Rendered beneath the field, not at the top of the card. */
  error?: string
  className?: string
}) {
  // Derived from `name` rather than useId so this stays renderable on the
  // server. Names are unique within a form, which is all the id has to be.
  const errorId = `${name}-error`

  return (
    <div className="flex flex-col gap-2">
      {/* Sentence case: this labels one field, not a section. */}
      <label htmlFor={name} className="text-xs font-medium tracking-wide text-text-muted">
        {label}
      </label>

      <div className="relative">
        <select
          id={name}
          name={name}
          defaultValue={value ?? ''}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-12 w-full cursor-pointer appearance-none rounded border bg-surface-subtle',
            'pl-3 pr-10 text-sm text-text',
            'transition-[border-color,background-color] duration-150 hover:border-text-subtle',
            'focus:outline-2 focus:outline-offset-2 focus:outline-ink',
            // `outline`, not `outline-subtle`: a control boundary must clear
            // WCAG 1.4.11 at 3:1. See PRD Appendix A.
            error ? 'border-error' : 'border-outline',
            className,
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
      </div>

      <FieldError id={errorId} message={error} />
    </div>
  )
}
