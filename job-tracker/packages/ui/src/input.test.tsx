import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './input.js'

describe('Input', () => {
  it('associates its label with the control', () => {
    render(<Input label="Email" name="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('exposes an error to assistive tech and marks the field invalid', () => {
    render(<Input label="Email" name="email" error="Required" />)
    const field = screen.getByLabelText('Email')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
    expect(field.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
  })

  it('bounds a focusable control with the accessible outline token', () => {
    render(<Input label="Email" name="email" />)
    const cls = screen.getByLabelText('Email').className
    expect(cls).toContain('border-outline')
    // outline-subtle fails WCAG 1.4.11 on a control - PRD Appendix A
    expect(cls).not.toContain('border-outline-subtle')
  })

  it('offers a reveal toggle only when asked', () => {
    const { rerender } = render(<Input label="Password" type="password" />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<Input label="Password" type="password" revealable />)
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
  })

  it('keeps the label reachable when it is visually hidden', () => {
    render(<Input label="Password" labelHidden type="password" />)
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})
