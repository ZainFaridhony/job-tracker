'use client'

import { useMemo, useState } from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import { FieldError } from '@job-tracker/ui'
import { CheckIcon, SearchIcon, XIcon } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxRow,
  ComboboxTrigger,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { includesTag, pairRows, sectionItems, tagItems } from '@/lib/onboarding/tag-items'
import { flattenSections, type Section } from '@/lib/onboarding/suggestions'

/**
 * Two-column rows of selectable items.
 *
 * Extracted because it renders in two places now: flat when searching, and once
 * per section when browsing. `grid` on the Combobox root is what makes arrow keys
 * walk two columns, and Base UI's grid navigation is hard-wired to exactly two, so
 * the rows are pairs.
 */
function rows(items: readonly string[], values: readonly string[], newValue: string | null) {
  return pairRows(items).map((row) => (
    <ComboboxRow key={row.join('|')} className="grid grid-cols-2 gap-1">
      {row.map((s) => {
        const on = includesTag(values, s)
        return (
          <ComboboxItem
            key={s}
            value={s}
            showIndicator={false}
            className="grid grid-cols-[1rem_1fr] items-center gap-2 pr-2"
          >
            <span
              aria-hidden
              className={
                on
                  ? 'flex size-4 items-center justify-center rounded-sm bg-ink'
                  : 'flex size-4 items-center justify-center rounded-sm border border-outline'
              }
            >
              {/* stroke set as an attribute, not via `color`. The vendored item
                  class carries `data-highlighted:**:text-accent-foreground`, a
                  blanket descendant rule that repaints every child's colour to
                  ink on the highlighted row — which would hide an ink tick on
                  this ink-filled box. Lucide draws with stroke="currentColor",
                  so overriding the attribute takes the tick out of that fight. */}
              {on && <CheckIcon className="size-3" stroke="var(--color-text-on-ink)" />}
            </span>
            <span className="truncate">
              {s}
              {s === newValue && <span className="ml-1.5 text-xs text-text-subtle">Add</span>}
            </span>
          </ComboboxItem>
        )
      })}
    </ComboboxRow>
  ))
}

/**
 * A list-of-tags field: filled pills for what is chosen, and a searchable
 * two-column picker for changing it. Used for both target roles and skills.
 *
 * Roles used to be a ChipField — a text box and an Add button — which meant
 * typing every entry from memory while the adjacent skills field offered a list
 * to pick from. Two ways to edit the same kind of value, on what is now one card.
 * This is the one that survives: picking beats typing, and anything not on the
 * list is still addable, so nothing is lost.
 *
 * The chips are our own markup rather than `Combobox.Chips` because Base UI
 * keeps a single input slot in its store — every `Combobox.Input` writes the
 * same `inputRef` — so a search field inside the popup and a chips input in the
 * trigger cannot coexist. Chips-as-markup also lets the selected state be a
 * filled pill, which a monochrome palette needs in order to read at all.
 *
 * Browsing shows ranked sections with headers; searching flattens them.
 *
 * Values reach the server as repeated hidden inputs, so `form.getAll(name)` in
 * saveProfileAction is untouched. Those inputs render on the server too: a
 * browser without JavaScript cannot work the picker, but it still submits
 * whatever the CV produced.
 */
export function TagPicker({
  name,
  label,
  initial,
  sections,
  placeholder = 'Search or add…',
  empty = 'Nothing yet',
  error,
}: {
  name: string
  label: string
  initial: string[]
  /** Grouped, so browsing 460 roles is navigable rather than a flat scroll. */
  sections: readonly Section[]
  placeholder?: string
  /** Shown in the trigger when nothing is chosen. */
  empty?: string
  error?: string
}) {
  const errorId = `${name}-error`
  const [values, setValues] = useState<string[]>(initial)
  const [query, setQuery] = useState('')
  const anchor = useComboboxAnchor()

  const searching = query.trim() !== ''

  /**
   * Browsing shows ranked sections with headers. Searching flattens them: once
   * someone types, the header is noise and what matters is every match in one
   * list, so a query reaches the whole set rather than the browse budget.
   */
  const groups = useMemo(
    () => (searching ? [] : sectionItems(sections, values)),
    [searching, sections, values],
  )
  const flat = useMemo(() => flattenSections(sections), [sections])
  const { items, isNew } = tagItems(values, flat, query)
  const newValue = isNew ? query.trim() : null

  // Base UI needs every selectable value it will render, in one array, whichever
  // view is showing — it drives selection and keyboard nav from this, not from the
  // markup.
  const known = searching ? items : [...values, ...groups.flatMap((g) => g.items)]

  return (
    <div className="flex flex-col gap-2">
      {/* Uppercase: this labels a section of the card, not a field inside one. */}
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>

      {values.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      <Combobox
        items={known}
        multiple
        grid
        value={values}
        onValueChange={setValues}
        inputValue={query}
        onInputValueChange={setQuery}
        // Our own filtering, so the query can be offered as an item.
        filter={null}
      >
        {/* A div, not a button: the chips are buttons and nesting them would be
            invalid. The chevron is the only thing that opens the popup. */}
        <div
          ref={anchor}
          className={`flex min-h-12 flex-wrap items-center gap-1.5 rounded border bg-surface-subtle px-2 py-1.5 ${
            error ? 'border-error' : 'border-outline'
          }`}
        >
          {values.length === 0 && <span className="px-1 text-sm text-text-subtle">{empty}</span>}

          {values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValues((prev) => prev.filter((s) => s !== v))}
              aria-label={`Remove ${v}`}
              className="group inline-flex items-center gap-1.5 rounded-full bg-ink py-1.5 pl-3 pr-2.5 text-sm font-medium text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {v}
              <XIcon aria-hidden className="size-3.5 opacity-60 group-hover:opacity-100" />
            </button>
          ))}

          <ComboboxTrigger
            aria-label={`Choose ${label.toLowerCase()}`}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
            className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded text-text-subtle transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>

        <ComboboxContent anchor={anchor}>
          <div className="relative border-b border-outline-subtle">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
            />
            <ComboboxPrimitive.Input
              placeholder={placeholder}
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-text placeholder:text-text-subtle focus:outline-none"
            />
          </div>

          <ComboboxList className="p-1">
            {searching
              ? rows(items, values, newValue)
              : groups.map((group) => (
                  <ComboboxGroup key={group.label}>
                    <ComboboxLabel className="font-semibold uppercase tracking-wider text-text-muted">
                      {group.label}
                    </ComboboxLabel>
                    {rows(group.items, values, newValue)}
                  </ComboboxGroup>
                ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <FieldError id={errorId} message={error} />
    </div>
  )
}
