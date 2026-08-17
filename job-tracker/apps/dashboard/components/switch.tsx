import type { ReactNode } from 'react'

/**
 * One switch, two mechanisms — because the two places that need it submit
 * differently, and the element has to follow the submission rather than the look.
 *
 *   SwitchTrack  the shape only, for a caller that already knows the state at
 *                render time. The Jobs sidebar's toggle is a submit BUTTON with
 *                `role="switch"`, so it owns its own semantics and needs the
 *                visual alone.
 *   SwitchField  a real `<input type="checkbox">` styled as a switch, for a caller
 *                that is a FIELD inside a larger form. Settings saves the whole
 *                preferences form at once, so the toggle has to be a form control
 *                that posts a value — not a button that submits on click.
 *
 * Both draw from `TRACK` and `KNOB` so they cannot drift into two switches that
 * look almost the same.
 *
 * Lives in apps/dashboard, not packages/ui: that package gains a component when a
 * SECOND APP needs it, and both callers here are this one.
 *
 * Colour is not the only encoding. The knob moves as well as the track filling, so
 * the state survives greyscale and colour blindness — the rule the dashboard's
 * Delta badge and health chip already follow.
 */

const TRACK = 'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none'
const KNOB = 'absolute top-0.5 size-4 rounded-full bg-surface transition-[left] duration-150 motion-reduce:transition-none'

/** Knob positions. `left-0.5` and `left-[1.125rem]` keep a 2px inset either end of
 *  a 36px track holding a 16px knob. */
const OFF = 'left-0.5'
const ON = 'left-[1.125rem]'

export function SwitchTrack({ on }: { on: boolean }) {
  return (
    // aria-hidden: the caller's own role="switch" and aria-checked already carry
    // the state. Announcing it twice is worse than not drawing it.
    <span aria-hidden className={`${TRACK} ${on ? 'bg-ink' : 'bg-outline'}`}>
      <span className={`${KNOB} ${on ? ON : OFF}`} />
    </span>
  )
}

/**
 * A checkbox that looks like a switch.
 *
 * The input is `sr-only` rather than `hidden` or `appearance-none`: it stays in the
 * tab order, stays focusable, and stays a real checkbox to assistive tech and to
 * the form. The track is a sibling driven by `peer-checked:`, which is why it
 * responds instantly with no client state and no JavaScript at all.
 *
 * The knob is a CHILD of the track, and `peer-checked:` only reaches siblings of the
 * peer — hence the `peer-checked:[&>span]:` variant, which compiles to
 * `.peer:checked ~ .track > span`. Without that the track would fill while the knob
 * stayed put.
 *
 * The focus ring goes on the track, since the real input is visually hidden and an
 * outline on it would draw nothing a keyboard user could see.
 */
export function SwitchField({
  name,
  label,
  hint,
  defaultChecked,
  value = 'on',
}: {
  name: string
  label: string
  hint?: ReactNode
  defaultChecked?: boolean
  value?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={
            `${TRACK} bg-outline peer-checked:bg-ink ` +
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ' +
            // Written out in full, NOT interpolated from ON above. Tailwind only
            // emits classes it can see spelled out; `peer-checked:[&>span]:${ON}`
            // would assemble a real-looking name at runtime and compile to no CSS
            // at all — silently, exactly like the `top-[${n}px]` trap in
            // lib/jobs/layout.ts. Keep this literal in step with ON by hand.
            'peer-checked:[&>span]:left-[1.125rem]'
          }
        >
          <span className={`${KNOB} ${OFF}`} />
        </span>
        <span className="text-sm font-medium text-text">{label}</span>
      </label>
      {hint && <p className="pl-12 text-xs leading-relaxed text-text-muted">{hint}</p>}
    </div>
  )
}
