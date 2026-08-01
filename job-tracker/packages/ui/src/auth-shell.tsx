import type { ReactNode } from 'react'
import { Logo } from './logo'

/**
 * The two-column auth layout from the reference designs: marketing copy left,
 * form card right. The left panel is context, not content, so it drops away on
 * small screens and the mark moves above the card.
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
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-12 md:grid-cols-2 md:px-12 md:py-24">
        <section className="hidden flex-col justify-center md:flex">
          <Logo className="mb-12 h-12 w-auto animate-pop text-ink" />
          <h1 style={{ animationDelay: '70ms' }}
            className="max-w-lg animate-rise text-4xl font-bold leading-tight tracking-tight text-text lg:text-5xl">
            {headline}
          </h1>
          <p style={{ animationDelay: '140ms' }}
            className="mt-6 max-w-md animate-rise text-base leading-relaxed text-text-muted">
            {sub}
          </p>
        </section>
        <section className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md">
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
