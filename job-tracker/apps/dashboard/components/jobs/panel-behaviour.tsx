'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Escape-to-close, a scroll lock, and focus-on-open for the open panel.
 *
 * Every one of these is an enhancement, not a requirement: the panel is
 * server-rendered, its backdrop is a <Link> and so is its close button, so it
 * opens and closes on a URL with no JavaScript at all. That is the whole reason
 * it is not a Base UI Dialog — a portal renders nothing on the server, so a
 * portalled panel would simply be missing.
 *
 * What is genuinely lost without JavaScript is focus management: the panel is
 * last in the document, so a keyboard user tabs to it rather than landing in
 * it. `DetailPanel` gives its <aside> `tabIndex={-1}` and the id this effect
 * targets, so JavaScript can move focus there directly. Focus is moved, not
 * trapped: this is a deliberately non-modal panel (see the doc comment on
 * `DetailPanel`), and a focus trap belongs to a modal dialog, which this is
 * not — Tab still reaches the rest of the page. On unmount, focus goes back to
 * whatever had it before the panel opened (almost always the card's title
 * link), so closing the panel returns a keyboard user to where they were
 * instead of dropping them at the top of the document.
 */
export function PanelBehaviour({ closeHref, panelId }: { closeHref: string; panelId: string }) {
  const router = useRouter()

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    document.getElementById(panelId)?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') router.push(closeHref, { scroll: false })
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore only if the lock is still ours. A Base UI Menu elsewhere on
      // the page (the account menu in DashboardNav, reachable behind the
      // backdrop) sets and restores this same property; restoring an
      // absolute value unconditionally could fire after that lock's own
      // restore and strand the body at `overflow: hidden` until reload.
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = previousOverflow
      }
      previouslyFocused?.focus()
    }
  }, [router, closeHref, panelId])

  return null
}
