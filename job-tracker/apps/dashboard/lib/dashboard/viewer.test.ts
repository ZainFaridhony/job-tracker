import { describe, expect, it } from 'vitest'
import { greetingFrom } from './viewer'

describe('greetingFrom', () => {
  it('uses the first name, because the full one reads like a system notice', () => {
    expect(greetingFrom('Ofi Novyanti', 'ofi@example.com')).toBe('Ofi')
  })

  it('falls back to a capitalised email local part', () => {
    expect(greetingFrom(null, 'zain@example.com')).toBe('Zain')
    expect(greetingFrom('   ', 'zain@example.com')).toBe('Zain')
  })

  it('never greets an empty string', () => {
    // A profile row with no name and a claim with no email is possible during
    // the window between sign-up and the profile trigger firing.
    expect(greetingFrom(null, '')).toBe('there')
  })

  it('collapses the extra whitespace a pasted name carries', () => {
    expect(greetingFrom('  Ofi   Novyanti ', 'x@y.z')).toBe('Ofi')
  })

  it('leaves an already-capitalised local part alone', () => {
    expect(greetingFrom(null, 'Zain.Faridhony@example.com')).toBe('Zain.Faridhony')
  })
})
