import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button.js'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Sign In</Button>)
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('uses the ink token for the primary variant, never a raw colour', () => {
    render(<Button>Go</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('bg-ink')
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('carries all three ink states, so hover and press come from the mark', () => {
    render(<Button>Go</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('hover:bg-ink-hover')
    expect(cls).toContain('active:bg-ink-pressed')
  })

  it('is disabled and busy while pending', () => {
    render(<Button pending>Go</Button>)
    const b = screen.getByRole('button')
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })

  it('does not claim to be busy when idle', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
  })
})
