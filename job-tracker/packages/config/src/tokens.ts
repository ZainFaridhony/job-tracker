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

  'error': '#BA1A1A',
  'error-surface': '#FFDAD6',
  'text-on-error-surface': '#93000A',
} as const satisfies Record<string, string>

export type TokenName = keyof typeof TOKENS
