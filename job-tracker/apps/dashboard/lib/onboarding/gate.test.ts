import { describe, expect, it } from 'vitest'
import { onboardingRedirect } from './gate'

const midway = { complete: false, step: 2 }
const fresh = { complete: false, step: 1 }
const done = { complete: true, step: 4 }

describe('onboardingRedirect', () => {
  it('sends an unfinished user out of the app and into their current step', () => {
    expect(onboardingRedirect('/dashboard', midway)).toBe('/onboarding/profile')
  })

  it('gates every app route, not just /dashboard', () => {
    expect(onboardingRedirect('/applications/42', fresh)).toBe('/onboarding/resume')
  })

  it('lets a finished user through to the app', () => {
    expect(onboardingRedirect('/dashboard', done)).toBeNull()
  })

  it('pushes a finished user out of the wizard', () => {
    expect(onboardingRedirect('/onboarding/profile', done)).toBe('/dashboard')
  })

  it('allows the step the user is on', () => {
    expect(onboardingRedirect('/onboarding/profile', midway)).toBeNull()
  })

  it('allows revisiting a completed step', () => {
    expect(onboardingRedirect('/onboarding/resume', midway)).toBeNull()
  })

  it('refuses a jump past the current step', () => {
    expect(onboardingRedirect('/onboarding/preferences', midway)).toBe('/onboarding/profile')
    expect(onboardingRedirect('/onboarding/done', fresh)).toBe('/onboarding/resume')
  })

  it('resolves the bare /onboarding path to the current step', () => {
    expect(onboardingRedirect('/onboarding', midway)).toBe('/onboarding/profile')
  })

  it('leaves an unknown slug alone so it 404s instead of silently redirecting', () => {
    expect(onboardingRedirect('/onboarding/nope', midway)).toBeNull()
  })

  // Anyone standing mid-wizard when the four-step flow deployed has one of
  // these in their address bar. The step page 404s on a slug it does not know,
  // so a pass-through would still be a dead end — these must redirect.
  it.each([
    ['/onboarding/roles', 'profile'],
    ['/onboarding/skills', 'profile'],
  ])('redirects the retired slug %s to the step that now owns it', (path, owner) => {
    expect(onboardingRedirect(path, { complete: false, step: 3 })).toBe(`/onboarding/${owner}`)
  })

  it.each([['/onboarding/goals'], ['/onboarding/work']])(
    'redirects %s to preferences once that step is reachable',
    (path) => {
      expect(onboardingRedirect(path, { complete: false, step: 3 })).toBe('/onboarding/preferences')
    },
  )

  it('clamps a retired slug rather than letting it jump ahead', () => {
    // `goals` now lives on step 3, but this user has only reached step 2.
    expect(onboardingRedirect('/onboarding/goals', midway)).toBe('/onboarding/profile')
    expect(onboardingRedirect('/onboarding/work', fresh)).toBe('/onboarding/resume')
  })

  it('still sends a finished user to the dashboard from a retired slug', () => {
    expect(onboardingRedirect('/onboarding/skills', done)).toBe('/dashboard')
  })

  it('never redirects a retired slug back to itself', () => {
    for (const slug of ['goals', 'roles', 'skills', 'work']) {
      const target = onboardingRedirect(`/onboarding/${slug}`, { complete: false, step: 4 })
      expect(target).not.toBe(`/onboarding/${slug}`)
      expect(target).not.toBeNull()
    }
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

  it('clamps a step outside 1-4 rather than producing an undefined slug', () => {
    expect(onboardingRedirect('/dashboard', { complete: false, step: 0 })).toBe(
      '/onboarding/resume',
    )
    expect(onboardingRedirect('/dashboard', { complete: false, step: 99 })).toBe('/onboarding/done')
    // A row the migration's remap missed would still hold a six-step value.
    expect(onboardingRedirect('/dashboard', { complete: false, step: 6 })).toBe('/onboarding/done')
  })
})
