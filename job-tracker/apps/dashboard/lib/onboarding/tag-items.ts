import type { Domain, Section } from './suggestions'

/**
 * What the skills picker offers, derived per keystroke.
 *
 * Lives here rather than in the component for two reasons: Base UI's Combobox
 * refuses free-form text, so the "offer the query itself" trick is real logic
 * worth testing; and the dashboard's test runner is node-only and scoped to
 * lib/**, so a component-level test would neither run nor have a DOM.
 */

export function includesTag(list: readonly string[], value: string): boolean {
  const key = value.toLowerCase()
  return list.some((s) => s.toLowerCase() === key)
}

/** Chosen first, then the curated list, deduped case-insensitively. Chosen lead
 *  so a skill the extractor invented is still a known item the picker can tick. */
function pool(chosen: readonly string[], suggestions: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of [...chosen, ...suggestions]) {
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

/**
 * How many suggestions the popup offers before anyone types.
 *
 * The lists run to ~463 roles and ~497 skills. Rendering all of them unprompted is
 * a 250-row popup nobody scrolls, and slow to mount for no benefit. Typing searches
 * the whole set, so nothing is unreachable — this bounds only the opening view,
 * which is what makes ranking matter: the visible slice is curated rather than
 * wherever the list happens to start.
 *
 * Set at 48 rather than the 24 a flat list needed. Headers are what earn the extra
 * rows: a section title tells you where you are, so a longer list stays navigable
 * instead of becoming a wall. A software CV matches eight skill sections, and a
 * budget of 24 would have shown three of them.
 *
 * Chosen values are always shown in full and do not count against it. They are what
 * the user has, not what we are offering.
 */
export const VISIBLE_WITHOUT_QUERY = 48

/**
 * `isNew` says the trailing item is the typed query rather than a known tag, so
 * the caller can badge it as an addition.
 */
export function tagItems(
  chosen: readonly string[],
  suggestions: readonly string[],
  query: string,
  visibleWithoutQuery: number = VISIBLE_WITHOUT_QUERY,
): { items: string[]; isNew: boolean } {
  const all = pool(chosen, suggestions)
  const q = query.trim()

  if (!q) {
    // Split on membership, not on `chosen.length`: pool() dedupes, so a chosen
    // list containing "Go" and "go" is one entry and the counts disagree.
    const chosenKeys = new Set(chosen.map((c) => c.toLowerCase()))
    const kept = all.filter((s) => chosenKeys.has(s.toLowerCase()))
    const offered = all
      .filter((s) => !chosenKeys.has(s.toLowerCase()))
      .slice(0, visibleWithoutQuery)
    return { items: [...kept, ...offered], isNew: false }
  }

  // Searching covers the full list, so the cap never hides a real match.
  const lower = q.toLowerCase()
  const matches = all.filter((s) => s.toLowerCase().includes(lower))
  const isNew = !includesTag(all, q)
  return { items: isNew ? [...matches, q] : matches, isNew }
}

/** Base UI's grid navigation is hard-wired to two columns, so rows are pairs. */
export function pairRows<T>(items: readonly T[]): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}

/**
 * Orders the sections by how well each matches what the CV already produced.
 *
 * The picker shows its opening rows before anyone types, and in authored order
 * those rows are the same for everybody: a backend CV was being offered "Digital
 * Marketing Specialist" and "Adobe Photoshop" ahead of anything adjacent to Go.
 *
 * Ranked once, from the values the CV produced, and never re-ranked as the user
 * edits. Re-ranking live would reorder the list under the cursor while someone is
 * picking from it.
 *
 * Three tiers rather than a score: a section in one of the user's own domains,
 * then the cross-industry one, then the rest. Within a tier the authored order is
 * preserved, because that order is already deliberate.
 */
export function rankSections(
  sections: readonly Section[],
  chosen: readonly string[],
): Section[] {
  const domains = inferDomains(sections, chosen)

  // No signal to rank by. Cross-industry already leads the authored order, so
  // returning it unchanged is the right answer rather than a fallback.
  if (domains.size === 0) return [...sections]

  const tier = (section: Section): number => {
    if (section.domains.some((d) => d !== 'general' && domains.has(d))) return 0
    if (section.domains.includes('general')) return 1
    return 2
  }

  return sections
    .map((section, index) => ({ section, index, tier: tier(section) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map(({ section }) => section)
}

/**
 * Which domains the chosen values sit in, read off the sections themselves.
 *
 * `general` never counts as evidence: almost every CV yields "Communication" or
 * "Excel", so treating those as a domain signal would put every user in the same
 * bucket and rank nothing.
 */
function inferDomains(sections: readonly Section[], chosen: readonly string[]): Set<Domain> {
  const byValue = new Map<string, Section>()
  for (const section of sections) {
    for (const item of section.items) byValue.set(item.toLowerCase(), section)
  }

  const found = new Set<Domain>()
  for (const value of chosen) {
    const section = byValue.get(value.trim().toLowerCase())
    if (!section) continue
    for (const domain of section.domains) {
      if (domain !== 'general') found.add(domain)
    }
  }

  return found
}

/**
 * The browse view: ranked sections, trimmed to a budget, with what the user has
 * already chosen lifted out of them.
 *
 * A chosen value must not also appear under its section header — the chips above
 * the field already show it, and a second copy reads as a duplicate rather than as
 * a tick. Sections that empty out entirely are dropped rather than left as a bare
 * header.
 *
 * The budget counts items, not sections, so a long first section does not squeeze
 * every other one to nothing: each section is capped at `perSection` too. Six per
 * section over a budget of 48 shows roughly eight headers, which is what a
 * software CV needs to see all of its own sections rather than three of them.
 */
export function sectionItems(
  sections: readonly Section[],
  chosen: readonly string[],
  { total = VISIBLE_WITHOUT_QUERY, perSection = 6 }: { total?: number; perSection?: number } = {},
): Array<{ label: string; items: string[] }> {
  const taken = new Set(chosen.map((c) => c.toLowerCase()))
  const out: Array<{ label: string; items: string[] }> = []
  let budget = total

  for (const section of rankSections(sections, chosen)) {
    if (budget <= 0) break
    const items = section.items
      .filter((item) => !taken.has(item.toLowerCase()))
      .slice(0, Math.min(perSection, budget))
    if (items.length === 0) continue
    out.push({ label: section.label, items })
    budget -= items.length
  }

  return out
}
