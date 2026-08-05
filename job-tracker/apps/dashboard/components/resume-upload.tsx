'use client'

import {
  useActionState,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type FormEvent,
} from 'react'
import { Button, Card, FormError, WizardFooter } from '@job-tracker/ui'
import type { IngestStage } from '@/lib/cv/ingest'
import { ACCEPT, checkFile, FAILURE_COPY } from '@/lib/cv/limits'
import { readLines } from '@/lib/cv/read-lines'
import { uploadCvAction, type StepState } from '@/lib/onboarding/actions'
import { STEP_BODY, STEP_FORM } from '@/lib/onboarding/step-layout'

/**
 * Step 1: the CV, and the wait for it.
 *
 * Reading a CV is the longest silence in the product — local text extraction, a
 * storage write, then a Groq call, five to fifteen seconds — and it lands at the
 * moment a first-time user is deciding whether this thing works. So the wait is
 * narrated: each line below corresponds to a real boundary in ingestCv, reported
 * as it is crossed, not advanced on a timer.
 *
 * Two submit paths, one pipeline. Until this component hydrates (and forever, if
 * JavaScript is off or the browser cannot stream a response) the form posts
 * `uploadCvAction` like any other step. Once hydrated it takes the submit over
 * and reads the NDJSON stream from /onboarding/ingest instead. Both call
 * ingestCv server-side, so there is one set of invariants; the enhanced path only
 * adds the reporting.
 *
 * The `action`/`onSubmit` swap is deliberate rather than calling preventDefault
 * on a form that still has an action: it does not depend on React's ordering
 * between a user submit handler and a form action, and getting that wrong would
 * mean uploading the file twice.
 */

/** The narration, in the order ingestCv crosses these boundaries. */
const LINES = [
  { key: 'read', label: 'Read your file' },
  { key: 'extracted', label: 'Found the text' },
  { key: 'stored', label: 'Saved it privately' },
  { key: 'understanding', label: 'Understood your experience' },
] as const

type LineKey = (typeof LINES)[number]['key']

type Progress = {
  /** Boundaries crossed so far, in order. */
  reached: LineKey[]
  fileName?: string
  chars?: number
  /** Set once the model has answered: false means it found nothing usable. */
  prefilled?: boolean
}

type Line = IngestStage | { stage: 'done'; next: string } | { stage: 'error'; message: string }

/** Capability never changes once the page is running, so nothing to subscribe to. */
const noSubscribe = () => () => {}

/**
 * Whether this render can take the submit over and stream the response.
 *
 * useSyncExternalStore rather than an effect, because the two snapshots are the
 * point: the server snapshot is always false, so the HTML ships with the form
 * action intact and works with no JavaScript. `ReadableStream` exists in the Node
 * runtime too, so a lazy useState initialiser would answer true on the server and
 * silently drop the no-JS path.
 */
function canStream(): boolean {
  return typeof ReadableStream !== 'undefined' && typeof TextDecoder !== 'undefined'
}

function Tick({ state }: { state: 'done' | 'active' | 'waiting' | 'skipped' }) {
  if (state === 'done') {
    return (
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-text-on-ink"
      >
        ✓
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span
        aria-hidden
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-outline-subtle border-t-ink"
      />
    )
  }
  if (state === 'skipped') {
    // Neither a tick nor an error: a Groq outage does not stop onboarding, so it
    // must not read as a failure.
    return (
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center rounded-full border border-outline text-[10px] text-text-subtle"
      >
        –
      </span>
    )
  }
  return <span aria-hidden className="size-4 shrink-0 rounded-full border border-outline-subtle" />
}

function IngestProgress({ progress }: { progress: Progress }) {
  const index = (key: LineKey) => LINES.findIndex((l) => l.key === key)
  const furthest = progress.reached.length === 0 ? -1 : index(progress.reached.at(-1)!)

  return (
    // aria-live so the narration is announced rather than only seen. Polite:
    // this is progress, and it must not interrupt.
    <ol aria-live="polite" className="flex flex-col gap-3">
      {LINES.map((line, i) => {
        const understood = line.key === 'understanding'
        const settled = understood && progress.prefilled !== undefined

        const state =
          i < furthest || settled
            ? understood && progress.prefilled === false
              ? 'skipped'
              : 'done'
            : i === furthest
              ? 'active'
              : 'waiting'

        let label: string = line.label
        if (line.key === 'read' && progress.fileName) label = `Read ${progress.fileName}`
        if (line.key === 'extracted' && progress.chars !== undefined) {
          label = `Found ${progress.chars.toLocaleString('en-GB')} characters of text`
        }
        if (understood && progress.prefilled === false) {
          label = "Couldn't read the details — you can add them next"
        }

        return (
          <li
            key={line.key}
            className={`flex items-center gap-3 text-sm ${
              state === 'waiting' ? 'text-text-subtle' : 'text-text'
            }`}
          >
            <Tick state={state} />
            {label}
          </li>
        )
      })}
    </ol>
  )
}

