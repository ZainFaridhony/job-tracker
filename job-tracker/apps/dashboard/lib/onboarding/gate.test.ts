import { describe, expect, it } from 'vitest'
import { onboardingRedirect } from './gate'

const midway = { complete: false, step: 3 }
const fresh = { complete: false, step: 1 }
const done = { complete: true, step: 6 }

describe('onboardingRedirect', () => {
  it('sends an unfinished user out of the app and into their current step', () => {
    expect(onboardingRedirect('/dashboard', midway)).toBe('/onboarding/roles')
  })

  it('gates every app route, not just /dashboard', () => {
    expect(onboardingRedirect('/applications/42', fresh)).toBe('/onboarding/resume')
  })

  it('lets a finished user through to the app', () => {
    expect(onboardingRedirect('/dashboard', done)).toBeNull()
  })

  it('pushes a finished user out of the wizard', () => {
    expect(onboardingRedirect('/onboarding/skills', done)).toBe('/dashboard')
  })

  it('allows the step the user is on', () => {
    expect(onboardingRedirect('/onboarding/roles', midway)).toBeNull()
  })

  it('allows revisiting a completed step', () => {
    expect(onboardingRedirect('/onboarding/resume', midway)).toBeNull()
    expect(onboardingRedirect('/onboarding/goals', midway)).toBeNull()
  })

  it('refuses a jump past the current step', () => {
    expect(onboardingRedirect('/onboarding/skills', midway)).toBe('/onboarding/roles')
    expect(onboardingRedirect('/onboarding/done', fresh)).toBe('/onboarding/resume')
  })

  it('resolves the bare /onboarding path to the current step', () => {
    expect(onboardingRedirect('/onboarding', midway)).toBe('/onboarding/roles')
  })

  it('leaves an unknown slug alone so it 404s instead of silently redirecting', () => {
    expect(onboardingRedirect('/onboarding/nope', midway)).toBeNull()
  })

  it.each([
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/check-email',
    '/reset-password',
    '/accept-terms',
    '/auth/callback',
    '/auth/confirm',
  ])('never redirects away from %s', (path) => {
    expect(onboardingRedirect(path, fresh)).toBeNull()
    expect(onboardingRedirect(path, done)).toBeNull()
  })

  it('does not treat a lookalike prefix as exempt', () => {
    expect(onboardingRedirect('/sign-in-secretly', fresh)).toBe('/onboarding/resume')
  })

  it('clamps a step outside 1-6 rather than producing an undefined slug', () => {
    expect(onboardingRedirect('/dashboard', { complete: false, step: 0 })).toBe(
      '/onboarding/resume',
    )
    expect(onboardingRedirect('/dashboard', { complete: false, step: 99 })).toBe('/onboarding/done')
  })
})
