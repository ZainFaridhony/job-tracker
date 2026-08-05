import { afterEach, describe, expect, it } from 'vitest'
import { installMathSumPrecise } from './math-sum-precise'

const original = Math.sumPrecise

afterEach(() => {
  if (original) Math.sumPrecise = original
  else delete Math.sumPrecise
})

describe('installMathSumPrecise', () => {
  it('installs the method when the runtime lacks it', () => {
    delete Math.sumPrecise
    installMathSumPrecise()
    expect(typeof Math.sumPrecise).toBe('function')
  })

  it('leaves a real implementation alone', () => {
    const native = (values: Iterable<number>) => [...values].length
    Math.sumPrecise = native
    installMathSumPrecise()
    expect(Math.sumPrecise).toBe(native)
  })

  it('is idempotent', () => {
    delete Math.sumPrecise
    installMathSumPrecise()
    const first = Math.sumPrecise
    installMathSumPrecise()
    expect(Math.sumPrecise).toBe(first)
  })

  it('does not show up in enumeration of Math', () => {
    delete Math.sumPrecise
    installMathSumPrecise()
    expect(Object.keys(Math)).not.toContain('sumPrecise')
  })
})

describe('the summation itself', () => {
  function sum(values: number[]): number {
    delete Math.sumPrecise
    installMathSumPrecise()
    return Math.sumPrecise!(values)
  }

  it('adds integers, which is what glyph sizes are', () => {
    expect(sum([4, 8, 12, 16])).toBe(40)
  })

  it('returns -0 for an empty iterable, as the specification does', () => {
    expect(Object.is(sum([]), -0)).toBe(true)
  })

  it('beats naive addition on values that lose precision', () => {
    // The classic case: the small terms vanish entirely under left-to-right
    // addition, which is exactly the error compensation recovers.
    const values = [1e16, 1, 1, -1e16]
    const naive = values.reduce((a, b) => a + b, 0)
    expect(naive).toBe(0)
    expect(sum(values)).toBe(2)
  })

  it('keeps 0.1 + 0.2 + 0.3 exact', () => {
    expect(sum([0.1, 0.2, 0.3])).toBe(0.6)
    expect(0.1 + 0.2 + 0.3).not.toBe(0.6)
  })

  it('propagates NaN', () => {
    expect(sum([1, Number.NaN, 2])).toBeNaN()
  })

  it('propagates a single infinity', () => {
    // Regression: the compensation term computes Infinity - Infinity, so an
    // unguarded Neumaier sum returns NaN here.
    expect(sum([1, Number.POSITIVE_INFINITY])).toBe(Number.POSITIVE_INFINITY)
    expect(sum([Number.NEGATIVE_INFINITY, 1])).toBe(Number.NEGATIVE_INFINITY)
  })

  it('returns NaN for opposing infinities', () => {
    expect(sum([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])).toBeNaN()
  })

  it('accepts any iterable, not just an array', () => {
    delete Math.sumPrecise
    installMathSumPrecise()
    expect(Math.sumPrecise!(new Set([1, 2, 3]))).toBe(6)
  })
})
