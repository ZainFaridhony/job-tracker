import type { ExtractedProfile } from './types'

/**
 * Scoring for the eval harness.
 *
 * Lives in src rather than eval/ so it runs in the normal test suite: a scorer
 * with a bug is worse than no scorer, because it produces confident numbers that
 * point the wrong way.
 *
 * Precision and recall are reported separately and never collapsed into accuracy.
 * They fail differently and the fixes are opposite: low precision means the model
 * is inventing and the prompt needs tighter exclusions, low recall means it is
 * missing things and the prompt needs better coverage. An F1 that hides which one
 * moved would send you to the wrong edit.
 */

/**
 * Compared on alphanumerics only, so "Node.js", "node js" and "nodejs" are one
 * skill. The prompt asks for canonical names; the scorer should not punish a
 * model for a full stop when the meaning is identical.
 */
export function normaliseTerm(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      // British and American spellings are the same skill. The model returned
      // "Financial Modeling" against a gold label of "Financial Modelling" and
      // scored it a miss plus an invention, which is a scorer artefact rather
      // than anything a prompt change should chase. Comparison only, never shown.
      .replace(/ll/g, 'l')
      .replace(/isation/g, 'ization')
      .replace(/ise$/, 'ize')
  )
}

export type ListScore = {
  precision: number
  recall: number
  f1: number
  /** Predicted items absent from gold. These are what invention looks like. */
  spurious: string[]
  /** Gold items absent from the prediction. These are what omission looks like. */
  missed: string[]
}

/** An empty prediction against an empty gold set is a perfect score, not 0/0. */
function ratio(hit: number, total: number): number {
  return total === 0 ? 1 : hit / total
}

export function scoreList(predicted: readonly string[], gold: readonly string[]): ListScore {
  const goldKeys = new Map(gold.map((g) => [normaliseTerm(g), g]))
  const predKeys = new Map(predicted.map((p) => [normaliseTerm(p), p]))

  const hits = [...predKeys.keys()].filter((k) => goldKeys.has(k))
  const precision = ratio(hits.length, predKeys.size)
  const recall = ratio(hits.length, goldKeys.size)

  return {
    precision,
    recall,
    f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    spurious: [...predKeys].filter(([k]) => !goldKeys.has(k)).map(([, v]) => v),
    missed: [...goldKeys].filter(([k]) => !predKeys.has(k)).map(([, v]) => v),
  }
}

export type YearsScore = {
  /** Landed on the number exactly. */
  exact: boolean
  /**
   * Within one year. The looser bar is the honest one for a metric the user then
   * corrects through a four-band select: off by one usually lands in the same band.
   */
  close: boolean
  predicted: number | null
  gold: number | null
}

export function scoreYears(predicted: number | null, gold: number | null): YearsScore {
  if (predicted === null || gold === null) {
    const both = predicted === null && gold === null
    return { exact: both, close: both, predicted, gold }
  }
  return {
    exact: predicted === gold,
    close: Math.abs(predicted - gold) <= 1,
    predicted,
    gold,
  }
}

export type CaseScore = {
  name: string
  roles: ListScore
  skills: ListScore
  years: YearsScore
}

export type GoldProfile = {
  targetRoles: readonly string[]
  skills: readonly string[]
  yearsExperience: number | null
}

export function scoreCase(
  name: string,
  predicted: ExtractedProfile,
  gold: GoldProfile,
): CaseScore {
  return {
    name,
    roles: scoreList(predicted.targetRoles, gold.targetRoles),
    skills: scoreList(predicted.skills, gold.skills),
    years: scoreYears(predicted.yearsExperience, gold.yearsExperience),
  }
}

export type Summary = {
  cases: number
  rolesF1: number
  skillsF1: number
  skillsPrecision: number
  skillsRecall: number
  yearsExact: number
  yearsClose: number
}

/** Mean of the mean. */
function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Macro-averaged, so every CV counts once regardless of how many skills it lists.
 * Micro-averaging would let one skill-heavy engineering CV outvote the fresh
 * graduate and the career switcher combined, which is exactly the case a change
 * is most likely to break.
 */
export function summarise(scores: readonly CaseScore[]): Summary {
  return {
    cases: scores.length,
    rolesF1: mean(scores.map((s) => s.roles.f1)),
    skillsF1: mean(scores.map((s) => s.skills.f1)),
    skillsPrecision: mean(scores.map((s) => s.skills.precision)),
    skillsRecall: mean(scores.map((s) => s.skills.recall)),
    yearsExact: mean(scores.map((s) => (s.years.exact ? 1 : 0))),
    yearsClose: mean(scores.map((s) => (s.years.close ? 1 : 0))),
  }
}
