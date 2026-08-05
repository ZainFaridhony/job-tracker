-- The onboarding wizard went from six steps to four, regrouped by who knows the
-- answer: the CV, then everything the CV told us, then everything it cannot say,
-- then the handoff. Same nine columns, fewer page loads.
--
-- Ordering is load-bearing. profiles_onboarding_step_check pinned 1..6, so the
-- stored values have to be remapped BEFORE the narrower constraint goes on, or
-- every row above 4 rejects and the migration aborts.

alter table public.profiles drop constraint profiles_onboarding_step_check;

-- old 1 resume          -> 1 resume        (nothing done yet)
-- old 2 goals           -> 2 profile       (CV uploaded, nothing confirmed)
-- old 3 roles           -> 2 profile       (goal answered; roles not yet confirmed)
-- old 4 skills          -> 2 profile       (roles kept; skills not yet confirmed)
-- old 5 work            -> 3 preferences   (goal answered; location/salary not)
-- old 6 done            -> 4 done
--
-- Applies to finished users too, not just those mid-wizard: their marker is 6
-- and would violate the new bound even though the gate never reads it again.
-- Nobody moves forward past work they have not done, and old steps 3 and 4 had
-- already answered career_goal, so step 3 shows it pre-selected rather than
-- asking twice.
update public.profiles
set onboarding_step = case onboarding_step
  when 1 then 1
  when 2 then 2
  when 3 then 2
  when 4 then 2
  when 5 then 3
  else 4
end;

alter table public.profiles
  add constraint profiles_onboarding_step_check
    check (onboarding_step between 1 and 4);

-- Set only when the model actually returned something from the CV. Step 2's
-- subtitle keys off this rather than off the field values, which the user may
-- since have edited: the six-step wizard said "We pulled these from your CV"
-- unconditionally, so a Groq outage left that sentence above empty fields.
alter table public.profiles add column cv_prefilled_at timestamptz;

-- Extends the existing column grant rather than restating it; role stays
-- unwritable (FR-45).
grant update (cv_prefilled_at) on public.profiles to authenticated;
