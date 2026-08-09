import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@job-tracker/ui'
import { DashboardNav } from '@/components/dashboard/nav'
import { Panel } from '@/components/dashboard/primitives'

/**
 * Settings: a section list on the left, one panel on the right.
 *
 * `/dashboard` stays the current tab in the top bar. Settings is reached from
 * the account menu rather than from the section tabs, so highlighting nothing up
 * there would be honest but disorienting — the tab bar is about which part of
 * the product you are in, and you have not left.
 *
 * Every section here is a real route, for the reason the top tabs are: hover and
 * a pointer cursor promise a response. Profile and Billing are honest
 * placeholders rather than absent links.
 */
const SECTIONS = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/preferences', label: 'Preferences' },
  { href: '/settings/billing', label: 'Billing' },
] as const

export type SettingsHref = (typeof SECTIONS)[number]['href']

export function SettingsShell({
  current,
  name,
  email,
  title,
  description,
  children,
}: {
  current: SettingsHref
  name: string
  email: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/dashboard" name={name} email={email} />

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-4 py-8 md:px-12 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="animate-rise">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-text">Settings</h1>
          {/* Horizontal and scrollable below lg, where a 240px rail would eat
              most of a phone. Same list, same order, laid on its side. */}
          <nav
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
          >
            {SECTIONS.map((section) => {
              const active = section.href === current
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-md px-4 py-2.5 text-sm transition-colors duration-150',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    active
                      ? 'border border-outline-subtle bg-surface font-semibold text-text shadow-[0_20px_60px_rgba(0,0,0,0.08)]'
                      : 'font-medium text-text-muted hover:bg-surface-subtle hover:text-text',
                  )}
                >
                  {section.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <Panel className="min-w-0 p-6 sm:p-8" delay={70}>
          <div className="flex flex-col gap-1 border-b border-outline-subtle pb-6">
            <h2 className="text-2xl font-bold tracking-tight text-text lg:text-3xl">{title}</h2>
            <p className="text-sm text-text-muted">{description}</p>
          </div>
          <div className="pt-8">{children}</div>
        </Panel>
      </main>
    </div>
  )
}
