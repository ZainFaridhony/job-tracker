'use client'

import { useActionState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import {
  AmountField,
  Button,
  ChoiceGrid,
  Divider,
  FormError,
  SegmentedField,
  Select,
  type Choice,
} from '@job-tracker/ui'
import { GraduationCapIcon, MedalIcon, RepeatIcon, TrendingUpIcon } from 'lucide-react'
import { SwitchField } from '@/components/switch'
import { TagPicker } from '@/components/tag-picker'
import {
  savePreferencesSettingsAction,
  type SettingsState,
} from '@/lib/settings/actions'
import {
  bandFor,
  CAREER_GOALS,
  DEFAULT_CURRENCY,
  EXPERIENCE_BANDS,
  SALARY_CURRENCIES,
  SALARY_PERIODS,
  WORK_LOCATIONS,
  type CareerGoalIcon,
} from '@/lib/onboarding/steps'
import { ROLE_SECTIONS, SKILL_SECTIONS } from '@/lib/onboarding/suggestions'
import type { Profile } from '@/app/(onboarding)/onboarding/[step]/forms'

/**
 * The whole of onboarding steps 2 and 3, on one screen, editable forever.
 *
 * Every control is the component the wizard uses. That is the point: a settings
 * screen that reimplements the same fields is two places to fix a chip picker,
 * and the two would answer differently about what a valid salary is within a
 * month. The server side is shared too — `readAllProfileFields` checks this post
 * and the wizard's with the same code.
 *
 * The wizard splits these across two steps because it is grouped by who knows
 * the answer: step 2 is what the CV said, step 3 is what it cannot say. That
 * distinction is about arriving, not about editing, so here they are one form
 * with a divider where the wizard has a page break.
 */
const GOAL_ICONS: Record<CareerGoalIcon, ReactNode> = {
  graduation: <GraduationCapIcon className="size-5" strokeWidth={1.5} />,
  trending: <TrendingUpIcon className="size-5" strokeWidth={1.5} />,
  switch: <RepeatIcon className="size-5" strokeWidth={1.5} />,
  medal: <MedalIcon className="size-5" strokeWidth={1.5} />,
}

const GOAL_CHOICES: Choice[] = CAREER_GOALS.map((g) => ({
  value: g.value,
  label: g.label,
  icon: GOAL_ICONS[g.icon],
}))

function cardError(state: SettingsState): string | undefined {
  return state.field ? undefined : state.error
}

function fieldError(state: SettingsState, field: string): string | undefined {
  return state.field === field ? state.error : undefined
}

/** Reads the enclosing form, so the button can be a child of the form rather
 *  than a client closure wrapping the action. */
function SaveButton({ savedAt }: { savedAt?: number }) {
  const { pending } = useFormStatus()
  return (
    <div className="flex items-center gap-4">
      <div className="w-full sm:w-auto sm:min-w-[200px]">
        <Button type="submit" pending={pending}>
          {pending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
      {/* aria-live so the confirmation is announced, not only seen. It is
          replaced rather than accumulated, and disappears on the next submit
          because `savedAt` is cleared while the action runs. */}
      <p aria-live="polite" className="text-sm text-text-muted">
        {!pending && savedAt ? 'Saved.' : ''}
      </p>
    </div>
  )
}

export function PreferencesForm({
  profile,
  autofill,
}: {
  profile: Profile
  /** `profiles.autofill_job_filters`. A separate prop rather than a field on
   *  `Profile`, which is the shape the onboarding wizard shares — the wizard has
   *  no such toggle, and widening that type would imply it does. */
  autofill: boolean
}) {
  const [state, action] = useActionState<SettingsState, FormData>(
    savePreferencesSettingsAction,
    {},
  )

  return (
    <form action={action} aria-label="Preferences" className="flex flex-col gap-8">
      <FormError message={cardError(state)} />

      <ChoiceGrid
        name="career_goal"
        legend="Career goal"
        choices={GOAL_CHOICES}
        value={profile.career_goal}
        columns={4}
        error={fieldError(state, 'career_goal')}
      />

      {/* Full width, both of them. A real extracted title like "Brand Partner
          Specialist - Automation" is a ~330px chip, so a half-width lane wraps
          three roles onto three rows — the same trade the wizard settled. */}
      <TagPicker
        name="target_roles"
        label="Roles from your CV"
        initial={profile.target_roles}
        sections={ROLE_SECTIONS}
        placeholder="Search or add a role…"
        empty="No roles yet"
        error={fieldError(state, 'target_roles')}
      />

      <TagPicker
        name="skills"
        label="Skills"
        initial={profile.skills}
        sections={SKILL_SECTIONS}
        placeholder="Search or add a skill…"
        empty="No skills yet"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Select
          label="Years of experience"
          name="years_experience"
          options={EXPERIENCE_BANDS}
          value={bandFor(profile.years_experience)?.value}
          placeholder="Select range"
          error={fieldError(state, 'years_experience')}
        />

        <SegmentedField
          name="work_location"
          legend="Preferred location"
          options={WORK_LOCATIONS}
          value={profile.work_location}
          error={fieldError(state, 'work_location')}
        />
      </div>

      <div className="flex flex-col gap-4">
        <SegmentedField
          name="salary_period"
          legend="Salary expectations"
          options={SALARY_PERIODS}
          value={profile.salary_period ?? 'yearly'}
          error={fieldError(state, 'salary_period')}
        />

        {/* `defaultValue`, not `value`: AmountField groups digits as you type
            and owns its own input state, so a controlled value would fight it.
            Same call the wizard makes. */}
        <AmountField
          label="Target salary"
          name="salary_target"
          currencyName="salary_currency"
          currencies={SALARY_CURRENCIES}
          currency={profile.salary_currency ?? DEFAULT_CURRENCY}
          defaultValue={profile.salary_target}
        />
      </div>

      <Divider />

      {/* The one control here that is not a profile fact but a choice about how
          the app behaves. It sits last, after the divider, so it reads as a
          setting rather than as another thing the CV told us.

          A hidden input carries the unchecked case: an unticked checkbox posts
          NOTHING, so without it `readPreferenceFields` could not tell "turned
          off" from "this form does not have the field" — and the toggle would be
          impossible to switch back off. The browser posts both in order and the
          server reads the LAST value, which is how the checkbox wins when it is
          ticked. Same reason it needs no JavaScript to work. */}
      <div className="flex flex-col gap-2">
        <input type="hidden" name="autofill_job_filters" value="off" />
        <SwitchField
          name="autofill_job_filters"
          value="on"
          defaultChecked={autofill}
          label="Open Jobs with my preferences already applied"
          hint="The Jobs tab will start filtered to your work location and target salary. You can clear any of it from the filter bar, or switch this from the Jobs sidebar."
        />
      </div>

      <SaveButton savedAt={state.savedAt} />
    </form>
  )
}
