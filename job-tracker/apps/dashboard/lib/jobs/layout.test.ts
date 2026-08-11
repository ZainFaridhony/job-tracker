import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BAR_HEIGHT, NAV_HEIGHT, STICKY_BAR, STICKY_SIDEBAR } from './layout'

describe('sticky offsets', () => {
  it('parks the filter bar exactly under the nav', () => {
    // DashboardNav is `sticky top-0` at h-[72px]. One pixel of disagreement
    // here and the bar either overlaps the nav or shows a stripe of page
    // through the gap while scrolling.
    expect(STICKY_BAR).toContain(`top-[${NAV_HEIGHT}px]`)
  })

  it('parks the sidebar under both of them', () => {
    expect(STICKY_SIDEBAR).toContain(`top-[${NAV_HEIGHT + BAR_HEIGHT}px]`)
  })

  it('keeps the sidebar below the bar in the stacking order', () => {
    // The bar is opaque and scrolls over the sidebar's top edge.
    const z = (s: string) => Number(/z-(\d+)/.exec(s)?.[1] ?? 0)
    expect(z(STICKY_BAR)).toBeGreaterThan(z(STICKY_SIDEBAR))
  })

  it('agrees with the nav it is measured against', () => {
    // The whole point of the constant. Nothing else notices if the nav's height
    // changes, and the symptom is a 72px stripe of scrolling page under a bar
    // that looks correct in isolation.
    const nav = readFileSync(
      new URL('../../components/dashboard/nav.tsx', import.meta.url),
      'utf8',
    )
    expect(nav).toContain(`h-[${NAV_HEIGHT}px]`)
  })

  it('agrees with the bar it is measured against', () => {
    // BAR_HEIGHT's comment claims 64 = py-3 (12px either side) + a 40px
    // control row, but nothing enforced the row actually being h-10 — the
    // coupling STICKY_SIDEBAR's top-[136px] depends on was comment-only.
    // Nothing else notices if the row's height changes, and the symptom is
    // the same stripe-of-page bug as the nav check above, just one layer down.
    //
    // Asserts on the class string, not just the bare substring: this file's
    // own prose mentions "h-10" three times (in comments, ahead of the class
    // attribute) before the row is ever declared, so `toContain('h-10')`
    // alone would still pass with the class deleted entirely.
    const bar = readFileSync(
      new URL('../../components/jobs/filter-bar.tsx', import.meta.url),
      'utf8',
    )
    expect(bar).toContain('flex h-10 flex-nowrap')
  })
})
