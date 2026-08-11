'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Escape-to-close and a scroll lock for the open panel.
 *
 * Every one of these is an enhancement, not a requirement: the panel is
 * server-rendered, its backdrop is a <Link> and so is its close button, so it
 * opens and closes on a URL with no JavaScript at all. That is the whole reason
 * it is not a Base UI Dialog — a portal renders nothing on the server, so a
 * portalled panel would simply be missing.
 *
 * What is genuinely lost without JavaScript is focus management: the panel is
 * last in the document, so a keyboard user tabs to it rather than landing in
 * it. It is an <aside> with an accessible name, which keeps it reachable as a
 * landmark. Focus is moved here when JavaScript is available.
 */
export function PanelBehaviour({ closeHref }: { closeHref: string }) {
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') router.push(closeHref, { scroll: false })
    }
    document.addEventListener('keydown', onKeyDown)

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [router, closeHref])

  return null
}
