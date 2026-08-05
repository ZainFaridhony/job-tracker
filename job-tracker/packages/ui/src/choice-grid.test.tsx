import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChoiceGrid } from './choice-grid'

const CHOICES = [
  { value: 'first-job', label: 'Land my first role' },
  { value: 'switch-company', label: 'Move to a better company' },
  { value: 'switch-field', label: 'Change field or specialism' },
  { value: 'level-up', label: 'Step up to a senior level' },
] as const

function cardOf(label: string) {
  return screen.getByRole('radio', { name: label }).closest('label')!
}

describe('ChoiceGrid', () => {
  it('renders a real radio per choice, grouped by name', () => {
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    for (const r of radios) expect(r).toHaveAttribute('name', 'career_goal')
  })

  it('reflects the stored answer when a step is revisited', () => {
    render(
      <ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} value="switch-field" />,
    )
    expect(screen.getByRole('radio', { name: 'Change field or specialism' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Land my first role' })).not.toBeChecked()
  })

  it('selects nothing when there is no stored answer', () => {
    // career_goal starts null, so a default would post an answer nobody gave.
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} value={null} />)
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked()
  })

  it('names the group for screen readers', () => {
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />)
    expect(screen.getByRole('group', { name: 'Career goal' })).toBeInTheDocument()
  })

  it('lays the choices out in two columns from sm up by default', () => {
    // Four stacked full-width rows cost ~284px; this costs ~172px, which is most
    // of what made the step overflow the viewport.
    const { container } = render(
      <ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />,
    )
    const grid = container.querySelector('.grid')!
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('sm:grid-cols-2')
    expect(grid.className).not.toContain('md:grid-cols-4')
  })

  it('goes four across when asked, via two columns at sm', () => {
    // ~124px in one row, against ~172px for a 2x2. Four across a tablet leaves
    // each card too narrow for its label, hence the sm step.
    const { container } = render(
      <ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} columns={4} />,
    )
    const grid = container.querySelector('.grid')!
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('sm:grid-cols-2')
    expect(grid.className).toContain('md:grid-cols-4')
  })

  it('emits column classes as literals Tailwind can see', () => {
    // A computed `md:grid-cols-${n}` compiles and renders and produces no CSS at
    // all, because Tailwind only emits what it finds as a literal string. Same
    // trap the segmented control's COLS table exists to avoid.
    for (const columns of [2, 4] as const) {
      const { container, unmount } = render(
        <ChoiceGrid name="g" legend="G" choices={CHOICES} columns={columns} />,
      )
      const cls = container.querySelector('.grid')!.className
      expect(cls).not.toMatch(/grid-cols-\$\{/)
      expect(cls).toMatch(/grid-cols-\d/)
      unmount()
    }
  })

  it('bounds each card with outline at rest, not outline-subtle', () => {
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />)
    const cls = cardOf('Land my first role').className
    // The visible edge of a radio. tokens.test.ts asserts outline-subtle is below
    // 3:1, which fails WCAG 1.4.11 on anything focusable.
    expect(cls).toContain('border-outline')
    expect(cls).not.toContain('border-outline-subtle')
  })

  it('thickens the checked edge with a ring, so selecting shifts nothing', () => {
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />)
    const cls = cardOf('Land my first role').className
    expect(cls).toContain('has-[:checked]:border-ink')
    expect(cls).toContain('has-[:checked]:ring-inset')
    // A 2px border on select would move the grid by a pixel.
    expect(cls).not.toContain('has-[:checked]:border-2')
  })

  it('carries a focus ring on the ink token and no raw colour', () => {
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />)
    const cls = cardOf('Land my first role').className
    expect(cls).toContain('has-[:focus-visible]:outline-ink')
    expect(cls).toContain('has-[:focus-visible]:outline-offset-2')
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('keeps the glyph out of the accessible name', () => {
    render(
      <ChoiceGrid
        name="career_goal"
        legend="Career goal"
        choices={[{ value: 'a', label: 'Land my first role', icon: <svg data-testid="glyph" /> }]}
      />,
    )
    // The label is the name; the glyph is decoration.
    expect(screen.getByRole('radio', { name: 'Land my first role' })).toBeInTheDocument()
    expect(screen.getByTestId('glyph').closest('[aria-hidden]')).not.toBeNull()
  })

  it('renders without a glyph', () => {
    render(<ChoiceGrid name="g" legend="G" choices={[{ value: 'a', label: 'Only text' }]} />)
    expect(screen.getByRole('radio', { name: 'Only text' })).toBeInTheDocument()
  })

  it('puts a validation message with the group, not at the top of the card', () => {
    render(
      <ChoiceGrid
        name="career_goal"
        legend="Career goal"
        choices={CHOICES}
        error="Pick the one that fits best."
      />,
    )
    const message = screen.getByRole('alert')
    expect(message).toHaveTextContent('Pick the one that fits best.')
    expect(screen.getByRole('group', { name: 'Career goal' })).toHaveAttribute(
      'aria-describedby',
      message.getAttribute('id'),
    )
  })

  it('renders no alert region when there is no error', () => {
    render(<ChoiceGrid name="career_goal" legend="Career goal" choices={CHOICES} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
