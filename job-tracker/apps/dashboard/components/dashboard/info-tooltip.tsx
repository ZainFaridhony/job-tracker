'use client'

import { type ReactNode, useState } from 'react'
import { Tooltip } from '@base-ui/react'
import { Info } from 'lucide-react'
import { cn } from '@job-tracker/ui'

/**
 * An ⓘ that explains the thing beside it.
 *
 * Shared rather than duplicated: this is the second caller (the change badge on
 * the hero card, and the optimisation tips), and the Base UI wiring below is the
 * part that was fiddly to get right. A copy of it is a second place to fix the
 * next tooltip bug. It stays in apps/dashboard rather than moving to
 * packages/ui, which gains a component when a second APP needs it, not before.
 *
 * WHY THE OPEN STATE IS CONTROLLED. Base UI opens a tooltip on hover and on
 * *keyboard* focus, which covers a mouse and a Tab key but not a tap: a touch
 * tap focuses the button without `:focus-visible`, so an uncontrolled tooltip is
 * simply unreachable on a phone. The `onClick` below is what makes the ⓘ do
 * something on touch, and `closeOnClick` is off so the click that opens it is
 * not also the click that closes it. Hover still drives `onOpenChange` on its
 * own, so leaving with the mouse closes it as usual.
 *
 * Not a Popover, which would be the other way to get a tap target: a popover is
 * a dismissable layer that takes focus, and these are captions, not things to
 * interact with.
 */
export function InfoTooltip({
  content,
  label,
  children,
  iconClassName,
  align = 'end',
}: {
  /** The popup body. */
  content: ReactNode
  /** The button's accessible name — its visible content is a number or nothing. */
  label: string
  /** Visible content inside the button, before the icon. */
  children?: ReactNode
  /**
   * Colour of the ⓘ. Not `currentColor`: on the change badge the surrounding
   * text is green or red, and the icon is not part of the measurement. On the
   * emphasised tip row the background is ink, so it must be `text-text-on-ink`.
   */
  iconClassName?: string
  align?: 'start' | 'center' | 'end'
}) {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger
        closeOnClick={false}
        onClick={() => setOpen(true)}
        // Base UI's hover delay. Its default of 600ms is a long wait for a
        // caption the pointer is already resting on.
        delay={150}
        className={cn(
          'inline-flex cursor-help items-center gap-1 rounded-sm bg-transparent p-0 text-left',
          'outline-offset-2 focus-visible:outline-2 focus-visible:outline-outline',
        )}
      >
        {children}
        <span className="sr-only">{label}</span>
        <Info
          aria-hidden
          className={cn('size-3.5 shrink-0', iconClassName ?? 'text-text-muted')}
          strokeWidth={2}
        />
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Positioner
          side="bottom"
          align={align}
          sideOffset={8}
          // Keeps the popup inside the viewport near a panel edge instead of
          // clipping; the tips sit at the right edge of a three-column grid.
          collisionPadding={12}
        >
          <Tooltip.Popup
            className={cn(
              'w-64 max-w-[calc(100vw-24px)] rounded-md border border-outline-subtle bg-surface p-3 text-xs',
              'shadow-[0_20px_60px_rgba(0,0,0,0.12)]',
              'origin-[var(--transform-origin)] transition-[transform,opacity] duration-150',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
              'motion-reduce:transition-none',
            )}
          >
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
