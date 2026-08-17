import { HeartPulse, Wand2 } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import { healthBand, type HealthTone, RESUME_HEALTH } from '@/lib/dashboard/dummy'
import { InfoTooltip } from './info-tooltip'
import { Eyebrow, Panel, PanelTitle, Tile } from './primitives'

/**
 * Resume health, as a banded score and four measured rows.
 *
 * The verdict chip carries its band's colour: Excellent green, Warning amber,
 * Critical red. What makes that safe is that the WORD changes with the colour —
 * colour is never the only encoding here, the same rule that keeps an arrow on
 * `Delta`. A chip that only went green-to-red would be unreadable to a
 * colour-blind reader and meaningless in greyscale.
 *
 * Both halves come from `healthBand(score)` in one call, so the label and the
 * fill cannot disagree; the score itself stays ink, because it is a quantity
 * rather than a judgement and the chip beside it already carries the verdict.
 *
 * "Missing skills" keeps its error colour independently of the band: that row is
 * the one thing here the user is meant to act on.
 */

/**
 * Tone to classes. A literal map rather than `bg-${tone}-surface`, because
 * Tailwind only emits CSS for class names it can see written out in full — an
 * interpolated one compiles to nothing at all, silently. Same trap as the
 * sticky offsets in lib/jobs/layout.ts.
 */
const BAND_CHIP: Record<HealthTone, string> = {
  success: 'bg-success-surface text-text-on-success-surface',
  warning: 'bg-warning-surface text-text-on-warning-surface',
  error: 'bg-error-surface text-text-on-error-surface',
}
export function ResumeHealth({ delay }: { delay?: number }) {
  const { score, outOf, rows, tips } = RESUME_HEALTH
  const band = healthBand(score)

  return (
    <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8" delay={delay}>
      <PanelTitle icon={<HeartPulse aria-hidden className="size-5" strokeWidth={1.75} />}>
        Resume health
      </PanelTitle>

      <Tile className="flex items-center justify-between gap-4">
        <span className="flex flex-col gap-1">
          <Eyebrow>Overall health</Eyebrow>
          <span className="text-2xl font-bold tracking-tight text-text">
            {score} / {outOf}
          </span>
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
            BAND_CHIP[band.tone],
          )}
        >
          {band.label}
        </span>
      </Tile>

      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-outline-subtle py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col">
              <dt
                className={cn(
                  'text-sm font-medium',
                  row.tone === 'negative' ? 'text-error' : 'text-text',
                )}
              >
                {row.label}
              </dt>
              <dd className="text-[10px] text-text-muted">{row.hint}</dd>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span
                className={cn(
                  'text-sm font-bold',
                  row.tone === 'negative' ? 'text-error' : 'text-text',
                )}
              >
                {row.value}
              </span>
              {row.action ? (
                <span className="text-[10px] font-bold text-text-muted">{row.action}</span>
              ) : null}
            </div>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-text">Optimisation tips</h3>
        {tips.map((tip) => (
          <div
            key={tip.label}
            className={cn(
              'flex items-center justify-between gap-3 rounded-md px-3 py-3',
              tip.emphasis
                ? 'bg-ink text-text-on-ink'
                : 'border border-outline-subtle bg-surface-subtle text-text',
            )}
          >
            <span className="text-xs font-medium">{tip.label}</span>
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-bold">{tip.gain}</span>
              <InfoTooltip
                label={`Why ${tip.label.toLowerCase()}?`}
                // The ⓘ inherits nothing: the emphasised row is an ink fill, so
                // a muted grey glyph on it would fall under 3:1.
                iconClassName={tip.emphasis ? 'text-text-on-ink' : 'text-text-muted'}
                content={<p className="leading-relaxed text-text-muted">{tip.reason}</p>}
              />
            </span>
          </div>
        ))}
      </div>

      {/* mt-auto so the panel's bottom edge lines up with the taller column
          beside it however many rows the list grows to. */}
      <span className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded bg-ink px-4 py-3 text-sm font-semibold text-text-on-ink">
        Optimise now
        <Wand2 aria-hidden className="size-4" strokeWidth={2} />
      </span>
    </Panel>
  )
}
