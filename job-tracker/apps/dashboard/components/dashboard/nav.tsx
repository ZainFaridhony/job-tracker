import Link from 'next/link'
import { cn, Logo } from '@job-tracker/ui'
import { signOutAction } from '@/lib/actions/auth'
import { AccountMenu } from './account-menu'

/**
 * The top bar: mark left, sections centred, identity right.
 *
 * A three-column grid with `1fr auto 1fr`, not flex with `justify-between`.
 * Under justify-between the tab group centres only when the mark and the right
 * cluster happen to be the same width, which they are not — it sat visibly left
 * of centre. The outer columns absorb the difference instead, so the middle cell
 * is centred on the page rather than on whatever is left over.
 *
 * Every tab is a real route. They were inert spans while their pages did not
 * exist, on the same reasoning the onboarding stepper is not clickable: a
 * control that looks navigable and refuses is worse than one that never
 * offered. Adding hover feedback to them made that trade untenable — hover says
 * "this responds" — so the pages exist now and the tabs point at them.
 */
const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/applications', label: 'Applications' },
  { href: '/resume', label: 'Resume' },
] as const

export type TabHref = (typeof TABS)[number]['href']

/** Initials rather than a photograph: there is no avatar in the schema, and a
 *  stock face in a personal dashboard reads as someone else's account. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? (parts.at(-1)![0] ?? '') : ''
  return (first + last).toUpperCase()
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // `group` and `relative` so the hover pill below can be a sibling that
        // grows behind the label rather than a background that snaps on.
        'group relative isolate inline-flex items-center rounded-full px-4 py-2',
        'text-sm transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        active
          ? 'font-semibold text-text-on-ink'
          : 'font-medium text-text-muted hover:text-text',
      )}
    >
      {/* The pill. On the active tab it is simply present; on the others it
          scales up from 92% as the pointer arrives, which is the same easing
          the wizard's entrances use. Behind the label via -z-10, so the text
          never repaints as the fill grows. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10 rounded-full',
          'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'motion-reduce:transition-none',
          active
            ? 'bg-ink group-hover:bg-ink-hover'
            : 'scale-[0.92] bg-surface-subtle opacity-0 group-hover:scale-100 group-hover:opacity-100',
        )}
      />
      {label}
    </Link>
  )
}

export function DashboardNav({
  current,
  name,
  email,
  jobsHref,
}: {
  current: TabHref
  name: string
  email: string
  /**
   * Where the Jobs tab points, when the reader has asked for their filters to be
   * seeded from their profile — see `seedJobsHref`.
   *
   * Optional, and it defaults to the plain `/jobs` in TABS. Two reasons rather
   * than one: a route that has no preference row to read should not have to
   * invent one, and `/jobs` itself passes nothing because seeding the tab for the
   * page you are already on would throw away the filters you just set by hand.
   *
   * `current` is still matched against the tab's own `/jobs`, not against this —
   * a seeded href carries a query string, so comparing against it would leave the
   * Jobs tab unhighlighted on the Jobs page.
   */
  jobsHref?: string
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-outline-subtle bg-surface/80 backdrop-blur-md">
      <div className="mx-auto grid h-[72px] w-full max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-12">
        <Link
          href="/dashboard"
          aria-label="Job Tracker AI"
          className="justify-self-start rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Logo className="h-7 w-auto text-ink" />
        </Link>

        {/* Hidden below md, where four tabs across a phone would either wrap or
            squeeze the mark and the identity cluster off the ends. */}
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => (
            <Tab
              key={tab.href}
              // The seeded href only ever replaces where the link GOES. `active`
              // and the React key still come from the tab's own path, so a query
              // string on the destination cannot break either.
              href={tab.href === '/jobs' && jobsHref ? jobsHref : tab.href}
              label={tab.label}
              active={tab.href === current}
            />
          ))}
        </nav>

        {/* No notification bell. There is no notification system — nothing
            writes one, nothing stores one, nothing marks one read — so the
            reference design's bell was an icon with a dot on it asserting
            unread items that cannot exist. It also had nowhere to go: clicking
            it did nothing, which is the same trade the section tabs failed
            before they became routes. Add it back with the feature. */}
        <div className="flex items-center gap-3 justify-self-end">
          <AccountMenu name={name} email={email} initials={initials(name)} />

          {/* The form the menu's Sign out button submits, by id. Rendered here,
              on the server and outside the menu's portal, so the submission
              cannot be cut short when the popup unmounts on click — and so it
              keeps Next's `$ACTION_*` fields rather than becoming a server
              action wrapped in a click handler. Empty, so it draws nothing. */}
          <form id="sign-out" action={signOutAction} />

          {/* A menu is JavaScript by definition, and this is the only way out of
              the app. Without JS the popup never opens, so the way out has to
              exist somewhere that does not need it. */}
          <noscript>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded px-2 py-1 text-sm text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Sign out
              </button>
            </form>
          </noscript>
        </div>
      </div>
    </header>
  )
}
