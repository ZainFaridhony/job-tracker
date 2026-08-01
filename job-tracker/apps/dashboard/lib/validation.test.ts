import { describe, it, expect } from 'vitest'
import { validateSignUp, validateNewPassword } from './validation'

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
