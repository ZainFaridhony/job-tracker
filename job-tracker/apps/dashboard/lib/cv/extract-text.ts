import mammoth from 'mammoth'
import { extractText as extractPdfText, getDocumentProxy } from 'unpdf'
import { DOCX_MIME, MAX_BYTES, PDF_MIME } from './limits'
import { installMathSumPrecise } from './math-sum-precise'

// Re-exported so existing server-side importers keep one source. The
// definitions live in ./limits, which the upload form also imports — this
// module cannot be imported from the browser because mammoth and unpdf are
// server-only parsers.
export { DOCX_MIME, MAX_BYTES, PDF_MIME }

/**
 * Below this a file is treated as having no usable text. It matches
 * MIN_USEFUL_CHARS in @job-tracker/ai, which refuses to call Groq on less.
 */
export const MIN_USEFUL_CHARS = 200

export type ExtractionFailure =
  | 'unsupported-type'
  | 'too-large'
  | 'no-text-layer'
  | 'corrupt'

export type ExtractionResult =
  | { ok: true; text: string; chars: number }
  | { ok: false; reason: ExtractionFailure }

/** Collapse runs of blank space so the model is not billed for layout. */
function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Turns an uploaded CV into plain text. Local, not an AI concern.
 *
 * The distinction that matters is `no-text-layer`: gpt-oss-120b is text-only
 * and cannot see an image, so a scanned CV yields nothing. Reporting that
 * explicitly is what stops an empty profile from looking like a successful
 * extraction — the user gets told their file has no selectable text instead of
 * silently landing on a blank wizard.
 */
export async function extractText(
  buffer: Buffer | Uint8Array,
  mimeType: string,
): Promise<ExtractionResult> {
  if (mimeType !== PDF_MIME && mimeType !== DOCX_MIME) {
    return { ok: false, reason: 'unsupported-type' }
  }
  if (buffer.byteLength > MAX_BYTES) return { ok: false, reason: 'too-large' }

  let raw: string
  try {
    if (mimeType === PDF_MIME) {
      // Before pdf.js touches a font table. Installed here rather than at import
      // time so it cannot be defeated by module ordering.
      installMathSumPrecise()
      const doc = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractPdfText(doc, { mergePages: true })
      raw = Array.isArray(text) ? text.join('\n') : text
    } else {
      const result = await mammoth.extractRawText({
        buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
      })
      raw = result.value
    }
  } catch {
    // Never surface the parser error: it can embed document content, and CV
    // content must not reach logs or error reports (P3).
    return { ok: false, reason: 'corrupt' }
  }

  const text = normalise(raw)
  if (text.length < MIN_USEFUL_CHARS) return { ok: false, reason: 'no-text-layer' }

  return { ok: true, text, chars: text.length }
}
