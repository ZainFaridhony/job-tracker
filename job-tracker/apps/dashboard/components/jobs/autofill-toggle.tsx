import Link from 'next/link'
import { SwitchTrack } from '@/components/switch'
import { toggleJobsAutofillAction } from '@/lib/jobs/actions'
import type { FilterState } from '@/lib/jobs/filters'
import { hasSeed, seedSummary, type SeedPreferences } from '@/lib/jobs/seed'

/**
 * "Start with my preferences" — the mirror of the checkbox on
 * /settings/preferences, editable from here too.
 *
 * A server component with a real POST form, so it works with JavaScript off. It is
 * NOT part of the `job-filters` GET form and cannot be: that form folds itself into
 * a URL and cannot write to Postgres, and a nested form is invalid HTML. It is a
 * sibling instead — the same arrangement the account menu uses for sign-out.
 *
 * The button posts the DESIRED state rather than asking the server to flip what is
 * stored, so the markup is honest about what pressing it does and two fast submits
 * cannot race into an unpredictable result.
 *
 * WHAT IT SAYS ABOUT ITSELF. The summary under the label is the same derivation the
 * link uses (`seeded()` in seed.ts), not a second computation — the reason the whole
 * screen derives rather than repeats. So the control cannot promise "Remote ·
 * $200k+" and then apply something else, which is precisely the class of
 * contradiction the reference sheet ships and this screen was built to remove.
 *
 * It disappears when there is nothing to apply, rather than rendering a switch that
 * provably does nothing — the reasoning that keeps the onboarding stepper
 * unclickable. In that case it offers the way to fix that instead: a link to the
 * screen where those preferences are set.
 */
export function AutofillToggle({
  prefs,
  filters,
}: {
  prefs: SeedPreferences
  /** Only for `period` and `currency`, which are display units rather than filters
   *  and must survive switching the toggle off — see `clearAllHref`. */
  filters: FilterState
}) {
  const summary = seedSummary(prefs)

  if (!hasSeed(prefs)) {
    return (
      <div className="flex flex-col gap-1.5 border-b border-outline-subtle pb-4 pt-3">
        <span className="text-sm font-semibold text-text">Start with my preferences</span>
        <p className="text-xs leading-relaxed text-text-muted">
          Set a work location or a target salary in{' '}
          <Link
            href="/settings/preferences"
            className="rounded underline underline-offset-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            your preferences
          </Link>{' '}
          and they can be applied here.
        </p>
      </div>
    )
  }

  const on = prefs.autofill

  return (
    <form
      action={toggleJobsAutofillAction}
      className="flex flex-col gap-1.5 border-b border-outline-subtle pb-4 pt-3"
    >
      {/* The target state, not a flip. See the action. */}
      <input type="hidden" name="autofill" value={on ? 'off' : 'on'} />
      {/* So switching off clears the filters without also changing the unit every
          salary on the screen reads in. */}
      <input type="hidden" name="period" value={filters.period} />
      <input type="hidden" name="currency" value={filters.currency} />

      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-describedby="autofill-summary"
        className="group flex w-full items-center gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {/* The same track the settings switch draws — see components/switch.tsx —
            so one preference does not get two slightly different switches. */}
        <SwitchTrack on={on} />
        <span className="text-sm font-semibold text-text">Start with my preferences</span>
      </button>

      <p id="autofill-summary" className="pl-12 text-xs leading-relaxed text-text-muted">
        {/* The middot list matches how the chips read, so the same filters are
            described the same way in both places. */}
        {summary.join(' · ')} — applied whenever you open Jobs.
      </p>
    </form>
  )
}
