/**
 * What a CV upload is allowed to be, and what to say when it isn't.
 *
 * Split out of extract-text.ts so a client component can import it. That module
 * pulls `mammoth` and `unpdf` at the top level, and both are server-only
 * parsers — importing it from the browser drags a PDF engine into the bundle.
 * This file must therefore stay free of imports.
 *
 * Size and type are knowable the moment the file picker closes, so the upload
 * form checks them here before spending a round trip. The server checks them
 * again: a client check is a courtesy, not a boundary.
 */

export const PDF_MIME = 'application/pdf'
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const MAX_BYTES = 10 * 1024 * 1024

/** What the file picker should offer, matching the two MIME types above. */
export const ACCEPT = `.pdf,.docx,${PDF_MIME},${DOCX_MIME}`

export type IngestFailure =
  | 'unsupported-type'
  | 'too-large'
  | 'no-text-layer'
  | 'corrupt'
  | 'no-file'
  | 'storage'

/**
 * One message per named failure.
 *
 * The scan case earns the longest copy because it is the only one the user can
 * act on but cannot guess at: a text-only model cannot read an image, and
 * "nothing was found" would look like our bug.
 *
 * Never extended with a provider or parser message. A Groq error can echo the
 * prompt and the prompt is the CV; a PDF parser error can embed document
 * content (P3 — no CV content in logs or error reports).
 */
export const FAILURE_COPY: Record<IngestFailure, string> = {
  'no-file': 'Choose a file to upload.',
  'unsupported-type': 'That file type is not supported. Upload a PDF or a Word document.',
  'too-large': 'That file is over 10 MB. Try exporting a smaller PDF.',
  'no-text-layer':
    'We could not find any selectable text in that file — it looks like a scan or an image. Export your CV as a text-based PDF, or upload the Word original.',
  corrupt: 'We could not open that file. It may be damaged or password-protected.',
  storage: 'We could not save that file. Try again.',
}

/**
 * The client-side half of validation. Returns the failure the server would
 * report for the same file, or null if it is worth uploading.
 */
export function checkFile(file: File): IngestFailure | null {
  if (file.size === 0) return 'no-file'
  if (file.size > MAX_BYTES) return 'too-large'
  if (file.type !== PDF_MIME && file.type !== DOCX_MIME) return 'unsupported-type'
  return null
}
