'use client'

import { useEffect } from 'react'

/**
 * Submits the filter form when a control changes.
 *
 * Purely additive: the form already works without this, because it is a real
 * <form method="GET"> with a Search button. This removes the extra click for
 * everyone who has JavaScript, which is what makes ticking a checkbox feel like
 * a filter rather than like filling in a form.
 *
 * Listens on the document rather than on the form, because half the controls
 * are associated by `form=` and are not descendants of it. Text inputs are
 * excluded — resubmitting per keystroke would navigate on every letter — so
 * typing still ends with Enter or the Search button.
 */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    function onChange(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return
      if (target.form?.id !== formId) return
      if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search'))
        return
      target.form.requestSubmit()
    }

    document.addEventListener('change', onChange)
    return () => document.removeEventListener('change', onChange)
  }, [formId])

  return null
}
