import type { ReactNode } from 'react'
import { cn } from './cn'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // No transition-shadow here: nothing ever changes the shadow, so it was
        // declaring a transition for a property that never moves.
        //
        // p-6 below sm: 32px of padding either side of a 560px column is a lot of
        // a phone screen, and the wizard has to fit a viewport without scrolling.
        'rounded-xl border border-outline-subtle bg-surface p-6 sm:p-8',
        'shadow-[0_20px_60px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
