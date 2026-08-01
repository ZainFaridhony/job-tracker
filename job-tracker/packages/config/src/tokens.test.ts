import { describe, it, expect } from 'vitest'
import { TOKENS } from './tokens'
import { contrastRatio } from './contrast'

const BACKGROUNDS = ['surface', 'canvas', 'surface-subtle'] as const
const TEXT = ['text', 'text-muted', 'text-subtle'] as const

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

  it('exempts outline-subtle, which is decorative only', () => {
    expect(contrastRatio(TOKENS['outline-subtle'], TOKENS['surface'])).toBeLessThan(3)
  })
})
