import { describe, expect, it } from 'vitest'
import { STEP_BODY, STEP_FORM } from './step-layout'

/**
 * These assert a shape, which is unusual for a test, and deliberate. The
 * arrangement they describe is the only reason Continue stays reachable on a
 * short window, and it is easy to undo by accident: drop `min-h-0` and the Card
 * refuses to shrink; move the footer back inside the Card and it scrolls away
 * again. The dashboard's vitest is node-only, so a rendered assertion is not
 * available here.
 */
describe('the step column', () => {
  it('is a column that fills the height the shell hands it', () => {
    expect(STEP_FORM).toContain('flex')
    expect(STEP_FORM).toContain('flex-col')
    expect(STEP_FORM).toContain('md:h-full')
  })

  it('scrolls the body, not the column', () => {
    // The column must not scroll: the footer lives in it, outside the body, and
    // that is what keeps the footer still.
    expect(STEP_BODY).toContain('md:overflow-y-auto')
    expect(STEP_FORM).not.toContain('overflow-y-auto')
  })

  it('lets the body shrink below its content', () => {
    // A flex item defaults to `min-height: auto`, which refuses to shrink past its
    // content — the body would push the footer off the bottom instead of
    // scrolling. This one class is the whole mechanism.
    expect(STEP_BODY).toContain('min-h-0')
    expect(STEP_BODY).toContain('flex-1')
  })

  it('leaves the page height to the shell', () => {
    // WizardShell owns `md:h-[100dvh]` and `md:overflow-hidden`. A second height
    // claim here would fight it.
    for (const cls of [STEP_FORM, STEP_BODY]) {
      expect(cls).not.toContain('100dvh')
      expect(cls).not.toContain('h-screen')
    }
  })

  it('only pins above md, so a phone scrolls normally', () => {
    expect(STEP_FORM).not.toMatch(/(^| )h-full/)
    expect(STEP_BODY).not.toMatch(/(^| )overflow-y-auto/)
  })
})
