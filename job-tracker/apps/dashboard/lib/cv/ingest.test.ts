import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCX_MIME, PDF_MIME } from './limits'

const extract = vi.fn()
vi.mock('@job-tracker/ai', () => ({
  createGroqExtractor: () => ({ extract }),
}))

let uploadError: unknown = null
let insertError: unknown = null

const fakeClient = {
  storage: {
    from: () => ({
      async upload() {
        return { error: uploadError }
      },
    }),
  },
  from() {
    return {
      async insert() {
        return { error: insertError }
      },
      update() {
        return {
          async eq() {
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

// The value import stays dynamic so the mocks above are in place first; the type
// import is erased at compile time and does not defeat that.
import type { IngestStage } from './ingest'
const { ingestCv } = await import('./ingest')

const fixture = (n: string) => readFileSync(join(__dirname, 'fixtures', n))

function file(name: string, bytes: Buffer | Uint8Array, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

/** Runs an ingest and reports the stage names in the order they were emitted. */
async function stagesFor(f: File) {
  const seen: IngestStage[] = []
  const result = await ingestCv({ userId: 'user-1', file: f, onStage: (e) => seen.push(e) })
  return { seen, names: seen.map((s) => s.stage), result }
}

beforeEach(() => {
  uploadError = null
  insertError = null
  extract.mockReset()
  extract.mockResolvedValue({ targetRoles: ['Backend Engineer'], skills: ['Go'], yearsExperience: 7 })
})

describe('ingestCv progress reporting', () => {
  it('reports each boundary once, in the order the work happens', async () => {
    const { names } = await stagesFor(file('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    // The narration on step 1 draws one line per boundary, so this order is what
    // the user sees resolve. It is not a timer.
    expect(names).toEqual(['read', 'extracted', 'stored', 'understanding', 'prefilled'])
  })

  it('carries the filename and the character count it actually found', async () => {
    const { seen } = await stagesFor(file('my-cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    const read = seen.find((s) => s.stage === 'read')!
    const extracted = seen.find((s) => s.stage === 'extracted')!
    expect(read).toEqual({ stage: 'read', fileName: 'my-cv.pdf' })
    expect(extracted.stage === 'extracted' && extracted.chars).toBeGreaterThan(200)
  })

  it('resolves the model stage as a success when it found something', async () => {
    const { seen } = await stagesFor(file('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(seen.at(-1)).toEqual({ stage: 'prefilled', prefilled: true })
  })

  it('resolves the model stage neutrally when the provider fails', async () => {
    extract.mockRejectedValue(new Error('502'))
    const { names, seen, result } = await stagesFor(file('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    // Not an error stage: a Groq outage does not stop onboarding, so it must not
    // read to the user as a failure. It reports "nothing to correct" instead.
    expect(names).toContain('understanding')
    expect(seen.at(-1)).toEqual({ stage: 'prefilled', prefilled: false })
    expect(result.ok).toBe(true)
  })

  it('resolves neutrally when the model answers but finds nothing', async () => {
    extract.mockResolvedValue({ targetRoles: [], skills: [], yearsExperience: null })
    const { seen } = await stagesFor(file('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(seen.at(-1)).toEqual({ stage: 'prefilled', prefilled: false })
  })

  it('stops reporting at the boundary that failed', async () => {
    const { names, result } = await stagesFor(file('scan.pdf', fixture('scanned-cv.pdf'), PDF_MIME))
    // The file was read; there was no text in it. Nothing past that happened, so
    // nothing past that is claimed.
    expect(names).toEqual(['read'])
    expect(result).toEqual({ ok: false, reason: 'no-text-layer' })
  })

  it('reports nothing at all for a file it refuses before reading', async () => {
    const { names, result } = await stagesFor(file('me.png', Buffer.from('x'), 'image/png'))
    expect(names).toEqual([])
    expect(result).toEqual({ ok: false, reason: 'unsupported-type' })
  })

  it('does not claim a save when storage failed', async () => {
    uploadError = { message: 'boom' }
    const { names, result } = await stagesFor(file('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(names).toEqual(['read', 'extracted'])
    expect(result).toEqual({ ok: false, reason: 'storage' })
  })

  it('does not claim a save when the row insert failed', async () => {
    insertError = { message: 'boom' }
    const { names, result } = await stagesFor(file('cv.pdf', fixture('text-cv.pdf'), PDF_MIME))
    expect(names).toEqual(['read', 'extracted'])
    expect(result).toEqual({ ok: false, reason: 'storage' })
  })

  it('runs the whole pipeline with no reporter attached', async () => {
    // This is the no-JavaScript path: uploadCvAction passes no onStage at all.
    const result = await ingestCv({
      userId: 'user-1',
      file: file('cv.docx', fixture('text-cv.docx'), DOCX_MIME),
    })
    expect(result.ok).toBe(true)
    expect(result.ok && result.fileName).toBe('cv.docx')
  })
})
