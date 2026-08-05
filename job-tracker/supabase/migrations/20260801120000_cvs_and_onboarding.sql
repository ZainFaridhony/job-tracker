-- Applied to the cloud project as three migrations (cvs_table,
-- onboarding_profile_fields, cvs_private_storage_bucket). Combined here as the
-- repo record.

-- CV files. extracted_text is dense PII (P1/P3): never logged, never public.
create table public.cvs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  storage_path   text not null,
  file_name      text not null,
  extracted_text text,
  char_count     int,
  is_primary     boolean not null default true,
  created_at     timestamptz not null default now()
);
create index cvs_user_id_idx on public.cvs (user_id);
alter table public.cvs enable row level security;

create policy cvs_select_own on public.cvs for select to authenticated using ((select auth.uid()) = user_id);
create policy cvs_insert_own on public.cvs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy cvs_update_own on public.cvs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cvs_delete_own on public.cvs for delete to authenticated using ((select auth.uid()) = user_id);

-- extracted_text and char_count are written by the server action only, so they
-- are deliberately absent from the update grant: a user must not be able to
-- tamper with what the AI later reads.
revoke all on public.cvs from anon;
revoke all on public.cvs from authenticated;
grant select, insert, delete on public.cvs to authenticated;
grant update (file_name, is_primary) on public.cvs to authenticated;

-- Onboarding answers. Steps 2-5 have no consumer until a job-discovery feature
-- exists (PRD NG2, now under review) — these columns are storage for now.
alter table public.profiles
  add column career_goal       text,
  add column target_roles      text[] not null default '{}',
  add column skills            text[] not null default '{}',
  add column years_experience  int,
  add column work_location     text,
  add column salary_period     text,
  add column salary_target     text,
  add column salary_currency   text,
  add column onboarding_step   int not null default 1;

alter table public.profiles
  add constraint profiles_work_location_check
    check (work_location is null or work_location in ('remote','hybrid','onsite')),
  add constraint profiles_salary_period_check
    check (salary_period is null or salary_period in ('yearly','monthly')),
  add constraint profiles_onboarding_step_check
    check (onboarding_step between 1 and 6);

-- Extends the existing grant. role stays unwritable (FR-45).
grant update (
  full_name, accepted_terms_at, onboarding_complete,
  career_goal, target_roles, skills, years_experience,
  work_location, salary_period, salary_target, salary_currency,
  onboarding_step
) on public.profiles to authenticated;

-- Private bucket. Access only via short-lived signed URLs (FR-9, NFR-5).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs','cvs',false, 10485760,
  array['application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- Objects are namespaced by user id, so the first path segment is the owner.
create policy cvs_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy cvs_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy cvs_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
