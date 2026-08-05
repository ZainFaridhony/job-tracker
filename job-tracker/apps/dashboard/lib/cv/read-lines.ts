/**
 * Parses an NDJSON response body into values as they arrive.
 *
 * Split out of the upload component so the awkward part is testable on its own.
 * A network chunk has no relationship to a line boundary: one chunk can carry
 * three complete lines and half of a fourth, or a single byte, or split a
 * multi-byte character down the middle. So the tail is carried over rather than
 * parsed, and the decoder is told the input is streaming.
 */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) yield JSON.parse(line)
        newline = buffer.indexOf('\n')
      }
    }

    // A final line with no trailing newline. The route always terminates its
    // last line, but a truncated response should not silently lose it.
    const last = buffer.trim()
    if (last) yield JSON.parse(last)
  } finally {
    // Releasing matters on the early-exit paths: the consumer stops reading as
    // soon as it sees `done` or `error`, which leaves the body unfinished.
    reader.releaseLock()
  }
}
