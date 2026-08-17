/**
 * Single source of truth for colour. Mirrored in theme.css as @theme variables —
 * change both together.
 *
 * PRD Appendix A records the derivation: ink-pressed, ink and ink-hover are the
 * three tonal facets sampled from brand/logo-mark.svg, so the primary button's
 * rest/hover/pressed states are the logo's own geometry rather than arbitrary
 * tints of it. Nothing here is pure black — the mark is #1E1E1E, and true black
 * beside it makes the logo look faded.
 */
export const TOKENS = {
  'ink-pressed': '#181818',
  'ink': '#1E1E1E',
  'ink-hover': '#2A2A2A',

  'text': '#1E1E1E',
  'text-muted': '#5C5C5C',
  'text-subtle': '#6F6F6F',
  'text-on-ink': '#FFFFFF',

  'canvas': '#FAFAFA',
  'surface': '#FFFFFF',
  'surface-subtle': '#F4F4F4',
  'surface-inverse': '#1E1E1E',

  'outline': '#8A8A8A',
  'outline-subtle': '#E4E4E4',

  // The three steps of an ordinal scale, best to worst. Each has a text token
  // and a tinted container pair. They exist for quantities with a genuine
  // direction — the way a change rises or falls, or a score bands from Excellent
  // to Critical — and NOT as a general good/caution/bad vocabulary. `warning` in
  // particular is not a "caution" colour for disabled controls or destructive
  // buttons; it is the middle step of a scale, and nothing else.
  //
  // Every value is chosen for weight, not hue. The three text tokens land within
  // 0.05 of each other on every background (6.53 / 6.51 / 6.46 on surface) and
  // the three containers within 0.26 (7.50 / 7.35 / 7.24), so no band shouts
  // louder than its neighbours. tokens.test.ts pins both spreads, because every
  // off-the-shelf green and amber is far lighter than this red — swapping one in
  // breaks the scale without failing any other assertion here.
  'success': '#146C2E',
  'success-surface': '#C6F0D2',
  'text-on-success-surface': '#00522A',

  'warning': '#8A5000',
  'warning-surface': '#FFE2BC',
  'text-on-warning-surface': '#6B3D00',

  'error': '#BA1A1A',
  'error-surface': '#FFDAD6',
  'text-on-error-surface': '#93000A',
} as const satisfies Record<string, string>

export type TokenName = keyof typeof TOKENS
