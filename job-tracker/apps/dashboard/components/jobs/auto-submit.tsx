'use client'

import { useEffect } from 'react'

/**
 * Submits the filter form when a control changes.
 *
 * Purely additive: the form already works without this, because it is a real
 * `<Form action="/jobs">` (see `search-header.tsx`) with a Search button.
 * This removes the extra click for everyone who has JavaScript, which is what
 * makes ticking a checkbox feel like a filter rather than like filling in a
 * form.
 *
 * Listens on the document rather than on the form, because half the controls
 * are associated by `form=` and are not descendants of it. No control is
 * excluded by type: `change` fires on commit — blur or Enter — not per
 * keystroke, which is the `input` event instead and this deliberately does
 * not listen for it. So a text field autosubmits when the reader leaves it,
 * exactly like every other control, and never mid-keystroke.
 *
 * `requestSubmit()` dispatches a trusted, bubbling `submit` event exactly as
 * if a submit button had been pressed, which is what lets it reach the
 * client-side navigation `next/form`'s `<Form>` installs on that event —
 * nothing here needs to call into the router directly.
 */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    function onChange(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return
      if (target.form?.id !== formId) return
      target.form.requestSubmit()
    }

    document.addEventListener('change', onChange)
    return () => document.removeEventListener('change', onChange)
  }, [formId])

  return null
}
