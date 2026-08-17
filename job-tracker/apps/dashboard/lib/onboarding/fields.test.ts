import { describe, expect, it } from 'vitest'
import { readAllProfileFields, readPreferenceFields, readProfileFields } from './fields'

/** The settings screen posts one form carrying both halves. */
function form(over: Record<string, string | string[]> = {}): FormData {
  const base: Record<string, string | string[]> = {
    career_goal: 'senior',
    work_location: 'hybrid',
    salary_period: 'yearly',
    salary_currency: 'IDR',
    salary_target: '600000000',
    target_roles: ['Business Development Manager'],
    skills: ['B2B Sales'],
    years_experience: '6',
  }
  const merged = { ...base, ...over }
  const fd = new FormData()
  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value)) value.forEach((v) => fd.append(key, v))
    else if (value !== '') fd.set(key, value)
    else fd.set(key, '')
  }
  return fd
}

describe('readProfileFields', () => {
  it('keeps the roles and skills it was given', () => {
    const read = readProfileFields(form({ target_roles: ['A', 'B'], skills: ['C'] }))
    expect(read.ok && read.values).toMatchObject({ target_roles: ['A', 'B'], skills: ['C'] })
  })

  it('drops empty entries rather than storing blank chips', () => {
    const read = readProfileFields(form({ target_roles: ['A', '', 'B'] }))
    expect(read.ok && read.values.target_roles).toEqual(['A', 'B'])
  })

  it('refuses an empty role list, naming the field so the form can place it', () => {
    const read = readProfileFields(form({ target_roles: [] }))
    expect(read.ok).toBe(false)
    expect(!read.ok && read.field).toBe('target_roles')
  })

  it('allows years to be unset, because the CV may not say', () => {
    const read = readProfileFields(form({ years_experience: '' }))
    expect(read.ok && read.values.years_experience).toBeNull()
  })

  it('bounds years, because the column is an int and 61 is a typo', () => {
    for (const bad of ['61', '-1', '6.5']) {
      const read = readProfileFields(form({ years_experience: bad }))
      expect(read.ok, bad).toBe(false)
      expect(!read.ok && read.field).toBe('years_experience')
    }
  })
})

describe('readPreferenceFields', () => {
  it('strips everything that is not a digit from the salary', () => {
    // AmountField groups as you type, and with JS off it posts what was typed.
    const read = readPreferenceFields(form({ salary_target: 'Rp 600,000,000' }))
    expect(read.ok && read.values.salary_target).toBe('600000000')
  })

  it('drops leading zeros, but a lone zero survives as a zero', () => {
    // `^0+(?=\d)` needs a digit behind it, which is what stops "0" becoming "".
    const padded = readPreferenceFields(form({ salary_target: '007' }))
    expect(padded.ok && padded.values.salary_target).toBe('7')

    const zero = readPreferenceFields(form({ salary_target: '0' }))
    expect(zero.ok && zero.values.salary_target).toBe('0')
  })

  it('stores no salary rather than an empty string', () => {
    const read = readPreferenceFields(form({ salary_target: '' }))
    expect(read.ok && read.values.salary_target).toBeNull()
  })

  it('leaves the autofill toggle to the settings screen, which owns it', () => {
    // This function is shared with the wizard's step 3, which has no such
    // control. Writing it here would make every step-3 save set it to false and
    // switch the preference back off for anyone who re-ran the wizard — the
    // mirror of the rule that keeps settings from writing onboarding_step.
    const read = readPreferenceFields(form({ autofill_job_filters: ['off', 'on'] }))
    expect(read.ok && 'autofill_job_filters' in read.values).toBe(false)
  })

  it('checks each set-valued field against its set', () => {
    const cases: Array<[string, string]> = [
      ['career_goal', ''],
      ['work_location', 'moon'],
      ['salary_period', 'weekly'],
      ['salary_currency', 'XYZ'],
    ]
    for (const [field, value] of cases) {
      const read = readPreferenceFields(form({ [field]: value }))
      expect(read.ok, field).toBe(false)
      expect(!read.ok && read.field).toBe(field)
    }
  })
})

describe('readAllProfileFields', () => {
  it('merges both halves into one update', () => {
    const read = readAllProfileFields(form())
    expect(read.ok).toBe(true)
    expect(read.ok && Object.keys(read.values).sort()).toEqual([
      'autofill_job_filters',
      'career_goal',
      'salary_currency',
      'salary_period',
      'salary_target',
      'skills',
      'target_roles',
      'work_location',
      'years_experience',
    ])
  })

  it('writes nothing that would disturb the wizard', () => {
    // Editing a salary two months later is not a step, and cv_prefilled_at
    // records an event that stays true however much the user edits afterwards.
    const read = readAllProfileFields(form())
    expect(read.ok && 'onboarding_step' in read.values).toBe(false)
    expect(read.ok && 'onboarding_complete' in read.values).toBe(false)
    expect(read.ok && 'cv_prefilled_at' in read.values).toBe(false)
  })

  it('reads the autofill toggle as a boolean, defaulting to off', () => {
    // A checkbox posts nothing when unticked, so the form pairs it with a hidden
    // "off" and the browser posts both in order. `form.get` returns the FIRST
    // value, so this has to read the LAST one or a ticked box would never win.
    const on = readAllProfileFields(form({ autofill_job_filters: ['off', 'on'] }))
    expect(on.ok && on.values.autofill_job_filters).toBe(true)

    const off = readAllProfileFields(form({ autofill_job_filters: ['off'] }))
    expect(off.ok && off.values.autofill_job_filters).toBe(false)
  })

  it('treats the toggle as off when the form omits it entirely', () => {
    const read = readAllProfileFields(form())
    expect(read.ok && read.values.autofill_job_filters).toBe(false)
  })

  it('reports a preference failure ahead of a profile one', () => {
    // Documented rather than desirable: see the note on the function. Each
    // message carries its own field, so it still lands under the right control.
    const read = readAllProfileFields(form({ work_location: 'moon', target_roles: [] }))
    expect(!read.ok && read.field).toBe('work_location')
  })

  it('still reports a profile failure when the preferences are fine', () => {
    const read = readAllProfileFields(form({ target_roles: [] }))
    expect(!read.ok && read.field).toBe('target_roles')
  })
})
