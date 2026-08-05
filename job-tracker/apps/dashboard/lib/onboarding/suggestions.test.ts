import { describe, expect, it } from 'vitest'
import {
  flattenSections,
  ROLE_SECTIONS,
  SKILL_SECTIONS,
  type Section,
} from './suggestions'

const LISTS: Array<[string, readonly Section[]]> = [
  ['roles', ROLE_SECTIONS],
  ['skills', SKILL_SECTIONS],
]

describe.each(LISTS)('%s', (_name, sections) => {
  const items = flattenSections(sections)

  it('offers no duplicates, even across sections', () => {
    // Sections are grouped by industry and industries overlap, so the same title
    // is easy to file twice. A duplicate shows up as a repeated row in the picker.
    const lower = items.map((i) => i.toLowerCase())
    expect(new Set(lower).size).toBe(lower.length)
  })

  it('stays within the length the picker and the AI validator both truncate at', () => {
    expect(items.every((i) => i.length > 0 && i.length <= 60)).toBe(true)
  })

  it('trims cleanly, so a stray space cannot break a match', () => {
    expect(items.every((i) => i === i.trim())).toBe(true)
  })

  it('gives every section a label and at least one item', () => {
    // A section with no items renders as a bare header.
    for (const section of sections) {
      expect(section.label.length).toBeGreaterThan(0)
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it('labels every section distinctly, so two headers cannot read the same', () => {
    const labels = sections.map((s) => s.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('tags every section with at least one domain', () => {
    // An untagged section can never rank, so it only ever appears last.
    expect(sections.filter((s) => s.domains.length === 0).map((s) => s.label)).toEqual([])
  })

  it('never pairs `general` with a specific domain', () => {
    // `general` is the middle ranking tier, and several sections legitimately earn
    // it: Leadership, Professionalism and Communication really do apply to every
    // industry. What breaks the tiers is a section claiming both — "applies
    // everywhere" and "applies here" — because it would then always rank tier-1.
    // The first cut aggregated section domains from the union of their members,
    // which leaked `general` onto Software engineering via "Technical Writer".
    const both = sections.filter((s) => s.domains.includes('general') && s.domains.length > 1)
    expect(both.map((s) => s.label)).toEqual([])
  })

  it('leads with the cross-industry section', () => {
    // rankSections returns the authored order when it can infer nothing, so the
    // opening of the list is what an unreadable CV gets offered.
    expect(sections[0]!.label).toBe('Cross-industry')
    expect(sections[0]!.domains).toEqual(['general'])
  })
})

describe('coverage', () => {
  it('offers enough roles to cover more than software', () => {
    // The picker is offered to sales, healthcare, aviation and maritime CVs too.
    expect(flattenSections(ROLE_SECTIONS).length).toBeGreaterThan(400)
    expect(ROLE_SECTIONS.length).toBeGreaterThan(25)
  })

  it('offers enough skills to serve the industries the roles reach', () => {
    expect(flattenSections(SKILL_SECTIONS).length).toBeGreaterThan(400)
    expect(SKILL_SECTIONS.length).toBeGreaterThan(40)
  })

  it('keeps every section browsable rather than a one-line header', () => {
    // Sections of one or two items are noise as headers; the first cut of the role
    // data had a "Network admin" section with a single entry.
    const thin = [...ROLE_SECTIONS, ...SKILL_SECTIONS].filter((s) => s.items.length < 4)
    expect(thin.map((s) => s.label)).toEqual([])
  })

  it('reaches every domain it declares, so no tag is dead', () => {
    const used = new Set([...ROLE_SECTIONS, ...SKILL_SECTIONS].flatMap((s) => s.domains))
    for (const domain of [
      'software', 'ai', 'data', 'design', 'product', 'sales', 'marketing', 'success',
      'business', 'ops', 'supply', 'manufacturing', 'finance', 'people', 'legal',
      'security', 'it', 'healthcare', 'education', 'media', 'construction',
      'hospitality', 'retail', 'government', 'energy', 'agriculture', 'aviation',
      'maritime', 'executive', 'startup', 'general',
    ] as const) {
      expect(used, `no section is tagged "${domain}"`).toContain(domain)
    }
  })

  it('keeps a cross-industry core in the skills list for CVs from any industry', () => {
    // The skills list is still weighted toward software and office work. Until it
    // is broadened, Cross-industry is what a nurse or a pilot actually gets.
    const general = SKILL_SECTIONS.find((s) => s.label === 'Cross-industry')!
    expect(general.items.length).toBeGreaterThanOrEqual(10)
  })
})

describe('flattenSections', () => {
  it('returns every item in section order', () => {
    const sections: Section[] = [
      { label: 'A', domains: ['software'], items: ['one', 'two'] },
      { label: 'B', domains: ['data'], items: ['three'] },
    ]
    expect(flattenSections(sections)).toEqual(['one', 'two', 'three'])
  })

  it('returns nothing for no sections', () => {
    expect(flattenSections([])).toEqual([])
  })
})
