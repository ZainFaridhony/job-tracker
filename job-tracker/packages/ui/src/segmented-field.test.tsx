import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SegmentedField } from './segmented-field'

const LOCATIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
] as const

function pill(container: HTMLElement) {
  return container.querySelector<HTMLElement>('span[aria-hidden]')!
}

/** jsdom rewrites `calc((100% - 0.5rem) / 3)` as `calc(0.333… * (100% - 0.5rem))`.
 *  Both are the same width, so read the fraction rather than the spelling. */
function segmentFraction(width: string): number {
  const multiplied = width.match(/calc\(\s*([\d.]+)\s*\*/)
  if (multiplied) return Number(multiplied[1])
  const divided = width.match(/\/\s*(\d+)\s*\)/)
  if (divided) return 1 / Number(divided[1])
  throw new Error(`unrecognised pill width: ${width}`)
}

describe('SegmentedField', () => {
  it('is real radios, so it submits and groups by name', () => {
    render(<SegmentedField name="work_location" legend="Preferred location" options={LOCATIONS} />)
    const remote = screen.getByRole('radio', { name: 'Remote' })
    expect(remote).toHaveAttribute('name', 'work_location')
    expect(remote).toHaveAttribute('value', 'remote')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('reflects the stored answer when a step is revisited', () => {
    render(<SegmentedField name="work_location" options={LOCATIONS} value="hybrid" />)
    expect(screen.getByRole('radio', { name: 'Hybrid' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Remote' })).not.toBeChecked()
  })

  it('selects nothing when there is no stored answer', () => {
    // work_location starts null. A control that highlighted a default the
    // server then rejects would be lying about what is submitted.
    render(<SegmentedField name="work_location" options={LOCATIONS} />)
    expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toHaveLength(
      0,
    )
  })

  it('keeps the label clickable by pairing it to its own input', async () => {
    render(<SegmentedField name="work_location" options={LOCATIONS} />)
    await userEvent.click(screen.getByText('On-site'))
    expect(screen.getByRole('radio', { name: 'On-site' })).toBeChecked()
  })

  it('names the group with a legend when given one', () => {
    render(<SegmentedField name="work_location" legend="Preferred location" options={LOCATIONS} />)
    expect(screen.getByRole('group', { name: 'Preferred location' })).toBeInTheDocument()
  })

  it('drives the pill from the checked input, not from client state', () => {
    // The slide is peer-checked, so it survives with JavaScript disabled. Each
    // segment needs its own peer name and its own position class.
    const { container } = render(<SegmentedField name="work_location" options={LOCATIONS} />)
    const peers = screen.getAllByRole('radio').map((r) => r.className)
    expect(peers).toEqual([
      expect.stringContaining('peer/s0'),
      expect.stringContaining('peer/s1'),
      expect.stringContaining('peer/s2'),
    ])

    const cls = pill(container).className
    expect(cls).toContain('peer-checked/s0:translate-x-0')
    expect(cls).toContain('peer-checked/s1:translate-x-full')
    expect(cls).toContain('peer-checked/s2:translate-x-[200%]')
  })

  it('hides the pill until something is checked', () => {
    const { container } = render(<SegmentedField name="work_location" options={LOCATIONS} />)
    const cls = pill(container).className
    expect(cls).toContain('opacity-0')
    expect(cls).toContain('peer-checked/s0:opacity-100')
  })

  it('sizes the pill to exactly one segment, allowing for the track padding', () => {
    const three = render(<SegmentedField name="a" options={LOCATIONS} />)
    const w3 = pill(three.container).style.width
    // Clears the track's p-1 on both sides, or the pill overhangs the last segment.
    expect(w3).toContain('100% - 0.5rem')
    expect(segmentFraction(w3)).toBeCloseTo(1 / 3)
    three.unmount()

    const two = render(<SegmentedField name="b" options={LOCATIONS.slice(0, 2)} />)
    expect(segmentFraction(pill(two.container).style.width)).toBeCloseTo(1 / 2)
  })

  it('gives the track one column per segment', () => {
    const { container } = render(<SegmentedField name="p" options={LOCATIONS.slice(0, 2)} />)
    expect(container.querySelector('.grid')!.className).toContain('grid-cols-2')
  })

  it('keeps the legend reachable when a neighbouring heading carries it', () => {
    render(
      <SegmentedField name="salary_period" legend="Pay period" legendHidden options={LOCATIONS} />,
    )
    // Hidden visually, still the group's accessible name.
    expect(screen.getByRole('group', { name: 'Pay period' })).toBeInTheDocument()
    expect(screen.getByText('Pay period').className).toContain('sr-only')
  })

  it('shrinks to its labels in the compact size, and keeps the pill in step', () => {
    const { container } = render(
      <SegmentedField name="salary_period" size="compact" options={LOCATIONS.slice(0, 2)} />,
    )
    const track = container.querySelector('.inline-grid')!
    expect(track.className).toContain('rounded-full')
    expect(track.className).toContain('p-0.5')

    // The gutter must be twice the track padding or the pill overhangs the last
    // segment. p-0.5 is 0.125rem a side, so 0.25rem total.
    const w = pill(container).style.width
    expect(w).toContain('100% - 0.25rem')
    expect(segmentFraction(w)).toBeCloseTo(1 / 2)
    expect(pill(container).className).toContain('rounded-full')
  })

  it('carries a visible focus ring on the outline token, not outline-subtle', () => {
    const { container } = render(<SegmentedField name="work_location" options={LOCATIONS} />)
    // WCAG 1.4.11: the focus indicator must clear 3:1, which outline-subtle does not.
    const cls = container.querySelector('.grid')!.className
    expect(cls).toContain('has-[:focus-visible]:outline-ink')
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('checks the stored segment in the server HTML, so the pill lands without JS', () => {
    // The slide is peer-checked off this attribute. If it were missing from the
    // server markup the pill would sit on the wrong segment until hydration.
    const html = renderToString(
      <SegmentedField name="work_location" options={LOCATIONS} value="onsite" />,
    )
    const checked = html.match(/<input[^>]*\bchecked\b[^>]*>/g) ?? []
    expect(checked).toHaveLength(1)
    expect(checked[0]).toContain('value="onsite"')
  })

  it('dresses the pill from the tokens, never a raw colour', () => {
    const { container } = render(<SegmentedField name="work_location" options={LOCATIONS} />)
    // A hex here would fail the no-raw-color rule at build; rgba is the escape
    // hatch the Card shadow already uses.
    expect(pill(container).className).not.toMatch(/#[0-9a-fA-F]{3,6}/)
    expect(pill(container).className).toContain('bg-surface')
  })

  it('associates every radio with a form it does not sit inside', () => {
    render(
      <SegmentedField
        name="period"
        legend="Salary period"
        form="job-filters"
        options={[
          { value: 'yearly', label: 'Yearly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />,
    )
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('form', 'job-filters')
    }
  })
})