export function ResumeForm({ backHref }: { backHref?: string }) {
  const [state, action, actionPending] = useActionState<StepState, FormData>(uploadCvAction, {})
  const [fileName, setFileName] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // False during SSR and on any browser that cannot stream, which leaves the
  // plain server action in charge.
  const enhanced = useSyncExternalStore(noSubscribe, canStream, () => false)

  /** Size and type are knowable the moment the picker closes. */
  function accept(chosen: File | undefined) {
    if (!chosen) {
      setFileName(null)
      setClientError(null)
      return
    }
    const rejected = checkFile(chosen)
    setFileName(chosen.name)
    setClientError(rejected ? FAILURE_COPY[rejected] : null)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (!dropped || !inputRef.current) return

    // Written back into the input rather than held in state: the input stays the
    // single source of truth, so the FormData the server sees is the same shape
    // whether the file was dropped or picked.
    const transfer = new DataTransfer()
    transfer.items.add(dropped)
    inputRef.current.files = transfer.files
    accept(dropped)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const chosen = inputRef.current?.files?.[0]

    if (!chosen) {
      setClientError(FAILURE_COPY['no-file'])
      return
    }
    const rejected = checkFile(chosen)
    if (rejected) {
      setClientError(FAILURE_COPY[rejected])
      return
    }

    setClientError(null)
    setProgress({ reached: [] })

    try {
      const response = await fetch('/onboarding/ingest', {
        method: 'POST',
        body: new FormData(form),
      })
      if (!response.ok || !response.body) throw new Error('ingest unavailable')

      for await (const raw of readLines(response.body)) {
        const line = raw as Line

        if (line.stage === 'error') {
          setProgress(null)
          setClientError(line.message)
          return
        }
        if (line.stage === 'done') {
          // A full navigation, so the next step renders what is now stored.
          window.location.assign(line.next)
          return
        }
        if (line.stage === 'prefilled') {
          setProgress((p) => (p ? { ...p, prefilled: line.prefilled } : p))
          continue
        }

        setProgress((p) => {
          if (!p) return p
          return {
            ...p,
            reached: [...p.reached, line.stage],
            ...(line.stage === 'read' ? { fileName: line.fileName } : {}),
            ...(line.stage === 'extracted' ? { chars: line.chars } : {}),
          }
        })
      }

      // The stream ended without `done` or `error`, which should not happen.
      setProgress(null)
      setClientError(FAILURE_COPY.storage)
    } catch {
      setProgress(null)
      setClientError(FAILURE_COPY.storage)
    }
  }

  // Once the narration starts it owns the card: the dropzone would only offer to
  // replace a file that is already being read. No footer either — there is
  // nothing to do but wait.
  if (progress) {
    return (
      <div className={STEP_FORM}>
        <Card className={STEP_BODY}>
          <IngestProgress progress={progress} />
        </Card>
      </div>
    )
  }

  const error = clientError ?? state.error

  return (
    <form
      action={enhanced ? undefined : action}
      onSubmit={enhanced ? onSubmit : undefined}
      aria-label="Upload CV"
      className={STEP_FORM}
    >
      <Card className={STEP_BODY}>
        <div className="flex flex-col gap-5">
          <FormError message={error} />

          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center transition-colors ${
              dragging
                ? 'border-ink bg-surface'
                : 'border-outline bg-surface-subtle hover:border-ink'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              name="cv"
              accept={ACCEPT}
              required
              onChange={(e) => accept(e.target.files?.[0])}
              className="sr-only"
            />
            <span className="text-sm font-medium text-text">
              {fileName ?? 'Choose a file or drag it here'}
            </span>
            <span className="text-xs text-text-subtle">
              {fileName ? 'Click to choose a different file' : 'PDF or Word document, up to 10 MB'}
            </span>
          </label>

          {/* P2: say where the file goes before it is sent, not in a policy page. */}
          <p className="text-xs leading-relaxed text-text-subtle">
            We extract the text from your CV and send it to our AI provider (Groq) to fill in the
            next step. It is stored privately and is never visible to anyone else.
          </p>
        </div>
      </Card>

      <WizardFooter backHref={backHref}>
        <Button type="submit" pending={actionPending}>
          {actionPending ? 'Reading your CV…' : 'Upload and continue'}
        </Button>
      </WizardFooter>
    </form>
  )
}
