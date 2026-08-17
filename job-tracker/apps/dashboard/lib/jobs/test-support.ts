import type { Job } from './data'

/**
 * A `Job` factory for tests, so a test that cares about two fields states two
 * fields.
 *
 * Not named `*.test.ts`, so vitest treats it as a helper rather than a suite.
 * Nothing in the app imports it.
 *
 * It exists because `facets.ts` and `skills.ts` were first tested against `JOBS`
 * itself, which made every assertion a fact about the corpus: "Design Systems is
 * on 3 listings", "there are 16 skills". Both are true today and both break the
 * moment a listing is added — the tests would fail on a change that could not
 * possibly have broken the logic, which trains you to edit the assertion instead
 * of reading it. Both functions already take `jobs` as a parameter, so injecting
 * a fixture costs nothing and the tests state intent instead.
 *
 * `data.test.ts` still runs against the real `JOBS`, because its subject IS the
 * corpus — that is the one place a fact about the listings belongs.
 */
export function makeJob(overrides: Partial<Job> & { id: string }): Job {
  return {
    title: 'Senior Engineer',
    company: 'Example',
    verified: false,
    city: 'Remote',
    mode: 'remote',
    mark: 'layers',
    match: 80,
    applicants: 10,
    postedHoursAgo: 24,
    salary: { min: 100_000, max: 140_000 },
    marketSalary: { min: 110_000, max: 150_000 },
    type: 'full-time',
    level: 'senior',
    fn: 'Engineering',
    industry: 'SaaS',
    size: 'startup',
    source: 'linkedin',
    skills: [],
    department: 'Engineering',
    hiringManager: 'Engineering Manager',
    activelyHiring: true,
    tags: [],
    summary: 'A summary.',
    responsibilities: ['Ship things.'],
    requirements: ['Experience.'],
    preferred: ['More experience.'],
    about: 'About the company.',
    resumeVersion: 'v1',
    insight: 'An insight.',
    ...overrides,
  }
}
