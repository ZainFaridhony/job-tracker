'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { EMPTY_FILTERS } from '@/lib/jobs/filters'

/**
 * Two jobs for the one form: submit it when a control changes, and — after a
 * client-side navigation the form itself did not cause — walk every
 * associated control and make its displayed state agree with the URL again.
 *
 * The first job is the one this component used to be named for (`AutoSubmit`):
 * purely additive, since the form already works with no JavaScript at all as a
 * real `<Form action="/jobs">` (see `search-header.tsx`) with a Search button.
 * Listens on the document rather than on the form, because half the controls
 * are associated by `form=` and are not descendants of it. `requestSubmit()`
 * dispatches a trusted, bubbling `submit` event exactly as if a submit button
 * had been pressed, which is what lets it reach the client-side navigation
 * `next/form`'s `<Form>` installs on that event — nothing here needs to call
 * into the router directly. `change` fires on commit — blur or Enter — not
 * per keystroke, so a text field autosubmits when the reader leaves it and
 * never mid-keystroke.
 *
 * The second job exists because of two facts about the platform, not a guess:
 *
 * 1. Next does not remount the page on a search-param change alone. The App
 *    Router's cache key deliberately excludes them —
 *    `createRouterCacheKey(activeSegment, true) // no search params` in
 *    `next/dist/client/components/layout-router.js`, with the comment "In the
 *    App Router model, search params do not cause state to be lost." That is
 *    exactly what keeps the sidebar's `<details>` open and the results'
 *    entrance animation from replaying on every filter click — it also means
 *    the DOM is reconciled, not rebuilt.
 * 2. React does not resync an uncontrolled control on that reconciliation.
 *    `react-dom`'s `updateInput` writes only the *content* attribute
 *    (`defaultChecked`/`defaultValue`) — once a control is dirty, the
 *    attribute no longer drives it. `<select>` is worse: its update path only
 *    calls `updateOptions` when `multiple` changes, so an uncontrolled select
 *    never resyncs at all.
 *
 * Put together: tick "Senior" in the sidebar (`?level=senior`, a chip
 * appears), click the chip's remove link (the chip and the query param both
 * go, but the checkbox — reconciled, not remounted — stays ticked), then tick
 * anything else, and the submit-on-change job above re-serialises every
 * associated control including that one, and `level=senior` comes right back.
 * There is no way to remove a filter from the sidebar once the chip naming it
 * is gone. The same failure reaches Clear All and the browser Back button,
 * because both are client-side navigations that change the URL without
 * remounting the form.
 */
export function FilterFormBehaviour({ formId }: { formId: string }) {
  const searchParams = useSearchParams()

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

  useEffect(() => {
    const form = document.getElementById(formId)
    if (!(form instanceof HTMLFormElement)) return

    for (const element of form.elements) {
      // Never touch the control the reader is mid-interaction with — this
      // effect exists to catch up controls a *different* navigation left
      // behind, not to fight the one that caused this render.
      if (element === document.activeElement) continue

      if (element instanceof HTMLInputElement) {
        const name = element.name
        if (!name) continue

        if (element.type === 'checkbox') {
          // Multi-valued: several checkboxes can share one name, so presence
          // in the full list of values is what "checked" means.
          const checked = searchParams.getAll(name).includes(element.value)
          if (element.checked !== checked) element.checked = checked
        } else if (element.type === 'radio') {
          // Single-valued, like a <select>: a radio group either states its
          // value or, absent from the URL, falls back to RADIO_DEFAULT.
          const fallback = RADIO_DEFAULT[name] ?? ''
          const values = searchParams.has(name) ? searchParams.getAll(name) : [fallback]
          const checked = values.includes(element.value)
          if (element.checked !== checked) element.checked = checked
        } else {
          const value = searchParams.get(name) ?? ''
          if (element.value !== value) element.value = value
        }
        continue
      }

      if (element instanceof HTMLSelectElement) {
        const name = element.name
        if (!name) continue
        // SELECT_DEFAULT, not '': a select whose absent state is a real value
        // rather than "any" would otherwise blank itself. See the note below.
        const value = searchParams.get(name) ?? SELECT_DEFAULT[name] ?? ''
        if (element.value !== value) element.value = value
      }
    }
  }, [formId, searchParams])

  return null
}

/**
 * Every radio group's absent-from-the-URL default is "nothing selected" —
 * `searchParams.has(name)` is false, so every radio in the group resets to
 * unchecked, same as a checkbox with no value present. `period` is the one
 * exception: `FilterState.period` is a `SalaryPeriod`, never null, and
 * `toQuery` omits it from the query string precisely when it already equals
 * `EMPTY_FILTERS.period` — so an untouched screen keeps a bare `/jobs`. Without
 * this, "Clear all" — which deliberately keeps the current period, see
 * `clearAllHref` — would resync every period radio to unchecked the moment the
 * kept value happens to be the default, dropping the segmented control's own
 * selection along with the filters it did mean to clear.
 */
const RADIO_DEFAULT: Record<string, string> = { period: EMPTY_FILTERS.period }

/**
 * The same exception, one control type over.
 *
 * A `<select>` whose name is absent from the URL resets to `''`, which selects
 * its placeholder — right for `fn`, `industry` and `mode`, which genuinely mean
 * "any". `currency` is not one of those: it is a display unit like `period`,
 * `FilterState.currency` is never empty, and `toQuery` omits it exactly when it
 * already equals `BASE_CURRENCY`. Without this entry, "Clear all" — which keeps
 * the chosen currency, see `clearAllHref` — would blank the currency picker
 * whenever the kept value happened to be USD, and the next submit would post an
 * empty currency.
 */
const SELECT_DEFAULT: Record<string, string> = { currency: EMPTY_FILTERS.currency }
