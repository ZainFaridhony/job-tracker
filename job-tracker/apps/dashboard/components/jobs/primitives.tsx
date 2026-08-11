import type { ReactNode } from 'react'
import {
  Brain,
  Cloud,
  Layers,
  Shield,
  Waves,
  Wallet,
  Briefcase,
  BadgeCheck,
} from 'lucide-react'
import { cn } from '@job-tracker/ui'
import {
  COMPETITION_LABEL,
  COMPETITION_SEGMENTS,
  competitionFilled,
  competitionFor,
  RING,
  ringDash,
} from '@/lib/jobs/derive'

/**
 * The pieces the card and the detail panel share.
 *
 * TOKEN MAP — the reference is written in raw hex the no-raw-color rule
 * rejects, and in three colours this palette does not have:
 *
 *   #FAFAFA page            -> bg-canvas
 *   #FFFFFF card            -> bg-surface
 *   #e2e2e2 hairline        -> border-outline-subtle  (decorative only)
 *   #f3f3f4 inner tile      -> bg-surface-subtle
 *   #000000 primary         -> bg-ink / text-text
 *   #444748 secondary       -> text-text-muted
 *   blue verified tick      -> text-text
 *   green/amber/red bands   -> the meter below, see CompetitionMeter
 *
 * Radii: the reference's rounded-3xl (24px) is this theme's rounded-xl, and its
 * rounded-lg/eight (8px) is this theme's plain rounded.
 */

/** Named by string in lib/jobs/data.ts, mapped to a component here — lib/ is a
 *  .ts file with no JSX, and packages/ui must not gain an icon library. */
const MARKS: Record<string, ReactNode> = {
  layers: <Layers aria-hidden className="size-6" strokeWidth={1.5} />,
  wallet: <Wallet aria-hidden className="size-6" strokeWidth={1.5} />,
  waves: <Waves aria-hidden className="size-6" strokeWidth={1.5} />,
  brain: <Brain aria-hidden className="size-6" strokeWidth={1.5} />,
  cloud: <Cloud aria-hidden className="size-6" strokeWidth={1.5} />,
  shield: <Shield aria-hidden className="size-6" strokeWidth={1.5} />,
}

/**
 * The company tile.
 *
 * An icon for every listing, where the reference photographs two of six and
 * draws icons for the other four. There are no logos to fetch, a remote image
 * host would need a next/image allowlist for files that do not exist, and a row
 * mixing photographs with glyphs jitters. The reference's own fallback, applied
 * consistently.
 */
export function CompanyMark({ mark, size = 'md' }: { mark: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border border-outline-subtle',
        'bg-surface-subtle text-text',
        size === 'md' ? 'size-14' : 'size-12',
      )}
    >
      {MARKS[mark] ?? <Briefcase aria-hidden className="size-6" strokeWidth={1.5} />}
    </span>
  )
}

/** The ink tick beside a company name. Blue in the reference; there is no blue
 *  token, and the tick reads as verification without one. `role="img"` pairs
 *  with the label the same way `Logo` does — lucide sets neither `role` nor
 *  `aria-hidden` on its own, and an `aria-label` on a bare `<svg>` is exposed
 *  inconsistently without it. */
export function VerifiedTick() {
  return (
    <BadgeCheck
      role="img"
      aria-label="Verified employer"
      className="size-4 shrink-0 text-text"
      strokeWidth={2}
    />
  )
}

/** The filled percentage pill on the card. */
export function MatchPill({ score }: { score: number }) {
  return (
    <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold tracking-tight text-text-on-ink">
      {score}% MATCH
    </span>
  )
}

/** A neutral chip. Used for salary, tags, and the info row. */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-outline-subtle',
        'bg-surface-subtle px-3 py-1.5 text-xs font-medium text-text',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Competition, as an ordinal shape instead of a colour.
 *
 * The reference paints Low green, Medium amber and High red. This palette has
 * no success token, inventing one ships a colour no contrast test covers, and
 * the reference's own DESIGN.md says to hold the monochrome line except for
 * error handling. So: three bars, one to three of them inked. Shape carries the
 * ordering, the words carry the meaning, and neither depends on hue — which is
 * the accessible encoding regardless of palette.
 *
 * The error pair is deliberately not used for `high`. Heavy competition is a
 * fact about the market, not a failure; the dashboard reserved error-surface
 * for Rejected and Missing skills, which are.
 */
export function CompetitionMeter({ applicants }: { applicants: number }) {
  const band = competitionFor(applicants)
  const filled = competitionFilled(band)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="flex items-end gap-0.5">
        {Array.from({ length: COMPETITION_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              'w-1 rounded-sm',
              i === 0 ? 'h-1.5' : i === 1 ? 'h-2.5' : 'h-3.5',
              i < filled ? 'bg-ink' : 'bg-outline-subtle',
            )}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-text">{COMPETITION_LABEL[band]}</span>
    </span>
  )
}

/** The drawer's score ring. Geometry from the score, where the reference
 *  hardcodes a 90% arc under the number 94. */
export function MatchRing({ score }: { score: number }) {
  const { dasharray, dashoffset } = ringDash(score)
  const box = (RING.r + RING.stroke) * 2

  return (
    <span className="relative inline-flex shrink-0" style={{ width: box, height: box }}>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden className="-rotate-90">
        <circle
          cx={box / 2}
          cy={box / 2}
          r={RING.r}
          fill="transparent"
          strokeWidth={RING.stroke}
          className="stroke-text-muted"
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={RING.r}
          fill="transparent"
          strokeWidth={RING.stroke}
          strokeLinecap="round"
          strokeDasharray={dasharray}
          strokeDashoffset={dashoffset}
          className="stroke-text-on-ink"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-on-ink">
        {score}%
      </span>
    </span>
  )
}

/**
 * What this screen is.
 *
 * The page it replaces said plainly that job discovery is not built (PRD NG2),
 * and these listings are invented. A fabricated job advert is something a
 * reader could act on in a way a fabricated application count is not, so the
 * screen says so once, at the top, rather than hedging in six places.
 */
export function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-outline bg-surface px-3 py-1 text-xs font-semibold text-text-muted">
      <span aria-hidden className="size-1.5 rounded-full bg-ink" />
      Sample data — these listings are placeholders
    </span>
  )
}
