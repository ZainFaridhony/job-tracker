import { describe, it, expect } from 'vitest'
import { relativeLuminance, contrastRatio } from './contrast.js'

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('uses the linear segment below the sRGB threshold', () => {
    // 0x0A = 10 -> 10/255 = 0.0392 which is <= 0.04045, so c/12.92
    expect(relativeLuminance('#0A0A0A')).toBeCloseTo(0.0392157 / 12.92, 6)
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2)
  })

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#1E1E1E', '#1E1E1E')).toBeCloseTo(1, 5)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#1E1E1E', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#1E1E1E'),
      10,
    )
  })

  it('matches the values recorded in PRD Appendix A', () => {
    expect(contrastRatio('#1E1E1E', '#FFFFFF')).toBeCloseTo(16.67, 1)
    expect(contrastRatio('#5C5C5C', '#FFFFFF')).toBeCloseTo(6.68, 1)
    expect(contrastRatio('#8A8A8A', '#FFFFFF')).toBeCloseTo(3.45, 1)
  })

  it('accepts shorthand and lowercase hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 2)
  })

  it('rejects a value that is not a hex colour', () => {
    expect(() => contrastRatio('rebeccapurple', '#FFFFFF')).toThrow(/hex colour/)
  })
})
