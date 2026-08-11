/**
 * Placeholder listings for the Jobs screen, and the vocabularies the filters
 * are drawn from.
 *
 * Every listing here is invented. PRD NG2 rules out job discovery, so nothing
 * fetches these and nothing ever will until that changes — the screen exists to
 * settle the UI. `SampleBadge` says so on the page, because a fabricated job ad
 * is a thing a reader could act on in a way a fabricated application count is
 * not.
 *
 * Lives in lib/ rather than beside the components because this workspace's
 * vitest is node-only and scoped to lib/**: anything here can be tested and
 * anything in components/ cannot. That is also why `mark` names an icon as a
 * string rather than holding a component — this is a .ts file with no JSX.
 *
 * Salary is stored ONCE, yearly. Monthly and hourly are computed in salary.ts.
 * The reference prints a Yearly|Monthly|Hourly toggle above six cards that all
 * say "/ yr", and a drawer whose posted range disagrees with its own card.
 * One source is what stops both.
 *
 * `postedHoursAgo` is a duration, not a date, so the mock does not rot into
 * "posted 7 months ago" the week after it is written.
 */

export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type EmploymentType = 'full-time' | 'part-time' | 'contract'
export type SeniorityLevel = 'mid' | 'senior' | 'lead' | 'principal'
export type CompanySize = 'startup' | 'private' | 'public' | 'enterprise'
export type JobSource = 'linkedin' | 'indeed' | 'glassdoor' | 'wellfound'

export type SalaryRange = { readonly min: number; readonly max: number }

export type Job = {
  readonly id: string
  readonly title: string
  readonly company: string
  readonly verified: boolean
  readonly city: string
  readonly mode: WorkMode
  /** A key into the icon map in components/jobs/primitives.tsx. A string, not a
   *  component: no JSX in lib/. Same reason CAREER_GOALS names its icon. */
  readonly mark: string
  readonly match: number
  readonly applicants: number
  readonly postedHoursAgo: number
  /** Yearly, and the only salary stored. */
  readonly salary: SalaryRange
  /** What the market pays, which is a different quantity from what this ad
   *  offers — the drawer shows both side by side. */
  readonly marketSalary: SalaryRange
  readonly type: EmploymentType
  readonly level: SeniorityLevel
  readonly fn: string
  readonly industry: string
  readonly size: CompanySize
  readonly source: JobSource
  readonly skills: readonly string[]
  readonly department: string
  /** A role, not a person. An invented name in a mock is fabricated data a
   *  reader could take for real. */
  readonly hiringManager: string
  readonly activelyHiring: boolean
  readonly tags: readonly string[]
  readonly summary: string
  readonly responsibilities: readonly string[]
  readonly requirements: readonly string[]
  readonly preferred: readonly string[]
  readonly about: string
  readonly resumeVersion: string
  readonly insight: string
}

export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const
export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'] as const
export const SENIORITY_LEVELS = ['mid', 'senior', 'lead', 'principal'] as const
export const COMPANY_SIZES = ['startup', 'private', 'public', 'enterprise'] as const
export const JOB_SOURCES = ['linkedin', 'indeed', 'glassdoor', 'wellfound'] as const
export const JOB_FUNCTIONS = ['Design', 'Engineering', 'Data', 'Research', 'Security'] as const
export const INDUSTRIES = ['SaaS', 'Fintech', 'AI', 'Cloud', 'Security'] as const

/** Hours, so it compares directly against `postedHoursAgo` with no clock. */
export const POSTED_WINDOWS = [
  { hours: 24, label: '24 hours' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
] as const

export const MODE_LABEL: Record<WorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

export const TYPE_LABEL: Record<EmploymentType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
}

export const LEVEL_LABEL: Record<SeniorityLevel, string> = {
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
}

export const SIZE_LABEL: Record<CompanySize, string> = {
  startup: 'Startup',
  private: 'Private',
  public: 'Public',
  enterprise: 'Enterprise',
}

export const SOURCE_LABEL: Record<JobSource, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  glassdoor: 'Glassdoor',
  wellfound: 'Wellfound',
}

