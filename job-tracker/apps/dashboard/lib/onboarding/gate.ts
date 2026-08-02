import { slugForStep, stepBySlug, TOTAL_STEPS } from './steps'

export type OnboardingState = {
  /** `profiles.onboarding_complete` */
  complete: boolean
  /** `profiles.onboarding_step`, 1-6 */
  step: number
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
  const step = stepBySlug(slug)

  // An unknown slug is a 404, not a redirect — silently rewriting a typo to the
  // current step would hide a broken link.
  if (!step) return pathname === '/onboarding' ? current : null

  // Going back to a finished step is allowed; jumping forward is not. Step 3
  // says "we pulled these from your CV", which is a lie if no CV was uploaded.
  return step.n > clampStep(state.step) ? current : null
}

function clampStep(n: number): number {
  return Math.min(Math.max(Math.trunc(n) || 1, 1), TOTAL_STEPS)
}
