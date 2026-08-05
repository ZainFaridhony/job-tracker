import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WizardShell } from './wizard-shell'

const STEPS = [
  { n: 1, short: 'Your CV' },
  { n: 2, short: 'What we read' },
  { n: 3, short: 'What you want' },
  { n: 4, short: 'Done' },
] as const

function renderAt(step: number) {
  return render(
    <WizardShell
      step={step}
      total={STEPS.length}
      steps={STEPS}
      title="Upload your CV"
      sub="We read it once."
    >
      <p>body</p>
    </WizardShell>,
  )
}

/** The node circle inside a step, which is what carries done/current/ahead. */
function nodes() {
  return screen.getAllByRole('listitem').map((li) => li.querySelectorAll('span')[1]!)
}

/** The two connector rules either side of each node, in DOM order. */
function connectors(li: Element) {
  const spans = Array.from(li.querySelectorAll('span'))
  return { before: spans[0]!, after: spans[2]! }
}

describe('WizardShell', () => {
  it('renders the title, sub and children', () => {
    renderAt(1)
    expect(screen.getByRole('heading', { name: 'Upload your CV' })).toBeInTheDocument()
    expect(screen.getByText('We read it once.')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('names the count for screen readers without printing it', () => {
    // The visible "Step 3 of 4" caption is gone: numbered nodes with a ring on the
    // current one already show it, so the text repeated the stepper. The list's
    // own label is what keeps the count in the accessibility tree.
    renderAt(3)
    expect(screen.getByRole('list', { name: 'Step 3 of 4' })).toBeInTheDocument()
    expect(screen.queryByText('Step 3 of 4')).not.toBeInTheDocument()
  })

  it('names every stage, so what is coming is visible', () => {
    renderAt(2)
    for (const s of STEPS) expect(screen.getByText(s.short)).toBeInTheDocument()
  })

  it('marks exactly one step as current', () => {
    renderAt(3)
    const current = screen.getAllByRole('listitem').filter((li) => li.ariaCurrent === 'step')
    expect(current).toHaveLength(1)
    expect(current[0]!).toHaveTextContent('What you want')
  })

  it('ticks finished stages and numbers the rest', () => {
    renderAt(3)
    expect(nodes().map((n) => n.textContent)).toEqual(['✓', '✓', '3', '4'])
  })

  it('gives the current node a ring rather than a fill, so it is not "done"', () => {
    // The defect this pattern replaced painted the current step exactly like a
    // finished one, which made the last step indistinguishable from a completed
    // wizard.
    renderAt(3)
    const [first, , third] = nodes()
    expect(third!.className).toContain('border-ink')
    expect(third!.className).not.toContain('bg-ink')
    expect(first!.className).toContain('bg-ink')
  })

  it('bounds an upcoming node with outline, not outline-subtle', () => {
    // outline-subtle is asserted below 3:1 in tokens.test.ts.
    renderAt(1)
    const upcoming = nodes()[3]!.className
    expect(upcoming).toContain('border-outline')
    expect(upcoming).not.toContain('border-outline-subtle')
  })

  it('inks the path up to where you are, and no further', () => {
    renderAt(3)
    const items = screen.getAllByRole('listitem')
    // Arriving at the current step: inked. Leaving it: not yet travelled.
    expect(connectors(items[2]!).before.className).toContain('bg-ink')
    expect(connectors(items[2]!).after.className).toContain('bg-outline-subtle')
    expect(connectors(items[3]!).before.className).toContain('bg-outline-subtle')
  })

  it('hides the outer connectors on the first and last steps', () => {
    // A rule running off the left of step 1 points at nothing.
    renderAt(2)
    const items = screen.getAllByRole('listitem')
    expect(connectors(items[0]!).before.className).toContain('invisible')
    expect(connectors(items[3]!).after.className).toContain('invisible')
    expect(connectors(items[0]!).after.className).not.toContain('invisible')
  })

  it('keeps the stepper unclickable', () => {
    // The gate clamps forward jumps, so a stepper that looked navigable would
    // only ever refuse. Back is the one way back.
    renderAt(3)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('staggers the reveal with inline delays, which survive the CSS bundle', () => {
    const { container } = renderAt(1)
    const delays = Array.from(container.querySelectorAll<HTMLElement>('.animate-rise')).map(
      (el) => el.style.animationDelay,
    )
    // Arbitrary Tailwind values like [animation-delay:140ms] were silently
    // dropped for all but the first occurrence, so these must stay inline.
    // Stepper, then the heading, then the step.
    expect(delays).toEqual(['70ms', '140ms', '210ms'])
  })

  it('aligns the header on one axis with the card', () => {
    const { container } = renderAt(2)
    // The heading was centred over a left-aligned card once, which gave the
    // column three axes and no spine. Only the stepper's own labels centre.
    expect(container.querySelector('h1')!.className).not.toContain('text-center')
  })

  it('caps the card and the header at the same width, so they share an edge', () => {
    const { container } = renderAt(2)
    const header = container.querySelector('header')!
    const card = screen.getByText('body').closest('.max-w-\\[880px\\]')
    expect(header.className).toContain('max-w-[880px]')
    expect(card).not.toBeNull()
  })

  it('pins the page height so the page itself never scrolls', () => {
    // The requirement is a step that fits the viewport at 100%. The header is an
    // auto row and the step takes the rest. 100dvh, not 100vh: mobile Safari's
    // address bar makes vh taller than what you can see.
    const { container } = renderAt(3)
    const main = container.querySelector('main')!
    expect(main.className).toContain('md:h-[100dvh]')
    expect(main.className).toContain('md:overflow-hidden')
    expect(main.className).toContain('md:grid-rows-[auto_minmax(0,1fr)]')
  })

  it('sizes the step rather than scrolling it, so the step can pin its own footer', () => {
    // This wrapper used to be the scroll container, which put the step's Continue
    // button inside the scrolling region and let it hide on a short window. It
    // hands the step a height now; the step's Card takes the overflow and its
    // footer sits outside the Card. See lib/onboarding/step-layout.ts.
    const { container } = renderAt(3)
    const wrapper = screen.getByText('body').parentElement!
    expect(wrapper.className).toContain('md:h-full')
    expect(container.querySelector('.md\\:overflow-y-auto')).toBeNull()
  })
})
