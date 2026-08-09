import { BarChart3, Brain } from 'lucide-react'
import { PERFORMANCE_SUMMARY, STRATEGY_ANALYSIS } from '@/lib/dashboard/dummy'
import { Eyebrow, Panel, PanelTitle, Tile } from './primitives'

/**
 * The historical strip: five figures and a paragraph reading them.
 *
 * Two columns on a phone rather than the reference's five across — five 20%
 * columns at 360px gives each tile 60px of content, which truncates "Resume v4"
 * and makes a 24px number the tallest thing in it.
 */
export function PerformanceSummary({ delay }: { delay?: number }) {
  return (
    <Panel className="p-6 sm:p-8" delay={delay}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <PanelTitle icon={<BarChart3 aria-hidden className="size-5" strokeWidth={1.75} />}>
          Career performance
        </PanelTitle>
        <Eyebrow>Historical insights</Eyebrow>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {PERFORMANCE_SUMMARY.map((tile) => (
          <Tile key={tile.label} className="flex flex-col gap-1 p-5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {tile.label}
            </dt>
            <span className="text-xs font-bold text-text-muted">{tile.caption}</span>
            <dd className="text-2xl font-bold tracking-tight text-text">{tile.value}</dd>
          </Tile>
        ))}
      </dl>

      <div className="flex flex-col gap-4 rounded-md border border-outline-subtle bg-surface-subtle p-6 sm:flex-row sm:gap-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded border border-outline-subtle bg-surface text-text">
          <Brain aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text">
            Strategy analysis
          </h3>
          <p className="text-[15px] font-medium leading-relaxed text-text-muted">
            {STRATEGY_ANALYSIS}
          </p>
        </div>
      </div>
    </Panel>
  )
}
