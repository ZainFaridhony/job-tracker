import { describe, expect, it } from 'vitest'
import { readLines } from './read-lines'

/** A body that hands out exactly the chunks given, in order. */
function bodyOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(typeof c === 'string' ? encoder.encode(c) : c)
      }
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<unknown[]> {
  const out: unknown[] = []
  for await (const value of readLines(stream)) out.push(value)
  return out
}

describe('readLines', () => {
  it('yields one value per line', async () => {
    const lines = await collect(bodyOf('{"stage":"read"}\n{"stage":"stored"}\n'))
    expect(lines).toEqual([{ stage: 'read' }, { stage: 'stored' }])
  })

  it('reassembles a line split across chunks', async () => {
    // This is the normal case, not an edge case: the route flushes each line as
    // the work completes, and the network re-frames it however it likes.
    const lines = await collect(bodyOf('{"stage":"ex', 'tracted","chars":41', '82}\n'))
    expect(lines).toEqual([{ stage: 'extracted', chars: 4182 }])
  })

  it('handles several lines arriving in one chunk', async () => {
    const lines = await collect(
      bodyOf('{"stage":"read"}\n{"stage":"extracted","chars":10}\n{"stage":"stored"}\n'),
    )
    expect(lines).toHaveLength(3)
  })

  it('handles a chunk holding whole lines plus a partial one', async () => {
    const lines = await collect(bodyOf('{"a":1}\n{"b":2}\n{"c":', '3}\n'))
    expect(lines).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
  })

  it('yields a final line that has no trailing newline', async () => {
    const lines = await collect(bodyOf('{"stage":"done","next":"/onboarding/profile"}'))
    expect(lines).toEqual([{ stage: 'done', next: '/onboarding/profile' }])
  })

  it('ignores blank lines rather than parsing them', async () => {
    const lines = await collect(bodyOf('{"a":1}\n\n\n{"b":2}\n'))
    expect(lines).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('yields nothing for an empty body', async () => {
    expect(await collect(bodyOf())).toEqual([])
  })

  it('survives a multi-byte character split down the middle', async () => {
    // "Café" as UTF-8, cut between the two bytes of é. A non-streaming decode
    // would turn the halves into replacement characters.
    const encoder = new TextEncoder()
    const whole = encoder.encode('{"name":"Café"}\n')
    const cut = whole.indexOf(0xc3) + 1
    const lines = await collect(bodyOf(whole.slice(0, cut), whole.slice(cut)))
    expect(lines).toEqual([{ name: 'Café' }])
  })

  it('releases the reader when the consumer stops early', async () => {
    // The upload form breaks out as soon as it sees `done`, which leaves the rest
    // of the body unread.
    const stream = bodyOf('{"stage":"read"}\n{"stage":"stored"}\n')
    for await (const value of readLines(stream)) {
      expect(value).toEqual({ stage: 'read' })
      break
    }
    // Locked would mean the generator's finally never ran.
    expect(stream.locked).toBe(false)
  })
})
