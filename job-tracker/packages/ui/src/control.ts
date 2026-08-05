/**
 * The shape every 48px control shares.
 *
 * Extracted rather than duplicated because two of them are different elements:
 * Button is a <button>, and the wizard's Back is an <a> because it navigates.
 * They are meant to be visually indistinguishable, so the focus ring and the
 * press transform must not be able to drift apart.
 *
 * Deliberately excluded: `w-full` and the `disabled:*` classes, which are
 * <button> concerns and stay in button.tsx. There is no padding here either —
 * Button sizes itself with `w-full` plus `justify-center`, so a content-width
 * control supplies its own.
 */
export const CONTROL_BASE =
  'inline-flex h-12 items-center justify-center gap-2 rounded text-sm font-medium ' +
  'transition-[background-color,transform] duration-150 active:scale-[0.99] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

// The three ink tokens are the logo mark's three tonal facets, so the primary
// control's states are the brand's own geometry rather than arbitrary tints.
// `outline`, not `outline-subtle`: this is the boundary of something focusable,
// and outline-subtle is asserted below 3:1 in tokens.test.ts, so it fails WCAG
// 1.4.11 as a control edge. It was previously only reaching `outline` on hover,
// which keyboard and touch users never trigger.
//
// secondary fills with `surface`, not `surface-subtle`. Its only caller is the
// wizard's Back link, which now sits on `canvas` rather than inside a white card,
// and surface-subtle (#F4F4F4) on canvas (#FAFAFA) is barely a fill at all —
// the control would be carried by its border alone. White reads as raised there,
// and the hover simply trades the two.
export const CONTROL_VARIANT = {
  primary: 'bg-ink text-text-on-ink hover:bg-ink-hover active:bg-ink-pressed',
  secondary: 'border border-outline bg-surface text-text hover:bg-surface-subtle',
} as const
