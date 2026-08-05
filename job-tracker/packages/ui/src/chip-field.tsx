'use client'

import { useState, type KeyboardEvent } from 'react'
import { cn } from './cn'
import { FieldError } from './field-error'

/**
 * Removable chips plus a free-text add box, submitted as repeated hidden inputs
 * so the whole thing works as a plain form field with no client state to sync.
 *
 * Used for the AI-prefilled lists in onboarding: the user's job is to delete
 * what the model got wrong and add what it missed, which is faster than typing
 * from nothing.
 */
export function ChipField({
  name,
  label,
  initial,
  placeholder = 'Add more…',
  error,
}: {
  name: string
  label: string
  initial: string[]
  placeholder?: string
  /** Rendered beneath the add box, not at the top of the card. */
  error?: string
}) {
  const [items, setItems] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')
  const errorId = `${name}-error`

  function matches(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase()
  }

  function commit(raw: string) {
    const value = raw.trim().slice(0, 60)
    if (!value) return
    // Checked inside the updater rather than against the render's `items`, so
    // two adds in one tick cannot both pass a check made outside it.
    setItems((prev) => (prev.some((i) => matches(i, value)) ? prev : [...prev, value]))
  }

  function add() {
    // Whitespace alone leaves the draft alone, so a stray space does not wipe
    // what was being typed.
    if (!draft.trim()) return
    commit(draft)
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter adds a chip rather than submitting the form — submitting here would
    // silently discard whatever the user was halfway through typing.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !draft && items.length) {
      setItems((prev) => prev.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Uppercase because this labels a section of the card, not one field
          inside one. Sentence case is for a field nested under a section. */}
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>

      {items.map((item) => (
        <input key={item} type="hidden" name={name} value={item} />
      ))}

      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((i) => i !== item))}
              aria-label={`Remove ${item}`}
              className={cn(
                // A filled pill, matching SkillsCombobox. The two used to
                // disagree — outlined here, filled there — while sitting on
                // adjacent steps; they now share a card, so they have to agree.
                // Filled is the one that survives a monochrome palette: an
                // outlined chip on surface-subtle reads as a disabled input, and
                // its border was outline-subtle, which is below 3:1 and so
                // illegal on something focusable.
                'group inline-flex items-center gap-1.5 rounded-full bg-ink',
                'py-1.5 pl-3 pr-2.5 text-sm font-medium text-text-on-ink transition-colors',
                'hover:bg-ink-hover',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              )}
            >
              {item}
              <span aria-hidden className="opacity-60 group-hover:opacity-100">
                ×
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={`Add to ${label}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 flex-1 rounded border bg-surface-subtle px-3 text-sm text-text',
            error ? 'border-error' : 'border-outline',
            'placeholder:text-text-subtle focus:outline-2 focus:outline-offset-2 focus:outline-ink',
          )}
        />
        <button
          type="button"
          onClick={add}
          className="rounded border border-outline px-4 text-sm font-medium text-text hover:bg-surface-subtle"
        >
          Add
        </button>
      </div>

      <FieldError id={errorId} message={error} />
    </div>
  )
}
