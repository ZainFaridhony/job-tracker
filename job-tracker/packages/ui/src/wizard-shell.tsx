import type { ReactNode } from 'react'
import { cn } from './cn'
import { Logo } from './logo'

export type WizardStep = {
  n: number
  /** Short stage name for the stepper. Not the heading — see below. */
  short: string
}

/**
 * Shell for the onboarding wizard: stepper across the top, one wide card below.
 *
 * A step has to fit the viewport at 100% without scrolling. Two things buy that:
 * a wide single column, so a chip field holding long extracted job titles fits
 * its rows instead of wrapping three deep in a half-width lane, and a header
 * kept to what it needs.
 *
 * An earlier version put the chrome in a left column. It worked, but it forced
 * the card into a 620px lane, which is what made the fields wrap. A later one
 * paired fields side by side to save height, which starved the field that needed
 * the measure. Wide and stacked is the trade that holds.
 *
 * Above `md` the grid is `h-[100dvh]` with the header on an `auto` row and the
 * step on `minmax(0, 1fr)`, so the page itself cannot scroll however short the
 * viewport is. What absorbs the overflow is the step's own Card, with its footer
 * outside it. `100dvh` and not `100vh`, because mobile Safari's address bar makes
 * `vh` taller than the visible area. Below `md` it is ordinary flow and the page
 * scrolls, which is correct on a phone.
 */
export function WizardShell({
  step,
  total,
  steps,
  title,
  sub,
  children,
}: {
  step: number
  total: number
  /** Every stage, for the stepper. Presentational only — the shell does no routing. */
  steps: readonly WizardStep[]
  title: string
  sub: string
  children: ReactNode
}) {
  return (
    <main
      className={cn(
        'bg-canvas px-4 py-8 sm:px-8',
        'md:grid md:h-[100dvh] md:grid-rows-[auto_minmax(0,1fr)] md:gap-8',
        'md:overflow-hidden md:px-12 md:py-8',
      )}
    >
      <header className="mx-auto w-full max-w-[880px]">
        <Logo className="mb-6 h-9 w-auto animate-pop text-ink" />

        {/* Nodes joined by connectors, labels underneath. The connector arriving
            at a node is inked once that node has been reached, so the filled
            path stops at where you are rather than running past it.

            No "Step 3 of 4" caption. It was needed when this was an unlabelled
            bar; with numbered nodes and a ring on the current one, it repeated
            what the stepper already shows. The count still reaches a screen
            reader through this list's own aria-label.

            Deliberately not clickable. The gate clamps forward jumps anyway, and
            a stepper that looks navigable but refuses is worse than one that
            never offered. Back is the one way back. */}
        <ol
          style={{ animationDelay: '70ms' }}
          className="flex w-full animate-rise items-start"
          aria-label={`Step ${step} of ${total}`}
        >
          {steps.map((s, i) => {
            const done = s.n < step
            const current = s.n === step
            const first = i === 0
            const last = i === steps.length - 1

            return (
              <li
                key={s.n}
                aria-current={current ? 'step' : undefined}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full items-center">
                  <span
                    aria-hidden
                    className={cn(
                      'h-px flex-1',
                      first && 'invisible',
                      s.n <= step ? 'bg-ink' : 'bg-outline-subtle',
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      done && 'bg-ink text-text-on-ink',
                      current && 'border-2 border-ink bg-surface text-text',
                      // `outline`, not `outline-subtle`: outline-subtle is
                      // asserted below 3:1 in tokens.test.ts.
                      !done && !current && 'border border-outline bg-surface text-text-subtle',
                    )}
                  >
                    {done ? '✓' : s.n}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'h-px flex-1',
                      last && 'invisible',
                      s.n < step ? 'bg-ink' : 'bg-outline-subtle',
                    )}
                  />
                </div>

                {/* Hidden below sm, where four labels across a phone would
                    either wrap to three lines each or truncate to nothing. The
                    nodes and the counter carry it there. */}
                <span
                  className={cn(
                    'hidden max-w-full truncate px-1 text-center text-xs sm:block',
                    current ? 'font-medium text-text' : 'text-text-muted',
                  )}
                >
                  {s.short}
                </span>
              </li>
            )
          })}
        </ol>

        <div style={{ animationDelay: '140ms' }} className="mt-6 animate-rise">
          <h1 className="text-2xl font-bold tracking-tight text-text lg:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{sub}</p>
        </div>
      </header>

      {/* Sized, not scrolling. The step owns the scroll now: its Card takes the
          slack and scrolls, and its footer sits outside the Card so Continue
          cannot leave the viewport. This wrapper used to scroll instead, which
          put the button inside the scrolling region and let it hide. */}
      <div
        style={{ animationDelay: '210ms' }}
        className={cn('mx-auto mt-8 w-full max-w-[880px] animate-rise', 'md:mt-0 md:h-full')}
      >
        {children}
      </div>
    </main>
  )
}
