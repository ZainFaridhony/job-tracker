import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }

export function Checkbox({ label, id, ...rest }: Props) {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className="flex items-start gap-3">
      <input
        {...rest}
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 rounded-sm border border-outline accent-ink"
      />
      <label htmlFor={inputId} className="text-sm text-text-muted">
        {label}
      </label>
    </div>
  )
}
