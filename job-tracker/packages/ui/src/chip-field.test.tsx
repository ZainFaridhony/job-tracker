import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ChipField } from './chip-field'

/** The chips only reach the server as hidden inputs, so assert on those. */
function submitted(container: HTMLElement, name: string): string[] {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${name}"]`),
  ).map((i) => i.value)
}

describe('ChipField', () => {
  it('renders the initial values as submittable fields', () => {
    const { container } = render(
      <ChipField name="skills" label="Skills" initial={['React', 'Postgres']} />,
    )
    expect(submitted(container, 'skills')).toEqual(['React', 'Postgres'])
  })

  it('adds a typed value on Enter without submitting the form', async () => {
    const user = userEvent.setup()
    let submits = 0
    const { container } = render(
      <form onSubmit={() => submits++}>
        <ChipField name="skills" label="Skills" initial={[]} />
      </form>,
    )

    await user.type(screen.getByLabelText('Add to Skills'), 'Kubernetes{Enter}')

    expect(submitted(container, 'skills')).toEqual(['Kubernetes'])
    expect(submits).toBe(0)
  })

  it('clears the draft after adding', async () => {
    const user = userEvent.setup()
    render(<ChipField name="skills" label="Skills" initial={[]} />)
    const box = screen.getByLabelText('Add to Skills')

    await user.type(box, 'Go{Enter}')

    expect(box).toHaveValue('')
  })

  it('ignores a duplicate regardless of case', async () => {
    const user = userEvent.setup()
    const { container } = render(<ChipField name="skills" label="Skills" initial={['React']} />)

    await user.type(screen.getByLabelText('Add to Skills'), 'react{Enter}')

    expect(submitted(container, 'skills')).toEqual(['React'])
  })

  it('ignores whitespace-only input', async () => {
    const user = userEvent.setup()
    const { container } = render(<ChipField name="skills" label="Skills" initial={[]} />)

    await user.type(screen.getByLabelText('Add to Skills'), '   {Enter}')

    expect(submitted(container, 'skills')).toEqual([])
  })

  it('removes a chip the AI got wrong', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ChipField name="roles" label="Roles" initial={['Barista', 'Engineer']} />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove Barista' }))

    expect(submitted(container, 'roles')).toEqual(['Engineer'])
  })

  it('drops the last chip on Backspace in an empty box', async () => {
    const user = userEvent.setup()
    const { container } = render(<ChipField name="roles" label="Roles" initial={['A', 'B']} />)

    await user.type(screen.getByLabelText('Add to Roles'), '{Backspace}')

    expect(submitted(container, 'roles')).toEqual(['A'])
  })

  it('keeps the chips when Backspace is used to edit the draft', async () => {
    const user = userEvent.setup()
    const { container } = render(<ChipField name="roles" label="Roles" initial={['A']} />)

    await user.type(screen.getByLabelText('Add to Roles'), 'xy{Backspace}')

    expect(submitted(container, 'roles')).toEqual(['A'])
  })

  it('truncates an overlong entry rather than storing it whole', async () => {
    const user = userEvent.setup()
    const { container } = render(<ChipField name="skills" label="Skills" initial={[]} />)

    await user.type(screen.getByLabelText('Add to Skills'), `${'x'.repeat(80)}{Enter}`)

    expect(submitted(container, 'skills')[0]).toHaveLength(60)
  })

  it('renders chips filled, matching the skills picker they now share a card with', () => {
    render(<ChipField name="roles" label="Roles" initial={['Backend Engineer']} />)
    const cls = screen.getByRole('button', { name: 'Remove Backend Engineer' }).className
    // Outlined-vs-filled was the visible inconsistency between step 3 and step 4
    // of the six-step wizard. Roles and skills sit together now, so they agree —
    // on the filled treatment, which is the one that reads in a monochrome
    // palette. It also retires an outline-subtle border on a focusable control.
    expect(cls).toContain('bg-ink')
    expect(cls).toContain('text-text-on-ink')
    expect(cls).not.toContain('border-outline-subtle')
  })

  it('gives a chip a visible focus ring of its own', () => {
    render(<ChipField name="roles" label="Roles" initial={['A']} />)
    const cls = screen.getByRole('button', { name: 'Remove A' }).className
    expect(cls).toContain('focus-visible:outline-ink')
    expect(cls).toContain('focus-visible:outline-offset-2')
  })

  it('puts a validation message with the field, not at the top of the card', () => {
    render(
      <ChipField name="target_roles" label="Roles" initial={[]} error="Keep at least one role." />,
    )
    const message = screen.getByRole('alert')
    expect(message).toHaveTextContent('Keep at least one role.')
    // Announced with the control, not just placed near it.
    expect(screen.getByLabelText('Add to Roles')).toHaveAttribute(
      'aria-describedby',
      message.getAttribute('id'),
    )
  })

  it('renders no alert region when there is no error', () => {
    render(<ChipField name="roles" label="Roles" initial={['A']} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
