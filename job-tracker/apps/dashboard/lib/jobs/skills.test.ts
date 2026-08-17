import { describe, expect, it } from 'vitest'
import { parseFilters } from './filters'
import { CV_GROUP, GAP_GROUP, UNGROUPED, skillFacetGroups } from './skills'
import { makeJob } from './test-support'

/**
 * A fixture, not `JOBS` — see `test-support.ts`. Every assertion below is about
 * the grouping rules, so tying them to the real corpus would break them every
 * time a listing was added, on a change that could not affect the logic.
 *
 *   a  remote  low     10   React, TypeScript, Figma
 *   b  remote  high   150   React, Kubernetes
 *   c  hybrid  medium  50   Figma, Python
 *   d  onsite  low      5   Terraform
 *
 * Six distinct skills. Unfiltered: Figma 2, React 2, and one each of Kubernetes,
 * Python, Terraform, TypeScript.
 */
const CORPUS = [
  makeJob({ id: 'a', mode: 'remote', applicants: 10, skills: ['React', 'TypeScript', 'Figma'] }),
  makeJob({ id: 'b', mode: 'remote', applicants: 150, skills: ['React', 'Kubernetes'] }),
  makeJob({ id: 'c', mode: 'hybrid', applicants: 50, skills: ['Figma', 'Python'] }),
  makeJob({ id: 'd', mode: 'onsite', applicants: 5, skills: ['Terraform'] }),
]

const groups = (raw: Record<string, string | string[]>, cv: readonly string[] = []) =>
  skillFacetGroups(CORPUS, parseFilters(raw), cv)

const named = (gs: ReturnType<typeof skillFacetGroups>, key: string) =>
  gs.find((g) => g.key === key)

const names = (gs: ReturnType<typeof skillFacetGroups>, key: string) =>
  named(gs, key)!.skills.map((s) => s.name)

describe('skillFacetGroups', () => {
  it('splits the offered skills into what the CV has and what it does not', () => {
    const gs = groups({}, ['React', 'TypeScript'])
    expect(gs.map((g) => g.key)).toEqual([CV_GROUP, GAP_GROUP])
    expect(names(gs, CV_GROUP)).toEqual(['React', 'TypeScript'])
    expect(names(gs, GAP_GROUP)).not.toContain('React')
  })

  it('omits a CV skill no listing anywhere requires', () => {
    // Nothing in the corpus asks for COBOL, so it is not part of the vocabulary
    // this filter draws from at all.
    const all = groups({}, ['React', 'COBOL']).flatMap((g) => g.skills.map((s) => s.name))
    expect(all).toContain('React')
    expect(all).not.toContain('COBOL')
  })

  it('orders by how many listings want the skill, then alphabetically', () => {
    // The flat alphabetical list this replaces buried the most-wanted skill.
    expect(names(groups({}), UNGROUPED)).toEqual([
      'Figma',
      'React',
      'Kubernetes',
      'Python',
      'Terraform',
      'TypeScript',
    ])
  })

  it('matches the CV case-insensitively but labels with the corpus casing', () => {
    // Extracted skills come from a model, so "react" is real. The checkbox VALUE
    // has to be the corpus spelling or parseFilters drops it as unknown.
    expect(names(groups({}, ['react', 'typescript']), CV_GROUP)).toEqual(['React', 'TypeScript'])
  })

  it('offers the whole vocabulary whatever else is filtering', () => {
    // "Show all data": the list does not shrink as other filters narrow the
    // corpus. Python and Terraform are on no remote listing and are still here.
    const skills = named(groups({ mode: 'remote' }), UNGROUPED)!.skills
    expect(skills).toHaveLength(6)
    expect(skills.find((s) => s.name === 'Python')?.count).toBe(0)
    expect(skills.find((s) => s.name === 'Terraform')?.count).toBe(0)
  })

  it('still counts against the other filters, which is what orders the list', () => {
    // Showing a zero-match skill is the cost of "show all"; sinking it to the
    // bottom is what keeps that cost small.
    const skills = named(groups({ mode: 'remote' }), UNGROUPED)!.skills
    expect(skills.find((s) => s.name === 'React')?.count).toBe(2)
    expect(skills[0]?.name).toBe('React')
    expect(skills.at(-1)?.count).toBe(0)
  })

  it('excludes the skills facet from its own counts', () => {
    // With React ticked only listing a and b survive, so counting against the
    // RESULTS would report Figma as 1. The figure has to say what ticking Figma
    // would do from the reader's current position, which is 2.
    const skills = named(groups({ skill: 'React' }), UNGROUPED)!.skills
    expect(skills.find((s) => s.name === 'Figma')?.count).toBe(2)
  })

  it('keeps a ticked skill rendered even when no listing matches it', () => {
    // Not cosmetic: an unmounted checked checkbox contributes no value to the
    // next submit, so the filter would silently delete itself the moment any
    // other control was touched.
    const found = groups({ mode: 'onsite', skill: 'Python' })
      .flatMap((g) => g.skills)
      .find((s) => s.name === 'Python')
    expect(found?.count).toBe(0)
    expect(found?.checked).toBe(true)
  })

  it('marks the ticked skills checked and leaves the rest unchecked', () => {
    const skills = named(groups({ skill: 'Figma' }), UNGROUPED)!.skills
    expect(skills.find((s) => s.name === 'Figma')?.checked).toBe(true)
    expect(skills.find((s) => s.name === 'React')?.checked).toBe(false)
  })

  it('drops an empty group rather than leaving a bare header', () => {
    const everything = CORPUS.flatMap((j) => j.skills)
    expect(groups({}, everything).map((g) => g.key)).toEqual([CV_GROUP])
  })

  it('falls back to one unlabelled group when the CV records no skills', () => {
    // "Asked for, not on your CV" claims we know what the reader already has.
    // With no CV skills — onboarding unfinished, or extraction returned nothing,
    // both of which ingestCv deliberately swallows — that claim is false, so the
    // grouping is dropped rather than mislabelled.
    const gs = groups({})
    expect(gs.map((g) => g.key)).toEqual([UNGROUPED])
    expect(gs[0]?.label).toBe('')
  })

  it('offers every skill exactly once across all groups', () => {
    const all = groups({}, ['React', 'Python']).flatMap((g) => g.skills.map((s) => s.name))
    expect(new Set(all).size).toBe(all.length)
    expect(all).toHaveLength(6)
  })

  it('offers nothing when the corpus is empty', () => {
    expect(skillFacetGroups([], parseFilters({}), ['React'])).toEqual([])
  })
})
