import { describe, expect, it } from 'vitest'
import { competitionFor } from './derive'
import { facetCounts } from './facets'
import { parseFilters } from './filters'
import { makeJob } from './test-support'

/**
 * A fixture, not `JOBS` — see `test-support.ts`. These assertions are about the
 * counting rule, so pinning them to the real corpus would break them whenever a
 * listing was added.
 *
 *   a  remote  low     10   React, TypeScript, Figma
 *   b  remote  high   150   React, Kubernetes
 *   c  hybrid  medium  50   Figma, Python
 *   d  onsite  low      5   Terraform
 */
const CORPUS = [
  makeJob({ id: 'a', mode: 'remote', applicants: 10, skills: ['React', 'TypeScript', 'Figma'] }),
  makeJob({ id: 'b', mode: 'remote', applicants: 150, skills: ['React', 'Kubernetes'] }),
  makeJob({ id: 'c', mode: 'hybrid', applicants: 50, skills: ['Figma', 'Python'] }),
  makeJob({ id: 'd', mode: 'onsite', applicants: 5, skills: ['Terraform'] }),
]

const skillsOf = (j: (typeof CORPUS)[number]) => j.skills
const bandOf = (j: (typeof CORPUS)[number]) => [competitionFor(j.applicants)]

const skills = (raw: Record<string, string | string[]>) =>
  facetCounts(CORPUS, parseFilters(raw), 'skills', skillsOf)

const bands = (raw: Record<string, string | string[]>) =>
  facetCounts(CORPUS, parseFilters(raw), 'competition', bandOf)

describe('facetCounts', () => {
  it('counts how many listings hold each value', () => {
    const counts = skills({})
    expect(counts.get('React')).toBe(2)
    expect(counts.get('Figma')).toBe(2)
    expect(counts.get('TypeScript')).toBe(1)
  })

  it('omits a value no listing holds rather than reporting it at 0', () => {
    const counts = skills({})
    expect(counts.get('COBOL')).toBeUndefined()
    for (const [value, n] of counts) expect(n, value).toBeGreaterThan(0)
  })

  it('narrows by every OTHER filter', () => {
    // Remote is a and b. Figma is on a only; c's copy does not count.
    const counts = skills({ mode: 'remote' })
    expect(counts.get('Figma')).toBe(1)
    expect(counts.get('Python')).toBeUndefined()
  })

  it('ignores the facet it is counting, so a count says what ticking WOULD do', () => {
    // The whole point of the function. With React ticked, only a and b survive
    // `applyFilters` — so counting against the results would report Figma as 1
    // and every unticked skill as 0, making each remaining checkbox look like a
    // dead end. Excluding the skills facet keeps the figure answering "how many
    // listings would I get".
    expect(skills({ skill: 'React' }).get('Figma')).toBe(2)
  })

  it('does not let one ticked value hide its own siblings', () => {
    // Ticking Low must not drop Medium and High — they are the alternatives the
    // reader might switch to.
    const counts = bands({ comp: 'low' })
    expect(counts.get('low')).toBe(2)
    expect(counts.get('medium')).toBe(1)
    expect(counts.get('high')).toBe(1)
  })

  it('still applies the other facets when counting a derived one', () => {
    // Remote is a (10, low) and b (150, high).
    const counts = bands({ mode: 'remote' })
    expect(counts.get('low')).toBe(1)
    expect(counts.get('high')).toBe(1)
    expect(counts.get('medium')).toBeUndefined()
  })

  it('counts nothing when no listing survives the other filters', () => {
    expect(skills({ q: 'zzzz' }).size).toBe(0)
  })
})
