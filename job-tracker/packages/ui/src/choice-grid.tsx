import type { ReactNode } from 'react'
import { cn } from './cn'
import { FieldError } from './field-error'

/**
 * A single-choice question as a grid of cards, each with a glyph over its label.
 *
 * Replaces a stack of full-width radio rows. Four of those cost ~284px of height;
 * a 2x2 grid costs ~172px and a single row of four costs ~124px, which is most of
 * what made the step overflow the viewport. It also reads as one question with
 * four answers rather than four independent questions, the same argument
 * SegmentedField makes — this is the version for labels too long to segment.
 *
 * Still real `<input type="radio">`s, sr-only, driven by `has-[:checked]`. So
 * keyboard arrows, form submission and screen-reader semantics come for free and
 * the selected state survives with JavaScript disabled, which a `useState`
 * version would not.
 *
 * The glyph is a ReactNode the caller supplies. `packages/ui` has no icon
 * library and should not gain one to draw a card; the dashboard passes its own.
 */

export type Choice = {
  value: string
  label: string
  /** Rendered above the label. Decorative — the label is the accessible name. */
  icon?: ReactNode
}

/**
 * Literal class strings, looked up. Tailwind only emits classes it can see, so a
 * computed `md:grid-cols-${n}` produces no CSS at all — the same trap the
 * segmented control's COLS table exists to avoid.
 *
 * `4` still passes through two columns at `sm` before going four wide: four cards
 * across a tablet leaves each one too narrow for its label.
 */
const GRID = {
  2: 'grid-cols-1 sm:grid-cols-2',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
} as const

export function ChoiceGrid({
  name,
  legend,
  choices,
  value,
  columns = 2,
  error,
}: {
  name: string
  legend: string
  choices: readonly Choice[]
  /** The stored answer. Null or absent selects nothing. */
  value?: string | null
  /**
   * Widest column count. `4` suits a full-width row of short answers; a long
   * label wraps to two lines and the grid stretches its row to match, so the
   * cards stay even without a min-height.
   */
  columns?: keyof typeof GRID
  error?: string
}) {
  // Derived from `name` rather than useId so this stays renderable on the server.
  const errorId = `${name}-error`

  return (
    <fieldset
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {legend}
      </legend>

      <div className={cn('grid gap-3', GRID[columns])}>
        {choices.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              'group relative flex cursor-pointer flex-col gap-2 rounded-md p-4',
              // `outline`, not `outline-subtle`: this is the visible edge of a
              // radio, and outline-subtle is asserted below 3:1 in
              // tokens.test.ts, which fails WCAG 1.4.11 on anything focusable.
              'border border-outline bg-surface',
              'transition-[background-color,border-color,transform] duration-150',
              'hover:bg-surface-subtle active:scale-[0.99]',
              // Checked reads as ink edge plus recessed fill. The inset ring
              // thickens the edge without a 2px border, which would shift the
              // grid by a pixel on select.
              'has-[:checked]:border-ink has-[:checked]:bg-surface-subtle',
              'has-[:checked]:ring-1 has-[:checked]:ring-inset has-[:checked]:ring-ink',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              'has-[:focus-visible]:outline-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              defaultChecked={value === choice.value}
              className="sr-only"
            />
            {choice.icon && (
              <span
                aria-hidden
                className="text-text-subtle transition-colors duration-150 group-has-[:checked]:text-text"
              >
                {choice.icon}
              </span>
            )}
            <span className="text-sm font-medium leading-snug text-text">{choice.label}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="mt-2">
          <FieldError id={errorId} message={error} />
        </div>
      )}
    </fieldset>
  )
}
