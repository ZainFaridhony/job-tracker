'use client'

import Link from 'next/link'
import { Menu } from '@base-ui/react'
import { LogOut, Settings } from 'lucide-react'
import { cn } from '@job-tracker/ui'

/**
 * The avatar, and what is behind it.
 *
 * Built on Base UI's Menu rather than the vendored shadcn one, for the same
 * reason `tag-picker.tsx` styles its combobox by hand: the shadcn components
 * carry their own CSS-variable vocabulary (`text-muted-foreground` and
 * friends), and mixing that into the app chrome would put two token systems on
 * one bar. Every colour here is a `@job-tracker/config` token whose contrast is
 * asserted in tokens.test.ts.
 *
 * SIGN OUT DOES NOT LIVE IN HERE. The button in the popup carries
 * `form="sign-out"` and the form itself is server-rendered by nav.tsx, outside
 * this portal. Two things follow, and both matter:
 *
 *   - the popup unmounts the instant the item is clicked, and a <form> that
 *     unmounts mid-click is a submission that may never dispatch. Pointing at a
 *     form that outlives the menu removes the race entirely;
 *   - the action stays a real form submission with Next's `$ACTION_*` fields
 *     intact, rather than a server action wrapped in a click handler — the
 *     failure mode CLAUDE.md records from the onboarding wizard, where the
 *     wrapper compiled, worked with JavaScript, and silently did nothing
 *     without it.
 *
 * A dropdown has no no-JS equivalent, so nav.tsx keeps a <noscript> fallback.
 */
const ITEM =
  'flex w-full cursor-default select-none items-center gap-2.5 rounded px-2.5 py-2 text-sm ' +
  'text-text transition-colors duration-150 outline-none ' +
  'data-[highlighted]:bg-surface-subtle data-[highlighted]:text-text'

export function AccountMenu({
  name,
  email,
  initials,
}: {
  name: string
  email: string
  initials: string
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className={cn(
          'flex size-9 items-center justify-center rounded-full bg-surface-subtle',
          'text-xs font-bold text-text transition-colors duration-150',
          'hover:bg-outline-subtle data-[popup-open]:bg-outline-subtle',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        )}
      >
        {initials}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup
            className={cn(
              'min-w-[220px] origin-[var(--transform-origin)] rounded-md border border-outline-subtle',
              'bg-surface p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.08)]',
              // Base UI drives these attributes; the pop matches the wizard's
              // entrance easing rather than inventing a third motion language.
              'transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
              'motion-reduce:transition-none',
            )}
          >
            {/* Who you are signed in as. The reference's menu opens on "My
                Account"; a label that names the actual account is the same
                gesture doing something useful. */}
            <div className="flex flex-col gap-0.5 px-2.5 py-2">
              <span className="truncate text-sm font-semibold text-text">{name}</span>
              {email && email !== name ? (
                <span className="truncate text-xs text-text-muted">{email}</span>
              ) : null}
            </div>

            <Menu.Separator className="my-1.5 h-px bg-outline-subtle" />

            {/* Profile and Billing are in the reference's menu too, and both
                exist as settings sections — but the menu points at the one with
                something in it rather than listing three ways to reach the same
                sidebar. */}
            <Menu.Item render={<Link href="/settings/preferences" />} className={ITEM}>
              <Settings aria-hidden className="size-4" strokeWidth={1.75} />
              Settings
            </Menu.Item>

            <Menu.Separator className="my-1.5 h-px bg-outline-subtle" />

            <Menu.Item
              // `form` reaches the server-rendered form in nav.tsx. See above.
              render={<button type="submit" form="sign-out" />}
              // Menu.Item defaults `nativeButton` to false and then renders a
              // div with role="menuitem"; handed a real <button> without this it
              // layers non-native handlers and attributes on top of native ones
              // and warns at runtime. A real <button> is required here, not
              // preferred — `form=` is what submits without a click handler —
              // so the flag has to be the thing that moves.
              nativeButton
              className={ITEM}
            >
              <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
