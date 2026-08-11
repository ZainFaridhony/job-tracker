import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCX_MIME, PDF_MIME } from '../cv/limits'

/** Thrown by the mocked next/navigation redirect, mirroring the real control flow. */
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`)
  }
}

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to)
  },
}))

const extract = vi.fn()
vi.mock('@job-tracker/ai', () => ({
  createCerebrasExtractor: () => ({ extract }),
}))

type Update = { table: string; values: Record<string, unknown>; id: unknown }

const uploads: Array<{ path: string; contentType: string; size: number }> = []
const inserts: Array<{ table: string; values: Record<string, unknown> }> = []
const updates: Update[] = []
let uploadError: unknown = null
let insertError: unknown = null
let userId: string | null = 'user-1'
/** What `profiles.onboarding_step` currently holds for the caller. */
let storedStep = 1

const fakeClient = {
  auth: {
    getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }),
  },
  storage: {
    from: () => ({
      async upload(path: string, body: Buffer, opts: { contentType: string }) {
        uploads.push({ path, contentType: opts.contentType, size: body.byteLength })
        return { error: uploadError }
      },
    }),
  },
  from(table: string) {
    return {
      async insert(values: Record<string, unknown>) {
        inserts.push({ table, values })
        return { error: insertError }
      },
      update(values: Record<string, unknown>) {
        return {
          async eq(_col: string, id: unknown) {
            updates.push({ table, values, id })
            return { error: null }
          },
        }
      },
      select(_cols: string) {
        return {
          eq(_col: string, _id: unknown) {
            return {
              async maybeSingle() {
                return { data: { onboarding_step: storedStep }, error: null }
              },
            }
          },
        }
      },
    }
  },
}

vi.mock('@job-tracker/db/server', () => ({
  createServerSupabase: async () => fakeClient,
}))

const { uploadCvAction, saveProfileAction, savePreferencesAction, finishOnboardingAction } =
  await import('./actions')

const fixture = (n: string) => readFileSync(join(__dirname, '..', 'cv', 'fixtures', n))

function upload(name: string, bytes: Buffer | Uint8Array, type: string): FormData {
  const form = new FormData()
  form.set('cv', new File([new Uint8Array(bytes)], name, { type }))
  return form
}

const profileUpdates = () => updates.filter((u) => u.table === 'profiles')

/** Runs an action that is expected to redirect, and reports where to. */
async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (e) {
    if (e instanceof Redirected) return e.to
    throw e
  }
  throw new Error('expected a redirect, got a return')
}

beforeEach(() => {
  uploads.length = 0
  inserts.length = 0
  updates.length = 0
  uploadError = null
  insertError = null
  userId = 'user-1'
  storedStep = 1
  extract.mockReset()
  extract.mockResolvedValue({ targetRoles: ['Backend Engineer'], skills: ['Go'], yearsExperience: 7 })
})

describe('uploadCvAction — rejections', () => {
  it('asks for a file when none was chosen', async () => {
    expect(await uploadCvAction({}, new FormData())).toEqual({
      error: 'Choose a file to upload.',
      field: 'cv',
    })
  })

  it('rejects an empty file', async () => {
    const r = await uploadCvAction({}, upload('empty.pdf', Buffer.alloc(0), PDF_MIME))
    expect(r.error).toBe('Choose a file to upload.')
  })

  it('names the supported types when given something else', async () => {
    const r = await uploadCvAction({}, upload('me.png', Buffer.from('x'), 'image/png'))
    expect(r.error).toMatch(/PDF or a Word document/)
  })

  it('rejects a file over 10 MB before reading it', async () => {
    const r = await uploadCvAction({}, upload('big.pdf', Buffer.alloc(11 * 1024 * 1024), PDF_MIME))
    expect(r.error).toMatch(/over 10 MB/)
  })

  it('explains a scanned CV instead of producing an empty profile', async () => {
    const r = await uploadCvAction({}, upload('scan.pdf', fixture('scanned-cv.pdf'), PDF_MIME))
    expect(r.error).toMatch(/scan or an image/)
  })

  it('stores nothing when the file cannot be read', async () => {
    await uploadCvAction({}, upload('scan.pdf', fixture('scanned-cv.pdf'), PDF_MIME))
    expect(uploads).toEqual([])
    expect(inserts).toEqual([])
    expect(updates).toEqual([])
  })

  it('reports a storage failure without advancing the step', async () => {
    uploadError = { message: 'boom' }
    const r = await uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(r.error).toBe('We could not save that file. Try again.')
    expect(updates).toEqual([])
  })

  it('reports a row-insert failure without advancing the step', async () => {
    insertError = { message: 'boom' }
    const r = await uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(r.error).toBe('We could not save that file. Try again.')
    expect(profileUpdates()).toEqual([])
  })

  it('never leaks CV text into an error message (P3)', async () => {
    uploadError = { message: 'boom' }
    const r = await uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(r.error).not.toMatch(/Backend Engineer/i)
  })

  it('names the field it rejected, so the message can sit with the control', async () => {
    const r = await uploadCvAction({}, upload('me.png', Buffer.from('x'), 'image/png'))
    expect(r.field).toBe('cv')
  })
})

describe('uploadCvAction — happy path', () => {
  it('advances to the confirm step', async () => {
    const to = await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(to).toBe('/onboarding/profile')
  })

  it('namespaces the object under the user id, which is what the policy checks', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(uploads).toHaveLength(1)
    expect(uploads[0]!.path.startsWith('user-1/')).toBe(true)
    expect(uploads[0]!.contentType).toBe(PDF_MIME)
  })

  it('sanitises the filename so it cannot escape that namespace', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('../../etc/passwd .pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    const rest = uploads[0]!.path.slice('user-1/'.length)
    expect(rest).not.toContain('/')
    expect(rest).not.toContain('..')
  })

  it('persists the extracted text and its length on the cvs row', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(inserts).toHaveLength(1)
    const row = inserts[0]!.values
    expect(inserts[0]!.table).toBe('cvs')
    expect(row.user_id).toBe('user-1')
    expect(row.file_name).toBe('cv.pdf')
    expect(String(row.extracted_text)).toMatch(/Backend Engineer/i)
    expect(row.char_count).toBe(String(row.extracted_text).length)
    expect(row.is_primary).toBe(true)
  })

  it('sends the extracted text to the extractor, not the raw file', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(extract).toHaveBeenCalledOnce()
    expect(extract.mock.calls[0]![0]).toMatch(/Backend Engineer/i)
  })

  it('pre-fills the confirm step from the model', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(profileUpdates()).toHaveLength(1)
    expect(profileUpdates()[0]!.values).toMatchObject({
      target_roles: ['Backend Engineer'],
      skills: ['Go'],
      years_experience: 7,
      onboarding_step: 2,
    })
  })

  it('records that a pre-fill happened, which is what the step-2 copy keys off', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    const at = profileUpdates()[0]!.values.cv_prefilled_at
    expect(typeof at).toBe('string')
    expect(Number.isNaN(Date.parse(String(at)))).toBe(false)
  })

  it('demotes an earlier CV so only one row claims is_primary', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(updates.filter((u) => u.table === 'cvs')).toEqual([
      { table: 'cvs', id: 'user-1', values: { is_primary: false } },
    ])
    expect(inserts[0]!.values.is_primary).toBe(true)
  })

  it('accepts a DOCX as well as a PDF', async () => {
    const to = await redirectTarget(() =>
      uploadCvAction({}, upload('cv.docx', fixture('text-cv.docx'), DOCX_MIME)),
    )
    expect(to).toBe('/onboarding/profile')
  })

  it('still advances when the model fails — a Cerebras outage must not block signup', async () => {
    extract.mockRejectedValue(new Error('502'))
    const to = await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(to).toBe('/onboarding/profile')
    expect(profileUpdates()[0]!.values).toEqual({ onboarding_step: 2 })
  })

  it('claims no pre-fill when the model failed', async () => {
    extract.mockRejectedValue(new Error('502'))
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    // Without this, step 2 would read "Here's what we read" over empty fields.
    expect(profileUpdates()[0]!.values).not.toHaveProperty('cv_prefilled_at')
  })

  it('claims no pre-fill when the model answered but found nothing', async () => {
    // Cerebras can succeed and still return an empty profile — a CV under the
    // minimum useful length, or a malformed response the validator falls back on.
    extract.mockResolvedValue({ targetRoles: [], skills: [], yearsExperience: null })
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    const values = profileUpdates()[0]!.values
    expect(values).not.toHaveProperty('cv_prefilled_at')
    expect(values).not.toHaveProperty('target_roles')
  })

  it('leaves hand-corrected lists alone when a re-upload hits a model failure', async () => {
    // Back makes this reachable: the user is on the last step, returns to step 1
    // and uploads again. Writing empty arrays here would delete their edits.
    storedStep = 4
    extract.mockRejectedValue(new Error('502'))
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    const values = profileUpdates()[0]!.values
    expect(values).not.toHaveProperty('target_roles')
    expect(values).not.toHaveProperty('skills')
    expect(values).not.toHaveProperty('years_experience')
  })

  it('keeps the CV even when the model fails, so nothing needs re-uploading', async () => {
    extract.mockRejectedValue(new Error('502'))
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(inserts).toHaveLength(1)
  })
})

describe('saveProfileAction', () => {
  function profileForm(roles: string[], skills: string[] = ['Go'], years = '') {
    const form = new FormData()
    for (const r of roles) form.append('target_roles', r)
    for (const s of skills) form.append('skills', s)
    form.set('years_experience', years)
    return form
  }

  it('refuses an empty role list rather than storing one', async () => {
    const r = await saveProfileAction({}, profileForm([]))
    expect(r.error).toMatch(/at least one role/)
    expect(r.field).toBe('target_roles')
    expect(updates).toEqual([])
  })

  it('keeps every chip the user left in place, and moves on', async () => {
    const to = await redirectTarget(() =>
      saveProfileAction({}, profileForm(['Backend Engineer', 'Platform Engineer'])),
    )
    expect(to).toBe('/onboarding/preferences')
    expect(updates[0]!.values).toEqual({
      target_roles: ['Backend Engineer', 'Platform Engineer'],
      skills: ['Go'],
      years_experience: null,
      onboarding_step: 3,
    })
  })

  it('drops blank entries', async () => {
    await redirectTarget(() => saveProfileAction({}, profileForm(['Engineer', ''])))
    expect(updates[0]!.values.target_roles).toEqual(['Engineer'])
  })

  it('treats a blank experience box as unstated, not zero', async () => {
    await redirectTarget(() => saveProfileAction({}, profileForm(['Engineer'], ['Go'], '')))
    expect(updates[0]!.values.years_experience).toBeNull()
  })

  it('accepts a whole number in range', async () => {
    await redirectTarget(() => saveProfileAction({}, profileForm(['Engineer'], ['Go'], '7')))
    expect(updates[0]!.values.years_experience).toBe(7)
  })

  it.each(['-1', '61', '3.5', 'seven'])('rejects %s years', async (bad) => {
    const r = await saveProfileAction({}, profileForm(['Engineer'], ['Go'], bad))
    expect(r.error).toMatch(/whole number between 0 and 60/)
    expect(r.field).toBe('years_experience')
    expect(updates).toEqual([])
  })

  it('allows an empty skill list — the CV may not have listed any', async () => {
    await redirectTarget(() => saveProfileAction({}, profileForm(['Engineer'], [], '5')))
    expect(updates[0]!.values.skills).toEqual([])
  })
})

describe('savePreferencesAction', () => {
  function prefsForm(
    goal = 'level-up',
    location = 'remote',
    period = 'yearly',
    target = '',
    currency = 'IDR',
  ) {
    const form = new FormData()
    form.set('career_goal', goal)
    form.set('work_location', location)
    form.set('salary_period', period)
    form.set('salary_target', target)
    form.set('salary_currency', currency)
    return form
  }

  it('requires a career goal', async () => {
    const r = await savePreferencesAction({}, prefsForm(''))
    expect(r.error).toMatch(/fits best/)
    expect(r.field).toBe('career_goal')
  })

  it('requires a location', async () => {
    const r = await savePreferencesAction({}, prefsForm('level-up', ''))
    expect(r.error).toMatch(/Pick a work location/)
    expect(r.field).toBe('work_location')
  })

  // The database check constraint rejects anything else, so a bad value would
  // otherwise surface as an unexplained 400 mid-wizard.
  it('rejects a location the database would refuse', async () => {
    expect((await savePreferencesAction({}, prefsForm('level-up', 'mars'))).error).toMatch(
      /Pick a work location/,
    )
    expect(updates).toEqual([])
  })

  it('rejects a salary period the database would refuse', async () => {
    expect(
      (await savePreferencesAction({}, prefsForm('level-up', 'remote', 'hourly'))).error,
    ).toMatch(/yearly or monthly/)
  })

  it('rejects a currency that is not on the list', async () => {
    expect(
      (await savePreferencesAction({}, prefsForm('level-up', 'remote', 'yearly', '100', 'XYZ')))
        .error,
    ).toMatch(/Pick a currency/)
    expect(updates).toEqual([])
  })

  it('stores a complete answer and moves to the summary', async () => {
    const to = await redirectTarget(() =>
      savePreferencesAction(
        {},
        prefsForm('switch-field', 'remote', 'monthly', ' 20,000,000 ', 'USD'),
      ),
    )
    expect(to).toBe('/onboarding/done')
    expect(updates[0]!.values).toEqual({
      career_goal: 'switch-field',
      work_location: 'remote',
      salary_period: 'monthly',
      salary_target: '20000000',
      salary_currency: 'USD',
      onboarding_step: 4,
    })
  })

  // Currency has its own column, so anything non-numeric in the amount is a
  // separator or a stray unit — either way the column stores the number.
  it('keeps only the digits of the amount', async () => {
    await redirectTarget(() =>
      savePreferencesAction({}, prefsForm('level-up', 'remote', 'yearly', '240.000.000 IDR')),
    )
    expect(updates[0]!.values.salary_target).toBe('240000000')
  })

  it('drops leading zeros rather than storing them', async () => {
    await redirectTarget(() =>
      savePreferencesAction({}, prefsForm('level-up', 'remote', 'yearly', '0012000')),
    )
    expect(updates[0]!.values.salary_target).toBe('12000')
  })

  it('stores an omitted salary as null rather than an empty string', async () => {
    await redirectTarget(() =>
      savePreferencesAction({}, prefsForm('level-up', 'hybrid', 'yearly', '   ')),
    )
    expect(updates[0]!.values.salary_target).toBeNull()
  })

  // The no-JS path posts no currency at all if the select never rendered.
  it('falls back to the default currency when none is posted', async () => {
    const form = new FormData()
    form.set('career_goal', 'level-up')
    form.set('work_location', 'remote')
    form.set('salary_period', 'yearly')
    await redirectTarget(() => savePreferencesAction({}, form))
    expect(updates[0]!.values.salary_currency).toBe('IDR')
  })
})

describe('going back and resubmitting', () => {
  function profileForm() {
    const form = new FormData()
    form.append('target_roles', 'Engineer')
    return form
  }

  it('does not rewind the progress marker', async () => {
    storedStep = 4
    await redirectTarget(() => saveProfileAction({}, profileForm()))
    expect(profileUpdates()[0]!.values.onboarding_step).toBe(4)
  })

  it('returns the user to where they had got to, not to the next step', async () => {
    storedStep = 4
    expect(await redirectTarget(() => saveProfileAction({}, profileForm()))).toBe('/onboarding/done')
  })

  it('still advances normally when the correction is at the frontier', async () => {
    storedStep = 2
    expect(await redirectTarget(() => saveProfileAction({}, profileForm()))).toBe(
      '/onboarding/preferences',
    )
    expect(profileUpdates()[0]!.values.onboarding_step).toBe(3)
  })

  it('holds at the last step rather than running past it', async () => {
    storedStep = 4
    const form = new FormData()
    form.set('career_goal', 'level-up')
    form.set('work_location', 'remote')
    form.set('salary_period', 'yearly')
    expect(await redirectTarget(() => savePreferencesAction({}, form))).toBe('/onboarding/done')
    expect(profileUpdates()[0]!.values.onboarding_step).toBe(4)
  })

  it('sends a re-upload back to the step it was launched from', async () => {
    storedStep = 3
    expect(
      await redirectTarget(() =>
        uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
      ),
    ).toBe('/onboarding/preferences')
  })

  it('does apply a fresh extraction on re-upload — a new CV is the point', async () => {
    storedStep = 3
    extract.mockResolvedValue({ targetRoles: ['Data Engineer'], skills: ['SQL'], yearsExperience: 3 })
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(profileUpdates()[0]!.values).toMatchObject({
      target_roles: ['Data Engineer'],
      skills: ['SQL'],
      years_experience: 3,
    })
  })
})

describe('finishOnboardingAction', () => {
  it('marks the profile complete and opens the workspace', async () => {
    expect(await redirectTarget(() => finishOnboardingAction())).toBe('/dashboard')
    expect(updates).toEqual([
      { table: 'profiles', id: 'user-1', values: { onboarding_complete: true } },
    ])
  })

  // It is posted as a form's `action` directly rather than through a client
  // closure, so it must tolerate the FormData React passes it. Wrapping it
  // instead cost the last step its no-JavaScript path once already.
  it('accepts the FormData a form action is called with', async () => {
    expect(await redirectTarget(() => finishOnboardingAction(new FormData()))).toBe('/dashboard')
    expect(updates[0]!.values).toEqual({ onboarding_complete: true })
  })

  it('never sets onboarding_complete for a signed-out caller', async () => {
    userId = null
    expect(await redirectTarget(() => finishOnboardingAction())).toBe('/sign-in')
    expect(updates).toEqual([])
  })
})

describe('every step action', () => {
  it('bounces a signed-out caller to sign-in instead of writing', async () => {
    userId = null
    const form = new FormData()
    form.set('career_goal', 'level-up')
    form.set('work_location', 'remote')
    expect(await redirectTarget(() => savePreferencesAction({}, form))).toBe('/sign-in')
    expect(updates).toEqual([])
  })

  it('bounces a signed-out upload too, rather than storing an orphan object', async () => {
    userId = null
    expect(
      await redirectTarget(() =>
        uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
      ),
    ).toBe('/sign-in')
    expect(uploads).toEqual([])
    expect(inserts).toEqual([])
  })
})
