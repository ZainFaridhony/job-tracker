import type { ExtractedProfile } from './types'

/**
 * Self-consistency voting across several samples of the same prompt.
 *
 * The failure mode for a list field is membership variance: run the same CV
 * twice and the skills come back slightly different, because each item near the
 * model's decision boundary is a coin flip. Sampling a few times and keeping what
 * recurs is the standard fix, and it is the right one here because the output is
 * two lists.
 *
 * What it does not fix: an omission every sample makes, or a hallucination every
 * sample repeats. Voting can only choose among what the samples produced. That is
 * what the verify strategy is for, and why the two are complementary rather than
 * alternatives.
 */

/** Case-insensitive, so "PostgreSQL" and "postgresql" are one vote, not two. */
function key(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Items appearing in at least `threshold` of the runs.
 *
 * Order comes from first appearance across the runs, which keeps the model's own
 * "most recent first" ordering for roles rather than reordering by vote count.
 * The surviving spelling is the first one seen, since the prompt's normalisation
 * rules mean disagreements are casing, not meaning.
 */
export function voteLists(runs: readonly (readonly string[])[], threshold: number): string[] {
  const counts = new Map<string, number>()
  const spelling = new Map<string, string>()
  const order: string[] = []

  for (const run of runs) {
    // Within one run a repeat is the same vote, not two.
    const seenInRun = new Set<string>()
    for (const raw of run) {
      const k = key(raw)
      if (!k || seenInRun.has(k)) continue
      seenInRun.add(k)

      if (!spelling.has(k)) {
        spelling.set(k, raw.trim())
        order.push(k)
      }
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
  }

  return order.filter((k) => (counts.get(k) ?? 0) >= threshold).map((k) => spelling.get(k)!)
}

/**
 * The median, not the mean: one sample misreading a date should not drag the
 * answer, and with three samples the median is simply the middle vote. Nulls are
 * dropped first, so two samples finding a number outvote one that found none.
 */
export function voteYears(values: readonly (number | null)[]): number | null {
  const found = values.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)
  if (found.length === 0) return null
  return found[Math.floor((found.length - 1) / 2)]!
}

/**
 * Majority of the samples, rounded up: 3 samples need 2, 2 need 2, 5 need 3.
 * Requiring a strict majority is what makes a single sample's invention lose.
 */
export function majority(sampleCount: number): number {
  return Math.max(1, Math.ceil((sampleCount + 1) / 2))
}

/** Collapses several samples into the profile to store. */
export function voteProfile(samples: readonly ExtractedProfile[]): ExtractedProfile {
  if (samples.length === 0) return { targetRoles: [], skills: [], yearsExperience: null }
  if (samples.length === 1) return samples[0]!

  const threshold = majority(samples.length)
  return {
    targetRoles: voteLists(
      samples.map((s) => s.targetRoles),
      threshold,
    ),
    skills: voteLists(
      samples.map((s) => s.skills),
      threshold,
    ),
    yearsExperience: voteYears(samples.map((s) => s.yearsExperience)),
  }
}
