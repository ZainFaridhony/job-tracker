'use client'

import { useState, type KeyboardEvent } from 'react'
import { cn } from './cn'

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
}: {
  name: string
  label: string
  initial: string[]
  placeholder?: string
}) {
  const [items, setItems] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim().slice(0, 60)
    if (!value) return
    if (items.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    setItems((prev) => [...prev, value])
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
      <span className="text-xs font-medium tracking-wide text-text-muted">{label}</span>

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
                'group inline-flex items-center gap-2 rounded-full border border-outline-subtle',
                'bg-surface-subtle px-3 py-1.5 text-sm text-text transition-colors',
                'hover:border-outline hover:bg-surface',
              )}
            >
              {item}
              <span aria-hidden className="text-text-subtle group-hover:text-text">
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
          className={cn(
            'h-11 flex-1 rounded border border-outline bg-surface-subtle px-3 text-sm text-text',
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
    </div>
  )
}
