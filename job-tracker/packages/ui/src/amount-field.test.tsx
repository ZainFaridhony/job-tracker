import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AmountField } from './amount-field'

const CURRENCIES = [
  { value: 'IDR', label: 'IDR', symbol: 'Rp' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
] as const

function setup(props: Partial<Parameters<typeof AmountField>[0]> = {}) {
  return render(
    <AmountField
      label="Target salary"
      name="salary_target"
      currencyName="salary_currency"
      currencies={CURRENCIES}
      {...props}
    />,
  )
}

describe('AmountField', () => {
  it('associates its label with the amount', () => {
    setup()
    expect(screen.getByLabelText('Target salary')).toHaveAttribute('name', 'salary_target')
  })

  it('submits the currency as its own field, not inside the amount', () => {
    setup()
    const select = screen.getByLabelText('Currency')
    expect(select).toHaveAttribute('name', 'salary_currency')
    expect(select.tagName).toBe('SELECT')
  })

  it('offers every currency it is given', () => {
    setup()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['IDR', 'USD', 'EUR'])
  })

  it('reflects the stored currency when a step is revisited', () => {
    setup({ currency: 'USD' })
    expect(screen.getByLabelText('Currency')).toHaveValue('USD')
  })

  it('falls back to the first currency when the stored one is unknown', () => {
    // A code retired from the list must not leave the select with no value.
    setup({ currency: 'ZWD' })
    expect(screen.getByLabelText('Currency')).toHaveValue('IDR')
  })

  it('groups the stored amount on first paint', () => {
    setup({ defaultValue: '240000000' })
    expect(screen.getByLabelText('Target salary')).toHaveValue('240,000,000')
  })

  it('groups digits as they are typed', async () => {
    setup()
    const amount = screen.getByLabelText('Target salary')
    await userEvent.type(amount, '120000')
    expect(amount).toHaveValue('120,000')
  })

  it('ignores anything that is not a digit', async () => {
    setup()
    const amount = screen.getByLabelText('Target salary')
    await userEvent.type(amount, '12a-3 4x')
    expect(amount).toHaveValue('1,234')
  })

  it('drops leading zeros', async () => {
    setup()
    const amount = screen.getByLabelText('Target salary')
    await userEvent.type(amount, '00420')
    expect(amount).toHaveValue('420')
  })

  it('shows the symbol for the chosen currency and follows the picker', async () => {
    const { container } = setup({ currency: 'IDR' })
    expect(container.textContent).toContain('Rp')
    await userEvent.selectOptions(screen.getByLabelText('Currency'), 'EUR')
    expect(container.textContent).toContain('€')
    expect(container.textContent).not.toContain('Rp')
  })

  it('keeps the amount a text input, so separators survive', () => {
    // type="number" rejects the commas and adds a spinner.
    setup()
    const amount = screen.getByLabelText('Target salary')
    expect(amount).toHaveAttribute('type', 'text')
    expect(amount).toHaveAttribute('inputMode', 'numeric')
  })

  it('bounds the field with the accessible outline token', () => {
    const { container } = setup()
    // outline-subtle fails WCAG 1.4.11 on a control - PRD Appendix A.
    const rule = container.querySelector('.border-b-2')!.className
    expect(rule).toContain('border-outline')
    expect(rule).not.toContain('border-outline-subtle')
  })

  it('never dresses itself in a raw colour', () => {
    const { container } = setup()
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })

  it('carries the stored answer in the server HTML, so no-JS is correct', () => {
    // A controlled <select> whose selection lived only in a client property
    // would render as the first currency for anyone without JavaScript, and
    // silently submit the wrong one. React must emit selected= in the markup.
    const html = renderToString(
      <AmountField
        label="Target salary"
        name="salary_target"
        currencyName="salary_currency"
        currencies={CURRENCIES}
        currency="USD"
        defaultValue="120000"
      />,
    )
    expect(html).toMatch(/<option[^>]*\bvalue="USD"[^>]*\bselected\b/)
    expect(html).toContain('120,000')
    expect(html).toContain('$')
  })

  it('associates both controls with a form neither sits inside', () => {
    // The jobs filter sidebar renders inside the results grid while its form
    // element is in the search card above it, so the amount and the currency
    // reach the form by id. One missing `form` here and that control is
    // silently dropped from every submission.
    render(
      <AmountField
        label="Minimum"
        name="salaryMin"
        currencyName="currency"
        currencies={CURRENCIES}
        form="job-filters"
      />,
    )
    expect(screen.getByLabelText('Minimum')).toHaveAttribute('form', 'job-filters')
    expect(screen.getByLabelText('Currency')).toHaveAttribute('form', 'job-filters')
  })

  it('renders a hint under the field only when given one', () => {
    const { unmount } = render(
      <AmountField
        label="Minimum"
        name="salaryMin"
        currencyName="currency"
        currencies={CURRENCIES}
        hint="Also the currency every salary is shown in."
      />,
    )
    expect(screen.getByText('Also the currency every salary is shown in.')).toBeInTheDocument()
    unmount()

    render(
      <AmountField
        label="Minimum"
        name="salaryMin"
        currencyName="currency"
        currencies={CURRENCIES}
      />,
    )
    expect(screen.queryByText(/Also the currency/)).toBeNull()
  })
})
