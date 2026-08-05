import type { ReactNode } from 'react'
import { cn } from './cn'
import { CONTROL_BASE, CONTROL_VARIANT } from './control'
import { ArrowLeft } from './icons'

/**
 * The wizard's action row: back on the left, the step's own submit on the right.
 *
 * Rendered as a sibling of the step's Card, not inside it. The Card is what
 * scrolls when a step outgrows the viewport, so a footer inside it would take
 * Continue out of reach on a short window — the page would hold still while the
 * button people are looking for scrolled away. Outside, it cannot move.
 *
 * That is also why there is no `border-t` any more. The rule divided the fields
 * from the actions while both lived in one card; across a gap, between two
 * separate boxes, there is nothing left to divide.
 *
 * The two directions of one axis belong together. An earlier build split them —
 * Back sat in the page header as text a third the size of Continue, sharing a
 * row and a type style with the static step counter, which made it read as
 * metadata rather than as a control and left it with a 16px-tall hit target.
 *
 * A plain anchor, not a router link: this package stays free of any framework,
 * and a full navigation is what guarantees the earlier step renders what is
 * currently stored rather than a cached form.
 *
 * Back is first in the DOM at every width. Below sm the row stacks, which puts
 * it above the submit. flex-col-reverse would read better on a phone — primary
 * on top — but only by making the visual order disagree with the DOM order, so
 * it is deliberately not used.
 *
 * `children` is wrapped rather than being asked to size itself: cn() has no
 * tailwind-merge, so a `w-auto` handed to Button would collide with the
 * `w-full` in its own base and resolution would fall to Tailwind's output
 * order. Making the wrapper the flex item avoids the conflict instead of
 * betting on it.
 */
export function WizardFooter({
  backHref,
  children,
}: {
  /** Omitted on step 1, where there is nothing behind. */
  backHref?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4')}>
      {backHref && (
        <a
          href={backHref}
          className={cn(
            'group w-full px-5 sm:w-auto sm:shrink-0',
            CONTROL_BASE,
            CONTROL_VARIANT.secondary,
          )}
        >
          {/* The arrow leans the way you are going. The global
              prefers-reduced-motion reset neutralises it, so the shape and the
              label carry the affordance on their own. */}
          <ArrowLeft className="transition-transform duration-150 group-hover:-translate-x-1" />
          Back
        </a>
      )}
      <div className="sm:flex-1">{children}</div>
    </div>
  )
}
