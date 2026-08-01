import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './logo'

describe('Logo', () => {
  it('is labelled for assistive tech', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Job Tracker AI' })).toBeInTheDocument()
  })

  it('inherits colour rather than hard-coding it', () => {
    render(<Logo />)
    const path = screen.getByRole('img', { name: 'Job Tracker AI' }).querySelector('path')
    expect(path).toHaveAttribute('fill', 'currentColor')
  })

  it('keeps the traced viewBox, so the geometry stays verifiable against brand/', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Job Tracker AI' })).toHaveAttribute(
      'viewBox',
      '0 0 556 766',
    )
  })
})
