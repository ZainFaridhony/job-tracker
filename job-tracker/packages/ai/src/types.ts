/**
 * What the model is allowed to return from a CV. Deliberately small: these are
 * the only fields the onboarding wizard pre-fills.
 *
 * Every field is nullable or empty-able because a CV that does not state
 * something must yield nothing rather than a guess — PRD FR-18's rule ("fields
 * the posting doesn't state are left empty, never invented") applied to CVs.
 */
export type ExtractedProfile = {
  targetRoles: string[]
  skills: string[]
  yearsExperience: number | null
}

/** Injectable so tests run against a fake instead of the network. */
export interface ProfileExtractor {
  extract(cvText: string): Promise<ExtractedProfile>
}

export const EMPTY_PROFILE: ExtractedProfile = {
  targetRoles: [],
  skills: [],
  yearsExperience: null,
}
