import { cn } from './cn'
import { FieldError } from './field-error'

/**
 * A radio group as a segmented control: one recessed track, the answer riding
 * under it as a raised pill that slides between segments.
 *
 * For short, mutually exclusive answers this is the densest honest form — three
 * 56px cards become one 40px row, and the options read as one question rather
 * than three independent ones. ChoiceGrid is the version for labels too long to
 * segment: same argument, two columns instead of one row.
 *
 * Still real `<input type="radio">`s, so keyboard arrows, form submission and
 * screen-reader semantics come for free. The inputs are sr-only and sit before
 * the pill so the whole control is driven by `peer-checked`: the slide needs no
 * client state and works with JavaScript disabled, which a `useState` thumb
 * would not. That is why the positions are a literal lookup table rather than
 * a computed class name — Tailwind only emits classes it can see as literals,
 * and a template string here would silently produce no CSS at all.
 *
 * Nothing checked is a real state: `work_location` starts null, so the pill is
 * hidden until an answer exists rather than sitting on a default the server
 * would then reject.
 */

// Indexed by option count, so a track of n segments gets n equal columns.
const COLS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'] as const

// Indexed by segment. translate-x is a multiple of the pill's own width, which
// is exactly one segment, so these stay correct at any track width.
const PEER = ['peer/s0', 'peer/s1', 'peer/s2', 'peer/s3'] as const

const PILL_AT = [
  'peer-checked/s0:translate-x-0 peer-checked/s0:opacity-100',
  'peer-checked/s1:translate-x-full peer-checked/s1:opacity-100',
  'peer-checked/s2:translate-x-[200%] peer-checked/s2:opacity-100',
  'peer-checked/s3:translate-x-[300%] peer-checked/s3:opacity-100',
] as const

const LABEL_ON = [
  'peer-checked/s0:text-text',
  'peer-checked/s1:text-text',
  'peer-checked/s2:text-text',
  'peer-checked/s3:text-text',
] as const

/** Beyond this the lookup tables run out and labels stop fitting anyway. */
export const MAX_SEGMENTS = PEER.length

/**
 * `default` is a full-width control in a form column. `compact` is chrome that
 * rides beside a section heading, so it shrinks to its labels and goes fully
 * round to read as a toggle rather than a field.
 *
 * The three geometries are coupled: `gutter` must equal twice the track padding
 * or the pill overhangs the last segment, since the pill's width is
 * `(100% - gutter) / n`. Change one, change all three.
 */
const SIZE = {
  default: {
    track: 'grid rounded-md p-1',
    pill: 'inset-y-1 left-1 rounded',
    label: 'py-2 text-sm',
    gutter: '0.5rem',
  },
  compact: {
    track: 'inline-grid rounded-full p-0.5',
    pill: 'inset-y-0.5 left-0.5 rounded-full',
    label: 'px-4 py-1 text-xs',
    gutter: '0.25rem',
  },
} as const

export function SegmentedField({
  name,
  legend,
  legendHidden,
  size = 'default',
  options,
  value,
  error,
  form,
}: {
  name: string
  /** Omit inside an enclosing fieldset that already names the group. */
  legend?: string
  /** Keeps the legend in the accessibility tree while hiding it visually, for
   *  when a neighbouring section heading is already carrying the label. */
  legendHidden?: boolean
  size?: keyof typeof SIZE
  options: readonly { readonly value: string; readonly label: string }[]
  /** The stored answer. Null or absent selects nothing. */
  value?: string | null
  /** Rendered beneath the track, so the message sits with the control it names
   *  rather than at the top of the card. */
  error?: string
  /** Associates every radio with a <form> elsewhere in the document. */
  form?: string
}) {
  const n = Math.min(options.length, MAX_SEGMENTS)
  const shown = options.slice(0, n)
  const s = SIZE[size]
  // Derived from `name` rather than useId so this stays renderable on the
  // server. Names are unique within a form, which is all the id has to be.
  const errorId = `${name}-error`

  return (
    <fieldset
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      {legend && (
        <legend
          className={
            legendHidden
              ? 'sr-only'
              : 'mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted'
          }
        >
          {legend}
        </legend>
      )}

      <div
        className={cn(
          'relative bg-surface-subtle',
          s.track,
          COLS[n],
          // One ring around the whole control. Arrow keys move focus and
          // selection together, so the pill already says which segment has it.
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
          'has-[:focus-visible]:outline-ink',
        )}
      >
        {shown.map((o, i) => (
          <input
            key={o.value}
            id={`${name}-${o.value}`}
            type="radio"
            name={name}
            form={form}
            value={o.value}
            defaultChecked={value === o.value}
            className={cn('sr-only', PEER[i])}
          />
        ))}

        {/* Sits between the track and the labels. inset-y-1/left-1 clear the
            track's p-1, so the width below is one exact segment. */}
        <span
          aria-hidden
          style={{ width: `calc((100% - ${s.gutter}) / ${n})` }}
          className={cn(
            'pointer-events-none absolute bg-surface opacity-0',
            s.pill,
            'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.08)]',
            'transition-[transform,opacity] duration-200 ease-entrance',
            ...PILL_AT.slice(0, n),
          )}
        />

        {shown.map((o, i) => (
          <label
            key={o.value}
            htmlFor={`${name}-${o.value}`}
            className={cn(
              // relative so the label paints over the pill rather than under it.
              'relative cursor-pointer select-none text-center font-medium',
              s.label,
              'text-text-muted transition-colors duration-150 hover:text-text',
              LABEL_ON[i],
            )}
          >
            {o.label}
          </label>
        ))}
      </div>

      {error && <div className="mt-2"><FieldError id={errorId} message={error} /></div>}
    </fieldset>
  )
}
