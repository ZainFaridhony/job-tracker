import { ingestCv, type IngestStage } from '@/lib/cv/ingest'
import { FAILURE_COPY } from '@/lib/cv/limits'
import { currentUserId, persistStep } from '@/lib/onboarding/persist'

/**
 * Step 1's upload, reported stage by stage as it happens.
 *
 * Reading a CV takes five to fifteen seconds — local text extraction, a storage
 * write, then a Groq call. Behind a single spinner that is the longest silence
 * in the product, at the one moment a first-time user is deciding whether this
 * thing works. Each line the client draws corresponds to a real boundary in
 * ingestCv, not to a timer.
 *
 * The same work still runs through `uploadCvAction` when JavaScript is off.
 * Both call ingestCv, so there is one pipeline with one set of invariants; this
 * route only adds the reporting and the navigation target.
 *
 * WHY IT LIVES UNDER /onboarding/ — gate.ts:47 redirects any non-wizard path to
 * the user's current step, so the same handler at /api/onboarding/ingest would
 * have its POST bounced to /onboarding/resume and silently never run. Inside
 * /onboarding/, gate.ts lets a slug it does not recognise fall through
 * untouched. A static segment also outranks the sibling [step] dynamic segment,
 * so this does not 404 as an unknown step.
 */

/** One NDJSON line per event. `done` and `error` are terminal. */
type Line =
  | IngestStage
  | { stage: 'done'; next: string }
  | { stage: 'error'; message: string }

export async function POST(request: Request): Promise<Response> {
  const userId = await currentUserId()

  const form = await request.formData()
  const file = form.get('cv')

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: Line) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))

      try {
        if (!(file instanceof File) || file.size === 0) {
          send({ stage: 'error', message: FAILURE_COPY['no-file'] })
          return
        }

        const result = await ingestCv({ userId, file, onStage: send })
        if (!result.ok) {
          send({ stage: 'error', message: FAILURE_COPY[result.reason] })
          return
        }

        // persistStep, not saveStep: redirect() throws, and unwinding here would
        // abort the stream instead of finishing it. The client navigates on the
        // `next` it gets back.
        const next = await persistStep(userId, 1, result.values)
        send({ stage: 'done', next })
      } catch {
        // Deliberately generic. A provider or parser error can carry CV content,
        // and CV content must not reach a response body or a log (P3).
        send({ stage: 'error', message: FAILURE_COPY.storage })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      // Per-user and single-use. NFR-12's rule is about auth cookies, but
      // nothing here should sit in a shared cache either.
      'Cache-Control': 'no-store',
      // Stops a proxy buffering the whole response and defeating the point.
      'X-Accel-Buffering': 'no',
    },
  })
}
