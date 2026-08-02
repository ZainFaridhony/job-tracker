export const STEPS = [
  { slug: 'resume', n: 1, title: 'Upload your resume', sub: 'We read it once to fill in the rest.' },
  { slug: 'goals', n: 2, title: "What's your career goal?", sub: 'This shapes what we look for.' },
  { slug: 'roles', n: 3, title: 'What roles interest you?', sub: 'We pulled these from your CV.' },
  { slug: 'skills', n: 4, title: "Let's build your AI profile", sub: 'Correct anything we misread.' },
  { slug: 'work', n: 5, title: 'Tell us your ideal workplace', sub: 'Location and compensation.' },
  { slug: 'done', n: 6, title: 'Your workspace is ready', sub: 'Here is what we understood.' },
] as const

export type StepSlug = (typeof STEPS)[number]['slug']
export const TOTAL_STEPS = STEPS.length

export function stepBySlug(slug: string) {
  return STEPS.find((s) => s.slug === slug)
}

export function stepByNumber(n: number) {
  return STEPS.find((s) => s.n === n)
}

/** The slug a user sitting on `n` belongs on. Clamps, so nobody skips ahead. */
export function slugForStep(n: number): StepSlug {
  const clamped = Math.min(Math.max(n, 1), TOTAL_STEPS)
  return stepByNumber(clamped)!.slug
}

export const CAREER_GOALS = [
  { value: 'first-job', label: 'Land my first role' },
  { value: 'switch-company', label: 'Move to a better company' },
  { value: 'switch-field', label: 'Change field or specialism' },
  { value: 'level-up', label: 'Step up to a senior level' },
] as const

export const WORK_LOCATIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
] as const

export const SALARY_PERIODS = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
] as const
