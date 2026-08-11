import { ChevronDown } from 'lucide-react'
import { Checkbox, Input, SegmentedField, Select } from '@job-tracker/ui'
import { Panel } from '@/components/dashboard/primitives'
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  JOB_SOURCES,
  LEVEL_LABEL,
  POSTED_WINDOWS,
  SENIORITY_LEVELS,
  SIZE_LABEL,
  SKILL_FACETS,
  SOURCE_LABEL,
  TYPE_LABEL,
} from '@/lib/jobs/data'
import type { FilterState } from '@/lib/jobs/filters'
import { stickySidebar } from '@/lib/jobs/layout'
import { SALARY_CURRENCIES } from '@/lib/onboarding/steps'
import { inCurrency, SALARY_PERIODS } from '@/lib/jobs/salary'
import { FILTER_FORM_ID } from './search-header'

/**
 * The filter sidebar, driven by the facet vocabularies rather than hand-written
 * eight times.
 *
 * Every section is a native <details>, which gives open/closed state, keyboard
 * operation and a disclosure triangle for free and needs no client component.
 * The reference's Languages section is dropped: nothing in the listing shape
 * records a language, and inventing one per company would be fabricated data
 * with no filter behind it. Everything shown here filters something real.
 *
 * The body is a <fieldset> with an sr-only <legend> repeating the section
 * title — `<summary>` is not an accessible group name for what follows it, so
 * without this a screen reader reaches "Senior, checkbox" with no context of
 * which facet that belongs to. `packages/ui/src/segmented-field.tsx` groups
 * its own radios the same way. `min-w-0` counters `<fieldset>`'s default
 * `min-inline-size: min-content`, which some browsers keep enforcing even
 * under `display: flex` and could otherwise force the column wider than the
 * grid track it sits in.
 */
function Section({
  title,
  open,
  children,
}: {
  title: string
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={open} className="group border-b border-outline-subtle py-2 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded py-2 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        {title}
        <ChevronDown
          aria-hidden
          className="size-4 text-text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
      </summary>
      <fieldset className="flex min-w-0 flex-col gap-3 pb-3 pt-1">
        <legend className="sr-only">{title}</legend>
        {children}
      </fieldset>
    </details>
  )
}

function CheckboxFacet<T extends string>({
  name,
  values,
  labels,
  selected,
}: {
  name: string
  values: readonly T[]
  labels: Record<T, string>
  selected: readonly T[]
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {values.map((v) => (
        <Checkbox
          key={v}
          name={name}
          value={v}
          form={FILTER_FORM_ID}
          defaultChecked={selected.includes(v)}
          label={labels[v]}
        />
      ))}
    </div>
  )
}

