import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Select } from './select'

const BANDS = [
  { value: '0', label: '0-2 years (Entry)' },
  { value: '3', label: '3-5 years (Intermediate)' },
  { value: '6', label: '6-9 years (Senior)' },
  { value: '10', label: '10+ years (Expert)' },
] as const

function setup(props: Partial<Parameters<typeof Select>[0]> = {}) {
  return render(
    <Select
      label="Years of experience"
      name="years_experience"
      options={BANDS}
      placeholder="Select range"
      {...props}
    />,
  )
}

describe('Select', () => {
  it('associates its label with the control', () => {
    setup()
    expect(screen.getByLabelText('Years of experience')).toHaveAttribute(
      'name',
      'years_experience',
    )
  })

  it('is a native select, so the platform picker and the keyboard come free', () => {
    setup()
    expect(screen.getByLabelText('Years of experience').tagName).toBe('SELECT')
  })

  it('offers every band it is given', () => {
    setup()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Select range',
      '0-2 years (Entry)',
      '3-5 years (Intermediate)',
      '6-9 years (Senior)',
      '10+ years (Expert)',
    ])
  })

  it('keeps "no answer" reachable, because the column is nullable', () => {
    // Without an empty option the first band would be submitted as though the
    // user had chosen it, and an existing answer could never be cleared.
    setup()
    expect(screen.getByLabelText('Years of experience')).toHaveValue('')
  })

  it('reflects the stored band when a step is revisited', () => {
    setup({ value: '6' })
    expect(screen.getByLabelText('Years of experience')).toHaveValue('6')
  })

  it('offers no empty option when there is no placeholder to put in it', () => {
    setup({ placeholder: undefined })
    expect(screen.getAllByRole('option')).toHaveLength(BANDS.length)
  })

  it('bounds the field with the accessible outline token', () => {
    setup()
    // outline-subtle fails WCAG 1.4.11 on a control - PRD Appendix A.
    const cls = screen.getByLabelText('Years of experience').className
    expect(cls).toContain('border-outline')
    expect(cls).not.toContain('border-outline-subtle')
  })

  it('is a normal 48px control, the same height as Input', () => {
    setup()
    expect(screen.getByLabelText('Years of experience').className).toContain('h-12')
  })

  it('keeps the chevron out of the accessibility tree and out of the way', () => {
    const { container } = setup()
    const chevron = container.querySelector('svg')!
    expect(chevron).toHaveAttribute('aria-hidden', 'true')
    expect(chevron.getAttribute('class')).toContain('pointer-events-none')
  })

  it('never dresses itself in a raw colour', () => {
    const { container } = setup()
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })

  it('carries the stored answer in the server HTML, so no-JS is correct', () => {
    // Uncontrolled, so React must emit selected= in the markup. A selection that
    // lived only in a client property would show the placeholder to anyone
    // without JavaScript and submit an empty answer.
    const html = renderToString(
      <Select
        label="Years of experience"
        name="years_experience"
        options={BANDS}
        placeholder="Select range"
        value="10"
      />,
    )
    const selected = html.match(/<option[^>]*\bselected\b[^>]*>/g) ?? []
    expect(selected).toHaveLength(1)
    expect(selected[0]).toContain('value="10"')
  })

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
})
