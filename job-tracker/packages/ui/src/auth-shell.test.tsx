import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthShell } from './auth-shell.js'

describe('AuthShell', () => {
  it('renders the marketing headline as the page heading and shows the form', () => {
    render(
      <AuthShell headline="Land your next opportunity with AI." sub="Organize applications.">
        <form aria-label="sign in" />
      </AuthShell>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Land your next opportunity with AI.',
    )
    expect(screen.getByRole('form', { name: 'sign in' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Job Tracker AI' }).length).toBeGreaterThan(0)
  })
})
