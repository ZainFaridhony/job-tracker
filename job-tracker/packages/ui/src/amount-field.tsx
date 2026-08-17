'use client'

import { useId, useState } from 'react'
import { cn } from './cn'
import { ChevronDown } from './icons'

export type Currency = {
  readonly value: string
  readonly label: string
  /** Presentation only. The stored value is the code. */
  readonly symbol: string
}

/** Groups digits in threes. Deliberately not Intl.NumberFormat: the separator
 *  must not change with the runtime's locale, or the same profile renders
 *  differently on the server and in the browser and React logs a mismatch. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Digits only, no leading zeros. The server runs the same normalisation, which
 *  is what lets the field stay a plain text input that works without JS. */
function normalise(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15)
}

/**
 * A money amount at display scale, with the currency chosen beside it.
 *
 * The amount is the answer to the question, so it is typeset like one — the
 * largest thing in the card, on a rule rather than in a box. ScaleSelect is the
 * same treatment for an answer that is picked rather than typed; the two are
 * deliberately peers.
 *
 * Amount and currency are separate fields because they are separate columns.
 * Before this, currency was typed into the amount as free text ("240,000,000
 * IDR"), which made the number unusable and gave the same fact two homes.
 *
 * The grouping is a client enhancement: the input posts whatever it holds and
 * the server normalises to digits, so with JavaScript off you type a plain
 * number and it still saves correctly. The symbol likewise follows the picker
 * live, and without JS simply stays on the stored currency — which is right on
 * load, and the chip never stops showing the truth.
 */
export function AmountField({
  label,
  labelHidden,
  name,
  currencyName,
  currencies,
  currency,
  defaultValue,
  placeholder,
  hint,
  form,
}: {
  label: string
  /**
   * Hides the label visually and keeps it for assistive tech.
   *
   * For a caller whose surrounding copy already says what the amount is — the
   * jobs sidebar's Salary section, where the segmented "Show salaries as" control
   * sits directly above and a hint sits directly below. The label is still
   * REQUIRED, and still rendered: dropping it leaves an unnamed number input
   * beside a labelled currency select, which a screen reader announces as
   * nothing and WCAG 3.3.2 does not allow. Onboarding and settings pass nothing
   * here, where the label is the question being asked and belongs on screen.
   */
  labelHidden?: boolean
  name: string
  currencyName: string
  currencies: readonly Currency[]
  /** The stored currency code. Falls back to the first offered. */
  currency?: string | null
  /** The stored amount. Digits, formatted for display on first paint. */
  defaultValue?: string | null
  placeholder?: string
  /** A line under the field, for when the currency means more than the amount
   *  it sits beside — the jobs filter reads every salary on the screen in it. */
  hint?: string
  /** Associates both controls with a <form> elsewhere in the document, for a
   *  layout that cannot put them in the same subtree. */
  form?: string
}) {
  const id = useId()
  const initialCode = currencies.find((c) => c.value === currency)?.value ?? currencies[0]!.value
  const [code, setCode] = useState(initialCode)
  const [shown, setShown] = useState(() => group(normalise(defaultValue ?? '')))

  const symbol = currencies.find((c) => c.value === code)?.symbol ?? ''

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={
          labelHidden ? 'sr-only' : 'text-xs font-medium tracking-wide text-text-muted'
        }
      >
        {label}
      </label>

      <div
        className={cn(
          'flex items-baseline gap-3 border-b-2 pb-2',
          // A field boundary, so `outline` and not `outline-subtle`: it has to
          // clear WCAG 1.4.11 at 3:1. See PRD Appendix A.
          'border-outline transition-colors duration-150 hover:border-text-subtle',
        )}
      >
        {/* One step down from the page h1, which is text-3xl. At the same size
            it outranked the question it was answering, and the amount is
            optional — salary_target is nullable. */}
        <span aria-hidden className="text-xl font-medium text-text-subtle">
          {symbol}
        </span>

        <input
          id={id}
          name={name}
          form={form}
          value={shown}
          onChange={(e) => setShown(group(normalise(e.target.value)))}
          // Not type="number": it forbids the separators and adds a spinner.
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby={`${id}-currency`}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular-nums tracking-tight',
            'text-text placeholder:text-2xl placeholder:font-normal placeholder:text-text-subtle',
            'rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          )}
        />

        <div className="relative shrink-0 self-center">
          <select
            id={`${id}-currency`}
            name={currencyName}
            form={form}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Currency"
            className={cn(
              'cursor-pointer appearance-none rounded border border-outline bg-surface-subtle',
              'py-1.5 pl-3 pr-8 text-xs font-semibold tracking-wide text-text',
              'transition-colors duration-150 hover:bg-surface',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            )}
          >
            {currencies.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-text-subtle" />
        </div>
      </div>

      {hint && <p className="text-xs leading-relaxed text-text-muted">{hint}</p>}
    </div>
  )
}
