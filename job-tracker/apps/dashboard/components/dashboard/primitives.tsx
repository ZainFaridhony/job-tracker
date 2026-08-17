import type { ReactNode } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import type { Trend } from '@/lib/dashboard/dummy'

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
 *   red-50 / red-600      -> bg-error-surface / text-text-on-error-surface
 *   green-50 / green-600  -> bg-success-surface / text-text-on-success-surface
 *   amber-50 / amber-600  -> bg-warning-surface / text-text-on-warning-surface
 *
 * Note the doubled prefix: the token is called `text-on-error-surface`, so the
 * utility that reads it is `text-` + that name. `text-on-error-surface` is a
 * class Tailwind emits NO CSS for — it silently resolves nothing rather than
 * erroring, and `pipeline.tsx` inherited near-black from it for months.
 *
 * The three tinted pairs are an ordinal scale (see tokens.ts) and belong only to
 * quantities with a real direction — `Delta` and `healthBand`. They are not a
 * general good/caution/bad vocabulary.
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
 * The one place this design leaves the monochrome line, and it does so on a
 * token whose contrast is asserted: `success` and `error` sit within 0.1 of each
 * other on every background, so a rise and a fall carry equal weight rather than
 * a drop shouting. Colour is never the only encoding — the arrow says the same
 * thing, which is what keeps this readable to a colour-blind reader and in
 * greyscale print.
 *
 * Takes the whole `Trend` rather than a number so the badge and the tooltip
 * beside it cannot end up rendering two different figures, which is the exact
 * failure the reference sheet shipped: 22% printed over a chart ending at 15
 * beside a title claiming a baseline of 14.
 */
export function Delta({ trend }: { trend: Trend }) {
  const { direction, percent } = trend

  // No baseline is not the same as no change, so it does not get an arrow, a
  // sign or a colour — all three would assert a comparison that never happened.
  if (percent === null) {
    return <span className="text-xs font-semibold text-text-muted">First week</span>
  }

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const tone =
    direction === 'up' ? 'text-success' : direction === 'down' ? 'text-error' : 'text-text-muted'

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', tone)}>
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.25} />
      {direction === 'up' ? '+' : ''}
      {percent}%
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
