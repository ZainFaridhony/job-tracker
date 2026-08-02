import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCX_MIME, PDF_MIME } from '../cv/extract-text'

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
  createGroqExtractor: () => ({ extract }),
}))

type Update = { table: string; values: Record<string, unknown>; id: unknown }

const uploads: Array<{ path: string; contentType: string; size: number }> = []
const inserts: Array<{ table: string; values: Record<string, unknown> }> = []
const updates: Update[] = []
let uploadError: unknown = null
let insertError: unknown = null
let userId: string | null = 'user-1'

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
    }
  },
}

vi.mock('@job-tracker/db/server', () => ({
  createServerSupabase: async () => fakeClient,
}))

const {
  uploadCvAction,
  saveGoalAction,
  saveRolesAction,
  saveSkillsAction,
  saveWorkAction,
  finishOnboardingAction,
} = await import('./actions')

const fixture = (n: string) => readFileSync(join(__dirname, '..', 'cv', 'fixtures', n))

function upload(name: string, bytes: Buffer | Uint8Array, type: string): FormData {
  const form = new FormData()
  form.set('cv', new File([new Uint8Array(bytes)], name, { type }))
  return form
}

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
  extract.mockReset()
  extract.mockResolvedValue({ targetRoles: ['Backend Engineer'], skills: ['Go'], yearsExperience: 7 })
})

describe('uploadCvAction — rejections', () => {
  it('asks for a file when none was chosen', async () => {
    expect(await uploadCvAction({}, new FormData())).toEqual({ error: 'Choose a file to upload.' })
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
    expect(updates).toEqual([])
  })

  it('never leaks CV text into an error message (P3)', async () => {
    uploadError = { message: 'boom' }
    const r = await uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(r.error).not.toMatch(/Backend Engineer/i)
  })
})

