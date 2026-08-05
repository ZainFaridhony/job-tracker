import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WizardFooter } from './wizard-footer'

describe('WizardFooter', () => {
  it('renders the step submit it is given', () => {
    render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('offers back as a link to the previous step', () => {
    render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    // A link, not a button: it navigates, and the arrow is decorative so the
    // accessible name is the label alone.
    const back = screen.getByRole('link', { name: 'Back' })
    expect(back).toHaveAttribute('href', '/onboarding/resume')
  })

  it('omits back on step 1, where there is nothing behind', () => {
    render(
      <WizardFooter>
        <button type="submit">Upload and continue</button>
      </WizardFooter>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload and continue' })).toBeInTheDocument()
  })

  it('puts back ahead of the submit in the DOM, so tab order matches the screen', () => {
    // The row stacks below sm, which puts back on top. flex-col-reverse would
    // read better there but would disagree with this order — hence the guard.
    const { container } = render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    const back = screen.getByRole('link', { name: 'Back' })
    const submit = screen.getByRole('button', { name: 'Continue' })
    const order = back.compareDocumentPosition(submit)
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('a')).toBe(back)
  })

  it('dresses back from the tokens, never a raw colour', () => {
    render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    const cls = screen.getByRole('link', { name: 'Back' }).className
    // `surface`, not `surface-subtle`: Back sits on canvas now that the footer is
    // outside the card, and #F4F4F4 on #FAFAFA is barely a fill at all.
    expect(cls).toContain('bg-surface')
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('gives back the same 48px geometry and focus ring as Button', () => {
    render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    // Shared via CONTROL_BASE. The old header link was 16px tall with a
    // focus offset of 4, both of which this replaces.
    const cls = screen.getByRole('link', { name: 'Back' }).className
    expect(cls).toContain('h-12')
    expect(cls).toContain('focus-visible:outline-offset-2')
  })

  it('bounds Back with outline at rest, not outline-subtle', () => {
    render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    // Back is focusable, so its border has to clear WCAG 1.4.11 at 3:1.
    // outline-subtle is asserted below that in tokens.test.ts.
    const cls = screen.getByRole('link', { name: 'Back' }).className
    expect(cls).toContain('border-outline')
    expect(cls).not.toContain('border-outline-subtle')
  })

  it('draws no divider, because it no longer sits inside the card', () => {
    // The rule separated fields from actions while both lived in one card. The
    // footer is a sibling of the Card now, so Continue cannot be trapped in the
    // Card's scroll region — and across a gap between two boxes there is nothing
    // left to divide.
    const { container } = render(
      <WizardFooter backHref="/onboarding/resume">
        <button type="submit">Continue</button>
      </WizardFooter>,
    )
    const cls = container.firstElementChild!.className
    expect(cls).not.toContain('border-t')
    expect(cls).not.toContain('border-outline-subtle')
  })
})
