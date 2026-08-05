import { cn } from './cn'

/**
 * Hand-authored, because no icon package is installed and two glyphs do not
 * justify adding one. The stroke weight and round terminals come from the
 * reference design system's icon rule: 1.5px with rounded ends is what sits
 * correctly beside Geist, which a filled glyph or a hairline would not.
 *
 * `←` was the previous stand-in. A text arrow renders at whatever weight the
 * platform's fallback font decides and sits off the label's optical baseline,
 * which is why these are paths.
 *
 * currentColor so the control's own text token drives them, and aria-hidden
 * throughout: every use so far sits beside a text label that carries the
 * meaning, so announcing the arrow would only duplicate it.
 */
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('size-4', className)} {...STROKE}>
      <path d="M13 8H3" />
      <path d="M7 4 3 8l4 4" />
    </svg>
  )
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('size-4', className)} {...STROKE}>
      <path d="M3 8h10" />
      <path d="m9 4 4 4-4 4" />
    </svg>
  )
}

export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('size-4', className)} {...STROKE}>
      <path d="m4 6.5 4 4 4-4" />
    </svg>
  )
}
