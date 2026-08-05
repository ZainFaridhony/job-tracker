import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractText, MIN_USEFUL_CHARS, PDF_MIME, DOCX_MIME, MAX_BYTES } from './extract-text'

const fixture = (n: string) => readFileSync(join(__dirname, 'fixtures', n))

describe('extractText', () => {
  it('pulls text out of a real PDF', async () => {
    const r = await extractText(fixture('text-cv.pdf'), PDF_MIME)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.text).toMatch(/Backend Engineer/i)
    expect(r.chars).toBeGreaterThan(MIN_USEFUL_CHARS)
  })

  it('gives pdf.js the Math.sumPrecise it expects before parsing a font', async () => {
    // unpdf's pdf.js calls Math.sumPrecise in glyph-table getSize(). No Node ships
    // it yet, and pdf.js swallows the TypeError — so the symptom is not a failure
    // but a font it could not rebuild, and characters it may then map wrongly.
    // Asserting on the extraction path, not on the polyfill in isolation, because
    // the thing that breaks is the wiring.
    delete Math.sumPrecise
    const r = await extractText(fixture('text-cv.pdf'), PDF_MIME)
    expect(r.ok).toBe(true)
    expect(typeof Math.sumPrecise).toBe('function')
  })

  it('reports no-text-layer for a scanned PDF rather than pretending it worked', async () => {
    const r = await extractText(fixture('scanned-cv.pdf'), PDF_MIME)
    expect(r.ok).toBe(false)
    if (r.ok) return
    // This is the whole reason char_count exists: a text-only model cannot read
    // an image, and an empty profile must not look like a successful extraction.
    expect(r.reason).toBe('no-text-layer')
  })

  it('rejects an unsupported type before touching any parser', async () => {
    const r = await extractText(Buffer.from('hello'), 'image/png')
    expect(r).toEqual({ ok: false, reason: 'unsupported-type' })
  })

  it('rejects an oversized file before parsing it', async () => {
    const r = await extractText(Buffer.alloc(MAX_BYTES + 1), PDF_MIME)
    expect(r).toEqual({ ok: false, reason: 'too-large' })
  })

  it('reports corrupt rather than throwing, so upload shows a message', async () => {
    const r = await extractText(Buffer.from('%PDF-1.4 not really a pdf'), PDF_MIME)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(['corrupt', 'no-text-layer']).toContain(r.reason)
  })

  it('reads DOCX too', async () => {
    const r = await extractText(fixture('text-cv.docx'), DOCX_MIME)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.text).toMatch(/Backend Engineer/i)
  })

  it('normalises whitespace so the model is not billed for blank space', async () => {
    const r = await extractText(fixture('text-cv.pdf'), PDF_MIME)
    if (!r.ok) return
    expect(r.text).not.toMatch(/\n{3,}/)
    expect(r.text).not.toMatch(/[ \t]{3,}/)
  })
})
