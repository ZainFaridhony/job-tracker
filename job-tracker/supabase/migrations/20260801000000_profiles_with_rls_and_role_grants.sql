-- Private schema for privileged helpers. Postgres grants EXECUTE to PUBLIC on
-- every new function, so a SECURITY DEFINER function living in `public` would be
-- a callable API endpoint for anon and authenticated. Keeping it out of an
-- exposed schema is the structural fix; the revokes below are belt and braces.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  role                text not null default 'user' check (role in ('user','admin')),
  accepted_terms_at   timestamptz,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so it reads profiles with RLS bypassed: a policy on profiles
-- that queries profiles directly raises infinite recursion (42P17). search_path
-- is pinned because a definer function running as the owner is otherwise open to
-- search-path manipulation.
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- auth.uid() is wrapped in a subselect so Postgres caches it once per statement
-- rather than re-evaluating it per row.
create policy profiles_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or private.is_admin());

-- Both USING and WITH CHECK: without WITH CHECK a user could rewrite the row's
-- id and hand it to someone else.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- FR-45: role must not be self-assignable. RLS cannot express a per-column
-- restriction, because the row legitimately belongs to the user. Column
-- privileges can: revoke everything, then grant back only what a user may write.
-- The escalation attempt then fails in the database rather than in application
-- code that a later refactor could quietly drop.
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, accepted_terms_at, onboarding_complete)
  on public.profiles to authenticated;

-- No insert policy and no insert grant: only this trigger creates rows, so no
-- code path can leave a user without a profile.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, accepted_terms_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when new.raw_user_meta_data ->> 'accepted_terms' = 'true'
         then now() else null end
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