describe('uploadCvAction — happy path', () => {
  it('advances to the career-goal step', async () => {
    const to = await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(to).toBe('/onboarding/goals')
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

  it('pre-fills steps 3 and 4 from the model', async () => {
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(updates).toEqual([
      {
        table: 'profiles',
        id: 'user-1',
        values: {
          target_roles: ['Backend Engineer'],
          skills: ['Go'],
          years_experience: 7,
          onboarding_step: 2,
        },
      },
    ])
  })

  it('accepts a DOCX as well as a PDF', async () => {
    const to = await redirectTarget(() =>
      uploadCvAction({}, upload('cv.docx', fixture('text-cv.docx'), DOCX_MIME)),
    )
    expect(to).toBe('/onboarding/goals')
  })

  it('still advances when the model fails — a Groq outage must not block signup', async () => {
    extract.mockRejectedValue(new Error('502'))
    const to = await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(to).toBe('/onboarding/goals')
    expect(updates[0]!.values).toMatchObject({
      target_roles: [],
      skills: [],
      years_experience: null,
      onboarding_step: 2,
    })
  })

  it('keeps the CV even when the model fails, so nothing needs re-uploading', async () => {
    extract.mockRejectedValue(new Error('502'))
    await redirectTarget(() =>
      uploadCvAction({}, upload('cv.pdf', fixture('text-cv.pdf'), PDF_MIME)),
    )
    expect(inserts).toHaveLength(1)
  })
})

describe('saveGoalAction', () => {
  it('requires a choice', async () => {
    expect(await saveGoalAction({}, new FormData())).toEqual({
      error: 'Pick the one that fits best.',
    })
  })

  it('stores the goal and moves to roles', async () => {
    const form = new FormData()
    form.set('career_goal', 'level-up')
    expect(await redirectTarget(() => saveGoalAction({}, form))).toBe('/onboarding/roles')
    expect(updates[0]!.values).toEqual({ career_goal: 'level-up', onboarding_step: 3 })
  })
})

describe('saveRolesAction', () => {
  it('refuses an empty list rather than storing one', async () => {
    const r = await saveRolesAction({}, new FormData())
    expect(r.error).toMatch(/at least one role/)
    expect(updates).toEqual([])
  })

  it('keeps every chip the user left in place', async () => {
    const form = new FormData()
    form.append('target_roles', 'Backend Engineer')
    form.append('target_roles', 'Platform Engineer')
    expect(await redirectTarget(() => saveRolesAction({}, form))).toBe('/onboarding/skills')
    expect(updates[0]!.values).toEqual({
      target_roles: ['Backend Engineer', 'Platform Engineer'],
      onboarding_step: 4,
    })
  })

  it('drops blank entries', async () => {
    const form = new FormData()
    form.append('target_roles', 'Engineer')
    form.append('target_roles', '')
    await redirectTarget(() => saveRolesAction({}, form))
    expect(updates[0]!.values.target_roles).toEqual(['Engineer'])
  })
})

describe('saveSkillsAction', () => {
  function skillsForm(years: string, skills: string[] = ['Go']) {
    const form = new FormData()
    for (const s of skills) form.append('skills', s)
    form.set('years_experience', years)
    return form
  }

  it('treats a blank experience box as unstated, not zero', async () => {
    await redirectTarget(() => saveSkillsAction({}, skillsForm('')))
    expect(updates[0]!.values).toEqual({
      skills: ['Go'],
      years_experience: null,
      onboarding_step: 5,
    })
  })

  it('accepts a whole number in range', async () => {
    expect(await redirectTarget(() => saveSkillsAction({}, skillsForm('7')))).toBe(
      '/onboarding/work',
    )
    expect(updates[0]!.values.years_experience).toBe(7)
  })

  it.each(['-1', '61', '3.5', 'seven'])('rejects %s years', async (bad) => {
    const r = await saveSkillsAction({}, skillsForm(bad))
    expect(r.error).toMatch(/whole number between 0 and 60/)
    expect(updates).toEqual([])
  })

  it('allows an empty skill list — the CV may not have listed any', async () => {
    await redirectTarget(() => saveSkillsAction({}, skillsForm('5', [])))
    expect(updates[0]!.values.skills).toEqual([])
  })
})

describe('saveWorkAction', () => {
  function workForm(location: string, period = 'yearly', target = '') {
    const form = new FormData()
    form.set('work_location', location)
    form.set('salary_period', period)
    form.set('salary_target', target)
    return form
  }

  it('requires a location', async () => {
    expect((await saveWorkAction({}, workForm(''))).error).toMatch(/Pick a work location/)
  })

  // The database check constraint rejects anything else, so a bad value would
  // otherwise surface as an unexplained 400 mid-wizard.
  it('rejects a location the database would refuse', async () => {
    expect((await saveWorkAction({}, workForm('mars'))).error).toMatch(/Pick a work location/)
    expect(updates).toEqual([])
  })

  it('rejects a salary period the database would refuse', async () => {
    expect((await saveWorkAction({}, workForm('remote', 'hourly'))).error).toMatch(
      /yearly or monthly/,
    )
  })

  it('stores a complete answer and moves to the summary', async () => {
    const to = await redirectTarget(() =>
      saveWorkAction({}, workForm('remote', 'monthly', ' 20,000,000 IDR ')),
    )
    expect(to).toBe('/onboarding/done')
    expect(updates[0]!.values).toEqual({
      work_location: 'remote',
      salary_period: 'monthly',
      salary_target: '20,000,000 IDR',
      onboarding_step: 6,
    })
  })

  it('stores an omitted salary as null rather than an empty string', async () => {
    await redirectTarget(() => saveWorkAction({}, workForm('hybrid', 'yearly', '   ')))
    expect(updates[0]!.values.salary_target).toBeNull()
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
  // instead cost step 6 its no-JavaScript path once already.
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
    expect(await redirectTarget(() => saveGoalAction({}, form))).toBe('/sign-in')
    expect(updates).toEqual([])
  })
})
