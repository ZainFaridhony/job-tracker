import type { ReactNode } from 'react'
import { cn } from './cn'
import { Logo } from './logo'

/**
 * Single-column shell for the onboarding wizard.
 *
 * AuthShell is the wrong shape here: its left column sells the product to a
 * stranger, and by this point they have already signed up. What matters now is
 * how much is left, so the step indicator is the only chrome.
 *
 * Centring works the same way as AuthShell — min-h-screen on the grid itself,
 * not on a wrapper whose child collapses to content height.
 */
export function WizardShell({
  step,
  total,
  title,
  sub,
  children,
}: {
  step: number
  total: number
  title: string
  sub: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[560px]">
        <div className="mb-10 flex flex-col items-center">
          <Logo className="mb-8 h-9 w-auto animate-pop text-ink" />

          {/* Segments rather than a bar: a discrete count is easier to read than
              a percentage when there are only six of them. */}
          <ol
            className="flex w-full items-center gap-2"
            aria-label={`Step ${step} of ${total}`}
          >
            {Array.from({ length: total }, (_, i) => {
              const n = i + 1
              const done = n < step
              const current = n === step
              return (
                <li
                  key={n}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    done || current ? 'bg-ink' : 'bg-outline-subtle',
                  )}
                />
              )
            })}
          </ol>
          <p className="mt-3 self-start text-xs font-medium tracking-wide text-text-subtle">
            Step {step} of {total}
          </p>
        </div>

        <div style={{ animationDelay: '70ms' }} className="animate-rise text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{sub}</p>
        </div>

        <div style={{ animationDelay: '140ms' }} className="mt-8 animate-rise">
          {children}
        </div>
      </div>
    </main>
  )
}
