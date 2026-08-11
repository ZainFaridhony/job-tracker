/**
 * The three sticky offsets, and the arithmetic that ties them together.
 *
 * Here rather than inline in the components for the reason `step-layout.ts`
 * exists: this workspace's vitest can reach lib/ and cannot reach components/,
 * and these numbers are coupled. DashboardNav is `sticky top-0` at 72px, the
 * filter bar parks under it, and the sidebar parks under both. Get one wrong
 * and the bar either overlaps the nav or leaves a stripe of scrolling page
 * showing through the gap.
 *
 * The class strings are literals, not built from the numbers. Tailwind only
 * emits classes it can see written out, so a template string here would compile
 * to no CSS at all — silently. The test is what keeps the literals and the
 * numbers agreeing.
 */

/** DashboardNav's `h-[72px]`. */
export const NAV_HEIGHT = 72

/** The filter bar: py-3 either side of a 40px control row. */
export const BAR_HEIGHT = 64

/** Matches the dashboard's own main element on horizontal alignment only —
 *  same `max-w-[1600px]`, same `px-4 md:px-12`, so the two screens' content
 *  lines up left and right. The vertical rhythm deliberately does not match
 *  (`gap-6` here against the dashboard's `gap-8`), and this adds `w-full`,
 *  which the dashboard's shell does not have. */
export const PAGE_SHELL = 'mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-8 md:px-12'

/** Breathing room under the sidebar so its last section is not flush with the
 *  viewport edge. Folded into the max-height literals below. */
export const SIDEBAR_GUTTER = 24

export const STICKY_BAR =
  'sticky top-[72px] z-30 -mx-4 border-b border-outline-subtle bg-canvas/85 px-4 py-3 backdrop-blur-md md:-mx-12 md:px-12'

/**
 * Where the sidebar parks, which depends on whether the bar is on screen.
 *
 * The bar holds only the active-filter chips now, so it renders nothing at all
 * on an untouched screen — the salary period and currency toggles moved into
 * the sidebar's own Salary section, where they sit beside the figure they
 * describe. That makes the sidebar's offset conditional rather than constant:
 * 72 + 64 when the bar is there, 72 alone when it is not. Leaving it at 136
 * unconditionally left a 64px band of scrolling page above the sidebar on every
 * unfiltered visit, which is the majority of them.
 *
 * Two literals rather than one built from the numbers, for the reason at the
 * top of this file: Tailwind only emits classes it can see written out.
 */
export const STICKY_SIDEBAR = 'lg:sticky lg:top-[136px] lg:z-20 lg:max-h-[calc(100dvh-160px)]'

export const STICKY_SIDEBAR_NO_BAR =
  'lg:sticky lg:top-[72px] lg:z-20 lg:max-h-[calc(100dvh-96px)]'

export function stickySidebar(hasBar: boolean): string {
  return hasBar ? STICKY_SIDEBAR : STICKY_SIDEBAR_NO_BAR
}
