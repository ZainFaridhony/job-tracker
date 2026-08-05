import { createGroqExtractor, type ExtractedProfile } from '@job-tracker/ai'
import { createServerSupabase } from '@job-tracker/db/server'
import type { TablesUpdate } from '@job-tracker/db/types'
import { extractText } from './extract-text'
import { checkFile, type IngestFailure } from './limits'

/**
 * One pipeline, two entry points.
 *
 * `uploadCvAction` calls this with no `onStage` and behaves exactly as it always
 * did, which is what keeps step 1 working without JavaScript. The ingest route
 * handler calls it with an `onStage` that writes each event into a stream, so
 * the browser can narrate the wait instead of showing a spinner for ten seconds.
 *
 * Neither caller persists the profile columns — this returns them and the caller
 * hands them to persistStep. Keeping the write out of here is what lets the
 * route handler stay inside its stream: persistStep's redirecting sibling throws.
 */

/**
 * Progress events, emitted at the moment the work actually happens rather than
 * on a timer. `understanding` resolves through `prefilled`, which reports
 * whether the model returned anything usable — a Groq outage must read as
 * "nothing to correct", not as a failure, because it does not stop onboarding.
 */
export type IngestStage =
  | { stage: 'read'; fileName: string }
  | { stage: 'extracted'; chars: number }
  | { stage: 'stored' }
  | { stage: 'understanding' }
  | { stage: 'prefilled'; prefilled: boolean }

export type IngestResult =
  | { ok: true; values: TablesUpdate<'profiles'>; fileName: string; chars: number }
  | { ok: false; reason: IngestFailure }

export type IngestInput = {
  userId: string
  file: File
  onStage?: (event: IngestStage) => void
}

/**
 * Storage objects are namespaced `<user-id>/...` and the bucket policy checks
 * the first path segment, so the separator has to go — and collapsing runs of
 * dots matters just as much. Replacing `/` alone leaves `..` intact, and a `..`
 * segment is exactly what a first-segment check assumes cannot appear.
 */
function safeObjectName(fileName: string): string {
  return fileName
    .replace(/[^\w.\-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(-100)
}

/** Whether the model actually found something worth pre-filling. */
function isPrefilled(profile: ExtractedProfile): boolean {
  return (
    profile.targetRoles.length > 0 ||
    profile.skills.length > 0 ||
    profile.yearsExperience !== null
  )
}

export async function ingestCv({ userId, file, onStage }: IngestInput): Promise<IngestResult> {
  // Size and type first, before the file is read into memory: an oversized
  // upload should be refused without buffering eleven megabytes to find out.
  // The upload form runs this same check to save the round trip; repeating it
  // server-side is the boundary, not a duplicate.
  const rejected = checkFile(file)
  if (rejected) return { ok: false, reason: rejected }

  const supabase = await createServerSupabase()
  const buffer = Buffer.from(await file.arrayBuffer())

  onStage?.({ stage: 'read', fileName: file.name })

  // Extract before storing: no point keeping a file we cannot read.
  const extracted = await extractText(buffer, file.type)
  if (!extracted.ok) return { ok: false, reason: extracted.reason }

  onStage?.({ stage: 'extracted', chars: extracted.chars })

  const path = `${userId}/${Date.now()}-${safeObjectName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return { ok: false, reason: 'storage' }

  // Back makes step 1 reachable again, so this may not be the first CV. Demote
  // the others first: two rows both claiming is_primary would leave whatever
  // reads "the" CV picking arbitrarily.
  await supabase.from('cvs').update({ is_primary: false }).eq('user_id', userId)

  // extracted_text sits outside the UPDATE grant, but INSERT is unrestricted at
  // column level, so this writes under the user's own RLS — no elevated client.
  const { error: rowError } = await supabase.from('cvs').insert({
    user_id: userId,
    storage_path: path,
    file_name: file.name,
    extracted_text: extracted.text,
    char_count: extracted.chars,
    is_primary: true,
  })
  if (rowError) return { ok: false, reason: 'storage' }

  onStage?.({ stage: 'stored' })
  onStage?.({ stage: 'understanding' })

  // Pre-fill step 2. A Groq failure must never block onboarding — the user just
  // fills those fields in by hand.
  let profile: ExtractedProfile | null = null
  try {
    profile = await createGroqExtractor().extract(extracted.text)
  } catch {
    // Swallowed on purpose: a provider error can echo the prompt, and the
    // prompt is the user's CV (P3).
  }

  const prefilled = profile !== null && isPrefilled(profile)
  onStage?.({ stage: 'prefilled', prefilled })

  // Only overwrite the AI-filled lists when there is something to write. On a
  // re-upload after Back, blanking them on a provider outage would delete roles
  // and skills the user had already corrected by hand.
  //
  // cv_prefilled_at keys step 2's copy off a recorded event rather than off
  // field values the user may since have edited. It stays null when the model
  // returned nothing, so "here's what we read" is never claimed over blanks.
  const values: TablesUpdate<'profiles'> =
    profile && prefilled
      ? {
          target_roles: profile.targetRoles,
          skills: profile.skills,
          years_experience: profile.yearsExperience,
          cv_prefilled_at: new Date().toISOString(),
        }
      : {}

  return { ok: true, values, fileName: file.name, chars: extracted.chars }
}
