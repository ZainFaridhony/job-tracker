/**
 * The shape every onboarding step takes: a column whose Card absorbs the slack
 * and scrolls, with the action row outside the Card and therefore immovable.
 *
 * This is the whole reason Continue stays reachable on a short window. The footer
 * used to live inside the Card, and the Card is what scrolls — so the page held
 * still while the button people were looking for scrolled out of the card's own
 * viewport. Fixing it by height budget alone would mean being right about every
 * font, every chip count and every browser's chrome; fixing it structurally means
 * the arithmetic can be wrong and the button is still there.
 *
 * Only above `md`, where WizardShell is a `100dvh` grid and hands this column a
 * fixed height. Below it both are in ordinary flow and the page scrolls, which is
 * what a phone should do.
 *
 * Shared as strings rather than a wrapper component because the element differs
 * per step: three are a `<form>`, and the last two are a plain `<div>` (nothing
 * to submit, or a form that wraps only the footer).
 */

/** On the step's outermost element. */
export const STEP_FORM = 'flex flex-col gap-4 md:h-full'

/**
 * On the step's `Card`. `min-h-0` is load-bearing: a flex item's default
 * `min-height: auto` refuses to shrink below its content, so the Card would push
 * the footer off the bottom instead of scrolling.
 */
export const STEP_BODY = 'min-h-0 flex-1 md:overflow-y-auto'
