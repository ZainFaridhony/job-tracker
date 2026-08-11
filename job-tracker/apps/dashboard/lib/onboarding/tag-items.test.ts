import { describe, expect, it } from 'vitest'
import { includesTag, pairRows, rankSections, sectionItems, tagItems } from './tag-items'
import type { Section } from './suggestions'

const SUGGESTIONS = ['Communication', 'Leadership', 'Project Management', 'Python'] as const

describe('includesTag', () => {
  it('matches regardless of case, because the CV decides the casing', () => {
    expect(includesTag(['Python'], 'python')).toBe(true)
    expect(includesTag(['Python'], 'PYTHON')).toBe(true)
    expect(includesTag(['Python'], 'Rust')).toBe(false)
  })
})

describe('tagItems', () => {
  it('offers the chosen skills first, so an extracted one is a known item', () => {
    // The extractor returns arbitrary strings. If they were not in the pool the
    // picker could not show them as selected.
    const { items } = tagItems(['English (Proficient)'], SUGGESTIONS, '')
    expect(items[0]).toBe('English (Proficient)')
    expect(items).toContain('Communication')
  })

  it('does not offer the same skill twice when it is also a suggestion', () => {
    const { items } = tagItems(['python'], SUGGESTIONS, '')
    expect(items.filter((s) => s.toLowerCase() === 'python')).toEqual(['python'])
  })

  it('filters on a substring, case-insensitively', () => {
    const { items } = tagItems([], SUGGESTIONS, 'man')
    expect(items).toContain('Project Management')
    expect(items).not.toContain('Leadership')
  })

  it('still offers the query when it only partly matches something', () => {
    // Not clutter: "Java" partly matches "JavaScript" but is its own skill, and
    // the only way to add it is for the query to stay selectable. The rule is
    // "offer the query unless it matches an item exactly".
    const { items, isNew } = tagItems([], ['JavaScript'], 'Java')
    expect(items).toEqual(['JavaScript', 'Java'])
    expect(isNew).toBe(true)
  })

  it('appends the query as an item when nothing matches, and flags it', () => {
    // Base UI refuses free-form text; offering the query as an item is the escape.
    const { items, isNew } = tagItems([], SUGGESTIONS, 'Rust')
    expect(items).toEqual(['Rust'])
    expect(isNew).toBe(true)
  })

  it('does not flag a query that already exists', () => {
    const { items, isNew } = tagItems([], SUGGESTIONS, 'python')
    expect(isNew).toBe(false)
    expect(items).toEqual(['Python'])
  })

  it('trims the query before using it as a value', () => {
    const { items } = tagItems([], SUGGESTIONS, '  Rust  ')
    expect(items).toEqual(['Rust'])
  })

  it('offers everything when the query is blank', () => {
    expect(tagItems([], SUGGESTIONS, '   ').items).toHaveLength(SUGGESTIONS.length)
  })
})

