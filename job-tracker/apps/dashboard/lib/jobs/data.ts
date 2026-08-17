/**
 * Placeholder listings for the Jobs screen, and the vocabularies the filters
 * are drawn from.
 *
 * Every listing here is invented. PRD NG2 rules out job discovery, so nothing
 * fetches these and nothing ever will until that changes — the screen exists to
 * settle the UI. What carries that on screen is the detail panel's disabled
 * Apply, Save, Share and Optimise controls and the caption under them; a
 * page-level "sample data" badge was tried and removed. If this corpus is ever
 * shown somewhere those controls are not, it needs its own disclosure — a
 * fabricated job advert is something a reader can act on in a way a fabricated
 * application count is not.
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
export type EmploymentType = 'full-time' | 'contract'
export type SeniorityLevel = 'senior' | 'lead' | 'principal'
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
export const EMPLOYMENT_TYPES = ['full-time', 'contract'] as const
export const SENIORITY_LEVELS = ['senior', 'lead', 'principal'] as const
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
  contract: 'Contract',
}

export const LEVEL_LABEL: Record<SeniorityLevel, string> = {
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
    type: 'contract',
    level: 'principal',
    fn: 'Research',
    industry: 'AI',
    size: 'private',
    source: 'glassdoor',
    skills: ['Python', 'PyTorch', 'Distributed Training', 'Evaluation'],
    department: 'Research',
    hiringManager: 'Director of Research',
    activelyHiring: false,
    tags: ['Contract', 'Hybrid', 'Research'],
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
  {
    id: 'northwind-principal-platform-engineer',
    title: 'Principal Platform Engineer',
    company: 'Northwind Systems',
    verified: true,
    city: 'Austin, TX',
    mode: 'remote',
    mark: 'server',
    match: 88,
    applicants: 88,
    postedHoursAgo: 6,
    salary: { min: 210_000, max: 260_000 },
    marketSalary: { min: 205_000, max: 250_000 },
    type: 'full-time',
    level: 'principal',
    fn: 'Engineering',
    industry: 'Cloud',
    size: 'enterprise',
    source: 'indeed',
    skills: ['Kubernetes', 'Terraform', 'Go', 'Observability'],
    department: 'Platform Engineering',
    hiringManager: 'Director, Platform Engineering',
    activelyHiring: true,
    tags: ['Full-time', 'Remote', 'Cloud'],
    summary:
      'Own the internal platform the whole engineering organisation deploys through, and set the technical direction for how services are built, shipped and observed.',
    responsibilities: [
      'Set the architecture for the deployment platform every product team uses.',
      'Reduce time-to-production for a new service from days to hours.',
      'Define the observability standard and make it the default, not an add-on.',
      'Act as the final technical reviewer on cross-cutting infrastructure changes.',
    ],
    requirements: [
      '10+ years in infrastructure, with time spent as the most senior engineer on a platform.',
      'Deep Kubernetes operational experience, not only cluster setup.',
      'Infrastructure as code at a scale where the code itself needed a review process.',
    ],
    preferred: [
      'Experience migrating a monolith onto a service platform without a freeze.',
      'Public writing or conference talks on platform engineering.',
    ],
    about:
      'Northwind Systems sells cloud infrastructure tooling to regulated industries. Roughly 3,000 people, with engineering split across Austin and Dublin.',
    resumeVersion: 'Resume v4',
    insight:
      'This is the most senior listing in your matches and the range reflects it, but the posted band sits slightly above the market estimate — the bar in interviews will be architecture, not coding.',
  },
  {
    id: 'lumen-senior-data-engineer',
    title: 'Senior Data Engineer',
    company: 'Lumen Analytics',
    verified: true,
    city: 'Chicago, IL',
    mode: 'hybrid',
    mark: 'database',
    match: 85,
    applicants: 31,
    postedHoursAgo: 12,
    salary: { min: 150_000, max: 185_000 },
    marketSalary: { min: 155_000, max: 190_000 },
    type: 'full-time',
    level: 'senior',
    fn: 'Data',
    industry: 'SaaS',
    size: 'private',
    source: 'linkedin',
    skills: ['PostgreSQL', 'Python', 'dbt', 'Airflow'],
    department: 'Data Platform',
    hiringManager: 'Head of Data',
    activelyHiring: true,
    tags: ['Full-time', 'Hybrid', 'SaaS'],
    summary:
      'Build and own the transformation layer that every dashboard and model in the company reads from, and make the numbers in it defensible.',
    responsibilities: [
      'Model the warehouse so a metric has one definition rather than four.',
      'Own the orchestration layer and the alerting when a pipeline is late.',
      'Work with analysts to turn ad-hoc SQL into tested, documented models.',
      'Set the testing standard for data quality and enforce it in review.',
    ],
    requirements: [
      '5+ years in data engineering with production ownership of a warehouse.',
      'Strong SQL and Python, and opinions about where each belongs.',
      'Experience with a transformation framework and a scheduler in production.',
    ],
    preferred: [
      'Experience defining metrics with a finance or revenue team.',
      'Exposure to streaming as well as batch.',
    ],
    about:
      'Lumen Analytics builds reporting tooling for mid-market retailers. Around 250 people, three days a week in the Chicago office.',
    resumeVersion: 'Resume v3',
    insight:
      'The posted range sits just under the market estimate, and dbt and Airflow are the two named tools most often missing from otherwise strong applications here.',
  },
  {
    id: 'vertex-lead-security-engineer',
    title: 'Lead Security Engineer',
    company: 'Vertex Security',
    verified: false,
    city: 'Washington, DC',
    mode: 'onsite',
    mark: 'lock',
    match: 79,
    applicants: 19,
    postedHoursAgo: 30,
    salary: { min: 165_000, max: 200_000 },
    marketSalary: { min: 170_000, max: 205_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Security',
    industry: 'Security',
    size: 'public',
    source: 'glassdoor',
    skills: ['Threat Modelling', 'Incident Response', 'Kubernetes', 'Python'],
    department: 'Product Security',
    hiringManager: 'Director, Product Security',
    activelyHiring: false,
    tags: ['Full-time', 'On-site', 'Security'],
    summary:
      'Lead the product security function: threat model new services before they ship, and own the response when something does not go to plan.',
    responsibilities: [
      'Threat model every new service before it reaches production.',
      'Run incident response, including the write-up nobody enjoys.',
      'Build the security review into the delivery process rather than beside it.',
      'Mentor two engineers moving into security from platform roles.',
    ],
    requirements: [
      '7+ years in security engineering, including time leading a response.',
      'Practical threat modelling on services you did not write.',
      'Enough Kubernetes to argue with a platform team on the details.',
    ],
    preferred: [
      'Experience in a regulated environment with external auditors.',
      'A background in engineering before moving into security.',
    ],
    about:
      'Vertex Security is a listed security vendor serving public sector customers. On-site five days a week, which is a condition of several of their contracts.',
    resumeVersion: 'Resume v2',
    insight:
      'On-site in DC and not currently marked as actively hiring, so this one is likely to move slowly — worth applying only if the location genuinely works.',
  },
  {
    id: 'orbit-senior-ml-engineer',
    title: 'Senior Machine Learning Engineer',
    company: 'Orbit Labs',
    verified: true,
    city: 'Remote, US',
    mode: 'remote',
    mark: 'brain',
    match: 91,
    applicants: 142,
    postedHoursAgo: 4,
    salary: { min: 190_000, max: 240_000 },
    marketSalary: { min: 195_000, max: 235_000 },
    type: 'full-time',
    level: 'senior',
    fn: 'Research',
    industry: 'AI',
    size: 'startup',
    source: 'wellfound',
    skills: ['Python', 'PyTorch', 'Distributed Training', 'Evaluation'],
    department: 'Applied Research',
    hiringManager: 'Head of Applied Research',
    activelyHiring: true,
    tags: ['Full-time', 'Remote', 'AI'],
    summary:
      'Take research models to production: own training infrastructure, evaluation harnesses, and the judgement about when a model is actually better.',
    responsibilities: [
      'Own the training pipeline for the primary model family.',
      'Build evaluation harnesses that catch a regression before a customer does.',
      'Reduce training cost per run without giving up quality.',
      'Publish internal write-ups so a result is reproducible by someone else.',
    ],
    requirements: [
      '5+ years in machine learning engineering with models you shipped, not only trained.',
      'Distributed training experience across more than one node.',
      'Rigour about evaluation, including where a benchmark is misleading.',
    ],
    preferred: [
      'Experience with inference cost optimisation at production traffic.',
      'Published work, or open-source contributions to a training stack.',
    ],
    about:
      'Orbit Labs is a 60-person AI startup working on retrieval and ranking. Fully remote across US time zones, Series B.',
    resumeVersion: 'Resume v4',
    insight:
      '142 applicants makes this the most contested listing in your matches, and your evaluation experience is the part of your CV that separates you here — lead with it.',
  },
  {
    id: 'ledgerline-lead-frontend-engineer',
    title: 'Lead Frontend Engineer',
    company: 'Ledgerline',
    verified: true,
    city: 'New York, NY',
    mode: 'hybrid',
    mark: 'wallet',
    match: 87,
    applicants: 57,
    postedHoursAgo: 20,
    salary: { min: 175_000, max: 210_000 },
    marketSalary: { min: 170_000, max: 205_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Engineering',
    industry: 'Fintech',
    size: 'private',
    source: 'linkedin',
    skills: ['React', 'TypeScript', 'Accessibility', 'Design Systems'],
    department: 'Client Platform',
    hiringManager: 'Engineering Manager, Client Platform',
    activelyHiring: true,
    tags: ['Full-time', 'Hybrid', 'Fintech'],
    summary:
      'Lead the frontend for a trading interface where latency and correctness are both visible to the user, and where an accessibility failure is a compliance problem.',
    responsibilities: [
      'Set the frontend architecture for the client-facing trading surface.',
      'Own the component library shared across three product teams.',
      'Hold the accessibility standard at WCAG 2.2 AA, with audits to prove it.',
      'Lead a team of four engineers, including their technical growth.',
    ],
    requirements: [
      '7+ years building production frontends, with at least one as a lead.',
      'Deep React and TypeScript, including performance work under real load.',
      'Accessibility experience that goes past an automated checker.',
    ],
    preferred: [
      'Financial or trading interface experience.',
      'Experience running a design system as a product with internal customers.',
    ],
    about:
      'Ledgerline builds execution software for asset managers. About 500 people, two days a week in the Manhattan office.',
    resumeVersion: 'Resume v4',
    insight:
      'The strongest overall fit in your matches: every one of the four named skills is already on your CV, and the posted range sits above the market estimate.',
  },
  {
    id: 'harborstone-principal-product-designer',
    title: 'Principal Product Designer',
    company: 'Harborstone',
    verified: false,
    city: 'Boston, MA',
    mode: 'onsite',
    mark: 'anchor',
    match: 82,
    applicants: 8,
    postedHoursAgo: 72,
    salary: { min: 180_000, max: 215_000 },
    marketSalary: { min: 175_000, max: 210_000 },
    type: 'full-time',
    level: 'principal',
    fn: 'Design',
    industry: 'Fintech',
    size: 'enterprise',
    source: 'indeed',
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
    department: 'Design',
    hiringManager: 'VP, Design',
    activelyHiring: true,
    tags: ['Full-time', 'On-site', 'Fintech'],
    summary:
      'The most senior individual contributor in a design team of thirty, setting craft standards across four product lines without taking on management.',
    responsibilities: [
      'Set the design direction for the retail banking product line.',
      'Raise the craft bar through critique rather than through org changes.',
      'Own the design system strategy across four product lines.',
      'Partner with research to decide which questions are worth answering.',
    ],
    requirements: [
      '10+ years in product design, including principal or staff level.',
      'A portfolio showing systems work as well as individual screens.',
      'Evidence of influencing designers you did not manage.',
    ],
    preferred: [
      'Regulated financial product experience.',
      'Experience in a design team large enough to need explicit standards.',
    ],
    about:
      'Harborstone is a retail bank with an in-house product organisation of around 1,200. Five days a week on-site in Boston.',
    resumeVersion: 'Resume v3',
    insight:
      'Only 8 applicants, which is unusually low for a principal design role — the on-site requirement is almost certainly why, so the competition here is genuinely light if that suits you.',
  },
  {
    id: 'quanta-senior-research-scientist',
    title: 'Senior Research Scientist',
    company: 'Quanta Research',
    verified: true,
    city: 'Remote, EU',
    mode: 'remote',
    mark: 'atom',
    match: 76,
    applicants: 175,
    postedHoursAgo: 8,
    salary: { min: 160_000, max: 195_000 },
    marketSalary: { min: 165_000, max: 200_000 },
    type: 'contract',
    level: 'senior',
    fn: 'Research',
    industry: 'AI',
    size: 'startup',
    source: 'wellfound',
    skills: ['Python', 'Evaluation', 'Statistics', 'Experiment Design'],
    department: 'Research',
    hiringManager: 'Research Lead',
    activelyHiring: true,
    tags: ['Contract', 'Remote', 'AI'],
    summary:
      'A twelve-month research contract on measurement: design the experiments that decide whether a modelling change is real, and report the ones that are not.',
    responsibilities: [
      'Design experiments whose results survive someone trying to break them.',
      'Own the statistical standard for what counts as an improvement.',
      'Report negative results as clearly as positive ones.',
      'Translate research findings into recommendations engineering can act on.',
    ],
    requirements: [
      'A research background with published experimental work.',
      'Strong applied statistics, including power and multiple comparisons.',
      'Python for analysis, and the discipline to make it reproducible.',
    ],
    preferred: [
      'Experience with human evaluation as well as automatic metrics.',
      'A track record of publishing results that contradicted expectations.',
    ],
    about:
      'Quanta Research is a 40-person research group working on evaluation methodology, funded by a mix of grants and commercial contracts.',
    resumeVersion: 'Resume v2',
    insight:
      'A contract rather than a permanent role, and 175 applicants — the highest count here. Statistics and Experiment Design are the two requirements your CV does not currently evidence.',
  },
  {
    id: 'meridian-lead-data-scientist',
    title: 'Lead Data Scientist',
    company: 'Meridian',
    verified: true,
    city: 'Toronto, ON',
    mode: 'hybrid',
    mark: 'chart',
    match: 81,
    applicants: 64,
    postedHoursAgo: 48,
    salary: { min: 170_000, max: 205_000 },
    marketSalary: { min: 165_000, max: 195_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Data',
    industry: 'Fintech',
    size: 'public',
    source: 'glassdoor',
    skills: ['Python', 'PostgreSQL', 'Statistics', 'Data Visualisation'],
    department: 'Risk Analytics',
    hiringManager: 'Director, Risk Analytics',
    activelyHiring: true,
    tags: ['Full-time', 'Hybrid', 'Fintech'],
    summary:
      'Lead the analytics function inside risk: build the models that decide credit exposure, and be able to explain every one of them to a regulator.',
    responsibilities: [
      'Own the credit risk models end to end, including their documentation.',
      'Lead a team of three analysts and set their technical standards.',
      'Present model behaviour to non-technical stakeholders and to auditors.',
      'Decide when a simpler model is the correct answer.',
    ],
    requirements: [
      '7+ years in data science with production models you still own.',
      'Strong statistics, and the ability to defend a method under scrutiny.',
      'Experience communicating model risk to a non-technical audience.',
    ],
    preferred: [
      'Credit or fraud modelling experience.',
      'Experience in a regulated environment with model governance.',
    ],
    about:
      'Meridian is a listed financial services group. The analytics team is about 40 people, hybrid with two days in the Toronto office.',
    resumeVersion: 'Resume v3',
    insight:
      'The posted range sits above the market estimate, which is unusual — the trade-off is a governance-heavy environment where documentation is a large part of the work.',
  },
  {
    id: 'skyforge-senior-site-reliability-engineer',
    title: 'Senior Site Reliability Engineer',
    company: 'Skyforge',
    verified: false,
    city: 'Remote, US',
    mode: 'remote',
    mark: 'cloud',
    match: 84,
    applicants: 22,
    postedHoursAgo: 5,
    salary: { min: 165_000, max: 200_000 },
    marketSalary: { min: 170_000, max: 205_000 },
    type: 'full-time',
    level: 'senior',
    fn: 'Engineering',
    industry: 'Cloud',
    size: 'startup',
    source: 'wellfound',
    skills: ['Kubernetes', 'Terraform', 'Observability', 'Incident Response'],
    department: 'Infrastructure',
    hiringManager: 'Head of Infrastructure',
    activelyHiring: true,
    tags: ['Full-time', 'Remote', 'Cloud'],
    summary:
      'First dedicated SRE hire: define what reliability means here, then build the tooling and the on-call practice to hold it.',
    responsibilities: [
      'Define the SLOs, and get engineering to agree they are the right ones.',
      'Build out observability from partial coverage to something trustworthy.',
      'Establish an on-call rotation that people can sustain.',
      'Run blameless post-incident reviews and close the actions from them.',
    ],
    requirements: [
      '5+ years in SRE or infrastructure with production on-call ownership.',
      'Kubernetes and Terraform in anger, including the failures.',
      'Experience introducing a practice rather than joining an existing one.',
    ],
    preferred: [
      'Experience as an early infrastructure hire at a startup.',
      'Cost optimisation work alongside reliability work.',
    ],
    about:
      'Skyforge is an 80-person Series A company selling developer infrastructure. Fully remote, unverified listing.',
    resumeVersion: 'Resume v4',
    insight:
      'Low competition at 22 applicants and a strong skills overlap, but note this is the first SRE hire — the role is as much about establishing practice as running systems.',
  },
  {
    id: 'brightpath-lead-ux-researcher',
    title: 'Lead UX Researcher',
    company: 'Brightpath',
    verified: true,
    city: 'Seattle, WA',
    mode: 'hybrid',
    mark: 'compass',
    match: 73,
    applicants: 15,
    postedHoursAgo: 96,
    salary: { min: 145_000, max: 175_000 },
    marketSalary: { min: 150_000, max: 180_000 },
    type: 'contract',
    level: 'lead',
    fn: 'Research',
    industry: 'SaaS',
    size: 'private',
    source: 'indeed',
    skills: ['User Research', 'Prototyping', 'Accessibility'],
    department: 'Product Research',
    hiringManager: 'Head of Product Research',
    activelyHiring: true,
    tags: ['Contract', 'Hybrid', 'SaaS'],
    summary:
      'A nine-month contract leading research for a product being rebuilt: decide what the team needs to learn before it commits, and make sure the answers land.',
    responsibilities: [
      'Set the research plan for a ground-up product rebuild.',
      'Run generative and evaluative studies, including accessibility testing.',
      'Turn findings into decisions rather than into a report nobody reads.',
      'Coach two product designers running their own lightweight studies.',
    ],
    requirements: [
      '6+ years in UX research, including leading a research function.',
      'Both generative and evaluative methods, and clarity on when each applies.',
      'Experience testing with assistive technology users.',
    ],
    preferred: [
      'Experience on a rebuild or migration where research shaped scope.',
      'Quantitative survey design alongside qualitative work.',
    ],
    about:
      'Brightpath builds scheduling software for healthcare providers. Around 300 people, hybrid in Seattle.',
    resumeVersion: 'Resume v2',
    insight:
      'The weakest match here and a contract role, but the lowest applicant count of any research listing — and your accessibility work is directly relevant to the assistive technology requirement.',
  },
  {
    id: 'ironvault-principal-security-architect',
    title: 'Principal Security Architect',
    company: 'Ironvault',
    verified: true,
    city: 'Remote, US',
    mode: 'remote',
    mark: 'shield',
    match: 78,
    applicants: 110,
    postedHoursAgo: 36,
    salary: { min: 200_000, max: 245_000 },
    marketSalary: { min: 195_000, max: 240_000 },
    type: 'full-time',
    level: 'principal',
    fn: 'Security',
    industry: 'Security',
    size: 'enterprise',
    source: 'linkedin',
    skills: ['Threat Modelling', 'Incident Response', 'Terraform', 'Kubernetes'],
    department: 'Security Architecture',
    hiringManager: 'Chief Information Security Officer',
    activelyHiring: true,
    tags: ['Full-time', 'Remote', 'Security'],
    summary:
      'Set the security architecture for a platform handling other companies’ secrets, where the threat model is the product and not a document about it.',
    responsibilities: [
      'Own the security architecture across every product surface.',
      'Lead threat modelling for new architecture before it is committed to.',
      'Represent security decisions to enterprise customers and their auditors.',
      'Set the standard for how infrastructure changes are security reviewed.',
    ],
    requirements: [
      '10+ years in security, several at architect level.',
      'Threat modelling on distributed systems you are accountable for.',
      'Infrastructure as code fluency, since the review happens in the code.',
    ],
    preferred: [
      'Experience at a company whose product is itself a security control.',
      'Involvement in an external audit or certification process.',
    ],
    about:
      'Ironvault provides secrets management to large enterprises. Around 2,000 people, remote-first with security reporting to the CISO.',
    resumeVersion: 'Resume v3',
    insight:
      'The highest posted range in your matches, and above the market estimate — but 110 applicants for a principal role means the screen will be strict about architecture depth.',
  },
  {
    id: 'novacore-senior-cloud-architect',
    title: 'Senior Cloud Architect',
    company: 'Novacore',
    verified: false,
    city: 'Denver, CO',
    mode: 'onsite',
    mark: 'server',
    match: 80,
    applicants: 45,
    postedHoursAgo: 60,
    salary: { min: 170_000, max: 205_000 },
    marketSalary: { min: 175_000, max: 210_000 },
    type: 'full-time',
    level: 'senior',
    fn: 'Engineering',
    industry: 'Cloud',
    size: 'public',
    source: 'glassdoor',
    skills: ['Kubernetes', 'Terraform', 'PostgreSQL', 'Go'],
    department: 'Cloud Engineering',
    hiringManager: 'Engineering Manager, Cloud',
    activelyHiring: false,
    tags: ['Full-time', 'On-site', 'Cloud'],
    summary:
      'Design the cloud architecture for a migration off two data centres, with a hard deadline set by a lease that is not being renewed.',
    responsibilities: [
      'Design the target architecture for the data centre migration.',
      'Sequence the migration so no single step is irreversible.',
      'Own the data layer plan, including the cutover for the primary database.',
      'Write the runbooks the on-call team will use afterwards.',
    ],
    requirements: [
      '6+ years in cloud infrastructure, including a completed migration.',
      'Kubernetes and Terraform, plus enough Go to read the operators.',
      'Database migration experience with a real cutover window.',
    ],
    preferred: [
      'Experience with a deadline driven by something outside engineering.',
      'Exposure to cost modelling for a migration business case.',
    ],
    about:
      'Novacore is a listed infrastructure provider of around 5,000 people. This team is on-site in Denver five days a week.',
    resumeVersion: 'Resume v3',
    insight:
      'Not currently marked as actively hiring and on-site in Denver, so treat the timeline as uncertain — but a completed migration on your CV would be the single strongest signal for this one.',
  },
  {
    id: 'palisade-lead-design-technologist',
    title: 'Lead Design Technologist',
    company: 'Palisade',
    verified: true,
    city: 'Remote, US',
    mode: 'remote',
    mark: 'layers',
    match: 93,
    applicants: 38,
    postedHoursAgo: 16,
    salary: { min: 170_000, max: 205_000 },
    marketSalary: { min: 165_000, max: 195_000 },
    type: 'full-time',
    level: 'lead',
    fn: 'Design',
    industry: 'SaaS',
    size: 'startup',
    source: 'wellfound',
    skills: ['Design Systems', 'React', 'TypeScript', 'Accessibility', 'Figma'],
    department: 'Design Engineering',
    hiringManager: 'Head of Design Engineering',
    activelyHiring: true,
    tags: ['Full-time', 'Remote', 'SaaS'],
    summary:
      'Sit between design and engineering and own the design system as real code: the Figma library and the React components are one system with one source of truth.',
    responsibilities: [
      'Own the design system in both Figma and code, and keep them in step.',
      'Build the components product teams assemble interfaces from.',
      'Make accessibility a property of the components rather than a review step.',
      'Prototype in code when a Figma file cannot answer the question.',
    ],
    requirements: [
      '6+ years spanning design and frontend engineering.',
      'A design system you owned in production, with real internal customers.',
      'React and TypeScript to a professional standard, plus Figma fluency.',
    ],
    preferred: [
      'Experience versioning and releasing a component library.',
      'Accessibility testing with assistive technology.',
    ],
    about:
      'Palisade is a 90-person Series B company building analytics tooling. Fully remote, with design engineering as its own function.',
    resumeVersion: 'Resume v4',
    insight:
      'The highest match in your list at 93%, and the only listing naming all five of the skills you already have — the posted range also sits above the market estimate.',
  },
  {
    id: 'clearwater-principal-data-architect',
    title: 'Principal Data Architect',
    company: 'Clearwater',
    verified: true,
    city: 'Atlanta, GA',
    mode: 'hybrid',
    mark: 'database',
    match: 77,
    applicants: 160,
    postedHoursAgo: 120,
    salary: { min: 195_000, max: 235_000 },
    marketSalary: { min: 200_000, max: 245_000 },
    type: 'full-time',
    level: 'principal',
    fn: 'Data',
    industry: 'Cloud',
    size: 'enterprise',
    source: 'indeed',
    skills: ['PostgreSQL', 'Airflow', 'dbt', 'Python'],
    department: 'Data Architecture',
    hiringManager: 'VP, Data',
    activelyHiring: true,
    tags: ['Full-time', 'Hybrid', 'Cloud'],
    summary:
      'Set the data architecture for a company whose analytics grew organically into eleven warehouses, and consolidate it without stopping the reporting anyone depends on.',
    responsibilities: [
      'Define the target data architecture and the path to it from eleven warehouses.',
      'Set modelling standards that survive contact with a dozen teams.',
      'Own the governance model, including ownership and retention.',
      'Review the consolidation work rather than doing all of it yourself.',
    ],
    requirements: [
      '10+ years in data engineering or architecture, including at principal level.',
      'A consolidation or migration of production analytics you led.',
      'Deep PostgreSQL, plus a transformation framework and a scheduler.',
    ],
    preferred: [
      'Experience with data governance under a regulatory requirement.',
      'Cost work: reducing warehouse spend without losing coverage.',
    ],
    about:
      'Clearwater is a cloud services company of roughly 4,000 people. Hybrid, two days a week in Atlanta.',
    resumeVersion: 'Resume v2',
    insight:
      'The oldest listing here at five days, with 160 applicants and a posted range below the market estimate — the least favourable combination of the three in your matches.',
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
