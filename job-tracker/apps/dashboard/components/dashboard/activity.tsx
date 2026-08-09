import { ArrowRight, Clock, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import { ACTIVITY_INSIGHTS, barHeights, WEEKS } from '@/lib/dashboard/dummy'
import { InsightCard, Panel, PanelTitle } from './primitives'

const ICONS: Record<string, React.ReactNode> = {
  zap: <Zap aria-hidden className="size-4" strokeWidth={1.75} />,
  clock: <Clock aria-hidden className="size-4" strokeWidth={1.75} />,
  trending: <TrendingUp aria-hidden className="size-4" strokeWidth={1.75} />,
}

/**
 * Six weeks of application volume.
 *
 * Bars are divs, not a charting library. Six values with no axes, no tooltips
 * and no interaction do not justify a dependency, and the one thing that has to
 * be right — height proportional to value, with a floor so a quiet week is still
 * visible — is `barHeights`, which is tested.
 *
 * The whole series is also a table for anyone not looking at it: a bar chart
 * with the numbers printed above each bar is legible, but the *shape* is not
 * available to a screen reader, so the counts are read out in order instead.
 */
export function WeeklyActivity({ delay }: { delay?: number }) {
  const counts = WEEKS.map((w) => w.count)
  const heights = barHeights(counts)
  const peak = Math.max(...counts)

  return (
    <Panel className="flex h-full flex-col p-6 sm:p-8" delay={delay}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col">
          <PanelTitle>Weekly application activity</PanelTitle>
          <span className="mt-1 text-sm font-medium text-text-muted">Last 6 weeks</span>
        </div>
        <span className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-text-on-ink">
          Discover jobs
          <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
        </span>
      </div>

      <div className="mt-10 flex h-[200px] items-end gap-3 sm:gap-4">
        {WEEKS.map((week, i) => (
          <div key={week.label} className="flex h-full flex-1 flex-col justify-end gap-2">
            <span className="text-center text-[10px] font-bold text-text">{week.count}</span>
            <div
              // origin-bottom with animate-fill would grow it sideways; height
              // is the axis here, so the bar simply arrives with the panel.
              style={{ height: `${heights[i]}%` }}
              className={cn(
                'w-full rounded-t-md transition-colors duration-150',
                week.count === peak ? 'bg-ink' : 'bg-surface-subtle hover:bg-outline',
              )}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-3 sm:gap-4">
        {WEEKS.map((week) => (
          <span
            key={week.label}
            className="flex-1 truncate text-center text-[10px] text-text-muted"
          >
            {week.range}
          </span>
        ))}
      </div>

      {/* The shape above is invisible to a screen reader; this is the same data
          in the one form that is not. */}
      <p className="sr-only">
        Applications per week:{' '}
        {WEEKS.map((w) => `${w.label}, ${w.range}: ${w.count}`).join('. ')}.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ACTIVITY_INSIGHTS.map((insight) => (
          <InsightCard
            key={insight.title}
            icon={ICONS[insight.icon]}
            title={insight.title}
            body={insight.body}
          />
        ))}
      </div>
    </Panel>
  )
}
