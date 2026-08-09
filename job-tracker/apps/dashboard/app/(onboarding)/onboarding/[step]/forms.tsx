'use client'

import { useActionState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import {
  AmountField,
  Button,
  Card,
  ChoiceGrid,
  Divider,
  FormError,
  SegmentedField,
  Select,
  WizardFooter,
  type Choice,
} from '@job-tracker/ui'
import {
  CheckIcon,
  GraduationCapIcon,
  MedalIcon,
  RepeatIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { TagPicker } from '@/components/tag-picker'
import {
  finishOnboardingAction,
  savePreferencesAction,
  saveProfileAction,
  type StepState,
} from '@/lib/onboarding/actions'
import { STEP_BODY, STEP_FORM } from '@/lib/onboarding/step-layout'
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

export type Profile = {
  career_goal: string | null
  target_roles: string[]
  skills: string[]
  years_experience: number | null
  work_location: string | null
  salary_period: string | null
  salary_target: string | null
  salary_currency: string | null
}

/** Every step owns its action row, so every step needs the back target. It is
 *  undefined on step 1, where WizardFooter renders the submit on its own. */
type StepProps = { backHref?: string }

/**
 * A message that belongs to no single control — the card-level fallback. When
 * the action named a field, that field renders the message itself and this stays
 * empty, so the same string never appears twice.
 */
function cardError(state: StepState): string | undefined {
  return state.field ? undefined : state.error
}

/** The message for one field, or undefined if the failure was elsewhere. */
function fieldError(state: StepState, field: string): string | undefined {
  return state.field === field ? state.error : undefined
}

/**
 * Step 2 — everything the CV told us, in one place.
 *
 * Roles and skills were adjacent steps in the six-step wizard, which is how they
 * ended up with two different chip treatments and two different ways to edit a
 * list. Together on one card they have to agree, and the user's job here is a
 * single pass of scanning and correcting rather than three separate arrivals.
 */
export function ProfileForm({ profile, backHref }: { profile: Profile } & StepProps) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveProfileAction, {})


  return (
    <form action={action} aria-label="Your profile" className={STEP_FORM}>
      <Card className={STEP_BODY}>
        <div className="flex flex-col gap-5">
          <FormError message={cardError(state)} />

          {/*
            Both pickers full width. They were briefly paired in two columns to
            save height, which starved the one that needed the room: a real
            extracted title like "Brand Partner Specialist - Automation" is a
            ~330px chip, so in a 396px lane three roles wrapped to three rows
            while short skills packed four to a row. At full width the same three
            fit on one. Match column width to content width, not just height.
          */}
          {/* "Roles from your CV", not "Target roles": the extractor reports
              titles the person actually held, and the column becomes a target
              list through the user's own edits on a step that asks them to
              correct it. Labelling held titles as targets was the field
              promising something the prompt does not produce. */}
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

          {/* Capped: a band picker stretched across 800px looks like a mistake. */}
          <div className="md:max-w-[280px]">
            {/* Bucketed on the way in: the stored figure may be the precise one
                the model read from the CV, which is usually not a band's lower
                bound. */}
            <Select
              label="Years of experience"
              name="years_experience"
              options={EXPERIENCE_BANDS}
              value={bandFor(profile.years_experience)?.value}
              placeholder="Select range"
              error={fieldError(state, 'years_experience')}
            />
          </div>
        </div>
      </Card>

      <WizardFooter backHref={backHref}>
        <Button type="submit" pending={pending}>
          Continue
        </Button>
      </WizardFooter>
    </form>
  )
}

/**
 * The glyph for each career goal. Mapped here rather than in `steps.ts` because
 * that module is imported by the server and by `gate.ts`; pulling an icon set in
 * there would drag it into every one of those bundles.
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

/**
 * Step 3 — what a CV cannot say.
 *
 * Career goal lives here rather than beside the roles Cerebras read off your
 * history: a CV is a record of what you have done, and this step is about what
 * you want next. Three questions, so they are grouped into two visible
 * decisions — the goal, then the shape of the job — rather than reading as five
 * loose controls.
 */
