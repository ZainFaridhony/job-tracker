import type { ReactNode } from 'react'
import { cn } from '@job-tracker/ui'

/**
 * The dashboard's shared surfaces.
 *
 * Kept in apps/dashboard rather than packages/ui because they compose that
 * package's tokens for one screen; `ui` is the shared vocabulary and gains a
 * component when a second app needs it, not before.
 *
 * TOKEN MAP — the reference sheet is written in raw hex from the superseded
 * palette, which the no-raw-color rule rejects by name. The translation:
 *
 *   #FAFAFA page          -> bg-canvas
 *   #FFFFFF card          -> bg-surface
 *   #ECECEC hairline      -> border-outline-subtle   (decorative only)
 *   gray-50 / gray-100    -> bg-surface-subtle
 *   #000000 primary       -> bg-ink / text-text
 *   #666666 secondary     -> text-text-muted
 *   red-50 / red-600      -> bg-error-surface / text-on-error-surface
 *   green-50 / green-600  -> dropped, see Delta below
 *
 * Radii differ between the two systems and are easy to mistranslate: the
 * reference's `card` (24px) is this theme's `rounded-xl`, and the reference's
 * `xl` (12px) is this theme's `rounded-md`.
 */

/** The signature card: 24px radius, hairline, and the diffused shadow. Matches
 *  `Card` in packages/ui, which cannot be reused here because `cn` is a plain
 *  join rather than tailwind-merge, so its `p-6 sm:p-8` cannot be overridden. */
export function Panel({
  children,
  className,
  delay,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div
      // Inline, not an arbitrary Tailwind value: `[animation-delay:200ms]` is
      // silently dropped for every occurrence after the first.
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        'animate-rise rounded-xl border border-outline-subtle bg-surface',
        'shadow-[0_20px_60px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The muted inner tile the reference uses for insights and summary figures. */
export function Tile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md border border-outline-subtle bg-surface-subtle p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** A small-caps label. Used for every "what is this number" caption. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </span>
  )
}

/**
 * A period-on-period change.
 *
 * Monochrome, where the reference paints it green. Two reasons, and the second
 * is the reference's own: this palette has no success token and inventing one
 * would ship a colour no contrast test covers, and DESIGN.md itself says to
 * hold the monochrome line and avoid red/green "unless absolutely necessary for
 * error handling". The arrow already carries the direction, so the colour was
 * only ever redundant encoding — which is the accessible choice anyway.
 */
export function Delta({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-text">
      <span aria-hidden>{up ? '↑' : '↓'}</span>
      {up ? '+' : ''}
      {value}%
    </span>
  )
}

/** One of the four figures across the top of the page. */
export function StatCard({
  value,
  label,
  icon,
  badge,
  delay,
}: {
  value: string
  label: ReactNode
  icon: ReactNode
  badge?: ReactNode
  delay?: number
}) {
  return (
    <Panel className="p-6" delay={delay}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text">
          {icon}
        </span>
        {badge}
      </div>
      <p className="text-3xl font-bold tracking-tight text-text">{value}</p>
      <div className="mt-1 text-sm font-medium leading-snug text-text-muted">{label}</div>
    </Panel>
  )
}

/** The captioned paragraph the reference repeats six times across two sections. */
export function InsightCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <Tile>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-text">{icon}</span>
        <span className="text-xs font-bold text-text">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-text-muted">{body}</p>
    </Tile>
  )
}

/** Section heading, used once per panel. */
export function PanelTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-text">
      {icon ? <span className="text-text">{icon}</span> : null}
      {children}
    </h2>
  )
}
