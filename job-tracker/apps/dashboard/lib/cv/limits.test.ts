import { describe, expect, it } from 'vitest'
import {
  ACCEPT,
  checkFile,
  DOCX_MIME,
  FAILURE_COPY,
  MAX_BYTES,
  PDF_MIME,
  type IngestFailure,
} from './limits'

function file(size: number, type: string): File {
  return new File([new Uint8Array(size)], 'cv', { type })
}

describe('checkFile', () => {
  it('accepts a PDF within the limit', () => {
    expect(checkFile(file(1024, PDF_MIME))).toBeNull()
  })

  it('accepts a DOCX within the limit', () => {
    expect(checkFile(file(1024, DOCX_MIME))).toBeNull()
  })

  it('treats an empty file as no file at all', () => {
    expect(checkFile(file(0, PDF_MIME))).toBe('no-file')
  })

  it('rejects anything over the limit', () => {
    expect(checkFile(file(MAX_BYTES + 1, PDF_MIME))).toBe('too-large')
  })

  it('accepts a file exactly at the limit', () => {
    expect(checkFile(file(MAX_BYTES, PDF_MIME))).toBeNull()
  })

  it('rejects a type neither parser can read', () => {
    expect(checkFile(file(1024, 'image/png'))).toBe('unsupported-type')
  })

  it('checks size before type, so an oversized image names the size', () => {
    // The upload form runs this to avoid a round trip; the order decides which
    // message the user gets, and the size is the more actionable one.
    expect(checkFile(file(MAX_BYTES + 1, 'image/png'))).toBe('too-large')
  })
})

describe('FAILURE_COPY', () => {
  it('has a message for every failure the pipeline can name', () => {
    const reasons: IngestFailure[] = [
      'no-file',
      'unsupported-type',
      'too-large',
      'no-text-layer',
      'corrupt',
      'storage',
    ]
    for (const reason of reasons) {
      expect(FAILURE_COPY[reason]).toBeTruthy()
    }
  })

  it('names the limit and the accepted types, per FR-6', () => {
    expect(FAILURE_COPY['too-large']).toMatch(/10 MB/)
    expect(FAILURE_COPY['unsupported-type']).toMatch(/PDF or a Word document/)
  })

  it('tells a scanned CV apart from a broken one', () => {
    // A text-only model cannot see an image, and "nothing was found" would look
    // like our bug rather than something the user can fix.
    expect(FAILURE_COPY['no-text-layer']).toMatch(/scan or an image/)
    expect(FAILURE_COPY.corrupt).not.toMatch(/scan/)
  })
})

describe('ACCEPT', () => {
  it('offers exactly the two types the pipeline can read', () => {
    expect(ACCEPT).toContain(PDF_MIME)
    expect(ACCEPT).toContain(DOCX_MIME)
    expect(ACCEPT).toContain('.pdf')
    expect(ACCEPT).toContain('.docx')
  })
})
