import { describe, expect, it } from 'vitest'
import { JOBS } from './data'
import { EMPTY_FILTERS, jobsHref } from './filters'
import { DEFAULT_TAB, JOB_TABS, TAB_LABEL, readTab, tabPane } from './tabs'

describe('readTab', () => {
  it('falls back to the default when the parameter is absent', () => {
    expect(readTab({})).toBe(DEFAULT_TAB)
  })

  it('falls back rather than rendering an empty pane for a tab that does not exist', () => {
    // A hand-edited or stale URL must not blank the panel — the listing is
    // still there, only the pane selector is wrong.
    expect(readTab({ tab: 'qualifications' })).toBe(DEFAULT_TAB)
    expect(readTab({ tab: '' })).toBe(DEFAULT_TAB)
  })

  it('reads a tab the vocabulary knows', () => {
    expect(readTab({ tab: 'required' })).toBe('required')
    expect(readTab({ tab: 'about' })).toBe('about')
  })

  it('takes the first of a repeated parameter, as the filters do', () => {
    expect(readTab({ tab: ['preferred', 'about'] })).toBe('preferred')
  })
})

describe('the tab vocabulary', () => {
  it('opens on the summary', () => {
    expect(JOB_TABS[0]).toBe(DEFAULT_TAB)
    expect(DEFAULT_TAB).toBe('summary')
  })

  it('labels every tab exactly once', () => {
    const labels = JOB_TABS.map((t) => TAB_LABEL[t])
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(JOB_TABS.length)
  })
})

describe('tabPane', () => {
  it('gives every tab of every listing something to show', () => {
    // A tab that can only ever render an empty pane reads as a broken screen,
    // the same reason data.test.ts refuses a facet no listing matches.
    for (const job of JOBS) {
      for (const tab of JOB_TABS) {
        const pane = tabPane(job, tab)
        expect(pane.heading, `${job.id} / ${tab}`).toBeTruthy()
        if (pane.kind === 'prose') expect(pane.body, `${job.id} / ${tab}`).toBeTruthy()
        else expect(pane.items.length, `${job.id} / ${tab}`).toBeGreaterThan(0)
      }
    }
  })

  it('names the company in the About heading rather than saying About', () => {
    const job = JOBS[0]!
    const pane = tabPane(job, 'about')
    expect(pane.heading).toBe(`About ${job.company}`)
  })

  it('splits the role from its responsibilities, so both tabs carry content', () => {
    // The reference's own Summary pane shows the role AND the responsibilities,
    // which would leave its Job Description tab with nothing. One each.
    const job = JOBS[0]!
    expect(tabPane(job, 'summary')).toEqual({
      kind: 'prose',
      heading: 'The role',
      body: job.summary,
    })
    expect(tabPane(job, 'description')).toEqual({
      kind: 'list',
      heading: 'Key responsibilities',
      items: job.responsibilities,
    })
  })
})

describe('jobsHref with a tab', () => {
  it('leaves the default tab out of the URL rather than writing it as noise', () => {
    expect(jobsHref(EMPTY_FILTERS, 'acme', DEFAULT_TAB)).toBe('/jobs?job=acme')
    expect(jobsHref(EMPTY_FILTERS, 'acme')).toBe('/jobs?job=acme')
  })

  it('carries a non-default tab alongside the listing', () => {
    expect(jobsHref(EMPTY_FILTERS, 'acme', 'required')).toBe('/jobs?job=acme&tab=required')
  })

  it('keeps the filters that found the listing when switching tab', () => {
    const href = jobsHref({ ...EMPTY_FILTERS, q: 'design' }, 'acme', 'about')
    expect(href).toContain('q=design')
    expect(href).toContain('job=acme')
    expect(href).toContain('tab=about')
  })

  it('does not write a tab for a listing that is not open', () => {
    // No panel, no pane. A bare `?tab=` with nothing to apply it to is dead
    // state that survives every subsequent filter click.
    expect(jobsHref(EMPTY_FILTERS, undefined, 'about')).toBe('/jobs')
  })
})
