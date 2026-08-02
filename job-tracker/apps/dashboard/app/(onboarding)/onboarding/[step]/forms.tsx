'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button, Card, ChipField, FormError, Input, OptionCard } from '@job-tracker/ui'
import {
  finishOnboardingAction,
  saveGoalAction,
  saveRolesAction,
  saveSkillsAction,
  saveWorkAction,
  uploadCvAction,
  type StepState,
} from '@/lib/onboarding/actions'
import { CAREER_GOALS, SALARY_PERIODS, WORK_LOCATIONS } from '@/lib/onboarding/steps'

export type Profile = {
  career_goal: string | null
  target_roles: string[]
  skills: string[]
  years_experience: number | null
  work_location: string | null
  salary_period: string | null
  salary_target: string | null
}

const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function ResumeForm() {
  const [state, action, pending] = useActionState<StepState, FormData>(uploadCvAction, {})
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <Card>
      <form action={action} aria-label="Upload resume" className="flex flex-col gap-6">
        <FormError message={state.error} />

        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-outline bg-surface-subtle px-6 py-12 text-center transition-colors hover:border-ink"
        >
          <input
            type="file"
            name="cv"
            accept={ACCEPT}
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="sr-only"
          />
          <span className="text-sm font-medium text-text">
            {fileName ?? 'Choose a PDF or Word document'}
          </span>
          <span className="text-xs text-text-subtle">
            {fileName ? 'Click to choose a different file' : 'Up to 10 MB'}
          </span>
        </label>

        {/* P2: say where the file goes before it is sent, not in a policy page. */}
        <p className="text-xs leading-relaxed text-text-subtle">
          We extract the text from your CV and send it to Groq to fill in the next steps. It is
          stored privately and is never visible to anyone else.
        </p>

        <Button type="submit" pending={pending}>
          {pending ? 'Reading your CV…' : 'Upload and continue'}
        </Button>
      </form>
    </Card>
  )
}

export function GoalForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveGoalAction, {})

  return (
    <Card>
      <form action={action} aria-label="Career goal" className="flex flex-col gap-4">
        <FormError message={state.error} />
        {CAREER_GOALS.map((g) => (
          <OptionCard
            key={g.value}
            name="career_goal"
            value={g.value}
            label={g.label}
            defaultChecked={profile.career_goal === g.value}
          />
        ))}
        <Button type="submit" pending={pending} className="mt-2">
          Continue
        </Button>
      </form>
    </Card>
  )
}

export function RolesForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveRolesAction, {})

  return (
    <Card>
      <form action={action} aria-label="Target roles" className="flex flex-col gap-6">
        <FormError message={state.error} />
        <ChipField
          name="target_roles"
          label="Target roles"
          initial={profile.target_roles}
          placeholder="Add a role…"
        />
        <Button type="submit" pending={pending}>
          Continue
        </Button>
      </form>
    </Card>
  )
}

export function SkillsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveSkillsAction, {})

  return (
    <Card>
      <form action={action} aria-label="Skills and experience" className="flex flex-col gap-6">
        <FormError message={state.error} />
        <ChipField
          name="skills"
          label="Identified skills"
          initial={profile.skills}
          placeholder="Add a skill…"
        />
        <Input
          label="Years of experience"
          name="years_experience"
          type="number"
          min={0}
          max={60}
          step={1}
          placeholder="e.g. 7"
          defaultValue={profile.years_experience ?? ''}
        />
        <Button type="submit" pending={pending}>
          Continue
        </Button>
      </form>
    </Card>
  )
}

export function WorkForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveWorkAction, {})

  return (
    <Card>
      <form action={action} aria-label="Work preferences" className="flex flex-col gap-6">
        <FormError message={state.error} />

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-medium tracking-wide text-text-muted">
            Preferred location
          </legend>
          {WORK_LOCATIONS.map((l) => (
            <OptionCard
              key={l.value}
              name="work_location"
              value={l.value}
              label={l.label}
              defaultChecked={profile.work_location === l.value}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-medium tracking-wide text-text-muted">
            Salary expectations
          </legend>
          <div className="flex gap-3">
            {SALARY_PERIODS.map((p) => (
              <div key={p.value} className="flex-1">
                <OptionCard
                  name="salary_period"
                  value={p.value}
                  label={p.label}
                  defaultChecked={(profile.salary_period ?? 'yearly') === p.value}
                />
              </div>
            ))}
          </div>
          <Input
            label="Target salary"
            name="salary_target"
            placeholder="e.g. 240,000,000 IDR"
            defaultValue={profile.salary_target ?? ''}
          />
        </fieldset>

        <Button type="submit" pending={pending}>
          Continue
        </Button>
      </form>
    </Card>
  )
}

/** Reads the enclosing form's state, which is what lets DoneForm post the
 *  server action directly instead of through a client wrapper. */
function FinishButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" pending={pending}>
      {pending ? 'Opening your workspace…' : 'Go to my workspace'}
    </Button>
  )
}

export function DoneForm({ profile }: { profile: Profile }) {
  const summary: Array<[string, string]> = [
    ['Roles', profile.target_roles.join(', ') || 'None yet'],
    ['Skills', profile.skills.slice(0, 8).join(', ') || 'None yet'],
    [
      'Experience',
      profile.years_experience === null ? 'Not stated' : `${profile.years_experience} years`,
    ],
    ['Location', WORK_LOCATIONS.find((l) => l.value === profile.work_location)?.label ?? '—'],
  ]

  return (
    <Card>
      <dl className="flex flex-col gap-4">
        {summary.map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1">
            <dt className="text-xs font-medium tracking-wide text-text-muted">{term}</dt>
            <dd className="text-sm leading-relaxed text-text">{value}</dd>
          </div>
        ))}
      </dl>
      <form action={finishOnboardingAction} className="mt-8">
        <FinishButton />
      </form>
    </Card>
  )
}
