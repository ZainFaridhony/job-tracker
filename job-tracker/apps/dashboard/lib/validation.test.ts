import { describe, it, expect } from 'vitest'
import { safeNext, validateSignUp, validateNewPassword } from './validation'

const ok = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.test',
  password: 'Str0ng-Passphrase',
  confirmPassword: 'Str0ng-Passphrase',
  terms: true,
}

describe('validateSignUp', () => {
  it('accepts a complete, valid submission', () => {
    expect(validateSignUp(ok)).toBeNull()
  })
  it('requires a name', () => {
    expect(validateSignUp({ ...ok, fullName: '  ' })).toMatch(/name/i)
  })
  it('requires a plausible email', () => {
    expect(validateSignUp({ ...ok, email: 'not-an-email' })).toMatch(/email/i)
  })
  it('requires at least 8 characters of password', () => {
    expect(
      validateSignUp({ ...ok, password: 'short7!', confirmPassword: 'short7!' }),
    ).toMatch(/8 characters/i)
  })
  it('requires the two passwords to match', () => {
    expect(validateSignUp({ ...ok, confirmPassword: 'different' })).toMatch(/match/i)
  })
  it('requires the terms checkbox — FR-44', () => {
    expect(validateSignUp({ ...ok, terms: false })).toMatch(/terms/i)
  })
})

describe('validateNewPassword', () => {
  it('accepts a long enough matching pair', () => {
    expect(validateNewPassword('Str0ng-Passphrase', 'Str0ng-Passphrase')).toBeNull()
  })
  it('requires 8 characters', () => {
    expect(validateNewPassword('short7!', 'short7!')).toMatch(/8 characters/i)
  })
  it('requires the pair to match', () => {
    expect(validateNewPassword('Str0ng-Passphrase', 'other')).toMatch(/match/i)
  })
})

describe('safeNext', () => {
  it('passes through an in-app path', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard')
    expect(safeNext('/jobs?status=interviewing')).toBe('/jobs?status=interviewing')
  })

  it('falls back when absent or absolute', () => {
    expect(safeNext(undefined)).toBe('/dashboard')
    expect(safeNext('')).toBe('/dashboard')
    expect(safeNext('https://evil.com')).toBe('/dashboard')
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeNext('//evil.com')).toBe('/dashboard')
  })

  it('rejects backslash and whitespace variants the URL parser normalises', () => {
    // new URL('/\\evil.com', 'https://app.test').href === 'https://evil.com/'
    expect(safeNext('/\\evil.com')).toBe('/dashboard')
    expect(safeNext('/\\/evil.com')).toBe('/dashboard')
    expect(safeNext('/\t/evil.com')).toBe('/dashboard')
    expect(safeNext('/\n/evil.com')).toBe('/dashboard')
    expect(safeNext('\\\\evil.com')).toBe('/dashboard')
  })

  it('resolves every accepted value to the same origin', () => {
    const base = 'https://app.example.test/sign-in'
    for (const probe of ['/\\evil.com', '/\t/evil.com', '//evil.com', 'https://evil.com']) {
      expect(new URL(safeNext(probe), base).origin).toBe('https://app.example.test')
    }
  })
})
