import { BadgeCheck, Brain, Users } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import { CONVERSION_INSIGHTS, PIPELINE, type PipelineTone } from '@/lib/dashboard/dummy'
import { InsightCard, Panel, PanelTitle } from './primitives'

/**
 * The funnel, as six nodes joined by rules.
 *
 * The reference animates each connector with a travelling gradient, on a loop,
 * forever. Dropped: it is six perpetually moving elements on a page that is
 * otherwise still, it never resolves into information, and `prefers-reduced-
 * motion` would have to switch it off anyway. The nodes carry the reading.
 *
 * Tones map to tokens rather than to Tailwind's palette, so every pair here is
 * one the contrast tests already assert: `win` is the ink fill used by primary
 * buttons, `negative` is the error surface used by form errors.
 */
const TONE: Record<PipelineTone, string> = {
  neutral: 'bg-surface-subtle text-text',
  current: 'border-2 border-ink bg-surface text-text',
  negative: 'bg-error-surface text-on-error-surface',
  win: 'bg-ink text-text-on-ink',
}

const LABEL_TONE: Record<PipelineTone, string> = {
  neutral: 'text-text-muted',
  current: 'text-text',
  negative: 'text-text-muted',
  win: 'text-text',
}

const ICONS: Record<string, React.ReactNode> = {
  users: <Users aria-hidden className="size-4" strokeWidth={1.75} />,
  verified: <BadgeCheck aria-hidden className="size-4" strokeWidth={1.75} />,
  brain: <Brain aria-hidden className="size-4" strokeWidth={1.75} />,
}

export function ConversionPipeline({ delay }: { delay?: number }) {
  return (
    <Panel className="p-6 sm:p-8" delay={delay}>
      <PanelTitle>Application conversion pipeline</PanelTitle>

      {/* Scrolls sideways rather than wrapping: six stages wrapped to two rows
          stop reading as a sequence, which is the only thing this shows. */}
      <ol className="mt-8 flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {PIPELINE.map((stage, i) => (
          <li key={stage.key} className="contents">
            <div className="flex min-w-[92px] flex-1 flex-col items-center gap-3 text-center">
              <span
                className={cn(
                  'flex size-16 items-center justify-center rounded-full text-xl font-bold',
                  TONE[stage.tone],
                )}
              >
                {stage.count}
              </span>
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-widest',
                  LABEL_TONE[stage.tone],
                )}
              >
                {stage.label}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <span
                aria-hidden
                className="h-px min-w-[16px] flex-1 shrink self-start bg-outline-subtle"
                style={{ marginTop: '2rem' }}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-10 border-t border-outline-subtle pt-8">
        <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-text">
          Conversion insights
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CONVERSION_INSIGHTS.map((insight) => (
            <InsightCard
              key={insight.title}
              icon={ICONS[insight.icon]}
              title={insight.title}
              body={insight.body}
            />
          ))}
        </div>
      </div>
    </Panel>
  )
}
