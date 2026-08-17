'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * The Search button, with a pending state while the filter navigation is in
 * flight.
 *
 * WHY NOT `useFormStatus`. That hook reports the status of a React *form action*
 * — a function passed to `action`. This form's action is the string "/jobs", and
 * `next/form` intercepts the submit to run a client-side navigation of its own,
 * so React never owns a transition to report and `pending` would stay false
 * forever. `useLinkStatus` is the equivalent for `next/link` and has no `<Form>`
 * counterpart.
 *
 * WHAT IT KEYS OFF INSTEAD. A submit starts the pending state; the arrival of new
 * `searchParams` ends it. That is exactly the round trip the reader is waiting on
 * — the server component re-renders with the new results — and it needs no access
 * to the router's internals.
 *
 * `formId` is a prop rather than an import of `FILTER_FORM_ID`, matching
 * `FilterFormBehaviour`. Importing the constant would pull `search-header.tsx` —
 * and `next/form`, `Input`, `Select`, `Panel` with it — into this module's client
 * graph to read one string.
 *
 * The submit listener is on the document, not the form, for the same reason
 * `FilterFormBehaviour`'s is: half the controls that trigger a submit are
 * associated by `form=` and are not descendants of the form element. It also
 * means the sidebar's own auto-submits light this button up too, which is right —
 * the button is the only thing on screen that can say "results are on their way",
 * and ticking a checkbox is the more common way to start that wait.
 *
 * `event.isTrusted` is NOT filtered here, deliberately, and that is the opposite
 * of what `FilterFormBehaviour` does with `change`. Its guard exists because a
 * synthetic `change` would cause an unwanted *submit*; here the submit has
 * already happened and a navigation really is starting, whatever dispatched it.
 *
 * Without JavaScript this renders as a plain enabled submit button and the
 * browser's own loading indicator does this job.
 */
export function SearchButton({ formId }: { formId: string }) {
  const [pending, setPending] = useState(false)
  const searchParams = useSearchParams()

  // The params at the moment of submit. Compared rather than assumed-different
  // because submitting a form that changes nothing — pressing Search twice —
  // produces no new params, and the effect below would otherwise never fire and
  // leave the button spinning forever.
  const submitted = useRef<string | null>(null)
  const current = searchParams.toString()

  useEffect(() => {
    function onSubmit(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLFormElement)) return
      if (target.id !== formId) return
      submitted.current = current
      setPending(true)
    }

    document.addEventListener('submit', onSubmit)
    return () => document.removeEventListener('submit', onSubmit)
  }, [current, formId])

  useEffect(() => {
    // New params means the navigation this button was waiting on has landed.
    if (submitted.current !== null && submitted.current !== current) {
      submitted.current = null
      setPending(false)
    }
  }, [current])

  useEffect(() => {
    if (!pending) return
    // A submit that resolves to the same URL produces no param change, so
    // nothing above would ever clear it. Next renders that case from cache
    // almost immediately, so this is a floor on the spinner, not a timeout on
    // the request.
    const timer = setTimeout(() => setPending(false), 1200)
    return () => clearTimeout(timer)
  }, [pending, current])

  return (
    <button
      type="submit"
      // Deliberately NOT disabled. A disabled submit button cannot be re-pressed
      // if the navigation fails, and disabling the control the reader just
      // activated moves focus to the body in some browsers. `aria-busy` states it
      // without taking the control away.
      aria-busy={pending}
      className="flex h-12 items-center justify-center gap-2 rounded bg-ink px-6 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {pending && (
        <Loader2
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
          strokeWidth={2}
        />
      )}
      {/* The label does not change to "Searching…". The button is a fixed grid
          cell, and swapping in a longer word reflows the whole row on every
          submit — the spinner and aria-busy carry the state instead. */}
      Search
    </button>
  )
}