describe('pairRows', () => {
  it('pairs items, because Base UI grid navigation is fixed at two columns', () => {
    expect(pairRows(['a', 'b', 'c', 'd'])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('leaves a lone last item in a row of one', () => {
    expect(pairRows(['a', 'b', 'c'])).toEqual([['a', 'b'], ['c']])
  })

  it('has no rows for no items', () => {
    expect(pairRows([])).toEqual([])
  })
})


describe('the opening view', () => {
  const many = Array.from({ length: 100 }, (_, i) => `Role ${i}`)

  it('caps what the picker offers before anyone types', () => {
    // 450+ roles rendered unprompted is a 200-row popup nobody scrolls.
    const { items } = tagItems([], many, '')
    expect(items).toHaveLength(48)
  })

  it('shows every chosen value in full, regardless of the cap', () => {
    // Those are what the user has, not what we are offering.
    const chosen = Array.from({ length: 30 }, (_, i) => `Chosen ${i}`)
    const { items } = tagItems(chosen, many, '')
    expect(items.slice(0, 30)).toEqual(chosen)
    expect(items).toHaveLength(78)
  })

  it('searches the whole list once there is a query, so the cap hides nothing', () => {
    const { items } = tagItems([], many, 'Role 99')
    expect(items).toContain('Role 99')
  })

  it('counts a chosen value only once when the list also contains it', () => {
    const { items } = tagItems(['Role 5'], many, '')
    expect(items.filter((i) => i === 'Role 5')).toHaveLength(1)
  })

  it('does not miscount when the chosen list has case duplicates', () => {
    // pool() dedupes, so slicing by chosen.length would drift.
    const { items } = tagItems(['Go', 'go', 'GO'], many, '')
    expect(items.filter((i) => i.toLowerCase() === 'go')).toHaveLength(1)
    expect(items).toHaveLength(49)
  })

  it('takes the cap from the front, so ranking decides what is visible', () => {
    const { items } = tagItems([], many, '', 3)
    expect(items).toEqual(['Role 0', 'Role 1', 'Role 2'])
  })
})

const SECTIONS: Section[] = [
  { label: 'Cross-industry', domains: ['general'], items: ['Project Manager', 'Consultant'] },
  { label: 'Software engineering', domains: ['software'], items: ['Backend Engineer', 'Tech Lead'] },
  { label: 'Design', domains: ['design'], items: ['Adobe Photoshop', 'Figma'] },
  { label: 'Marketing', domains: ['marketing'], items: ['SEO Specialist', 'Brand Manager'] },
]

describe('rankSections', () => {
  it('leads with the sections the CV is actually in', () => {
    // The complaint this exists to fix: a backend CV was offered Photoshop and
    // Digital Marketing Specialist before anything adjacent to what it said.
    const out = rankSections(SECTIONS, ['Backend Engineer'])
    expect(out[0]!.label).toBe('Software engineering')
  })

  it('puts cross-industry between a match and a miss', () => {
    const labels = rankSections(SECTIONS, ['Backend Engineer']).map((s) => s.label)
    expect(labels.indexOf('Software engineering')).toBeLessThan(labels.indexOf('Cross-industry'))
    expect(labels.indexOf('Cross-industry')).toBeLessThan(labels.indexOf('Design'))
  })

  it('keeps every section, so nothing becomes unreachable', () => {
    const out = rankSections(SECTIONS, ['Backend Engineer'])
    expect(out).toHaveLength(SECTIONS.length)
    expect(new Set(out.map((s) => s.label)).size).toBe(SECTIONS.length)
  })

  it('preserves the authored order inside a tier', () => {
    const labels = rankSections(SECTIONS, ['Figma']).map((s) => s.label)
    expect(labels.indexOf('Software engineering')).toBeLessThan(labels.indexOf('Marketing'))
  })

  it('returns the authored order when the CV gives no signal', () => {
    const authored = SECTIONS.map((s) => s.label)
    expect(rankSections(SECTIONS, []).map((s) => s.label)).toEqual(authored)
    expect(rankSections(SECTIONS, ['Underwater Basket Weaver']).map((s) => s.label)).toEqual(
      authored,
    )
  })

  it('does not treat a cross-industry chip as a domain signal', () => {
    // Almost every CV yields something general. Counting it would put everyone in
    // the same bucket and rank nothing.
    expect(rankSections(SECTIONS, ['Project Manager']).map((s) => s.label)).toEqual(
      SECTIONS.map((s) => s.label),
    )
  })

  it('matches a chosen value case-insensitively', () => {
    expect(rankSections(SECTIONS, ['backend engineer'])[0]!.label).toBe('Software engineering')
  })

  /**
   * The sections above are all single-domain, which is why they never caught
   * this: the defect only appears once a section carries a domain it does not
   * own. The real data did — Sales was tagged `['people', 'sales']` — and a chip
   * in Sales therefore asserted the user was in `people`, which pulled every
   * people-tagged section into the same tier. Software engineering was authored
   * earlier, so it won the tie and a business-development CV opened on
   * "Software Engineer".
   */
  const OVERTAGGED: Section[] = [
    { label: 'Cross-industry', domains: ['general'], items: ['Project Manager'] },
    { label: 'Software engineering', domains: ['people', 'software'], items: ['Backend Engineer'] },
    { label: 'Sales', domains: ['people', 'sales'], items: ['Business Development Manager'] },
    { label: 'People and HR', domains: ['people'], items: ['Recruiter'] },
  ]

  it('leads with the section holding the chip, not one that merely shares a tag', () => {
    const labels = rankSections(OVERTAGGED, ['Business Development Manager']).map((s) => s.label)
    expect(labels[0]).toBe('Sales')
    expect(labels.indexOf('Sales')).toBeLessThan(labels.indexOf('Software engineering'))
  })

  it('still offers tag-related sections, just below the ones with evidence', () => {
    // Relatedness is not thrown away — it is demoted. `people` is shared, so
    // those sections stay ahead of anything unrelated.
    const labels = rankSections(OVERTAGGED, ['Business Development Manager']).map((s) => s.label)
    expect(labels.indexOf('People and HR')).toBeLessThan(labels.indexOf('Cross-industry'))
  })

  it('orders by how many chips a section holds', () => {
    const sections: Section[] = [
      { label: 'A', domains: ['software'], items: ['a1'] },
      { label: 'B', domains: ['sales'], items: ['b1', 'b2'] },
    ]
    expect(rankSections(sections, ['a1', 'b1', 'b2'])[0]!.label).toBe('B')
  })

  it('breaks a tie on the earliest chip, because roles arrive most-recent-first', () => {
    const sections: Section[] = [
      { label: 'Product', domains: ['product'], items: ['Product Analyst'] },
      { label: 'Sales', domains: ['sales'], items: ['Account Executive'] },
    ]
    // One chip each. The current job is listed first, so Sales should lead even
    // though Product is authored earlier.
    const labels = rankSections(sections, ['Account Executive', 'Product Analyst']).map(
      (s) => s.label,
    )
    expect(labels).toEqual(['Sales', 'Product'])
  })

  it('does not let a general chip vouch for unrelated sections', () => {
    // A general chip pins its own section, which is honest — it is where the
    // value lives. What it must not do is emit `general` as a domain and drag
    // every other section up with it.
    const labels = rankSections(OVERTAGGED, ['Project Manager']).map((s) => s.label)
    expect(labels).toEqual(OVERTAGGED.map((s) => s.label))
  })

  it('reads more than one domain off the CV', () => {
    const top = rankSections(SECTIONS, ['Backend Engineer', 'Figma'])
      .slice(0, 2)
      .map((s) => s.label)
    expect(top).toContain('Software engineering')
    expect(top).toContain('Design')
  })
})

describe('sectionItems', () => {
  it('groups the browse view under ranked headers', () => {
    const out = sectionItems(SECTIONS, ['Backend Engineer'])
    expect(out[0]!.label).toBe('Software engineering')
    expect(out.map((g) => g.label)).toContain('Cross-industry')
  })

  it('lifts chosen values out of their section', () => {
    // The chips above the field already show them; a second copy under a header
    // reads as a duplicate rather than as a tick.
    const out = sectionItems(SECTIONS, ['Backend Engineer'])
    const software = out.find((g) => g.label === 'Software engineering')!
    expect(software.items).toEqual(['Tech Lead'])
  })

  it('drops a section that empties out rather than leaving a bare header', () => {
    const out = sectionItems(SECTIONS, ['Adobe Photoshop', 'Figma'])
    expect(out.map((g) => g.label)).not.toContain('Design')
  })

  it('spends a total budget across sections', () => {
    const out = sectionItems(SECTIONS, [], { total: 3, perSection: 8 })
    expect(out.flatMap((g) => g.items)).toHaveLength(3)
  })

  it('caps each section, so a long one cannot starve the rest', () => {
    const long: Section[] = [
      { label: 'Long', domains: ['software'], items: Array.from({ length: 50 }, (_, i) => `L${i}`) },
      { label: 'Short', domains: ['data'], items: ['S0'] },
    ]
    const out = sectionItems(long, [], { total: 20, perSection: 4 })
    expect(out.find((g) => g.label === 'Long')!.items).toHaveLength(4)
    expect(out.map((g) => g.label)).toContain('Short')
  })

  it('stops once the budget is spent rather than emitting empty groups', () => {
    const out = sectionItems(SECTIONS, [], { total: 2, perSection: 2 })
    expect(out).toHaveLength(1)
    expect(out.every((g) => g.items.length > 0)).toBe(true)
  })
})
