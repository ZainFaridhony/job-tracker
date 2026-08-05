import { slugForStep, stepBySlug, TOTAL_STEPS, type StepSlug } from './steps'

export type OnboardingState = {
  /** `profiles.onboarding_complete` */
  complete: boolean
  /** `profiles.onboarding_step`, 1-4 */
  step: number
}

/**
 * Slugs from the six-step wizard, mapped to whichever step now owns their
 * content.
 *
 * These get their own case ahead of the unknown-slug 404 below. A slug we
 * ourselves used to serve is not a typo, and anyone standing mid-wizard when
 * the four-step flow deployed has one of these in their address bar.
 */
const RETIRED_SLUGS: Record<string, StepSlug> = {
  goals: 'preferences',
  roles: 'profile',
  skills: 'profile',
  work: 'preferences',
}

/** Paths that must stay reachable regardless of onboarding progress. */
const EXEMPT_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/check-email',
  '/reset-password',
  '/accept-terms',
  '/auth',
]

function isExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Where a signed-in user belongs, given where they asked to go.
 *
 * Kept pure and separate from the proxy so the rules can be asserted directly.
 * The proxy supplies the state; the step page calls the same function, so a
 * direct navigation and a client-side one cannot disagree.
 *
 * Returns the pathname to redirect to, or null to let the request through.
 */
export function onboardingRedirect(pathname: string, state: OnboardingState): string | null {
  if (isExempt(pathname)) return null

  const inWizard = pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  if (state.complete) {
    // Finished. The wizard would offer to redo work that is already done.
    return inWizard ? '/dashboard' : null
  }

  const current = `/onboarding/${slugForStep(state.step)}`

  // FR-5: the CV is a hard gate, so nothing else in the app is reachable yet.
  if (!inWizard) return current

  const slug = pathname.slice('/onboarding/'.length)

  // Always a redirect, never a pass-through: the step page 404s on any slug it
  // does not recognise, so letting a retired one through would still be a dead
  // end. Clamped like any other target, so an old URL cannot jump ahead.
  const retired = RETIRED_SLUGS[slug]
  if (retired) {
    const owner = stepBySlug(retired)!
    return owner.n > clampStep(state.step) ? current : `/onboarding/${retired}`
  }

  const step = stepBySlug(slug)

  // An unknown slug is a 404, not a redirect — silently rewriting a typo to the
  // current step would hide a broken link.
  if (!step) return pathname === '/onboarding' ? current : null

  // Going back to a finished step is allowed; jumping forward is not. Step 2
  // says "here's what we read", which is a lie if no CV was uploaded.
  return step.n > clampStep(state.step) ? current : null
}

function clampStep(n: number): number {
  return Math.min(Math.max(Math.trunc(n) || 1, 1), TOTAL_STEPS)
}