export const JOBS: readonly Job[] = [
  {
    id: 'acme-senior-product-designer',
    title: 'Senior Product Designer',
    company: 'Acme Corp',
    verified: true,
    city: 'San Francisco, CA',
    mode: 'remote',
    mark: 'layers',
    match: 94,
    applicants: 24,
    postedHoursAgo: 2,
    salary: { min: 140_000, max: 180_000 },
    marketSalary: { min: 170_000, max: 190_000 },
    type: 'full-time',
    level: 'senior',
    fn: 'Design',
    industry: 'SaaS',
    size: 'private',
    source: 'linkedin',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
    department: 'Product Design',
    hiringManager: 'VP, Product Design',
    activelyHiring: true,
    tags: ['Full-time', 'Remote friendly', 'SaaS'],
    summary:
      'Lead the design strategy for the core platform, working with product managers and engineers to turn complex workflows into elegant, user-centric solutions.',
    responsibilities: [
      'Lead end-to-end design from discovery through high-fidelity handoff.',
      'Maintain and evolve the design system so products stay consistent.',
      'Run user research and usability testing to validate design decisions.',
      'Mentor junior designers and contribute to the design culture.',
    ],
    requirements: [
      '5+ years designing software products, at least two of them at senior level.',
      'A portfolio that shows the reasoning, not only the screens.',
      'Fluency in Figma and in maintaining a shared component library.',
    ],
    preferred: [
      'Experience in a high-growth B2B SaaS environment.',
      'Comfort reading product analytics and turning them into design questions.',
    ],
    about:
      'Acme Corp builds workflow software for operations teams. Around 400 people, remote-first, with design reporting into product.',
    resumeVersion: 'Resume v4',
    insight:
      'Your systems work maps closely onto this team, and the posted range sits below the market estimate — there is room to negotiate at the top of the band.',
  },
  {
    id: 'globalpay-lead-ui-ux-designer',
    title: 'Lead UI/UX Designer',
    company: 'GlobalPay',
    verified: true,
    city: 'New York, NY',
    mode: 'hybrid',
    mark: 'wallet',
    match: 88,
    applicants: 42,
    postedHoursAgo: 20,
    salary: { min: 160_000, max: 200_000 },
    marketSalary: { min: 165_000, max: 195_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Design',
    industry: 'Fintech',
    size: 'public',
    source: 'linkedin',
    skills: ['Figma', 'Design Systems', 'Accessibility', 'Prototyping'],
    department: 'Design',
    hiringManager: 'Director of Design',
    activelyHiring: true,
    tags: ['Full-time', 'Hybrid', 'Fintech'],
    summary:
      'Own the interface language for a payments platform used in nineteen markets, and set the accessibility bar the rest of the product builds against.',
    responsibilities: [
      'Define and document the interface language across web and mobile.',
      'Partner with engineering on a shared component library.',
      'Hold the accessibility standard for every shipped surface.',
    ],
    requirements: [
      '7+ years in product design, including a lead or principal role.',
      'Demonstrable work on regulated or high-trust products.',
      'Working knowledge of WCAG 2.2 AA and how to test against it.',
    ],
    preferred: ['Payments or banking experience.', 'Experience mentoring a small design team.'],
    about:
      'GlobalPay processes cross-border payments for mid-market businesses. Publicly listed, roughly 2,000 people, design centralised in New York.',
    resumeVersion: 'Resume v4',
    insight:
      'This posting pays above the market estimate at the top of its range, which is unusual — treat the listed maximum as real rather than aspirational.',
  },
  {
    id: 'techflow-lead-frontend-engineer',
    title: 'Lead Frontend Engineer',
    company: 'TechFlow',
    verified: true,
    city: 'Austin, TX',
    mode: 'remote',
    mark: 'waves',
    match: 82,
    applicants: 12,
    postedHoursAgo: 5,
    salary: { min: 150_000, max: 195_000 },
    marketSalary: { min: 155_000, max: 200_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Engineering',
    industry: 'SaaS',
    size: 'startup',
    source: 'wellfound',
    skills: ['React', 'TypeScript', 'Accessibility', 'Design Systems'],
    department: 'Platform',
    hiringManager: 'Head of Engineering',
    activelyHiring: true,
    tags: ['Full-time', 'Remote friendly', 'Series B'],
    summary:
      'Set the frontend direction for a small platform team: architecture, performance budgets, and the component library everything else is built from.',
    responsibilities: [
      'Own frontend architecture and the performance budget.',
      'Build and maintain the shared component library.',
      'Review design work early enough to change it cheaply.',
    ],
    requirements: [
      '6+ years building production React, with TypeScript throughout.',
      'Experience owning a design system rather than only consuming one.',
    ],
    preferred: ['Server-rendering experience beyond a framework default.', 'Open-source work.'],
    about:
      'TechFlow is a Series B workflow-automation startup, about 90 people, fully remote across US time zones.',
    resumeVersion: 'Resume v4',
    insight:
      'Twelve applicants on a five-hour-old posting is the least contested listing in this set — applying early is worth more here than polish.',
  },
  {
    id: 'nexus-ai-research-scientist',
    title: 'AI Research Scientist',
    company: 'Nexus AI',
    verified: true,
    city: 'Seattle, WA',
    mode: 'hybrid',
    mark: 'brain',
    match: 76,
    applicants: 156,
    postedHoursAgo: 96,
    salary: { min: 180_000, max: 240_000 },
    marketSalary: { min: 190_000, max: 250_000 },
    type: 'full-time',
    level: 'principal',
    fn: 'Research',
    industry: 'AI',
    size: 'private',
    source: 'glassdoor',
    skills: ['Python', 'PyTorch', 'Distributed Training', 'Evaluation'],
    department: 'Research',
    hiringManager: 'Director of Research',
    activelyHiring: false,
    tags: ['Full-time', 'Hybrid', 'Research'],
    summary:
      'Run original research on evaluation and alignment for production language models, and publish what generalises.',
    responsibilities: [
      'Design and run experiments on model evaluation.',
      'Publish findings and land them in the production stack.',
      'Mentor research engineers on experimental design.',
    ],
    requirements: [
      'PhD in a relevant field, or equivalent published work.',
      'Track record training or evaluating large models.',
    ],
    preferred: ['First-author publications at a major venue.', 'Open-source evaluation tooling.'],
    about:
      'Nexus AI is an applied research lab of about 250 people building evaluation infrastructure for language models.',
    resumeVersion: 'Resume v4',
    insight:
      '156 applicants over four days puts this in the top band for competition. A tailored resume matters more here than anywhere else in this list.',
  },
  {
    id: 'cloudscale-data-systems-architect',
    title: 'Data Systems Architect',
    company: 'CloudScale',
    verified: true,
    city: 'Denver, CO',
    mode: 'remote',
    mark: 'cloud',
    match: 79,
    applicants: 186,
    postedHoursAgo: 168,
    salary: { min: 170_000, max: 210_000 },
    marketSalary: { min: 175_000, max: 215_000 },
    type: 'full-time',
    level: 'principal',
    fn: 'Data',
    industry: 'Cloud',
    size: 'enterprise',
    source: 'indeed',
    skills: ['PostgreSQL', 'Kubernetes', 'Terraform', 'Python'],
    department: 'Data Platform',
    hiringManager: 'Principal Architect',
    activelyHiring: false,
    tags: ['Full-time', 'Remote friendly', 'Cloud'],
    summary:
      'Design the storage and streaming layer underneath a multi-region cloud product, and decide what runs where.',
    responsibilities: [
      'Own the data architecture across regions.',
      'Set the standards other teams build their pipelines against.',
      'Lead capacity and cost planning for storage.',
    ],
    requirements: [
      '8+ years in data infrastructure, including multi-region systems.',
      'Deep PostgreSQL, and comfort with infrastructure as code.',
    ],
    preferred: ['Experience migrating a monolith to regional isolation.'],
    about:
      'CloudScale runs managed infrastructure for enterprise customers. Around 5,000 people across four regions.',
    resumeVersion: 'Resume v4',
    insight:
      'A week old with 186 applicants. The Kubernetes and Terraform overlap is your strongest evidence here — lead with it rather than with breadth.',
  },
  {
    id: 'securenet-cybersecurity-lead',
    title: 'Cybersecurity Lead',
    company: 'SecureNet',
    verified: true,
    city: 'Boston, MA',
    mode: 'onsite',
    mark: 'shield',
    match: 85,
    applicants: 67,
    postedHoursAgo: 48,
    salary: { min: 165_000, max: 205_000 },
    marketSalary: { min: 160_000, max: 200_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Security',
    industry: 'Security',
    size: 'private',
    source: 'linkedin',
    skills: ['Threat Modelling', 'Incident Response', 'Python', 'Kubernetes'],
    department: 'Security Engineering',
    hiringManager: 'CISO',
    activelyHiring: true,
    tags: ['Full-time', 'On-site', 'Security'],
    summary:
      'Lead the security engineering function: threat modelling, incident response, and the controls that keep an enterprise customer base auditable.',
    responsibilities: [
      'Own threat modelling across the product surface.',
      'Run incident response and the post-incident review that follows it.',
      'Take the security half of enterprise procurement reviews.',
    ],
    requirements: [
      '6+ years in security engineering, including incident command.',
      'Hands-on with container and cloud security controls.',
    ],
    preferred: ['SOC 2 or ISO 27001 audit experience.'],
    about:
      'SecureNet builds detection tooling for regulated industries. About 600 people, security team on-site in Boston.',
    resumeVersion: 'Resume v4',
    insight:
      'The only on-site listing here, which is why 67 applicants reads as moderate rather than high for a lead role at this range.',
  },
]

/**
 * The skills the sidebar offers, derived rather than typed.
 *
 * A hand-written facet list drifts from the corpus the first time a listing is
 * edited, and a facet nothing matches is a filter that can only empty the list.
 * Sorted so the sidebar order is stable across edits.
 */
export const SKILL_FACETS: readonly string[] = [
  ...new Set(JOBS.flatMap((j) => j.skills)),
].sort((a, b) => a.localeCompare(b))

/** The reference's "Trending:" row. Real queries against this corpus, so every
 *  one of them returns something. */
export const TRENDING = ['Design Systems', 'React', 'Python'] as const

export function jobById(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id)
}
