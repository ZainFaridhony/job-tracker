'use client'

import { useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
 * NAVIGATION IS DRIVEN BY THE ROUTER, NOT BY THE ANCHOR'S DEFAULT ACTION, and
 * that is the same fix as the one below rather than a different style choice.
 * `Menu.Item`'s own click handler emits `close` — see
 * `menu/item/useMenuItemCommonProps.js` — so the portal, and the <a> inside it,
 * unmount during the very click that is supposed to navigate. A default action
 * whose element is gone before the browser gets to it does not happen, which is
 * exactly the race the sign-out form was moved out of the portal to avoid; the
 * Settings link had the same bug and no equivalent escape, so clicking it left
 * you on the page you started from.
 *
 * So: `closeOnClick` is off, an explicit `router.push` starts the navigation, and
 * the popup is closed by state we own — in that order, so the push is queued
 * before anything unmounts. It stays a real `<Link>`, which keeps the href in the
 * status bar and keeps middle-click and cmd-click opening a new tab; those
 * modified clicks fall through untouched, because the browser handles them and a
 * `router.push` would wrongly navigate this tab as well.
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
// `cursor-pointer`, not the shadcn convention's `cursor-default`: both rows here
// do something on click, and an arrow cursor over a control that responds reads
// as a control that does not.
const ITEM =
  'flex w-full cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-2 text-sm ' +
  'text-text transition-colors duration-150 outline-none ' +
  'data-[highlighted]:bg-surface-subtle data-[highlighted]:text-text'

const SETTINGS_HREF = '/settings/preferences'

export function AccountMenu({
  name,
  email,
  initials,
}: {
  name: string
  email: string
  initials: string
}) {
  const router = useRouter()
  // Controlled only so the Settings item can close the popup AFTER it has started
  // the navigation. Uncontrolled, Base UI closes it during the click instead.
  const [open, setOpen] = useState(false)

  // `HTMLElement`, not `HTMLAnchorElement`: Base UI types `Menu.Item`'s onClick
  // against the div it renders by default, and only a handler accepting the wider
  // element type is assignable to that. Nothing here touches anchor-only fields.
  function onSettingsClick(event: MouseEvent<HTMLElement>) {
    // Let the browser have the clicks it handles better than we do: cmd/ctrl for a
    // new tab, shift for a new window, middle-click likewise. `router.push` on top
    // of those would navigate this tab as well, which is not what was asked for.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (event.button !== 0) return

    event.preventDefault()
    router.push(SETTINGS_HREF)
    setOpen(false)
  }

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
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
            <Menu.Item
              render={<Link href={SETTINGS_HREF} />}
              // Off, so Base UI does not tear the portal down mid-click and take
              // this anchor with it. `onSettingsClick` closes the menu itself,
              // once the navigation is already queued.
              closeOnClick={false}
              onClick={onSettingsClick}
              className={ITEM}
            >
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
