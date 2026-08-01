import type { ReactNode } from 'react'
import { Logo } from './logo.js'

/**
 * The two-column auth layout from the reference designs: marketing copy left,
 * form card right. The left panel is context, not content, so it drops away on
 * small screens and the mark moves above the card.
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
          <Logo className="mb-12 h-12 w-auto text-ink" />
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-text lg:text-5xl">
            {headline}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-text-muted">{sub}</p>
        </section>
        <section className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md">
            <Logo className="mb-8 h-10 w-auto text-ink md:hidden" />
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
