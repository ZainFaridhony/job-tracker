import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Panel } from './primitives'

/**
 * What a section that does not exist yet looks like.
 *
 * These pages exist so the tabs can be links rather than dead spans — see the
 * note in nav.tsx. That makes honesty the whole job here: the page says plainly
 * that nothing is built, rather than showing an empty state that implies real
 * data would appear if only you had some.
 */
export function SectionPlaceholder({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Panel className="flex flex-col items-center gap-4 p-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-text">
        {icon}
      </span>
      <div className="flex max-w-[420px] flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2.5 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Back to dashboard
        <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
      </Link>
    </Panel>
  )
}
