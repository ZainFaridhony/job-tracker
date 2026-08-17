-- Applied to the cloud project as the migration `autofill_job_filters`.
-- Combined here as the repo record.
--
-- A per-user preference: should the Jobs tab open already filtered to the work
-- location and target salary the profile records? Read by navPreferences() in
-- apps/dashboard/lib/jobs/profile.ts and turned into a link by seedJobsHref().
--
-- `not null default false` rather than nullable. Every other preference column
-- here is nullable because "the CV did not say" is a real state for it — but a
-- boolean has no such state: either the reader asked for this or they did not,
-- and they have not until they tick it. Defaulting to false also means existing
-- rows need no backfill and nobody's Jobs tab changes behaviour on deploy.
alter table public.profiles
  add column if not exists autofill_job_filters boolean not null default false;

-- THE GRANT IS THE POINT OF THIS FILE, not the column.
--
-- RLS on profiles already restricts a row to its owner, but UPDATE on this table
-- is granted per COLUMN, not per row — that is what keeps `role` unwritable by
-- the user it belongs to, since RLS cannot express a per-column restriction when
-- the row legitimately belongs to them. So a new writable column is invisible to
-- the client until it is named here, and the failure mode is a permission error
-- from savePreferencesSettingsAction that looks nothing like a missing grant.
grant update (autofill_job_filters) on public.profiles to authenticated;
