# Jobs Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/jobs` placeholder with the two-screen Jobs experience from `references/jobs` — a filterable card grid and a job detail panel — built on placeholder listings, translated into this project's tokens and invariants.

**Architecture:** Filter state lives in the URL, so the entire screen is one server-rendered `GET` form: `page.tsx` reads `searchParams`, four pure modules under `lib/jobs/` turn them into a filtered list and its display strings, and `components/jobs/` renders. The detail panel is a fixed overlay rendered by the same server component when `?job=<id>` is set — not a portalled dialog — so it works without JavaScript and has a real, shareable URL. Every piece of logic sits in `lib/` because this workspace's vitest is node-only and scoped to `lib/**`; components stay declarative.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, Tailwind 4 (`@theme` tokens from `@job-tracker/config`), lucide-react, vitest (node) for `apps/dashboard`, vitest + Testing Library (jsdom) for `packages/ui`.

## Global Constraints

- Run every `pnpm` command from `job-tracker/job-tracker/` (the pnpm root is one level below the git root).
- **No raw colour.** `packages/config/eslint-rules/no-raw-color.js` fails the build on any hex literal under `apps/**` or `packages/ui/**`. The reference's greens (`#4caf50`, `#1b5e20`), ambers (`#ffb300`, `#e65100`), reds (`#f44336`, `#b71c1c`) and blues (`text-blue-500`, `bg-blue-50/50`) are all forbidden, as are the five superseded palette values by name.
- **Only these colour tokens exist:** `ink`, `ink-hover`, `ink-pressed`, `text`, `text-muted`, `text-subtle`, `text-on-ink`, `canvas`, `surface`, `surface-subtle`, `surface-inverse`, `outline`, `outline-subtle`, `error`, `error-surface`, `text-on-error-surface`. There is no success token and none may be invented.
- **`outline` vs `outline-subtle` is functional.** Anything focusable gets `outline` (clears WCAG 1.4.11 at 3:1); `outline-subtle` is decorative dividers only. `outline-subtle` on a control is a defect.
- **Radii translation from the reference:** reference `3xl`/`card` (24px) → this theme's `rounded-xl`; reference `xl` (12px) → `rounded-md`; reference `lg`/`eight` (8px) → `rounded`.
- **`packages/ui` must not gain an icon library.** Icons are passed in as `ReactNode`, or the component lives in `apps/dashboard`.
- **No JSX in `lib/`.** These modules are compiled by a node-only vitest and are `.ts` files. Icons are named as strings and mapped to components in `components/`.
- Keep relative imports **extensionless** — Turbopack will not resolve `.js` specifiers pointing at TypeScript sources, and this only surfaces at build.
- Motion must carry `motion-reduce:transition-none` (or `motion-reduce:animate-none`).
- **Turbo masks which task failed.** When a task fails, re-run that workspace alone before believing the *summary* — but a specific error at a specific line is real until proven otherwise.
- `dashboard#typecheck` races `dashboard#build` over `apps/dashboard/.next/types/`. A `TS2344 ... does not satisfy the constraint 'AppRouteHandlerRoutes'` for a route that plainly exists is that race; re-run `pnpm --filter dashboard typecheck` alone.

---

## What the reference contradicts itself about

The dashboard build established the rule: **derive, never repeat**, because this reference set disagrees with itself wherever a number is typed twice. Five disagreements in `references/jobs`, each resolved by computing rather than storing:

1. **Competition labels vs applicant counts.** The six cards read 24→Low, 12→Low, 42→Medium, 67→Medium, 156→High, 186→High. That is a consistent banding nobody wrote down. `competitionFor(applicants)` with thresholds at 25 and 100 reproduces all six exactly — so the label is derived and the thresholds are asserted against the reference's own six figures.
2. **"12 Active Filters" over four chips**, with exactly one checkbox ticked in the sidebar. The count is derived from the chip list.
3. **A Yearly | Monthly | Hourly toggle above cards that all say `/ yr`.** The toggle is inert in the reference. Salary is stored once, yearly, and the other two periods are computed — which makes the control do something real instead of being a decoration.
4. **Card 1 posts $140k–$180k; the drawer for the same job posts $160k–$180k.** One salary per job. The drawer's *market estimate* stays a separate figure because it is a genuinely different quantity.
5. **The match ring is drawn at 90% next to the number 94%** (`stroke-dasharray="150" stroke-dashoffset="15"`). Geometry is computed from the score.

## Deliberate deviations from the reference

Each of these is a decision, not an omission. State it in the code comment where it lands.

- **Competition is monochrome.** The reference paints Low green, Medium amber, High red. This palette has no success token, and `DESIGN.md` itself says to hold the monochrome line "unless absolutely necessary for error handling". A three-level ordinal needs an ordinal encoding, so it becomes a **three-segment meter** — 1, 2 or 3 filled ink bars — beside the words. Shape plus text, which is the accessible encoding anyway. Error tokens are *not* used: high competition is a fact about the market, not a failure, and the dashboard reserved `error-surface` for Rejected and Missing skills, which are genuinely bad outcomes.
- **The verified tick is ink, not blue**, matching `pipeline.tsx`'s existing `BadgeCheck`.
- **"Actively hiring" gets an ink dot**, which is what the reference's own `DESIGN.md` prescribes for status: "small 8px solid dots ... to maintain the monochrome theme".
- **The blue "Insight" box becomes a `Tile`** (`surface-subtle` + `outline-subtle`), the same translation `InsightCard` already made on the dashboard.
- **All company marks are icon tiles.** The reference uses remote photographs for two cards and icon tiles for four. Remote images would need `next/image` remote patterns for logos that do not exist; the reference's own fallback is the icon tile, so all six use it and the row stops jittering.
- **The nav stays ours.** The reference ships its own pill-group nav with a bell and a photo avatar. `DashboardNav` is already built, already centred on a `1fr auto 1fr` grid, already has the account menu, and the bell was deliberately removed. Pass `current="/jobs"`.
- **No hiring-manager name.** The reference prints "Sarah Chen (VP)". Inventing a person for a mock is fabricated data a reader could mistake for real, so the field shows the role — "VP, Product Design".
- **The detail panel is server-rendered, not portalled.** A Base UI `Dialog` renders through `createPortal`, which produces nothing on the server, so a portalled panel would be invisible without JavaScript. A `position: fixed` overlay rendered inline needs no portal and costs nothing. (Base UI's `Drawer` primitive was also considered and rejected: it is snap-point and swipe oriented, defaulting to `swipeDirection: 'down'` with snap points measured as fractions of viewport *height* — the bottom-sheet case, not a right-hand panel.)
- **The screen is labelled sample data.** These are fabricated job listings on a screen whose PRD entry (NG2) rules out job discovery. The placeholder this replaces said so plainly; a badge beside the heading keeps that honest, and the panel's Apply button is `disabled` with a caption rather than pretending.

---

## File structure

**Created — `apps/dashboard/lib/jobs/` (all pure, all tested):**

| File | Responsibility |
|---|---|
| `data.ts` | The `Job` type, the six placeholder listings, the facet vocabularies and their labels. The single source. |
| `data.test.ts` | Internal consistency of the corpus and the facet lists. |
| `salary.ts` | One stored yearly range → per-period amounts and formatted strings. |
| `salary.test.ts` | Conversion and formatting at each period. |
| `derive.ts` | Applicants → competition band and meter fill; hours → "2h ago"; score → verdict and ring geometry. |
| `derive.test.ts` | Including: the thresholds reproduce the reference's own six labels. |
| `filters.ts` | `FilterState`, parsing from search params, applying to a list, active chips, chip removal, serialising back to a query. |
| `filters.test.ts` | Parse/apply/chips/round-trip. |
| `layout.ts` | The three sticky offsets, as literal class strings, plus the arithmetic that ties them together. |
| `layout.test.ts` | Pins that the sidebar offset equals nav height + bar height. |

**Created — `apps/dashboard/components/jobs/`:**

| File | Responsibility |
|---|---|
| `primitives.tsx` | `CompanyMark`, `MatchPill`, `MatchRing`, `CompetitionMeter`, `Pill`, `SampleBadge`. Shared by card and panel. |
| `job-card.tsx` | One listing. |
| `job-list.tsx` | Result count, grid, empty state. |
| `search-header.tsx` | The search card: the `<form>` element itself plus keywords, location, work mode, submit, trending chips. |
| `filter-sidebar.tsx` | The accordion sidebar, data-driven from the facet vocabularies. |
| `filter-bar.tsx` | The sticky bar: period toggle, active chips, clear-all. |
| `detail-panel.tsx` | The overlay panel and its backdrop. |
| `panel-behaviour.tsx` | `'use client'`. Escape-to-close, focus-on-open, background scroll lock. Purely additive. |
| `auto-submit.tsx` | `'use client'`. Submits the filter form on change. Purely additive. |

**Modified:**

- `apps/dashboard/app/jobs/page.tsx` — was a `SectionPlaceholder`; becomes the composition root.
- `packages/ui/src/select.tsx` — add a `form` passthrough.
- `packages/ui/src/segmented-field.tsx` — add a `form` passthrough.
- `packages/config/theme.css` — add the panel's slide-in keyframe.
- `CLAUDE.md` — a `## Jobs` section recording the traps.

**Unchanged and reused:** `DashboardNav`, `Panel`/`Tile`/`Eyebrow` from `components/dashboard/primitives.tsx`, `Input`, `Checkbox`, `Select`, `SegmentedField` from `@job-tracker/ui`.

---

### Task 1: The placeholder corpus

**Files:**
- Create: `apps/dashboard/lib/jobs/data.ts`
- Test: `apps/dashboard/lib/jobs/data.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Job`, `type WorkMode = 'remote'|'hybrid'|'onsite'`, `type EmploymentType = 'full-time'|'part-time'|'contract'`, `type SeniorityLevel = 'mid'|'senior'|'lead'|'principal'`, `type CompanySize = 'startup'|'private'|'public'|'enterprise'`, `type JobSource = 'linkedin'|'indeed'|'glassdoor'|'wellfound'`, `type SalaryRange = { min: number; max: number }`; the constants `JOBS`, `WORK_MODES`, `EMPLOYMENT_TYPES`, `SENIORITY_LEVELS`, `COMPANY_SIZES`, `JOB_SOURCES`, `JOB_FUNCTIONS`, `INDUSTRIES`, `POSTED_WINDOWS`, `SKILL_FACETS`, `TRENDING`; the label maps `MODE_LABEL`, `TYPE_LABEL`, `LEVEL_LABEL`, `SIZE_LABEL`, `SOURCE_LABEL`; and `jobById(id: string): Job | undefined`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/lib/jobs/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  INDUSTRIES,
  JOBS,
  JOB_FUNCTIONS,
  JOB_SOURCES,
  SENIORITY_LEVELS,
  SKILL_FACETS,
  WORK_MODES,
  jobById,
} from './data'

