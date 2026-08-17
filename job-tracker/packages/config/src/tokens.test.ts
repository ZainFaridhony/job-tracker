import { describe, it, expect } from 'vitest'
import { TOKENS } from './tokens'
import { contrastRatio } from './contrast'

const BACKGROUNDS = ['surface', 'canvas', 'surface-subtle'] as const
const TEXT = ['text', 'text-muted', 'text-subtle'] as const

/** The three steps of an ordinal scale, best to worst. Each has a text token
 *  and a `-surface` / `text-on-*-surface` container pair. */
const ORDINAL = ['success', 'warning', 'error'] as const

type Measured = readonly (readonly [string, number])[]

/** Kept as name/ratio pairs rather than two parallel arrays so the failure
 *  message names the offending token without an index TS cannot prove is in
 *  range — `noUncheckedIndexedAccess` is on. */
const spreadOf = (m: Measured): number => {
  const rs = m.map(([, r]) => r)
  return Math.max(...rs) - Math.min(...rs)
}

const describe_ = (m: Measured): string =>
  m.map(([name, r]) => `${name} ${r.toFixed(2)}`).join(', ')

describe('TOKENS', () => {
  it('is uppercase 6-digit hex throughout', () => {
    for (const [name, value] of Object.entries(TOKENS)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('contains no value from the superseded reference palette', () => {
    const forbidden = ['#000000', '#1A1C1C', '#444748', '#C4C7C7', '#747878']
    expect(Object.values(TOKENS).filter((v) => forbidden.includes(v))).toEqual([])
  })

  it('takes its ink from the three facets of the logo mark', () => {
    expect(TOKENS['ink-pressed']).toBe('#181818')
    expect(TOKENS['ink']).toBe('#1E1E1E')
    expect(TOKENS['ink-hover']).toBe('#2A2A2A')
  })
})

describe('accessibility floors', () => {
  it('clears AA 4.5:1 for every text token on every background', () => {
    for (const bg of BACKGROUNDS) {
      for (const fg of TEXT) {
        const r = contrastRatio(TOKENS[fg], TOKENS[bg])
        expect(r, `${fg} on ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('clears AA 4.5:1 for text on the primary button in all three states', () => {
    for (const ink of ['ink', 'ink-hover', 'ink-pressed'] as const) {
      const r = contrastRatio(TOKENS['text-on-ink'], TOKENS[ink])
      expect(r, `text-on-ink on ${ink} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('clears WCAG 1.4.11 non-text 3:1 for control outlines', () => {
    for (const bg of BACKGROUNDS) {
      const r = contrastRatio(TOKENS['outline'], TOKENS[bg])
      expect(r, `outline on ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('clears AA for error text on both the canvas and the error fill', () => {
    expect(contrastRatio(TOKENS['error'], TOKENS['canvas'])).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(TOKENS['text-on-error-surface'], TOKENS['error-surface']),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('clears AA for every ordinal token on every background', () => {
    for (const bg of BACKGROUNDS) {
      for (const fg of ORDINAL) {
        const r = contrastRatio(TOKENS[fg], TOKENS[bg])
        expect(r, `${fg} on ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('clears AA for every tinted container and the text sat on it', () => {
    for (const band of ORDINAL) {
      const r = contrastRatio(TOKENS[`text-on-${band}-surface`], TOKENS[`${band}-surface`])
      expect(r, `text-on-${band}-surface on ${band}-surface = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  // An ordinal scale is only readable if its steps carry equal weight. Pinned in
  // both directions because the obvious greens and ambers are all far lighter
  // than this red: swap one in and "Critical" shouts while "Excellent" whispers,
  // which no other assertion here would catch. Same reason a rise and a fall on
  // `Delta` must weigh the same.
  it('weights the ordinal tokens alike, so no band shouts louder than another', () => {
    for (const bg of BACKGROUNDS) {
      const measured = ORDINAL.map((t) => [t, contrastRatio(TOKENS[t], TOKENS[bg])] as const)
      expect(spreadOf(measured), `on ${bg}: ${describe_(measured)}`).toBeLessThan(0.5)
    }
  })

  it('weights the tinted containers alike for the same reason', () => {
    const measured = ORDINAL.map(
      (b) =>
        [b, contrastRatio(TOKENS[`text-on-${b}-surface`], TOKENS[`${b}-surface`])] as const,
    )
    expect(spreadOf(measured), describe_(measured)).toBeLessThan(0.5)
  })

  // Not decoration: the emphasised optimisation tip is an ink fill with a
  // focusable ⓘ inside it, so the focus ring is drawn against ink rather than
  // against one of the three light backgrounds the check above covers.
  it('clears WCAG 1.4.11 for a focus ring drawn on an ink fill', () => {
    const r = contrastRatio(TOKENS['outline'], TOKENS['ink'])
    expect(r, `outline on ink = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(3)
  })

  it('exempts outline-subtle, which is decorative only', () => {
    expect(contrastRatio(TOKENS['outline-subtle'], TOKENS['surface'])).toBeLessThan(3)
  })
})
