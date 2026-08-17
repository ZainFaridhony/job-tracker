import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  it('ties the label to the input, so clicking the text toggles it', () => {
    render(<Checkbox name="skill" value="React" label="React" />)
    expect(screen.getByLabelText('React')).toHaveAttribute('type', 'checkbox')
  })

  it('gives each instance its own id when none is supplied', () => {
    // The jobs sidebar renders a dozen of these from one map. A shared id would
    // point every label at the first input, so clicking "Python" would tick
    // "Accessibility".
    render(
      <>
        <Checkbox name="skill" value="React" label="React" />
        <Checkbox name="skill" value="Python" label="Python" />
      </>,
    )
    expect(screen.getByLabelText('React')).not.toBe(screen.getByLabelText('Python'))
  })

  it('forwards the form attribute, so a control outside the form still submits', () => {
    // How the whole jobs sidebar is associated with the search card's <form>.
    render(<Checkbox name="skill" value="React" label="React" form="job-filters" />)
    expect(screen.getByLabelText('React')).toHaveAttribute('form', 'job-filters')
  })
})
