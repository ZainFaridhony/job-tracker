/**
 * A validation message that sits with the control it is about.
 *
 * The wizard's server actions used to return one card-level string, so "Pick a
 * work location" rendered at the top of the card, a whole stack of controls away
 * from the segmented control it named. Input has carried its own version of this
 * markup since the auth screens; this is the same thing for the controls that
 * are not a single input — a radio group, a chip list, an amount field.
 *
 * Renders nothing without a message, so a caller can pass a possibly-undefined
 * error without a conditional. `id` is required rather than generated: the point
 * is that the control references it with aria-describedby, and a generated id
 * would leave nothing for the caller to point at.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-xs text-error">
      {message}
    </p>
  )
}
