/**
 * Polyfill for `Math.sumPrecise`, which `unpdf`'s bundled pdf.js calls and Node
 * does not have.
 *
 * Seen live as three `TypeError: Math.sumPrecise is not a function` warnings per
 * PDF upload on Node 26.6.0. The proposal is still TC39 stage 2, so no current
 * Node ships it. pdf.js swallows the error, which is why extraction still
 * returns text — but every call site is font work: glyph-table `getSize()` while
 * rebuilding an embedded font, and XFA column layout. A font pdf.js fails to
 * rebuild is one whose glyphs it may not map back to Unicode, so the failure mode
 * is not an error, it is quietly wrong characters in `extracted_text`. That then
 * goes to the model as if it were the CV (FR-7).
 *
 * Patching a global is not free, so it is narrow on purpose: installed only by
 * extractText, only when the method is genuinely absent, and it disappears the
 * day V8 ships the real one.
 */

declare global {
  interface Math {
    sumPrecise?: (values: Iterable<number>) => number
  }
}

/**
 * Kahan-Babuska-Neumaier summation: carries the rounding error each addition
 * loses and adds it back at the end. Not the full specification — that pins
 * exact behaviour for mixed infinities — but correct for finite input, which is
 * all glyph sizes and column widths ever are, and far closer than the naive sum
 * this replaces.
 */
function sumPrecise(values: Iterable<number>): number {
  let sum = 0
  let compensation = 0
  let seen = false

  for (const value of values) {
    seen = true
    const next = sum + value
    // Whichever operand is larger keeps its precision; the smaller one's lost
    // low bits are what accumulates into the compensation.
    compensation +=
      Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum
    sum = next
  }

  // The specification returns -0 for an empty iterable, not 0.
  if (!seen) return -0

  // Compensation is meaningless once the sum leaves the finite range: the
  // correction term computes Infinity - Infinity and comes back NaN, which would
  // then poison an otherwise correct Infinity. A non-finite sum is already the
  // answer — including the NaN that Infinity + -Infinity should produce.
  if (!Number.isFinite(sum)) return sum

  return sum + compensation
}

export function installMathSumPrecise(): void {
  if (typeof Math.sumPrecise === 'function') return
  Object.defineProperty(Math, 'sumPrecise', {
    value: sumPrecise,
    writable: true,
    configurable: true,
    enumerable: false,
  })
}
