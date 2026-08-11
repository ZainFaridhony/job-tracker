import { HeartPulse, Wand2 } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import { RESUME_HEALTH } from '@/lib/dashboard/dummy'
import { Eyebrow, Panel, PanelTitle, Tile } from './primitives'

/**
 * Resume health, as a score and four measured rows.
 *
 * The verdict chip is a neutral chip, not the reference's green one — same
 * reasoning as `Delta`: no success token exists, and the number beside it
 * already says 91 out of 100. "Missing skills" keeps its error colour, because
 * that row is the one thing here the user is meant to act on and the palette
 * has a tested pair for exactly that.
 */
export function ResumeHealth({ delay }: { delay?: number }) {
  const { score, outOf, verdict, rows, tips } = RESUME_HEALTH

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
        <span className="rounded-full border border-outline px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text">
          {verdict}
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
            <span className="text-xs font-bold">{tip.gain}</span>
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
