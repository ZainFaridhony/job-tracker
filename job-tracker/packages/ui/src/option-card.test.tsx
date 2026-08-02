import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OptionCard } from './option-card'

describe('OptionCard', () => {
  it('is a real radio, so it submits and groups by name', () => {
    render(<OptionCard name="career_goal" value="level-up" label="Step up to senior" />)
    const radio = screen.getByRole('radio', { name: /Step up to senior/ })
    expect(radio).toHaveAttribute('name', 'career_goal')
    expect(radio).toHaveAttribute('value', 'level-up')
  })

  it('reflects the stored answer when a step is revisited', () => {
    render(<OptionCard name="work_location" value="remote" label="Remote" defaultChecked />)
    expect(screen.getByRole('radio', { name: 'Remote' })).toBeChecked()
  })

  it('only one option in a group can be selected', () => {
    render(
      <>
        <OptionCard name="work_location" value="remote" label="Remote" defaultChecked />
        <OptionCard name="work_location" value="hybrid" label="Hybrid" />
      </>,
    )
    expect(screen.getByRole('radio', { name: 'Remote' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Hybrid' })).not.toBeChecked()
  })

  it('shows the hint alongside the label', () => {
    render(<OptionCard name="g" value="v" label="Remote" hint="Work from anywhere" />)
    expect(screen.getByText('Work from anywhere')).toBeInTheDocument()
  })

  it('carries a visible focus ring on the outline token, not outline-subtle', () => {
    const { container } = render(<OptionCard name="g" value="v" label="Remote" />)
    const cls = container.querySelector('label')!.className
    // WCAG 1.4.11: the focus indicator must clear 3:1, which outline-subtle does not.
    expect(cls).toContain('has-[:focus-visible]:outline-ink')
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
})