export function FilterSidebar({
  filters,
  hasBar,
}: {
  filters: FilterState
  /** Whether the sticky filter bar is on screen. It only renders when a filter
   *  is active, and the sidebar parks 64px lower when it is — passed down
   *  rather than recomputed here so both components read one decision. */
  hasBar: boolean
}) {
  return (
    <Panel className={`flex flex-col overflow-y-auto p-5 ${stickySidebar(hasBar)}`} delay={140}>
      <h2 className="border-b border-outline-subtle pb-3 text-sm font-bold uppercase tracking-wider text-text">
        Filters
      </h2>

      <Section title="Job information" open>
        <Select
          label="Job function"
          name="fn"
          form={FILTER_FORM_ID}
          value={filters.fn || null}
          placeholder="Any function"
          options={JOB_FUNCTIONS.map((v) => ({ value: v, label: v }))}
        />
        <Select
          label="Industry"
          name="industry"
          form={FILTER_FORM_ID}
          value={filters.industry || null}
          placeholder="Any industry"
          options={INDUSTRIES.map((v) => ({ value: v, label: v }))}
        />
      </Section>

      <Section title="Employment type">
        <CheckboxFacet
          name="type"
          values={EMPLOYMENT_TYPES}
          labels={TYPE_LABEL}
          selected={filters.types}
        />
      </Section>

      <Section title="Experience level">
        <CheckboxFacet
          name="level"
          values={SENIORITY_LEVELS}
          labels={LEVEL_LABEL}
          selected={filters.levels}
        />
      </Section>

      <Section title="Salary" open>
        {/* Two display units and one filter, in that order, because the units
            are what the figure below is read in.

            Neither unit is a filter: both change how every salary on the screen
            reads and neither can admit or reject a listing. That is why they
            produce no chip and are not counted — see FilterState — and why
            "Clear all" keeps them. They live here rather than in the sticky bar
            because a unit belongs beside the figure it describes, and because
            the bar is now conditional. */}
        <SegmentedField
          name="period"
          legend="Show salaries as"
          form={FILTER_FORM_ID}
          value={filters.period}
          options={SALARY_PERIODS}
        />

        <Select
          label="Currency"
          name="currency"
          form={FILTER_FORM_ID}
          value={filters.currency}
          options={SALARY_CURRENCIES.map((c) => ({
            value: c.value,
            label: `${c.label} (${c.symbol})`,
          }))}
        />

        {/* One floor, not a min/max pair. A maximum on a salary search filters
            out the listings you would most want, which is why the chip reads
            "$160k+" rather than a band.

            Typed in the currency picked above, and yearly regardless of the
            period picked above that — the period is how the results are read,
            not a second axis to type a threshold on. The label carries both
            facts because switching currency reinterprets whatever is already in
            the box, which is only defensible if the box says what it is
            counting. */}
        <Input
          label={`Minimum, per year (${filters.currency})`}
          name="salaryMin"
          form={FILTER_FORM_ID}
          inputMode="numeric"
          defaultValue={filters.salaryMin === null ? '' : String(filters.salaryMin)}
          // Converted rather than hardcoded, so the hint is plausible in every
          // currency instead of suggesting 160000 to someone reading rupiah.
          placeholder={String(Math.round(inCurrency(160_000, filters.currency)))}
        />
      </Section>

      <Section title="Company">
        <CheckboxFacet
          name="size"
          values={COMPANY_SIZES}
          labels={SIZE_LABEL}
          selected={filters.sizes}
        />
      </Section>

      <Section title={`Skills (${SKILL_FACETS.length})`}>
        {/* Ticking two asks for a listing wanting both — see applyFilters. */}
        <div className="grid grid-cols-1 gap-2">
          {SKILL_FACETS.map((s) => (
            <Checkbox
              key={s}
              name="skill"
              value={s}
              form={FILTER_FORM_ID}
              defaultChecked={filters.skills.includes(s)}
              label={s}
            />
          ))}
        </div>
      </Section>

      <Section title="Posted">
        {/* Radios, not checkboxes: the windows nest, so two ticked would mean
            the wider one and the narrower one at once. "Any time" is the
            group's own un-tick — an empty value, checked exactly when nothing
            narrower is — because a radio group otherwise offers no way back
            to "no filter" once one of the timed options is chosen.
            `parseFilters` already drops an empty `posted` value to `null`
            (it validates against POSTED_WINDOWS), so this needs no change
            there. */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 text-sm text-text-muted">
            <input
              type="radio"
              name="posted"
              value=""
              form={FILTER_FORM_ID}
              defaultChecked={filters.postedWithinHours === null}
              className="size-4 border border-outline accent-ink"
            />
            Any time
          </label>
          {POSTED_WINDOWS.map((w) => (
            <label key={w.hours} className="flex items-center gap-3 text-sm text-text-muted">
              <input
                type="radio"
                name="posted"
                value={w.hours}
                form={FILTER_FORM_ID}
                defaultChecked={filters.postedWithinHours === w.hours}
                className="size-4 border border-outline accent-ink"
              />
              Past {w.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Sources">
        <CheckboxFacet
          name="source"
          values={JOB_SOURCES}
          labels={SOURCE_LABEL}
          selected={filters.sources}
        />
      </Section>
    </Panel>
  )
}
