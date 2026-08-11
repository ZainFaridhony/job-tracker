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
import {
  BASE_CURRENCY,
  formatFigure,
  isSalaryCurrency,
  isSalaryPeriod,
  toBaseCurrency,
  type SalaryCurrency,
  type SalaryPeriod,
} from './salary'

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
  /** Typed in `currency`, not in the corpus's base — the input sits under a
   *  currency picker and its label says which. `applyFilters` moves this one
   *  number into the base rather than moving every listing out of it. */
  salaryMin: number | null
  postedWithinHours: number | null
  /** A display unit, not a filter: it changes how salary reads, never which
   *  listings survive. Excluded from the chips and from the count. */
  period: SalaryPeriod
  /** The other display unit, and the same rule applies — no chip, not counted.
   *  It does reach `applyFilters`, but only to interpret `salaryMin`, never to
   *  admit or reject a listing on its own. */
  currency: SalaryCurrency
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
  currency: BASE_CURRENCY,
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
  const currency = one(raw, 'currency')

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
    currency: isSalaryCurrency(currency) ? currency : BASE_CURRENCY,
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
    //
    // The floor is typed in whichever currency is on screen and every listing
    // is stored in the base, so one side has to move first. Moving the single
    // threshold rather than every listing keeps one conversion per request
    // instead of one per row, and keeps the corpus the only source of truth
    // about what a job pays.
    if (f.salaryMin !== null && job.salary.max < toBaseCurrency(f.salaryMin, f.currency)) {
      return false
    }
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
    // formatFigure, not formatAmount: the floor is already denominated in
    // `f.currency`, so converting it again would show a figure the reader never
    // typed.
    chips.push({
      key: `salaryMin:${f.salaryMin}`,
      label: `${formatFigure(f.salaryMin, f.currency)}+`,
    })
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
  // The defaults are omitted so an untouched screen has a bare /jobs URL.
  if (f.period !== 'yearly') p.set('period', f.period)
  if (f.currency !== BASE_CURRENCY) p.set('currency', f.currency)
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
  const encodedJob = jobId ? `job=${encodeURIComponent(jobId)}` : ''
  const withJob = jobId ? (query ? `${query}&${encodedJob}` : encodedJob) : query
  return withJob ? `/jobs?${withJob}` : '/jobs'
}

/** "Clear all", except for the two fields that are not filters: `period` and
 *  `currency` are display units (see `FilterState`), so resetting them along
 *  with the real filters would silently change how every salary reads as a side
 *  effect of a click that promises only to clear filters. Both the bar's "Clear
 *  all" and the empty state's "Clear all filters" go through this rather than a
 *  bare `href="/jobs"`, so the rule lives in one place instead of being
 *  copy-pasted at each call site. */
export function clearAllHref(f: FilterState): string {
  return jobsHref({ ...EMPTY_FILTERS, period: f.period, currency: f.currency })
}
