import type { ReactNode } from 'react'
import { Logo } from './logo'

/**
 * The two-column auth layout from the reference designs: marketing copy left,
 * form card right. The left panel is context, not content, so it drops away on
 * small screens and the mark moves above the card.
 *
 * <main> is the centring context, not merely a minimum-height wrapper. Putting
 * min-h-screen on it while the grid inside had no height of its own let the
 * grid collapse to content height and sit at the top, which left the whole
 * composition pinned to the top of a tall window. items-center on the inner
 * grid is what puts the mark and the card on one shared axis.
 *
 * The entrance is one staggered movement rather than four separate ones: the
 * mark pops, then the headline, sub and card rise 70ms apart. Easing and
 * durations come from the reference designs. `animate-*` resolves to `both`, so
 * each element holds its from-state until its delay elapses — without that the
 * stagger flickers. Delays are inline styles, not arbitrary Tailwind values:
 * only the first of the three arbitrary variants survived class detection
 * across the package boundary, which silently collapsed the stagger.
 */
export function AuthShell({
  headline,
  sub,
  children,
}: {
  headline: string
  sub: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12 md:px-12">
      <div className="grid w-full max-w-[1200px] items-center gap-12 md:grid-cols-2 md:gap-20">
        <section className="hidden md:block">
          <Logo className="mb-12 h-12 w-auto animate-pop text-ink" />
          <h1
            style={{ animationDelay: '70ms' }}
            className="max-w-lg animate-rise text-4xl font-bold leading-tight tracking-tight text-text lg:text-5xl"
          >
            {headline}
          </h1>
          <p
            style={{ animationDelay: '140ms' }}
            className="mt-6 max-w-md animate-rise text-base leading-relaxed text-text-muted"
          >
            {sub}
          </p>
        </section>
        <section>
          <div className="mx-auto w-full max-w-[480px]">
            <Logo className="mb-8 h-10 w-auto animate-pop text-ink md:hidden" />
            <div style={{ animationDelay: '210ms' }} className="animate-rise">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
