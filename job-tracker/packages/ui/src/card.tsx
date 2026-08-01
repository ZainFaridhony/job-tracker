import type { ReactNode } from 'react'
import { cn } from './cn'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-subtle bg-surface p-8',
        'transition-shadow duration-300',
        'shadow-[0_20px_60px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
