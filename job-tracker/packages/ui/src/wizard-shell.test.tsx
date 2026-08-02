import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WizardShell } from './wizard-shell'

function renderAt(step: number) {
  return render(
    <WizardShell step={step} total={6} title="Upload your resume" sub="We read it once.">
      <p>body</p>
    </WizardShell>,
  )
}

describe('WizardShell', () => {
  it('renders the title, sub and children', () => {
    renderAt(1)
    expect(screen.getByRole('heading', { name: 'Upload your resume' })).toBeInTheDocument()
    expect(screen.getByText('We read it once.')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('states progress in text, not only in the bar', () => {
    renderAt(3)
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Step 3 of 6' })).toBeInTheDocument()
  })

  it('marks exactly one segment as the current step', () => {
    renderAt(3)
    const current = screen.getAllByRole('listitem').filter((li) => li.ariaCurrent === 'step')
    expect(current).toHaveLength(1)
  })

  it('fills every segment up to and including the current one', () => {
    renderAt(4)
    const filled = screen
      .getAllByRole('listitem')
      .filter((li) => li.className.includes('bg-ink'))
    expect(filled).toHaveLength(4)
  })

  it('fills nothing beyond the current step', () => {
    renderAt(1)
    const filled = screen
      .getAllByRole('listitem')
      .filter((li) => li.className.includes('bg-ink'))
    expect(filled).toHaveLength(1)
  })

  it('staggers the reveal with inline delays, which survive the CSS bundle', () => {
    const { container } = renderAt(1)
    const delays = Array.from(container.querySelectorAll<HTMLElement>('.animate-rise')).map(
      (el) => el.style.animationDelay,
    )
    // Arbitrary Tailwind values like [animation-delay:140ms] were silently
    // dropped for all but the first occurrence, so these must stay inline.
    expect(delays).toEqual(['70ms', '140ms'])
  })
})
