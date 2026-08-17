import { createServerSupabase } from '@job-tracker/db/server'
import type { SeedPreferences } from './seed'

/**
 * The skills the CV produced, for grouping the Jobs sidebar's Skills facet.
 *
 * This is the first thing in the app to READ what onboarding steps 2–3 write.
 * Until now those columns were storage — CLAUDE.md lists them under Known
 * outstanding as "store data nothing reads" — so anything here has to tolerate
 * their being absent rather than assume the wizard filled them: a user can reach
 * /jobs with `skills` null (extraction failed, or Cerebras returned an empty
 * profile, both of which `ingestCv` deliberately swallows). `skillFacetGroups`
 * takes an empty list to mean "make no claim about this reader" and renders one
 * unlabelled group, so the empty case needs no special handling at the call site.
 *
 * Kept OUT of `viewer()` on purpose. That function serves the top bar on four
 * routes and answers "who is looking at this page"; CV contents are not part of
 * that question, and adding them would make three other routes pay for a column
 * they never render. `page.tsx` runs the two concurrently in its existing
 * `Promise.all`, so the separation costs no wall-clock — one extra round trip in
 * parallel, not in series.
 *
 * All the logic is in `skills.ts`, which is pure and therefore testable; this
 * half needs a request context and so cannot be reached by a node-only vitest.
 * Same split `viewer.ts` makes with `greetingFrom`.
 */
export async function cvSkills(): Promise<string[]> {
  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()

  const { data: profile } = await supabase
    .from('profiles')
    .select('skills')
    .eq('id', String(claims?.claims.sub ?? ''))
    .maybeSingle()

  // `filter(Boolean)` because the column is free-form `text[]` with no check
  // constraint, so a stray empty string is possible and would render a nameless
  // checkbox.
  return (profile?.skills ?? []).map(String).filter(Boolean)
}

/**
 * The row behind the nav's seeded Jobs link.
 *
 * Separate from `cvSkills()` above rather than one query returning both, because
 * the two are read on different pages: `/jobs` needs the skills and never the
 * seed (it IS the destination), and `/dashboard`, `/applications` and `/resume`
 * need the seed and never the skills. One combined query would make every one of
 * those four routes fetch a column it does not use.
 *
 * Defaults to `autofill: false` when there is no row, so a signed-out or
 * half-created profile gets the plain `/jobs` link rather than an error — the
 * seeded link is an enhancement, and nothing about the nav should depend on it.
 *
 * All the logic is in `seed.ts`, which is pure and therefore tested; this half
 * needs a request context and so cannot be reached by the node-only vitest.
 */
export async function navPreferences(): Promise<SeedPreferences> {
  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'autofill_job_filters, work_location, salary_target, salary_currency, salary_period, skills, years_experience',
    )
    .eq('id', String(claims?.claims.sub ?? ''))
    .maybeSingle()

  return {
    autofill: profile?.autofill_job_filters ?? false,
    workLocation: profile?.work_location ?? null,
    salaryTarget: profile?.salary_target ?? null,
    salaryCurrency: profile?.salary_currency ?? null,
    salaryPeriod: profile?.salary_period ?? null,
    // `filter(Boolean)` for the same reason as `cvSkills` above: free-form text[]
    // with no check constraint, so a stray empty string is possible.
    skills: (profile?.skills ?? []).map(String).filter(Boolean),
    yearsExperience: profile?.years_experience ?? null,
  }
}
