'use client'

import { type Trend, trendSummary } from '@/lib/dashboard/dummy'
import { InfoTooltip } from './info-tooltip'
import { Delta } from './primitives'

/**
 * The change badge, and the working behind it.
 *
 * A thin wrapper over `InfoTooltip` — everything about how the popup opens lives
 * there, shared with the optimisation tips. What is specific to this caller is
 * only what goes in the popup and what sits inside the trigger.
 *
 * The whole badge is inside the button, not just the ⓘ, so the hit target is the
 * figure a reader is already looking at rather than a 14px glyph beside it.
 * `Delta` itself stays a plain span that renders on the server; only this
 * wrapper is interactive.
 */
export function DeltaTooltip({ trend, noun }: { trend: Trend; noun: string }) {
  const summary = trendSummary(trend, noun)

  return (
    <InfoTooltip
      label={`${summary}. Show the comparison.`}
      content={
        <>
          <dl className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-muted">Last week</dt>
              <dd className="font-semibold text-text">{trend.previous}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-muted">This week</dt>
              <dd className="font-semibold text-text">{trend.current}</dd>
            </div>
          </dl>
          <p className="mt-2 border-t border-outline-subtle pt-2 leading-relaxed text-text-muted">
            {summary}
          </p>
        </>
      }
    >
      <Delta trend={trend} />
    </InfoTooltip>
  )
}