export function PreferencesForm({ profile, backHref }: { profile: Profile } & StepProps) {
  const [state, action, pending] = useActionState<StepState, FormData>(savePreferencesAction, {})

  return (
    <form action={action} aria-label="What you are looking for" className={STEP_FORM}>
      <Card className={STEP_BODY}>
        <div className="flex flex-col gap-5">
          <FormError message={cardError(state)} />

          {/* Four across in one row, which costs ~124px where a 2x2 costs ~172px
              and four stacked rows cost ~284px. The longest label wraps to two
              lines and the grid stretches its row to match, so the cards stay
              even. Two up at sm, one below it. */}
          <ChoiceGrid
            name="career_goal"
            legend="Career goal"
            choices={GOAL_CHOICES}
            value={profile.career_goal}
            columns={4}
            error={fieldError(state, 'career_goal')}
          />

          <SegmentedField
            name="work_location"
            legend="Preferred location"
            options={WORK_LOCATIONS}
            value={profile.work_location}
            error={fieldError(state, 'work_location')}
          />

          <div className="flex flex-col gap-4">
            {/* The period is a property of the amount below it, not a question of
                its own, so it rides beside the heading as chrome. The legend stays
                in the accessibility tree because the heading is a <p>, not a label
                the radios could be associated with. */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Salary expectations
              </p>
              <SegmentedField
                name="salary_period"
                legend="Pay period"
                legendHidden
                size="compact"
                options={SALARY_PERIODS}
                value={profile.salary_period ?? 'yearly'}
              />
            </div>

            <AmountField
              label="Target salary"
              name="salary_target"
              currencyName="salary_currency"
              currencies={SALARY_CURRENCIES}
              currency={profile.salary_currency ?? DEFAULT_CURRENCY}
              defaultValue={profile.salary_target}
            />
          </div>
        </div>
      </Card>

      <WizardFooter backHref={backHref}>
        <Button type="submit" pending={pending}>
          Continue
        </Button>
      </WizardFooter>
    </form>
  )
}

/** Reads the enclosing form's state, which is what lets DoneForm post the
 *  server action directly instead of through a client wrapper. */
function FinishButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" pending={pending}>
      {/* "My Workspace" capitalised as a proper name — it names the place the
          button goes, not a generic workspace. The pending label follows it for
          the same reason: "Opening your workspace…" beside "Go to My Workspace"
          would be two names for one destination. */}
      {pending ? 'Opening My Workspace…' : 'Go to My Workspace'}
    </Button>
  )
}

/** Reassembles the three columns the amount was split across, so the summary
 *  shows what was entered rather than a bare number. */
function salarySummary(profile: Profile): string {
  if (!profile.salary_target) return 'Not stated'
  const symbol = SALARY_CURRENCIES.find((c) => c.value === profile.salary_currency)?.symbol ?? ''
  const amount = profile.salary_target.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const period = profile.salary_period === 'monthly' ? 'a month' : 'a year'
  return `${symbol}${amount} ${profile.salary_currency ?? ''} ${period}`.replace(/\s+/g, ' ').trim()
}

/** First few, then a count. A summary of twelve skills is not a summary. */
function few(items: string[], limit = 3): string {
  if (items.length === 0) return 'None yet'
  const shown = items.slice(0, limit).join(', ')
  return items.length > limit ? `${shown} +${items.length - limit}` : shown
}

/**
 * Step 4 — what the product now knows, as a confirmation rather than a table.
 *
 * The filename row is gone. It was the one fact here the user could not see
 * elsewhere, but step 1 already narrates "Read <filename>" while the upload is
 * happening, so this was the second telling — and it put a person's name and a
 * character count on screen to say something they had just watched happen.
 * Removing it also retires the `cvs` query in page.tsx, which existed only to
 * feed it.
 *
 * Ticked rows rather than a two-column grid: every line here is a thing that is
 * now settled, and a tick says that where a bare label does not. The values stay
 * — a checklist reading "Resume analysed / Goals set" looks tidier and tells you
 * nothing you could check, and this is the last screen before the wizard closes.
 *
 * Deliberately NOT taking two things from the reference design. Its copy claims
 * a personalised dashboard built from your goals and career trajectory; no such
 * personalisation exists (PRD NG2), and step 2-3's answers are currently stored
 * and read by nothing. And its call to action sits inside the card, where this
 * one cannot: WizardFooter lives outside the Card because the Card is the scroll
 * region, and a button inside it scrolls away on a short viewport. See
 * lib/onboarding/step-layout.ts.
 */
export function DoneForm({ profile, backHref }: { profile: Profile } & StepProps) {
  const summary: Array<[string, string]> = [
    ['Roles', few(profile.target_roles)],
    ['Skills', few(profile.skills)],
    // bandFor, not a find on the value: a figure the model read from the CV
    // matches no band's lower bound and would render as unstated.
    ['Experience', bandFor(profile.years_experience)?.label ?? 'Not stated'],
    [
      'Looking for',
      [WORK_LOCATIONS.find((l) => l.value === profile.work_location)?.label, salarySummary(profile)]
        .filter(Boolean)
        .join(' · '),
    ],
  ]

  return (
    // Same column as the other steps, but the form wraps only the footer: there
    // is nothing on this step to submit, and finishOnboardingAction takes a
    // FormData it never reads so it can be a form's action directly.
    <div className={STEP_FORM}>
      <Card className={STEP_BODY}>
        <div className="flex flex-col gap-6">
          {/* The affirmation the heading above states in words. Centred on the
              same axis as that heading, so the card opens on one line rather
              than two. aria-hidden: "Your profile is set" already says it, and
              a screen reader does not need the mark repeated. */}
          <span
            aria-hidden
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-ink text-text-on-ink"
          >
            <CheckIcon className="size-6" strokeWidth={3} />
          </span>

          <Divider />

          <dl className="flex flex-col gap-5">
            {summary.map(([term, value]) => (
              <div key={term} className="flex items-start gap-3">
                {/* text-ink, not the filled badge above: four filled circles
                    would compete with the one that marks the whole step done. */}
                <CheckIcon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-ink"
                  strokeWidth={3}
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-xs font-medium tracking-wide text-text-muted">{term}</dt>
                  <dd className="text-sm leading-relaxed text-text">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <form action={finishOnboardingAction}>
        <WizardFooter backHref={backHref}>
          <FinishButton />
        </WizardFooter>
      </form>
    </div>
  )
}