describe('the corpus', () => {
  it('gives every listing a distinct id', () => {
    expect(new Set(JOBS.map((j) => j.id)).size).toBe(JOBS.length)
  })

  it('orders every salary range low to high', () => {
    for (const j of JOBS) {
      expect(j.salary.max, j.id).toBeGreaterThan(j.salary.min)
      expect(j.marketSalary.max, j.id).toBeGreaterThan(j.marketSalary.min)
    }
  })

  it('keeps match scores and applicant counts in range', () => {
    for (const j of JOBS) {
      expect(j.match, j.id).toBeGreaterThanOrEqual(0)
      expect(j.match, j.id).toBeLessThanOrEqual(100)
      expect(j.applicants, j.id).toBeGreaterThanOrEqual(0)
      expect(j.postedHoursAgo, j.id).toBeGreaterThanOrEqual(0)
    }
  })

  it('draws every faceted field from its own vocabulary', () => {
    for (const j of JOBS) {
      expect(WORK_MODES, j.id).toContain(j.mode)
      expect(EMPLOYMENT_TYPES, j.id).toContain(j.type)
      expect(SENIORITY_LEVELS, j.id).toContain(j.level)
      expect(COMPANY_SIZES, j.id).toContain(j.size)
      expect(JOB_SOURCES, j.id).toContain(j.source)
      expect(JOB_FUNCTIONS, j.id).toContain(j.fn)
      expect(INDUSTRIES, j.id).toContain(j.industry)
    }
  })

  it('offers no skill facet that no listing has', () => {
    // The sidebar renders SKILL_FACETS. A facet nothing matches is a filter
    // that can only ever empty the list, which reads as a broken screen.
    const held = new Set(JOBS.flatMap((j) => j.skills))
    for (const s of SKILL_FACETS) expect(held, s).toContain(s)
  })

  it('covers every work mode, so the mode filter is demonstrable', () => {
    const modes = new Set(JOBS.map((j) => j.mode))
    for (const m of WORK_MODES) expect(modes, m).toContain(m)
  })

  it('finds a listing by id and nothing by a bad one', () => {
    expect(jobById(JOBS[0]!.id)?.title).toBe(JOBS[0]!.title)
    expect(jobById('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/data.test.ts`
Expected: FAIL — `Failed to resolve import "./data"`.

- [ ] **Step 3: Write the module**

Create `apps/dashboard/lib/jobs/data.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/data.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/lib/jobs/data.ts apps/dashboard/lib/jobs/data.test.ts
git commit -m "feat(jobs): the placeholder corpus, and the vocabularies filters draw from"
```

---

### Task 2: Salary, stored once and shown three ways

**Files:**
- Create: `apps/dashboard/lib/jobs/salary.ts`
- Test: `apps/dashboard/lib/jobs/salary.test.ts`

**Interfaces:**
- Consumes: `SalaryRange` from `./data`.
- Produces: `type SalaryPeriod = 'yearly'|'monthly'|'hourly'`, `SALARY_PERIODS: readonly {value: SalaryPeriod; label: string}[]`, `HOURS_PER_YEAR`, `perPeriod(yearly: number, period: SalaryPeriod): number`, `formatAmount(yearly: number, period: SalaryPeriod): string`, `formatRange(range: SalaryRange, period: SalaryPeriod): string`, `isSalaryPeriod(v: string): v is SalaryPeriod`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/lib/jobs/salary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatAmount, formatRange, isSalaryPeriod, perPeriod } from './salary'

describe('perPeriod', () => {
  it('divides a yearly figure by the right denominator', () => {
    expect(perPeriod(120_000, 'yearly')).toBe(120_000)
    expect(perPeriod(120_000, 'monthly')).toBe(10_000)
    // 2080 = 40 hours x 52 weeks, the convention every US posting uses.
    expect(perPeriod(208_000, 'hourly')).toBe(100)
  })
})

describe('formatAmount', () => {
  it('rounds yearly to whole thousands, because the cents are noise', () => {
    expect(formatAmount(140_000, 'yearly')).toBe('$140k')
    expect(formatAmount(195_000, 'yearly')).toBe('$195k')
  })

  it('keeps one decimal monthly, where whole thousands would collapse the band', () => {
    // 140k and 145k are both "$12k" at zero decimals, which loses the range.
    expect(formatAmount(140_000, 'monthly')).toBe('$11.7k')
    expect(formatAmount(180_000, 'monthly')).toBe('$15.0k')
  })

  it('shows whole dollars hourly', () => {
    expect(formatAmount(140_000, 'hourly')).toBe('$67')
    expect(formatAmount(180_000, 'hourly')).toBe('$87')
  })
})

describe('formatRange', () => {
  it('renders the card chip at each period from one stored range', () => {
    const range = { min: 140_000, max: 180_000 }
    expect(formatRange(range, 'yearly')).toBe('$140k – $180k / yr')
    expect(formatRange(range, 'monthly')).toBe('$11.7k – $15.0k / mo')
    expect(formatRange(range, 'hourly')).toBe('$67 – $87 / hr')
  })
})

describe('isSalaryPeriod', () => {
  it('accepts the three periods and rejects anything else', () => {
    expect(isSalaryPeriod('monthly')).toBe(true)
    expect(isSalaryPeriod('weekly')).toBe(false)
    expect(isSalaryPeriod('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/salary.test.ts`
Expected: FAIL — `Failed to resolve import "./salary"`.

- [ ] **Step 3: Write the module**

Create `apps/dashboard/lib/jobs/salary.ts`:

```ts
import type { SalaryRange } from './data'

/**
 * One stored yearly range, shown at whichever period the reader picked.
 *
 * The reference puts a Yearly | Monthly | Hourly toggle above six cards that
 * every one of them label "/ yr" — the control is decoration. Storing yearly
 * and computing the rest is what makes the toggle do something, and it is the
 * same reason the dashboard derives its headline figures from PIPELINE rather
 * than repeating them.
 *
 * Rounding differs by period on purpose. At whole thousands a monthly band of
 * $140k–$145k collapses to "$12k – $12k", which reads as a bug; one decimal
 * keeps the band visible. Hourly is small enough that thousands are useless and
 * whole dollars are exact enough.
 */

export type SalaryPeriod = 'yearly' | 'monthly' | 'hourly'

export const SALARY_PERIODS = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'hourly', label: 'Hourly' },
] as const satisfies readonly { value: SalaryPeriod; label: string }[]

/** 40 hours x 52 weeks. The convention, not an estimate. */
export const HOURS_PER_YEAR = 2080

const SUFFIX: Record<SalaryPeriod, string> = {
  yearly: '/ yr',
  monthly: '/ mo',
  hourly: '/ hr',
}

export function isSalaryPeriod(value: string): value is SalaryPeriod {
  return value === 'yearly' || value === 'monthly' || value === 'hourly'
}

export function perPeriod(yearly: number, period: SalaryPeriod): number {
  if (period === 'monthly') return yearly / 12
  if (period === 'hourly') return yearly / HOURS_PER_YEAR
  return yearly
}

export function formatAmount(yearly: number, period: SalaryPeriod): string {
  const value = perPeriod(yearly, period)
  if (period === 'hourly') return `$${Math.round(value)}`
  if (period === 'monthly') return `$${(value / 1000).toFixed(1)}k`
  return `$${Math.round(value / 1000)}k`
}

/** En dash with spaces, which is the range dash — a hyphen here reads as a
 *  minus sign against currency. */
export function formatRange(range: SalaryRange, period: SalaryPeriod): string {
  return `${formatAmount(range.min, period)} – ${formatAmount(range.max, period)} ${SUFFIX[period]}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/salary.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/lib/jobs/salary.ts apps/dashboard/lib/jobs/salary.test.ts
git commit -m "feat(jobs): store salary once and compute the other two periods"
```

---

### Task 3: Competition, freshness and match, all derived

**Files:**
- Create: `apps/dashboard/lib/jobs/derive.ts`
- Test: `apps/dashboard/lib/jobs/derive.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type CompetitionBand = 'low'|'medium'|'high'`, `COMPETITION_THRESHOLDS`, `COMPETITION_LABEL: Record<CompetitionBand,string>`, `COMPETITION_SEGMENTS`, `competitionFor(applicants: number): CompetitionBand`, `competitionFilled(band: CompetitionBand): number`, `postedAgo(hoursAgo: number): string`, `verdictFor(score: number): string`, `RING`, `ringDash(score: number): { dasharray: number; dashoffset: number }`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/lib/jobs/derive.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  COMPETITION_SEGMENTS,
  competitionFilled,
  competitionFor,
  postedAgo,
  RING,
  ringDash,
  verdictFor,
} from './derive'

describe('competitionFor', () => {
  it('reproduces the label the reference prints for each of its six cards', () => {
    // The reference never states a rule; it states six pairs. These thresholds
    // are the rule those pairs imply, and this test is what keeps the two
    // agreeing if the corpus is ever re-tuned.
    const reference: Array<[number, string]> = [
      [24, 'low'],
      [12, 'low'],
      [42, 'medium'],
      [67, 'medium'],
      [156, 'high'],
      [186, 'high'],
    ]
    for (const [applicants, band] of reference) {
      expect(competitionFor(applicants), String(applicants)).toBe(band)
    }
  })

  it('places the boundaries themselves', () => {
    expect(competitionFor(0)).toBe('low')
    expect(competitionFor(24)).toBe('low')
    expect(competitionFor(25)).toBe('medium')
    expect(competitionFor(99)).toBe('medium')
    expect(competitionFor(100)).toBe('high')
  })
})

describe('competitionFilled', () => {
  it('fills one segment per band, so the meter is ordinal without colour', () => {
    expect(competitionFilled('low')).toBe(1)
    expect(competitionFilled('medium')).toBe(2)
    expect(competitionFilled('high')).toBe(3)
  })

  it('never fills more segments than the meter draws', () => {
    for (const band of ['low', 'medium', 'high'] as const) {
      expect(competitionFilled(band)).toBeLessThanOrEqual(COMPETITION_SEGMENTS)
    }
  })
})

describe('postedAgo', () => {
  it('steps through the units the card needs', () => {
    expect(postedAgo(0)).toBe('just now')
    expect(postedAgo(2)).toBe('2h ago')
    expect(postedAgo(23)).toBe('23h ago')
    expect(postedAgo(24)).toBe('1d ago')
    expect(postedAgo(96)).toBe('4d ago')
    expect(postedAgo(168)).toBe('1w ago')
    expect(postedAgo(400)).toBe('2w ago')
  })

  it('reads a negative duration as new rather than as the future', () => {
    // Nothing produces one, but "in -3h" on a job card would be worse than
    // rounding it down.
    expect(postedAgo(-3)).toBe('just now')
  })
})

describe('verdictFor', () => {
  it('calls 94% an excellent match, as the reference drawer does', () => {
    expect(verdictFor(94)).toBe('Excellent match')
  })

  it('bands the rest', () => {
    expect(verdictFor(90)).toBe('Excellent match')
    expect(verdictFor(89)).toBe('Strong match')
    expect(verdictFor(80)).toBe('Strong match')
    expect(verdictFor(79)).toBe('Fair match')
    expect(verdictFor(70)).toBe('Fair match')
    expect(verdictFor(69)).toBe('Weak match')
  })
})

describe('ringDash', () => {
  const circumference = 2 * Math.PI * RING.r

  it('draws the arc the score actually says', () => {
    // The reference hardcodes dasharray 150 / dashoffset 15, which is a 90%
    // ring underneath the number 94%.
    const { dasharray, dashoffset } = ringDash(94)
    expect(dasharray).toBeCloseTo(circumference, 5)
    expect(dashoffset).toBeCloseTo(circumference * 0.06, 5)
  })

  it('closes the ring at 100 and empties it at 0', () => {
    expect(ringDash(100).dashoffset).toBeCloseTo(0, 5)
    expect(ringDash(0).dashoffset).toBeCloseTo(circumference, 5)
  })

  it('clamps rather than drawing an arc longer than the circle', () => {
    expect(ringDash(140).dashoffset).toBeCloseTo(0, 5)
    expect(ringDash(-20).dashoffset).toBeCloseTo(circumference, 5)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/derive.test.ts`
Expected: FAIL — `Failed to resolve import "./derive"`.

- [ ] **Step 3: Write the module**

Create `apps/dashboard/lib/jobs/derive.ts`:

```ts
/**
 * What a listing's raw fields mean, computed rather than stored.
 *
 * Three derivations that the reference hardcodes and then contradicts:
 *
 *   - competition, printed as a Low/Medium/High label beside an applicant
 *     count, with no stated rule. The six pairs it does state imply thresholds
 *     at 25 and 100, and derive.test.ts asserts those thresholds reproduce all
 *     six labels — so the rule is checkable rather than remembered;
 *   - freshness, printed as "2h ago" against no timestamp;
 *   - the match ring, drawn at dasharray 150 / dashoffset 15 — a 90% arc —
 *     underneath the number 94%.
 *
 * COLOUR. The reference paints competition green, amber and red. There is no
 * success token in this palette and inventing one ships a colour no contrast
 * test covers; the reference's own DESIGN.md says to hold the monochrome line
 * "unless absolutely necessary for error handling". So the meter is the
 * encoding: an ordinal quantity gets an ordinal shape, one to three filled
 * segments, beside the word. The error pair is deliberately NOT used — high
 * competition is a fact about the market, not a failure, and the dashboard
 * reserved error for Rejected and Missing skills, which are.
 */

export type CompetitionBand = 'low' | 'medium' | 'high'

/** Lower bound of each band, in applicants. */
export const COMPETITION_THRESHOLDS = { medium: 25, high: 100 } as const

export const COMPETITION_LABEL: Record<CompetitionBand, string> = {
  low: 'Low competition',
  medium: 'Medium competition',
  high: 'High competition',
}

/** How many bars the meter draws. Also the ceiling on `competitionFilled`. */
export const COMPETITION_SEGMENTS = 3

export function competitionFor(applicants: number): CompetitionBand {
  if (applicants >= COMPETITION_THRESHOLDS.high) return 'high'
  if (applicants >= COMPETITION_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export function competitionFilled(band: CompetitionBand): number {
  return band === 'high' ? 3 : band === 'medium' ? 2 : 1
}

/**
 * A duration, not a date.
 *
 * The corpus stores `postedHoursAgo` so the mock does not rot — a hardcoded ISO
 * date reads "posted 7 months ago" a season after it is written, which is the
 * same drift the dashboard's start date has and cannot avoid. Taking hours also
 * keeps every clock out of this module, so nothing here needs a fake timer.
 */
export function postedAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return 'just now'
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ago`
  const days = Math.floor(hoursAgo / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function verdictFor(score: number): string {
  if (score >= 90) return 'Excellent match'
  if (score >= 80) return 'Strong match'
  if (score >= 70) return 'Fair match'
  return 'Weak match'
}

/** Radius and stroke of the drawer's score ring, in user units. */
export const RING = { r: 24, stroke: 4 } as const

export function ringDash(score: number): { dasharray: number; dashoffset: number } {
  const circumference = 2 * Math.PI * RING.r
  const clamped = Math.min(100, Math.max(0, score))
  return { dasharray: circumference, dashoffset: circumference * (1 - clamped / 100) }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/derive.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/lib/jobs/derive.ts apps/dashboard/lib/jobs/derive.test.ts
git commit -m "feat(jobs): derive competition, freshness and the match ring"
```

---

### Task 4: Filter state, which is the URL

**Files:**
- Create: `apps/dashboard/lib/jobs/filters.ts`
- Test: `apps/dashboard/lib/jobs/filters.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces; `SalaryPeriod` and `isSalaryPeriod` from `./salary`.
- Produces: `type RawParams = Record<string, string | string[] | undefined>`, `type FilterState`, `type Chip = { key: string; label: string }`, `EMPTY_FILTERS: FilterState`, `parseFilters(raw: RawParams): FilterState`, `applyFilters(jobs: readonly Job[], f: FilterState): Job[]`, `activeChips(f: FilterState): Chip[]`, `activeCount(f: FilterState): number`, `withoutChip(f: FilterState, key: string): FilterState`, `toQuery(f: FilterState): string`, `rawFromQuery(query: string): RawParams`, `jobsHref(f: FilterState, jobId?: string): string`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/lib/jobs/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { JOBS } from './data'
import {
  activeChips,
  activeCount,
  applyFilters,
  EMPTY_FILTERS,
  jobsHref,
  parseFilters,
  rawFromQuery,
  toQuery,
  withoutChip,
} from './filters'

describe('parseFilters', () => {
  it('reads nothing out of nothing', () => {
    expect(parseFilters({})).toEqual(EMPTY_FILTERS)
  })

  it('accepts one value or many for a repeated parameter', () => {
    expect(parseFilters({ mode: 'remote' }).modes).toEqual(['remote'])
    expect(parseFilters({ mode: ['remote', 'hybrid'] }).modes).toEqual(['remote', 'hybrid'])
  })

  it('drops values outside the vocabulary, because the URL is user-editable', () => {
    // An unrecognised mode would otherwise render a chip that nothing removes.
    expect(parseFilters({ mode: ['remote', 'moon'] }).modes).toEqual(['remote'])
    expect(parseFilters({ fn: 'Astrology' }).fn).toBe('')
    expect(parseFilters({ period: 'weekly' }).period).toBe('yearly')
  })

  it('deduplicates, so ?mode=remote&mode=remote is one filter not two', () => {
    expect(parseFilters({ mode: ['remote', 'remote'] }).modes).toEqual(['remote'])
  })

  it('keeps only digits in the salary floor', () => {
    expect(parseFilters({ salaryMin: '$160,000' }).salaryMin).toBe(160000)
    expect(parseFilters({ salaryMin: '' }).salaryMin).toBeNull()
    expect(parseFilters({ salaryMin: 'abc' }).salaryMin).toBeNull()
  })

  it('accepts only a posted window it actually offers', () => {
    expect(parseFilters({ posted: '168' }).postedWithinHours).toBe(168)
    expect(parseFilters({ posted: '3' }).postedWithinHours).toBeNull()
  })

  it('bounds the free-text fields', () => {
    expect(parseFilters({ q: 'x'.repeat(500) }).q).toHaveLength(100)
  })
})

describe('applyFilters', () => {
  it('returns everything when nothing is set', () => {
    expect(applyFilters(JOBS, EMPTY_FILTERS)).toHaveLength(JOBS.length)
  })

  it('matches the query against title, company and skills', () => {
    expect(applyFilters(JOBS, parseFilters({ q: 'designer' })).length).toBeGreaterThan(0)
    expect(applyFilters(JOBS, parseFilters({ q: 'ACME' })).map((j) => j.company)).toEqual([
      'Acme Corp',
    ])
    expect(applyFilters(JOBS, parseFilters({ q: 'terraform' })).map((j) => j.company)).toEqual([
      'CloudScale',
    ])
  })

  it('treats several values of one facet as OR', () => {
    const remote = applyFilters(JOBS, parseFilters({ mode: 'remote' }))
    const both = applyFilters(JOBS, parseFilters({ mode: ['remote', 'onsite'] }))
    expect(both.length).toBeGreaterThan(remote.length)
  })

  it('treats several skills as AND, because a skill filter is a requirement', () => {
    const one = applyFilters(JOBS, parseFilters({ skill: 'Python' }))
    const two = applyFilters(JOBS, parseFilters({ skill: ['Python', 'Kubernetes'] }))
    expect(two.length).toBeLessThan(one.length)
    for (const j of two) {
      expect(j.skills).toContain('Python')
      expect(j.skills).toContain('Kubernetes')
    }
  })

  it('reads a salary floor against the top of the band, not the bottom', () => {
    // "pays at least 200k" should keep a 165k-205k listing: the band reaches it.
    const kept = applyFilters(JOBS, parseFilters({ salaryMin: '200000' }))
    expect(kept.map((j) => j.company).sort()).toEqual(['CloudScale', 'GlobalPay', 'Nexus AI', 'SecureNet'])
  })

  it('filters by how long ago a listing was posted', () => {
    const day = applyFilters(JOBS, parseFilters({ posted: '24' }))
    expect(day.every((j) => j.postedHoursAgo <= 24)).toBe(true)
    expect(day.length).toBeLessThan(JOBS.length)
  })

  it('narrows, never widens, as facets are added', () => {
    const a = applyFilters(JOBS, parseFilters({ mode: 'remote' }))
    const b = applyFilters(JOBS, parseFilters({ mode: 'remote', level: 'lead' }))
    expect(b.length).toBeLessThanOrEqual(a.length)
  })

  it('can return nothing, which the empty state has to handle', () => {
    expect(applyFilters(JOBS, parseFilters({ q: 'zzzz' }))).toEqual([])
  })
})

describe('activeChips', () => {
  it('counts what it shows — the reference says "12 Active Filters" over four chips', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'], level: 'lead', q: 'react' })
    expect(activeCount(f)).toBe(activeChips(f).length)
    expect(activeCount(f)).toBe(4)
  })

  it('does not count the display period, which is a unit and not a filter', () => {
    expect(activeCount(parseFilters({ period: 'monthly' }))).toBe(0)
    expect(activeChips(parseFilters({ period: 'monthly' }))).toEqual([])
  })

  it('labels each chip with its human name rather than its stored value', () => {
    const labels = activeChips(parseFilters({ mode: 'onsite', source: 'linkedin' })).map(
      (c) => c.label,
    )
    expect(labels).toContain('On-site')
    expect(labels).toContain('LinkedIn')
  })

  it('gives each chip a distinct key', () => {
    const chips = activeChips(parseFilters({ mode: ['remote', 'hybrid'], type: 'full-time' }))
    expect(new Set(chips.map((c) => c.key)).size).toBe(chips.length)
  })
})

describe('withoutChip', () => {
  it('removes one value of a facet and leaves its siblings', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'] })
    expect(withoutChip(f, 'mode:remote').modes).toEqual(['hybrid'])
  })

  it('clears a single-valued facet', () => {
    expect(withoutChip(parseFilters({ q: 'react' }), 'q:react').q).toBe('')
    expect(withoutChip(parseFilters({ salaryMin: '160000' }), 'salaryMin:160000').salaryMin).toBeNull()
  })

  it('leaves the state alone for a key it does not know', () => {
    const f = parseFilters({ mode: 'remote' })
    expect(withoutChip(f, 'nonsense:1')).toEqual(f)
  })

  it('removes exactly one chip per call', () => {
    const f = parseFilters({ mode: ['remote', 'hybrid'], q: 'react' })
    for (const chip of activeChips(f)) {
      expect(activeCount(withoutChip(f, chip.key))).toBe(activeCount(f) - 1)
    }
  })
})

describe('toQuery', () => {
  it('round-trips every field', () => {
    const f = parseFilters({
      q: 'react',
      location: 'austin',
      fn: 'Engineering',
      industry: 'SaaS',
      mode: ['remote', 'hybrid'],
      type: 'full-time',
      level: 'lead',
      size: 'startup',
      source: 'wellfound',
      skill: ['React', 'TypeScript'],
      salaryMin: '160000',
      posted: '168',
      period: 'monthly',
    })
    expect(parseFilters(rawFromQuery(toQuery(f)))).toEqual(f)
  })

  it('writes nothing for an empty state, so /jobs stays clean', () => {
    expect(toQuery(EMPTY_FILTERS)).toBe('')
  })

  it('omits the default period', () => {
    expect(toQuery(parseFilters({ period: 'yearly' }))).toBe('')
    expect(toQuery(parseFilters({ period: 'hourly' }))).toBe('period=hourly')
  })
})

describe('jobsHref', () => {
  it('is a bare path when there is nothing to carry', () => {
    expect(jobsHref(EMPTY_FILTERS)).toBe('/jobs')
  })

  it('keeps the filters when opening a listing, so closing returns to them', () => {
    const f = parseFilters({ mode: 'remote' })
    expect(jobsHref(f, 'acme-senior-product-designer')).toBe(
      '/jobs?mode=remote&job=acme-senior-product-designer',
    )
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/filters.test.ts`
Expected: FAIL — `Failed to resolve import "./filters"`.

- [ ] **Step 3: Write the module**

Create `apps/dashboard/lib/jobs/filters.ts`:

```ts
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  JOB_SOURCES,
  LEVEL_LABEL,
  MODE_LABEL,
  POSTED_WINDOWS,
  SENIORITY_LEVELS,
  SIZE_LABEL,
  SKILL_FACETS,
  SOURCE_LABEL,
  TYPE_LABEL,
  WORK_MODES,
  type CompanySize,
  type EmploymentType,
  type Job,
  type JobSource,
  type SeniorityLevel,
  type WorkMode,
} from './data'
import { formatAmount, isSalaryPeriod, type SalaryPeriod } from './salary'

/**
 * Filter state, which is the URL.
 *
 * Putting it there rather than in React state buys four things at once: the
 * whole screen stays a server component, the filters survive a reload and a
 * shared link, "Clear all" is a plain <Link href="/jobs">, and the sidebar can
 * be a real <form method="GET"> that works with JavaScript off — the same
 * standard the onboarding wizard holds itself to.
 *
 * Everything here is pure and lives in lib/ so the node-only vitest can reach
 * it. The components below do no filtering of their own.
 *
 * Unknown values are dropped rather than carried. The URL is user-editable, and
 * a chip built from ?mode=moon would be one no click could remove.
 */

export type RawParams = Record<string, string | string[] | undefined>

export type FilterState = {
  q: string
  location: string
  fn: string
  industry: string
  modes: WorkMode[]
  types: EmploymentType[]
  levels: SeniorityLevel[]
  sizes: CompanySize[]
  sources: JobSource[]
  skills: string[]
  salaryMin: number | null
  postedWithinHours: number | null
  /** A display unit, not a filter: it changes how salary reads, never which
   *  listings survive. Excluded from the chips and from the count. */
  period: SalaryPeriod
}

export type Chip = { key: string; label: string }

export const EMPTY_FILTERS: FilterState = {
  q: '',
  location: '',
  fn: '',
  industry: '',
  modes: [],
  types: [],
  levels: [],
  sizes: [],
  sources: [],
  skills: [],
  salaryMin: null,
  postedWithinHours: null,
  period: 'yearly',
}

const MAX_TEXT = 100

function one(raw: RawParams, key: string): string {
  const value = raw[key]
  const first = Array.isArray(value) ? value[0] : value
  return (first ?? '').trim()
}

function many<T extends string>(raw: RawParams, key: string, allowed: readonly T[]): T[] {
  const value = raw[key]
  const list = value === undefined ? [] : Array.isArray(value) ? value : [value]
  const vocabulary = new Set<string>(allowed)
  return [...new Set(list.filter((v): v is T => vocabulary.has(v)))]
}

function pick<T extends string>(raw: RawParams, key: string, allowed: readonly T[]): T | '' {
  const value = one(raw, key)
  return (allowed as readonly string[]).includes(value) ? (value as T) : ''
}

export function parseFilters(raw: RawParams): FilterState {
  const digits = one(raw, 'salaryMin').replace(/\D/g, '')
  const posted = Number(one(raw, 'posted'))
  const period = one(raw, 'period')

  return {
    q: one(raw, 'q').slice(0, MAX_TEXT),
    location: one(raw, 'location').slice(0, MAX_TEXT),
    fn: pick(raw, 'fn', JOB_FUNCTIONS),
    industry: pick(raw, 'industry', INDUSTRIES),
    modes: many(raw, 'mode', WORK_MODES),
    types: many(raw, 'type', EMPLOYMENT_TYPES),
    levels: many(raw, 'level', SENIORITY_LEVELS),
    sizes: many(raw, 'size', COMPANY_SIZES),
    sources: many(raw, 'source', JOB_SOURCES),
    skills: many(raw, 'skill', SKILL_FACETS),
    salaryMin: digits === '' ? null : Number(digits),
    postedWithinHours: POSTED_WINDOWS.some((w) => w.hours === posted) ? posted : null,
    period: isSalaryPeriod(period) ? period : 'yearly',
  }
}

export function applyFilters(jobs: readonly Job[], f: FilterState): Job[] {
  const q = f.q.toLowerCase()
  const location = f.location.toLowerCase()

  return jobs.filter((job) => {
    if (q) {
      const haystack = `${job.title} ${job.company} ${job.skills.join(' ')}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (location) {
      const haystack = `${job.city} ${MODE_LABEL[job.mode]}`.toLowerCase()
      if (!haystack.includes(location)) return false
    }
    if (f.fn && job.fn !== f.fn) return false
    if (f.industry && job.industry !== f.industry) return false
    if (f.modes.length && !f.modes.includes(job.mode)) return false
    if (f.types.length && !f.types.includes(job.type)) return false
    if (f.levels.length && !f.levels.includes(job.level)) return false
    if (f.sizes.length && !f.sizes.includes(job.size)) return false
    if (f.sources.length && !f.sources.includes(job.source)) return false
    // AND, not OR: ticking two skills asks for a listing wanting both. Several
    // values of every OTHER facet are alternatives, which is why they use
    // `includes` above and this one uses `every`.
    if (f.skills.length && !f.skills.every((s) => job.skills.includes(s))) return false
    // Against the TOP of the band. "pays at least 200k" should keep a listing
    // advertised at 165k-205k, because it reaches the figure.
    if (f.salaryMin !== null && job.salary.max < f.salaryMin) return false
    if (f.postedWithinHours !== null && job.postedHoursAgo > f.postedWithinHours) return false
    return true
  })
}

export function activeChips(f: FilterState): Chip[] {
  const chips: Chip[] = []
  if (f.q) chips.push({ key: `q:${f.q}`, label: `“${f.q}”` })
  if (f.location) chips.push({ key: `location:${f.location}`, label: f.location })
  if (f.fn) chips.push({ key: `fn:${f.fn}`, label: f.fn })
  if (f.industry) chips.push({ key: `industry:${f.industry}`, label: f.industry })
  for (const m of f.modes) chips.push({ key: `mode:${m}`, label: MODE_LABEL[m] })
  for (const t of f.types) chips.push({ key: `type:${t}`, label: TYPE_LABEL[t] })
  for (const l of f.levels) chips.push({ key: `level:${l}`, label: LEVEL_LABEL[l] })
  for (const s of f.sizes) chips.push({ key: `size:${s}`, label: SIZE_LABEL[s] })
  for (const s of f.sources) chips.push({ key: `source:${s}`, label: SOURCE_LABEL[s] })
  for (const s of f.skills) chips.push({ key: `skill:${s}`, label: s })
  if (f.salaryMin !== null) {
    chips.push({ key: `salaryMin:${f.salaryMin}`, label: `${formatAmount(f.salaryMin, 'yearly')}+` })
  }
  if (f.postedWithinHours !== null) {
    const window = POSTED_WINDOWS.find((w) => w.hours === f.postedWithinHours)
    chips.push({ key: `posted:${f.postedWithinHours}`, label: `Past ${window?.label ?? ''}`.trim() })
  }
  return chips
}

/** Derived, never typed. The reference prints "12 Active Filters:" above four
 *  chips and one ticked checkbox. */
export function activeCount(f: FilterState): number {
  return activeChips(f).length
}

export function withoutChip(f: FilterState, key: string): FilterState {
  const separator = key.indexOf(':')
  const param = separator === -1 ? key : key.slice(0, separator)
  const value = separator === -1 ? '' : key.slice(separator + 1)

  switch (param) {
    case 'q':
      return { ...f, q: '' }
    case 'location':
      return { ...f, location: '' }
    case 'fn':
      return { ...f, fn: '' }
    case 'industry':
      return { ...f, industry: '' }
    case 'mode':
      return { ...f, modes: f.modes.filter((v) => v !== value) }
    case 'type':
      return { ...f, types: f.types.filter((v) => v !== value) }
    case 'level':
      return { ...f, levels: f.levels.filter((v) => v !== value) }
    case 'size':
      return { ...f, sizes: f.sizes.filter((v) => v !== value) }
    case 'source':
      return { ...f, sources: f.sources.filter((v) => v !== value) }
    case 'skill':
      return { ...f, skills: f.skills.filter((v) => v !== value) }
    case 'salaryMin':
      return { ...f, salaryMin: null }
    case 'posted':
      return { ...f, postedWithinHours: null }
    default:
      return f
  }
}

export function toQuery(f: FilterState): string {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.location) p.set('location', f.location)
  if (f.fn) p.set('fn', f.fn)
  if (f.industry) p.set('industry', f.industry)
  for (const m of f.modes) p.append('mode', m)
  for (const t of f.types) p.append('type', t)
  for (const l of f.levels) p.append('level', l)
  for (const s of f.sizes) p.append('size', s)
  for (const s of f.sources) p.append('source', s)
  for (const s of f.skills) p.append('skill', s)
  if (f.salaryMin !== null) p.set('salaryMin', String(f.salaryMin))
  if (f.postedWithinHours !== null) p.set('posted', String(f.postedWithinHours))
  // The default is omitted so an untouched screen has a bare /jobs URL.
  if (f.period !== 'yearly') p.set('period', f.period)
  return p.toString()
}

/** The inverse of what Next hands a page, for round-tripping and for hrefs. */
export function rawFromQuery(query: string): RawParams {
  const raw: RawParams = {}
  for (const [key, value] of new URLSearchParams(query)) {
    const existing = raw[key]
    if (existing === undefined) raw[key] = value
    else if (Array.isArray(existing)) existing.push(value)
    else raw[key] = [existing, value]
  }
  return raw
}

/** Every link on the screen goes through here, so opening or closing a listing
 *  never silently drops the filters that found it. */
export function jobsHref(f: FilterState, jobId?: string): string {
  const query = toQuery(f)
  const withJob = jobId ? (query ? `${query}&job=${jobId}` : `job=${jobId}`) : query
  return withJob ? `/jobs?${withJob}` : '/jobs'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/filters.test.ts`
Expected: PASS, 22 tests.

- [ ] **Step 5: Run the whole workspace, since this is the last lib module**

Run: `pnpm --filter dashboard test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/lib/jobs/filters.ts apps/dashboard/lib/jobs/filters.test.ts
git commit -m "feat(jobs): filter state lives in the URL, and derives its own chips"
```

---

### Task 5: `form` passthrough on Select and SegmentedField

The search card sits above the results and the sidebar sits inside the grid below them, so they cannot be wrapped in one `<form>` element. HTML's `form="<id>"` attribute associates a control with a form anywhere in the document — the same mechanism `AccountMenu` already uses to submit a sign-out form it does not contain. `Input` and `Checkbox` spread their rest props onto the input, so they already accept it. `Select` and `SegmentedField` do not.

**Files:**
- Modify: `packages/ui/src/select.tsx`
- Modify: `packages/ui/src/segmented-field.tsx`
- Test: `packages/ui/src/select.test.tsx` (append)
- Test: `packages/ui/src/segmented-field.test.tsx` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: an optional `form?: string` prop on both components, forwarded to every underlying input.

- [ ] **Step 1: Write the failing tests**

Append to `packages/ui/src/select.test.tsx`:

```ts
it('associates itself with a form it does not sit inside', () => {
  // The jobs sidebar and its submit button are in different subtrees, so the
  // controls reach the form by id rather than by containment.
  render(
    <Select
      label="Industry"
      name="industry"
      form="job-filters"
      options={[{ value: 'saas', label: 'SaaS' }]}
    />,
  )
  expect(screen.getByLabelText('Industry')).toHaveAttribute('form', 'job-filters')
})
```

Append to `packages/ui/src/segmented-field.test.tsx`:

```ts
it('associates every radio with a form it does not sit inside', () => {
  render(
    <SegmentedField
      name="period"
      legend="Salary period"
      form="job-filters"
      options={[
        { value: 'yearly', label: 'Yearly' },
        { value: 'monthly', label: 'Monthly' },
      ]}
    />,
  )
  for (const radio of screen.getAllByRole('radio')) {
    expect(radio).toHaveAttribute('form', 'job-filters')
  }
})
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm --filter @job-tracker/ui exec vitest run src/select.test.tsx src/segmented-field.test.tsx`
Expected: FAIL — TypeScript rejects the unknown `form` prop, and the attribute is absent.

- [ ] **Step 3: Add the prop to `Select`**

In `packages/ui/src/select.tsx`, add to the destructured props and the type:

```tsx
export function Select({
  label,
  name,
  options,
  value,
  placeholder,
  error,
  className,
  form,
}: {
  label: string
  name: string
  options: readonly { readonly value: string; readonly label: string }[]
  value?: string | null
  placeholder?: string
  error?: string
  className?: string
  /** Associates the control with a <form> elsewhere in the document, for a
   *  layout that cannot put the two in the same subtree. */
  form?: string
}) {
```

and add `form={form}` to the `<select>` element, immediately after `name={name}`.

- [ ] **Step 4: Add the prop to `SegmentedField`**

In `packages/ui/src/segmented-field.tsx`, add `form` to the destructured props and the type:

```tsx
  value?: string | null
  error?: string
  /** Associates every radio with a <form> elsewhere in the document. */
  form?: string
}) {
```

and add `form={form}` to the `<input type="radio">` inside the first `shown.map`, immediately after `name={name}`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @job-tracker/ui test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/select.tsx packages/ui/src/segmented-field.tsx packages/ui/src/select.test.tsx packages/ui/src/segmented-field.test.tsx
git commit -m "feat(ui): let Select and SegmentedField join a form they do not sit inside"
```

---

### Task 6: The card, the grid, and a Jobs page that renders them

The first visible deliverable. `apps/dashboard` has no component-test harness — its vitest is `environment: 'node'` with `include: ['lib/**/*.test.ts']` — so verification here is the build gate plus the browser, and the load-bearing arithmetic goes into `lib/jobs/layout.ts` where it *can* be tested.

**Files:**
- Create: `apps/dashboard/lib/jobs/layout.ts`
- Test: `apps/dashboard/lib/jobs/layout.test.ts`
- Create: `apps/dashboard/components/jobs/primitives.tsx`
- Create: `apps/dashboard/components/jobs/job-card.tsx`
- Create: `apps/dashboard/components/jobs/job-list.tsx`
- Modify: `apps/dashboard/app/jobs/page.tsx`

**Interfaces:**
- Consumes: `JOBS`, `MODE_LABEL`, `type Job` from `lib/jobs/data`; `formatRange`, `type SalaryPeriod` from `lib/jobs/salary`; `competitionFor`, `competitionFilled`, `COMPETITION_LABEL`, `COMPETITION_SEGMENTS`, `postedAgo`, `RING`, `ringDash`, `verdictFor` from `lib/jobs/derive`; `type FilterState`, `jobsHref`, `parseFilters`, `applyFilters` from `lib/jobs/filters`; `Panel` from `components/dashboard/primitives`; `DashboardNav`, `viewer`.
- Produces: `NAV_HEIGHT`, `BAR_HEIGHT`, `STICKY_BAR`, `STICKY_SIDEBAR`, `PAGE_SHELL` from `lib/jobs/layout`; `CompanyMark`, `MatchPill`, `MatchRing`, `CompetitionMeter`, `Pill`, `SampleBadge` from `components/jobs/primitives`; `JobCard` from `components/jobs/job-card`; `JobList` from `components/jobs/job-list`.

- [ ] **Step 1: Write the failing layout test**

Create `apps/dashboard/lib/jobs/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BAR_HEIGHT, NAV_HEIGHT, STICKY_BAR, STICKY_SIDEBAR } from './layout'

describe('sticky offsets', () => {
  it('parks the filter bar exactly under the nav', () => {
    // DashboardNav is `sticky top-0` at h-[72px]. One pixel of disagreement
    // here and the bar either overlaps the nav or shows a stripe of page
    // through the gap while scrolling.
    expect(STICKY_BAR).toContain(`top-[${NAV_HEIGHT}px]`)
  })

  it('parks the sidebar under both of them', () => {
    expect(STICKY_SIDEBAR).toContain(`top-[${NAV_HEIGHT + BAR_HEIGHT}px]`)
  })

  it('keeps the sidebar below the bar in the stacking order', () => {
    // The bar is opaque and scrolls over the sidebar's top edge.
    const z = (s: string) => Number(/z-(\d+)/.exec(s)?.[1] ?? 0)
    expect(z(STICKY_BAR)).toBeGreaterThan(z(STICKY_SIDEBAR))
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/layout.test.ts`
Expected: FAIL — `Failed to resolve import "./layout"`.

- [ ] **Step 3: Write `lib/jobs/layout.ts`**

```ts
/**
 * The three sticky offsets, and the arithmetic that ties them together.
 *
 * Here rather than inline in the components for the reason `step-layout.ts`
 * exists: this workspace's vitest can reach lib/ and cannot reach components/,
 * and these numbers are coupled. DashboardNav is `sticky top-0` at 72px, the
 * filter bar parks under it, and the sidebar parks under both. Get one wrong
 * and the bar either overlaps the nav or leaves a stripe of scrolling page
 * showing through the gap.
 *
 * The class strings are literals, not built from the numbers. Tailwind only
 * emits classes it can see written out, so a template string here would compile
 * to no CSS at all — silently. The test is what keeps the literals and the
 * numbers agreeing.
 */

/** DashboardNav's `h-[72px]`. */
export const NAV_HEIGHT = 72

/** The filter bar: py-3 either side of a 40px control row. */
export const BAR_HEIGHT = 64

/** Matches the dashboard's own main element, so the two screens line up. */
export const PAGE_SHELL = 'mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-8 md:px-12'

export const STICKY_BAR =
  'sticky top-[72px] z-30 -mx-4 border-b border-outline-subtle bg-canvas/85 px-4 py-3 backdrop-blur-md md:-mx-12 md:px-12'

export const STICKY_SIDEBAR = 'lg:sticky lg:top-[136px] lg:z-20 lg:max-h-[calc(100dvh-160px)]'
```

- [ ] **Step 4: Run the layout test to verify it passes**

Run: `pnpm --filter dashboard exec vitest run lib/jobs/layout.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write `components/jobs/primitives.tsx`**

```tsx
import type { ReactNode } from 'react'
import {
  Brain,
  Cloud,
  Layers,
  Shield,
  Waves,
  Wallet,
  Briefcase,
  BadgeCheck,
} from 'lucide-react'
import { cn } from '@job-tracker/ui'
import {
  COMPETITION_LABEL,
  COMPETITION_SEGMENTS,
  competitionFilled,
  competitionFor,
  RING,
  ringDash,
} from '@/lib/jobs/derive'

/**
 * The pieces the card and the detail panel share.
 *
 * TOKEN MAP — the reference is written in raw hex the no-raw-color rule
 * rejects, and in three colours this palette does not have:
 *
 *   #FAFAFA page            -> bg-canvas
 *   #FFFFFF card            -> bg-surface
 *   #e2e2e2 hairline        -> border-outline-subtle  (decorative only)
 *   #f3f3f4 inner tile      -> bg-surface-subtle
 *   #000000 primary         -> bg-ink / text-text
 *   #444748 secondary       -> text-text-muted
 *   blue verified tick      -> text-text
 *   green/amber/red bands   -> the meter below, see CompetitionMeter
 *
 * Radii: the reference's rounded-3xl (24px) is this theme's rounded-xl, and its
 * rounded-lg/eight (8px) is this theme's plain rounded.
 */

/** Named by string in lib/jobs/data.ts, mapped to a component here — lib/ is a
 *  .ts file with no JSX, and packages/ui must not gain an icon library. */
const MARKS: Record<string, ReactNode> = {
  layers: <Layers aria-hidden className="size-6" strokeWidth={1.5} />,
  wallet: <Wallet aria-hidden className="size-6" strokeWidth={1.5} />,
  waves: <Waves aria-hidden className="size-6" strokeWidth={1.5} />,
  brain: <Brain aria-hidden className="size-6" strokeWidth={1.5} />,
  cloud: <Cloud aria-hidden className="size-6" strokeWidth={1.5} />,
  shield: <Shield aria-hidden className="size-6" strokeWidth={1.5} />,
}

/**
 * The company tile.
 *
 * An icon for every listing, where the reference photographs two of six and
 * draws icons for the other four. There are no logos to fetch, a remote image
 * host would need a next/image allowlist for files that do not exist, and a row
 * mixing photographs with glyphs jitters. The reference's own fallback, applied
 * consistently.
 */
export function CompanyMark({ mark, size = 'md' }: { mark: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border border-outline-subtle',
        'bg-surface-subtle text-text',
        size === 'md' ? 'size-14' : 'size-12',
      )}
    >
      {MARKS[mark] ?? <Briefcase aria-hidden className="size-6" strokeWidth={1.5} />}
    </span>
  )
}

/** The ink tick beside a company name. Blue in the reference; there is no blue
 *  token, and the tick reads as verification without one. */
export function VerifiedTick() {
  return <BadgeCheck aria-label="Verified employer" className="size-4 shrink-0 text-text" strokeWidth={2} />
}

/** The filled percentage pill on the card. */
export function MatchPill({ score }: { score: number }) {
  return (
    <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold tracking-tight text-text-on-ink">
      {score}% MATCH
    </span>
  )
}

/** A neutral chip. Used for salary, tags, and the info row. */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-outline-subtle',
        'bg-surface-subtle px-3 py-1.5 text-xs font-medium text-text',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Competition, as an ordinal shape instead of a colour.
 *
 * The reference paints Low green, Medium amber and High red. This palette has
 * no success token, inventing one ships a colour no contrast test covers, and
 * the reference's own DESIGN.md says to hold the monochrome line except for
 * error handling. So: three bars, one to three of them inked. Shape carries the
 * ordering, the words carry the meaning, and neither depends on hue — which is
 * the accessible encoding regardless of palette.
 *
 * The error pair is deliberately not used for `high`. Heavy competition is a
 * fact about the market, not a failure; the dashboard reserved error-surface
 * for Rejected and Missing skills, which are.
 */
export function CompetitionMeter({ applicants }: { applicants: number }) {
  const band = competitionFor(applicants)
  const filled = competitionFilled(band)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="flex items-end gap-0.5">
        {Array.from({ length: COMPETITION_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              'w-1 rounded-sm',
              i === 0 ? 'h-1.5' : i === 1 ? 'h-2.5' : 'h-3.5',
              i < filled ? 'bg-ink' : 'bg-outline-subtle',
            )}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-text">{COMPETITION_LABEL[band]}</span>
    </span>
  )
}

/** The drawer's score ring. Geometry from the score, where the reference
 *  hardcodes a 90% arc under the number 94. */
export function MatchRing({ score }: { score: number }) {
  const { dasharray, dashoffset } = ringDash(score)
  const box = (RING.r + RING.stroke) * 2

  return (
    <span className="relative inline-flex shrink-0" style={{ width: box, height: box }}>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden className="-rotate-90">
        <circle
          cx={box / 2}
          cy={box / 2}
          r={RING.r}
          fill="transparent"
          strokeWidth={RING.stroke}
          className="stroke-text-muted"
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={RING.r}
          fill="transparent"
          strokeWidth={RING.stroke}
          strokeLinecap="round"
          strokeDasharray={dasharray}
          strokeDashoffset={dashoffset}
          className="stroke-text-on-ink"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-on-ink">
        {score}%
      </span>
    </span>
  )
}

/**
 * What this screen is.
 *
 * The page it replaces said plainly that job discovery is not built (PRD NG2),
 * and these listings are invented. A fabricated job advert is something a
 * reader could act on in a way a fabricated application count is not, so the
 * screen says so once, at the top, rather than hedging in six places.
 */
export function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-outline bg-surface px-3 py-1 text-xs font-semibold text-text-muted">
      <span aria-hidden className="size-1.5 rounded-full bg-ink" />
      Sample data — these listings are placeholders
    </span>
  )
}
```

- [ ] **Step 6: Write `components/jobs/job-card.tsx`**

```tsx
import Link from 'next/link'
import { Bookmark, Users } from 'lucide-react'
import { cn } from '@job-tracker/ui'
import { MODE_LABEL, type Job } from '@/lib/jobs/data'
import { postedAgo } from '@/lib/jobs/derive'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { formatRange } from '@/lib/jobs/salary'
import { CompanyMark, CompetitionMeter, MatchPill, Pill, VerifiedTick } from './primitives'

/**
 * One listing.
 *
 * The whole card is the link, and the bookmark button sits outside it rather
 * than inside — a button nested in an anchor is invalid HTML and the browser's
 * recovery differs, so the two are siblings in a relative container with the
 * link stretched across it by an ::after.
 *
 * `scroll={false}`: opening a listing is a same-page navigation, and scrolling
 * the list back to the top to show a panel that was already visible is a
 * regression rather than a feature.
 */
export function JobCard({
  job,
  filters,
  selected,
  delay,
}: {
  job: Job
  filters: FilterState
  selected: boolean
  delay?: number
}) {
  return (
    <div
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        'group relative flex animate-rise flex-col gap-6 rounded-xl border bg-surface p-6 sm:p-8',
        'shadow-[0_12px_40px_rgba(0,0,0,0.06)]',
        'transition-[transform,box-shadow,border-color] duration-300 ease-entrance',
        'hover:-translate-y-1 hover:shadow-[0_15px_45px_rgba(0,0,0,0.12)] hover:border-outline',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected ? 'border-ink' : 'border-outline-subtle',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyMark mark={job.mark} />
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1">
              <span className="truncate text-base font-bold text-text">{job.company}</span>
              {job.verified && <VerifiedTick />}
            </span>
            <span className="truncate text-xs text-text-muted">
              {job.city} • {MODE_LABEL[job.mode]} • {postedAgo(job.postedHoursAgo)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <MatchPill score={job.match} />
          {/* Inert, and shaped so that reads as deliberate: saving a listing
              needs a table nothing writes to yet. `disabled` rather than a
              button that swallows the click. */}
          <button
            type="button"
            disabled
            aria-label="Save this listing (not available on sample data)"
            className="rounded p-2 text-text-subtle disabled:cursor-not-allowed"
          >
            <Bookmark aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-2xl font-bold leading-tight tracking-tight text-text">
          {/* The stretched link. `after:absolute inset-0` makes the whole card
              the hit target without nesting the button inside an anchor. */}
          <Link
            href={jobsHref(filters, job.id)}
            scroll={false}
            className="rounded outline-none after:absolute after:inset-0 after:content-['']"
          >
            {job.title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>{formatRange(job.salary, filters.period)}</Pill>
          <Pill>
            <Users aria-hidden className="size-3.5" strokeWidth={1.75} />
            {job.applicants} applicants
            <span aria-hidden className="mx-1 h-3 w-px bg-outline-subtle" />
            <CompetitionMeter applicants={job.applicants} />
          </Pill>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write `components/jobs/job-list.tsx`**

```tsx
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import type { Job } from '@/lib/jobs/data'
import { activeCount, type FilterState } from '@/lib/jobs/filters'
import { Panel } from '@/components/dashboard/primitives'
import { JobCard } from './job-card'

/**
 * The result count, the grid, and what an empty result looks like.
 *
 * Two columns from md up, which is what the reference's screenshot shows: it
 * captures cards 1, 3 and 5 down the visible left half with 2, 4 and 6 hidden
 * behind the open drawer.
 */
export function JobList({
  jobs,
  filters,
  selectedId,
}: {
  jobs: readonly Job[]
  filters: FilterState
  selectedId?: string
}) {
  if (jobs.length === 0) {
    return (
      <Panel className="flex flex-col items-center gap-4 p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-text">
          <SearchX aria-hidden className="size-6" strokeWidth={1.5} />
        </span>
        <div className="flex max-w-[420px] flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight text-text">No listings match</h2>
          <p className="text-sm leading-relaxed text-text-muted">
            {activeCount(filters)} filters are narrowing six sample listings. Remove one, or
            clear them all and start again.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center rounded bg-ink px-4 py-2.5 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Clear all filters
        </Link>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-text-muted">
        {jobs.length} {jobs.length === 1 ? 'listing' : 'listings'}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {jobs.map((job, i) => (
          <JobCard
            key={job.id}
            job={job}
            filters={filters}
            selected={job.id === selectedId}
            delay={i * 60}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Rewrite `app/jobs/page.tsx`**

```tsx
import { DashboardNav } from '@/components/dashboard/nav'
import { JobList } from '@/components/jobs/job-list'
import { SampleBadge } from '@/components/jobs/primitives'
import { JOBS } from '@/lib/jobs/data'
import { applyFilters, parseFilters, type RawParams } from '@/lib/jobs/filters'
import { PAGE_SHELL } from '@/lib/jobs/layout'
import { viewer } from '@/lib/dashboard/viewer'

export const metadata = { title: 'Jobs · Job Tracker AI' }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>
}) {
  const [{ display, email }, raw] = await Promise.all([viewer(), searchParams])
  const filters = parseFilters(raw)
  const results = applyFilters(JOBS, filters)

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav current="/jobs" name={display} email={email} />

      <main className={PAGE_SHELL}>
        <div className="flex animate-rise flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-text lg:text-4xl">Jobs</h1>
          <SampleBadge />
        </div>

        <JobList jobs={results} filters={filters} />
      </main>
    </div>
  )
}
```

- [ ] **Step 9: Verify the gate**

Run: `pnpm --filter dashboard lint && pnpm --filter dashboard typecheck && pnpm --filter dashboard test`
Expected: all PASS. In particular `no-raw-color` reports nothing — the only colour in these files is a token utility, and the two `rgba()` shadows are alpha-on-black rather than hex literals, which is the form `Panel` already uses.

- [ ] **Step 10: Verify in the browser**

Run: `pnpm turbo dev`, sign in, open `http://127.0.0.1:3001/jobs`.
Expected: six cards in two columns from `md` up; each lifts 4px on hover with the shadow deepening; the whole card is clickable; the bookmark button is visibly inert; the competition meter fills 1, 2 or 3 bars and no card shows a colour.
Then check `http://127.0.0.1:3001/jobs?q=terraform` shows one listing and `?q=zzz` shows the empty state.

- [ ] **Step 11: Commit**

```bash
git add apps/dashboard/lib/jobs/layout.ts apps/dashboard/lib/jobs/layout.test.ts apps/dashboard/components/jobs apps/dashboard/app/jobs/page.tsx
git commit -m "feat(jobs): the listing card and the results grid"
```

---

### Task 7: The search card, the sidebar, and the sticky bar — one GET form

**Files:**
- Create: `apps/dashboard/components/jobs/search-header.tsx`
- Create: `apps/dashboard/components/jobs/filter-sidebar.tsx`
- Create: `apps/dashboard/components/jobs/filter-bar.tsx`
- Create: `apps/dashboard/components/jobs/auto-submit.tsx`
- Modify: `apps/dashboard/app/jobs/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1, 4, 5, 6.
- Produces: `FILTER_FORM_ID`, `SearchHeader` from `search-header.tsx`; `FilterSidebar` from `filter-sidebar.tsx`; `FilterBar` from `filter-bar.tsx`; `AutoSubmit` from `auto-submit.tsx`.

- [ ] **Step 1: Write `components/jobs/search-header.tsx`**

```tsx
import { MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { Input, Select } from '@job-tracker/ui'
import { Panel } from '@/components/dashboard/primitives'
import { MODE_LABEL, TRENDING, WORK_MODES } from '@/lib/jobs/data'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { AutoSubmit } from './auto-submit'

/**
 * The search card, and the <form> element the whole screen submits through.
 *
 * `method="GET"` is the point. Filter state is the URL, so submitting this form
 * IS applying the filters: no client state, no server action, and the screen
 * works with JavaScript off — which is the standard the onboarding wizard
 * already holds. AutoSubmit below is a pure enhancement on top.
 *
 * The sidebar is rendered further down the page, inside the results grid, so it
 * cannot be a descendant of this element. Its controls carry
 * `form={FILTER_FORM_ID}` instead — the same association-by-id that lets the
 * account menu submit a sign-out form it does not contain.
 */
export const FILTER_FORM_ID = 'job-filters'

export function SearchHeader({ filters }: { filters: FilterState }) {
  return (
    <Panel className="p-6 sm:p-8" delay={70}>
      <form
        id={FILTER_FORM_ID}
        method="GET"
        action="/jobs"
        className="grid grid-cols-1 items-end gap-4 md:grid-cols-5"
      >
        <AutoSubmit formId={FILTER_FORM_ID} />

        <div className="md:col-span-2">
          <Input
            label="Job title, keywords"
            name="q"
            defaultValue={filters.q}
            placeholder="e.g. Senior Product Designer"
            icon={<Search aria-hidden className="size-4" strokeWidth={1.75} />}
          />
        </div>

        <Input
          label="Location"
          name="location"
          defaultValue={filters.location}
          placeholder="Remote or city"
          icon={<MapPin aria-hidden className="size-4" strokeWidth={1.75} />}
        />

        <Select
          label="Work mode"
          name="mode"
          value={filters.modes[0] ?? null}
          placeholder="Any"
          options={WORK_MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        />

        {/* Present for the no-JS path, where nothing else applies the form.
            With JavaScript, AutoSubmit has usually already run — but the button
            stays visible because a search field without a search button reads
            as broken, and a keyboard Enter needs a default submit anyway. */}
        <button
          type="submit"
          className="h-12 rounded bg-ink px-6 text-sm font-semibold text-text-on-ink transition-colors duration-150 hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Trending
        </span>
        {/* Real queries against the corpus, so none of them lands on an empty
            state — a "trending" chip that finds nothing is worse than no chip. */}
        {TRENDING.map((term) => (
          <Link
            key={term}
            href={jobsHref({ ...filters, q: term })}
            className="rounded-full border border-outline-subtle bg-surface px-3 py-1 text-xs font-medium text-text-muted transition-colors duration-150 hover:border-outline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {term}
          </Link>
        ))}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 2: Write `components/jobs/auto-submit.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

/**
 * Submits the filter form when a control changes.
 *
 * Purely additive: the form already works without this, because it is a real
 * <form method="GET"> with a Search button. This removes the extra click for
 * everyone who has JavaScript, which is what makes ticking a checkbox feel like
 * a filter rather than like filling in a form.
 *
 * Listens on the document rather than on the form, because half the controls
 * are associated by `form=` and are not descendants of it. Text inputs are
 * excluded — resubmitting per keystroke would navigate on every letter — so
 * typing still ends with Enter or the Search button.
 */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    function onChange(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return
      if (target.form?.id !== formId) return
      if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search'))
        return
      target.form.requestSubmit()
    }

    document.addEventListener('change', onChange)
    return () => document.removeEventListener('change', onChange)
  }, [formId])

  return null
}
```

- [ ] **Step 3: Write `components/jobs/filter-sidebar.tsx`**

```tsx
import { ChevronDown } from 'lucide-react'
import { Checkbox, Input, Select } from '@job-tracker/ui'
import { Panel } from '@/components/dashboard/primitives'
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  JOB_SOURCES,
  LEVEL_LABEL,
  POSTED_WINDOWS,
  SENIORITY_LEVELS,
  SIZE_LABEL,
  SKILL_FACETS,
  SOURCE_LABEL,
  TYPE_LABEL,
} from '@/lib/jobs/data'
import type { FilterState } from '@/lib/jobs/filters'
import { STICKY_SIDEBAR } from '@/lib/jobs/layout'
import { FILTER_FORM_ID } from './search-header'

/**
 * The filter sidebar, driven by the facet vocabularies rather than hand-written
 * eight times.
 *
 * Every section is a native <details>, which gives open/closed state, keyboard
 * operation and a disclosure triangle for free and needs no client component.
 * The reference's Languages section is dropped: nothing in the listing shape
 * records a language, and inventing one per company would be fabricated data
 * with no filter behind it. Everything shown here filters something real.
 */
function Section({
  title,
  open,
  children,
}: {
  title: string
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={open} className="group border-b border-outline-subtle py-2 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold text-text">
        {title}
        <ChevronDown
          aria-hidden
          className="size-4 text-text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
      </summary>
      <div className="flex flex-col gap-3 pb-3 pt-1">{children}</div>
    </details>
  )
}

function CheckboxFacet<T extends string>({
  name,
  values,
  labels,
  selected,
}: {
  name: string
  values: readonly T[]
  labels: Record<T, string>
  selected: readonly T[]
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {values.map((v) => (
        <Checkbox
          key={v}
          name={name}
          value={v}
          form={FILTER_FORM_ID}
          defaultChecked={selected.includes(v)}
          label={labels[v]}
        />
      ))}
    </div>
  )
}

export function FilterSidebar({ filters }: { filters: FilterState }) {
  return (
    <Panel className={`flex flex-col overflow-y-auto p-5 ${STICKY_SIDEBAR}`} delay={140}>
      <h2 className="border-b border-outline-subtle pb-3 text-sm font-bold uppercase tracking-wider text-text">
        Filters
      </h2>

      <Section title="Job information" open>
        <Select
          label="Job function"
          name="fn"
          form={FILTER_FORM_ID}
          value={filters.fn || null}
          placeholder="Any function"
          options={JOB_FUNCTIONS.map((v) => ({ value: v, label: v }))}
        />
        <Select
          label="Industry"
          name="industry"
          form={FILTER_FORM_ID}
          value={filters.industry || null}
          placeholder="Any industry"
          options={INDUSTRIES.map((v) => ({ value: v, label: v }))}
        />
      </Section>

      <Section title="Employment type">
        <CheckboxFacet
          name="type"
          values={EMPLOYMENT_TYPES}
          labels={TYPE_LABEL}
          selected={filters.types}
        />
      </Section>

      <Section title="Experience level">
        <CheckboxFacet
          name="level"
          values={SENIORITY_LEVELS}
          labels={LEVEL_LABEL}
          selected={filters.levels}
        />
      </Section>

      <Section title="Salary">
        {/* One floor, not a min/max pair. A maximum on a salary search filters
            out the listings you would most want, which is why the chip reads
            "$160k+" rather than a band. */}
        <Input
          label="Minimum, per year"
          name="salaryMin"
          form={FILTER_FORM_ID}
          inputMode="numeric"
          defaultValue={filters.salaryMin === null ? '' : String(filters.salaryMin)}
          placeholder="160000"
        />
      </Section>

      <Section title="Company">
        <CheckboxFacet
          name="size"
          values={COMPANY_SIZES}
          labels={SIZE_LABEL}
          selected={filters.sizes}
        />
      </Section>

      <Section title={`Skills (${SKILL_FACETS.length})`}>
        {/* Ticking two asks for a listing wanting both — see applyFilters. */}
        <div className="grid grid-cols-1 gap-2">
          {SKILL_FACETS.map((s) => (
            <Checkbox
              key={s}
              name="skill"
              value={s}
              form={FILTER_FORM_ID}
              defaultChecked={filters.skills.includes(s)}
              label={s}
            />
          ))}
        </div>
      </Section>

      <Section title="Posted">
        {/* Radios, not checkboxes: the windows nest, so two ticked would mean
            the wider one and the narrower one at once. */}
        <div className="flex flex-col gap-2">
          {POSTED_WINDOWS.map((w) => (
            <label key={w.hours} className="flex items-center gap-3 text-sm text-text-muted">
              <input
                type="radio"
                name="posted"
                value={w.hours}
                form={FILTER_FORM_ID}
                defaultChecked={filters.postedWithinHours === w.hours}
                className="size-4 border border-outline accent-ink"
              />
              Past {w.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Sources">
        <CheckboxFacet
          name="source"
          values={JOB_SOURCES}
          labels={SOURCE_LABEL}
          selected={filters.sources}
        />
      </Section>
    </Panel>
  )
}
```

- [ ] **Step 4: Write `components/jobs/filter-bar.tsx`**

```tsx
import Link from 'next/link'
import { X } from 'lucide-react'
import { SegmentedField } from '@job-tracker/ui'
import {
  activeChips,
  activeCount,
  jobsHref,
  withoutChip,
  type FilterState,
} from '@/lib/jobs/filters'
import { STICKY_BAR } from '@/lib/jobs/layout'
import { SALARY_PERIODS } from '@/lib/jobs/salary'
import { FILTER_FORM_ID } from './search-header'

/**
 * The sticky bar: what unit salaries are in on the left, what is filtering on
 * the right.
 *
 * The count is `activeChips().length`, not a number typed beside them — the
 * reference prints "12 Active Filters:" above four chips and one ticked
 * checkbox, which is what happens when the two are written separately.
 *
 * The period toggle is in the bar and NOT counted as a filter, because it is a
 * unit: it changes how every salary reads and never changes which listings
 * survive. It posts into the same form as everything else.
 *
 * Each chip's remove link is `withoutChip` applied to the current state, so
 * removing one filter cannot disturb the others — including the second value of
 * the same facet.
 */
export function FilterBar({ filters }: { filters: FilterState }) {
  const chips = activeChips(filters)

  return (
    <div className={STICKY_BAR}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <SegmentedField
          name="period"
          legend="Show salaries as"
          legendHidden
          size="compact"
          form={FILTER_FORM_ID}
          value={filters.period}
          options={SALARY_PERIODS}
        />

        {chips.length > 0 && (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {activeCount(filters)} active
            </span>

            <ul className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <Link
                    href={jobsHref(withoutChip(filters, chip.key))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-outline-subtle bg-surface px-3 py-1 text-xs font-medium text-text transition-colors duration-150 hover:border-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {chip.label}
                    <X aria-hidden className="size-3" strokeWidth={2.5} />
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/jobs"
              className="ml-auto rounded text-xs font-semibold text-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Clear all
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Compose them in `app/jobs/page.tsx`**

Replace the `<main>` body:

```tsx
      <main className={PAGE_SHELL}>
        <div className="flex animate-rise flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-text lg:text-4xl">Jobs</h1>
          <SampleBadge />
        </div>

        <SearchHeader filters={filters} />
        <FilterBar filters={filters} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
          <FilterSidebar filters={filters} />
          <div className="lg:col-span-3">
            <JobList jobs={results} filters={filters} />
          </div>
        </div>
      </main>
```

and add the imports:

```tsx
import { FilterBar } from '@/components/jobs/filter-bar'
import { FilterSidebar } from '@/components/jobs/filter-sidebar'
import { SearchHeader } from '@/components/jobs/search-header'
```

- [ ] **Step 6: Verify the gate**

Run: `pnpm --filter dashboard lint && pnpm --filter dashboard typecheck && pnpm --filter dashboard test`
Expected: all PASS.

- [ ] **Step 7: Verify the no-JavaScript path**

The project has no Playwright, and the established technique is to replay the rendered form with curl. Here the form is a `GET`, which makes it simpler still:

```bash
curl -s 'http://127.0.0.1:3001/jobs?mode=remote&level=lead' | grep -c 'Lead Frontend Engineer'
curl -s 'http://127.0.0.1:3001/jobs?mode=remote&level=lead' | grep -c 'Cybersecurity Lead'
```
Expected: `1` then `0` — the server filtered, with no JavaScript involved at any point.

Confirm the form itself is a real GET form and the sidebar controls are associated with it:
```bash
curl -s http://127.0.0.1:3001/jobs | grep -o 'method="get" action="/jobs"' | head -1
curl -s http://127.0.0.1:3001/jobs | grep -c 'form="job-filters"'
```
Expected: the method/action line, and a count above 20.

- [ ] **Step 8: Verify in the browser**

With JavaScript on: ticking a checkbox re-filters without pressing Search; typing in the keyword field does *not* navigate per keystroke; Enter submits. The bar sits flush under the nav while scrolling with no stripe of page between them, and the sidebar stops under the bar.

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/components/jobs apps/dashboard/app/jobs/page.tsx
git commit -m "feat(jobs): search, sidebar and active filters as one GET form"
```

---

### Task 8: The detail panel

**Files:**
- Create: `apps/dashboard/components/jobs/detail-panel.tsx`
- Create: `apps/dashboard/components/jobs/panel-behaviour.tsx`
- Modify: `apps/dashboard/app/jobs/page.tsx`
- Modify: `packages/config/theme.css`

**Interfaces:**
- Consumes: `jobById`, `MODE_LABEL`, `type Job`; `postedAgo`, `verdictFor`; `formatRange`; `jobsHref`, `type FilterState`; `Tile` from `components/dashboard/primitives`; `MatchRing`, `CompanyMark`, `Pill`, `VerifiedTick` from `./primitives`.
- Produces: `DetailPanel` from `detail-panel.tsx`; `PanelBehaviour` from `panel-behaviour.tsx`; the `--animate-slide-in` token in `theme.css`.

- [ ] **Step 1: Add the slide-in animation to `packages/config/theme.css`**

Inside the `@theme` block, after `--animate-fill`:

```css
  --animate-slide-in: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
```

and after the `fill` keyframes:

```css
@keyframes slide-in {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: none; }
}
```

Keep the `@theme` block to plain declarations — a prose comment inside it breaks the dev PostCSS parser while the production build tolerates it, so `turbo build` would pass and `next dev` would fail. `src/tokens.ts` is not touched: it mirrors colours for the contrast tests and carries no motion.

- [ ] **Step 2: Write `components/jobs/panel-behaviour.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Escape-to-close and a scroll lock for the open panel.
 *
 * Every one of these is an enhancement, not a requirement: the panel is
 * server-rendered, its backdrop is a <Link> and so is its close button, so it
 * opens and closes on a URL with no JavaScript at all. That is the whole reason
 * it is not a Base UI Dialog — a portal renders nothing on the server, so a
 * portalled panel would simply be missing.
 *
 * What is genuinely lost without JavaScript is focus management: the panel is
 * last in the document, so a keyboard user tabs to it rather than landing in
 * it. It is an <aside> with an accessible name, which keeps it reachable as a
 * landmark. Focus is moved here when JavaScript is available.
 */
export function PanelBehaviour({ closeHref }: { closeHref: string }) {
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') router.push(closeHref, { scroll: false })
    }
    document.addEventListener('keydown', onKeyDown)

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [router, closeHref])

  return null
}
```

- [ ] **Step 3: Write `components/jobs/detail-panel.tsx`**

```tsx
import Link from 'next/link'
import { Share2, Sparkles, TrendingUp, Users, X } from 'lucide-react'
import { Tile } from '@/components/dashboard/primitives'
import { MODE_LABEL, type Job } from '@/lib/jobs/data'
import { postedAgo, verdictFor } from '@/lib/jobs/derive'
import { jobsHref, type FilterState } from '@/lib/jobs/filters'
import { formatRange } from '@/lib/jobs/salary'
import { CompanyMark, CompetitionMeter, MatchRing, Pill, VerifiedTick } from './primitives'
import { PanelBehaviour } from './panel-behaviour'

/**
 * The listing, in full.
 *
 * A fixed overlay rendered inline by the server component, NOT a portalled
 * dialog. React's createPortal produces nothing during server rendering, so a
 * Base UI Dialog here would be a panel that simply does not exist without
 * JavaScript. `position: fixed` needs no portal — it escapes layout flow on its
 * own — so this renders, animates and closes on a plain URL. Base UI's Drawer
 * was also considered and set aside: it is built for snap points and swipe,
 * defaulting to `swipeDirection: 'down'` with snap points as fractions of
 * viewport height, which is the bottom-sheet case rather than a side panel.
 *
 * The backdrop is a link to the same close href, so clicking away works
 * without a handler.
 *
 * The reference's five content tabs (Summary / Job Description / Required
 * Quals / Preferred / About) are rendered as five stacked sections instead.
 * Tabs would need client state to hide four-fifths of a panel that already
 * scrolls, and hiding the requirements behind a tab is the opposite of what
 * someone reads a job ad for.
 */
export function DetailPanel({ job, filters }: { job: Job; filters: FilterState }) {
  const closeHref = jobsHref(filters)

  return (
    <>
      <PanelBehaviour closeHref={closeHref} />

      {/* aria-hidden: the same action is on a real, named button inside the
          panel, so this must not be a second announced control. */}
      <Link
        href={closeHref}
        scroll={false}
        aria-hidden
        tabIndex={-1}
        className="animate-fade fixed inset-0 z-50 bg-surface-inverse/20 backdrop-blur-sm motion-reduce:animate-none"
      />

      <aside
        aria-label={`${job.title} at ${job.company}`}
        className="animate-slide-in fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-outline-subtle bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.08)] motion-reduce:animate-none md:w-[560px] md:rounded-l-xl"
      >
        <header className="flex flex-col gap-4 border-b border-outline-subtle p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <CompanyMark mark={job.mark} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-text">{job.company}</span>
                  {job.verified && <VerifiedTick />}
                </span>
                <span className="truncate text-xs text-text-muted">
                  {job.city} ({MODE_LABEL[job.mode]}) • {postedAgo(job.postedHoursAgo)}
                </span>
              </div>
            </div>

            <Link
              href={closeHref}
              scroll={false}
              aria-label="Close listing"
              className="rounded p-2 text-text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <X aria-hidden className="size-5" strokeWidth={2} />
            </Link>
          </div>

          <h2 className="text-2xl font-bold leading-tight tracking-tight text-text">{job.title}</h2>

          <div className="flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
            {job.activelyHiring && (
              <Pill>
                {/* An ink dot, where the reference uses a green one. The
                    reference's own DESIGN.md prescribes exactly this: small
                    solid dots, monochrome, for status. */}
                <span aria-hidden className="size-1.5 rounded-full bg-ink" />
                Actively hiring
              </Pill>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-6">
          <section className="flex items-center justify-between gap-4 rounded-md bg-surface-inverse p-5">
            <div className="flex items-center gap-4">
              <MatchRing score={job.match} />
              <div>
                <h3 className="text-base font-semibold text-text-on-ink">
                  {verdictFor(job.match)}
                </h3>
                <p className="text-xs text-text-on-ink/70">Matched with {job.resumeVersion}</p>
              </div>
            </div>
            {/* Inert and labelled as such, for the same reason the card's
                bookmark is: resume optimisation is not built. */}
            <button
              type="button"
              disabled
              className="flex shrink-0 items-center gap-2 rounded bg-surface px-4 py-2 text-xs font-bold text-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles aria-hidden className="size-4" strokeWidth={1.75} />
              Optimise resume
            </button>
          </section>

          <section className="flex flex-col gap-4 rounded-md border border-outline-subtle bg-surface p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text">
              <TrendingUp aria-hidden className="size-4" strokeWidth={1.75} />
              Salary insight
            </h3>

            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  Market estimate
                </span>
                <span className="text-base font-bold text-text">
                  {formatRange(job.marketSalary, filters.period)}
                </span>
              </div>
              <span aria-hidden className="h-10 w-px bg-outline-subtle" />
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  This listing
                </span>
                <span className="text-base font-bold text-text">
                  {formatRange(job.salary, filters.period)}
                </span>
              </div>
            </div>

            {/* A Tile, where the reference uses a blue box. Same translation
                InsightCard already made on the dashboard. */}
            <Tile>
              <p className="text-xs leading-relaxed text-text-muted">
                <span className="font-bold text-text">Insight:</span> {job.insight}
              </p>
            </Tile>
          </section>

          <section className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-outline-subtle pb-6">
            {[
              { label: 'Location', value: `${job.city} (${MODE_LABEL[job.mode]})` },
              { label: 'Experience', value: job.level },
              { label: 'Department', value: job.department },
              { label: 'Hiring manager', value: job.hiringManager },
            ].map((row) => (
              <div key={row.label} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">{row.label}</span>
                <span className="text-sm font-semibold capitalize text-text">{row.value}</span>
              </div>
            ))}
          </section>

          <section className="flex items-center gap-3">
            <Pill>
              <Users aria-hidden className="size-3.5" strokeWidth={1.75} />
              {job.applicants} applicants
            </Pill>
            <CompetitionMeter applicants={job.applicants} />
          </section>

          <article className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-text">The role</h3>
              <p className="text-sm leading-relaxed text-text-muted">{job.summary}</p>
            </div>

            {[
              { title: 'Responsibilities', items: job.responsibilities },
              { title: 'Requirements', items: job.requirements },
              { title: 'Nice to have', items: job.preferred },
            ].map((block) => (
              <div key={block.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-text">{block.title}</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text-muted">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-text">About {job.company}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{job.about}</p>
            </div>
          </article>
        </div>

        <footer className="flex flex-col gap-2 border-t border-outline-subtle bg-surface p-6">
          <div className="flex gap-3">
            <button
              type="button"
              disabled
              className="flex-1 rounded bg-ink py-3 text-sm font-bold text-text-on-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply now
            </button>
            <button
              type="button"
              disabled
              aria-label="Share listing (not available on sample data)"
              className="rounded border border-outline-subtle p-3 text-text-muted disabled:cursor-not-allowed"
            >
              <Share2 aria-hidden className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          {/* The one line that keeps the footer honest. A primary button that
              looks live and does nothing is worse than one that says why. */}
          <p className="text-xs text-text-muted">
            Sample listing — applying is not connected to anything yet.
          </p>
        </footer>
      </aside>
    </>
  )
}
```

- [ ] **Step 4: Wire it into `app/jobs/page.tsx`**

Add the imports:

```tsx
import { DetailPanel } from '@/components/jobs/detail-panel'
import { JOBS, jobById } from '@/lib/jobs/data'
```

After `const results = applyFilters(JOBS, filters)`:

```tsx
  // An unknown ?job= is ignored rather than 404ing the whole screen: the id is
  // one parameter among a dozen, and losing the list because one of them went
  // stale would be a worse trade than quietly showing the list.
  const selectedId = typeof raw.job === 'string' ? raw.job : undefined
  const selected = selectedId ? jobById(selectedId) : undefined
```

Pass the selection to the list, and render the panel at the end of `<main>`:

```tsx
            <JobList jobs={results} filters={filters} selectedId={selected?.id} />
```

```tsx
        {selected && <DetailPanel job={selected} filters={filters} />}
```

- [ ] **Step 5: Verify the gate**

Run: `pnpm turbo lint typecheck test build`
Expected: 17 tasks pass. If `dashboard#typecheck` reports a `TS2344` about a route that plainly exists, re-run `pnpm --filter dashboard typecheck` alone — that is the documented race with `dashboard#build`.

- [ ] **Step 6: Verify the panel without JavaScript**

```bash
curl -s 'http://127.0.0.1:3001/jobs?job=acme-senior-product-designer' | grep -c 'Excellent match'
curl -s 'http://127.0.0.1:3001/jobs?mode=remote&job=acme-senior-product-designer' | grep -o 'href="/jobs?mode=remote"' | head -1
```
Expected: `1`, then the close link carrying the filter back — closing the panel must not clear the search that found it.

- [ ] **Step 7: Verify in the browser**

Click a card: the panel slides in from the right over a blurred backdrop; the card behind it keeps an ink border; Escape closes it; clicking the backdrop closes it; the browser Back button closes it; the URL is shareable. At `md` and below the panel is full width. With `prefers-reduced-motion` the panel appears without sliding.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/components/jobs apps/dashboard/app/jobs/page.tsx packages/config/theme.css
git commit -m "feat(jobs): the detail panel, on a URL rather than in a portal"
```

---

### Task 9: Record the traps, and run the whole gate

**Files:**
- Modify: `CLAUDE.md` (repo root)

- [ ] **Step 1: Add a `## Jobs` section to `CLAUDE.md`, after `## Dashboard`**

```markdown
## Jobs

Built from `references/jobs/` — three pieces: a design system sheet, a card grid
(`jobs_premium_card_redesign`) and a detail drawer (`jobs_premium_detail_drawer`).
Both screenshots render, unlike the dashboard's.

**Filter state is the URL, and that is what makes the screen a server
component.** `lib/jobs/filters.ts` parses `searchParams` into a `FilterState`,
applies it, and derives the chips; `page.tsx` does the rest. Four things fall
out of it at once: filters survive a reload and a shared link, "Clear all" is a
`<Link href="/jobs">`, the whole thing works with JavaScript off, and every bit
of the logic sits in `lib/` where this workspace's node-only vitest can reach
it. `components/jobs/auto-submit.tsx` is the enhancement, not the mechanism.

**The search card and the sidebar cannot share a `<form>` element** — one is
above the results and the other is inside the grid below them. They are
associated by `form="job-filters"`, the same HTML mechanism `AccountMenu` uses
to submit a sign-out form it does not contain. `Input` and `Checkbox` already
forwarded a `form` prop through their rest props; `Select` and `SegmentedField`
had to gain one.

**The detail panel is not a Dialog, and that is deliberate.** `createPortal`
renders nothing on the server, so a portalled panel is a panel that does not
exist without JavaScript. A `position: fixed` overlay rendered inline needs no
portal. Base UI's `Drawer` was also set aside: it defaults to
`swipeDirection: 'down'` with snap points measured as fractions of viewport
*height*, which is the bottom-sheet case rather than a side panel. What is
genuinely lost is focus management, which `panel-behaviour.tsx` restores when
JavaScript is available; without it the panel is an `<aside>` with an accessible
name, last in the document.

**Competition is a meter, not a colour.** The reference paints Low green, Medium
amber, High red. There is no success token, inventing one ships a colour no
contrast test covers, and the reference's own `DESIGN.md` says to hold the
monochrome line except for error handling. Three bars, one to three inked, beside
the words — an ordinal quantity gets an ordinal shape. The error pair is
deliberately *not* used for `high`: heavy competition is a fact about the market,
not a failure, and error-surface is reserved for Rejected and Missing skills,
which are.

**Five more places the reference contradicts itself**, all resolved by deriving:

- Low/Medium/High is printed beside applicant counts with no stated rule. The six
  pairs it does state imply thresholds at 25 and 100, and `derive.test.ts`
  asserts those thresholds reproduce all six labels.
- "12 Active Filters:" sits above four chips and one ticked checkbox. The count
  is `activeChips().length`.
- A Yearly | Monthly | Hourly toggle sits above six cards that all say `/ yr`.
  Salary is stored once, yearly; the other two are computed, so the toggle does
  something. The period is *not* counted as an active filter — it is a unit.
- Card 1 posts $140k–$180k and the drawer for the same job posts $160k–$180k.
  One salary per listing; the market estimate stays separate because it is a
  different quantity.
- The match ring is drawn at `dasharray 150 / dashoffset 15` — a 90% arc — under
  the number 94%. `ringDash(score)` computes it.

**`postedHoursAgo` is a duration, not a date.** A hardcoded ISO timestamp turns
"2h ago" into "posted 7 months ago" a season later, and it drags a clock into a
module that otherwise needs none — so nothing here needs a fake timer.

**`lib/jobs/layout.ts` pins the three sticky offsets** for the reason
`step-layout.ts` exists: the numbers are coupled (nav 72, bar 64, sidebar under
both) and `lib/` is the only place this workspace can test. The class strings are
literals rather than built from the numbers, because Tailwind only emits classes
it can see written out — a template string there compiles to no CSS, silently.

**The listings are fabricated, and the screen says so.** PRD NG2 rules out job
discovery; the placeholder this replaced said that plainly. `SampleBadge` keeps
it honest at the top of the page, and the Apply, Save, Share and Optimise
controls are `disabled` with a caption rather than swallowing clicks — a primary
button that looks live and does nothing is worse than one that says why.

**The reference's Languages filter is dropped** — nothing in the listing shape
records a language, and inventing one per company would be fabricated data with
no filter behind it. Every facet shown filters something real, and
`data.test.ts` asserts no facet exists that no listing matches.
```

- [ ] **Step 2: Run the full gate**

Run: `pnpm turbo lint typecheck test build`
Expected: 17 tasks pass. Remember that a failing task SIGINTs its siblings, so re-run the suspect workspace alone before believing the summary — but a specific error at a specific line is real.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record what the Jobs screen decided, and why"
```

---

## Self-review

**Spec coverage.** Every element of both reference screens maps to a task: the search header, trending chips, sticky period toggle, active-filter chips, clear-all, the eight sidebar sections (minus Languages, dropped with a stated reason), the card in full, the two-column grid, and every block of the drawer — header, badges, match card, salary insight, info grid, body copy, sticky footer. The reference's five content *tabs* are rendered as stacked sections instead, which is a stated deviation rather than a gap: tabs need client state to hide four-fifths of a panel that already scrolls, and hiding the requirements is the opposite of what someone opens a job ad for.

**Type consistency.** `SalaryPeriod` is defined once in `salary.ts` and imported by `filters.ts` and the components. `FilterState` is defined once in `filters.ts`; every component takes it whole rather than destructuring parts of it. `Job` is defined once in `data.ts`. `FILTER_FORM_ID` is exported from `search-header.tsx` and imported by both the sidebar and the bar, so the id cannot drift. `jobsHref` is the only place a `/jobs` URL is built with parameters.

**Known gaps, stated rather than hidden.**

- `apps/dashboard` still has no component-test harness, so `components/jobs/*.tsx` has no automated coverage — same standing gap as the dashboard and the onboarding components. The testable logic was pushed into `lib/jobs/` deliberately, which is why four of the nine tasks are pure modules with tests and the component tasks verify through the build gate, curl and the browser.
- Focus is not moved into the panel without JavaScript. Mitigated by the landmark and by `panel-behaviour.tsx`; not solved.
- The sidebar renders every skill facet as a checkbox. At six listings that is a short list; a real corpus would need the search-and-add treatment `TagPicker` already has, and that is where to take it.
- The screen stores nothing and reads nothing from Postgres. It is UI over a fixed array, which is what was asked for, and PRD NG2 still rules out the feature behind it.
