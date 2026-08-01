# Design Spec — Login System and Monorepo Foundation

| Field | Value |
|---|---|
| **Phase** | 0.9 (see PRD §14) |
| **Date** | 2026-08-01 |
| **Status** | Pending review |
| **Source of truth** | `docs/PRD.md` (amended 2026-08-01) · `references/brand/logo.png` (palette) · `references/login_system/` (layout) |
| **Covers** | FR-1, FR-3, FR-4, FR-42–FR-46 · NFR-12, NFR-13 · P8, P9 · §12.1 |

---

## 1. Scope

Deliver the monorepo foundation and a complete login system. Three applications boot locally and deploy to Vercel. A user can create an account, verify their email, sign in with a password or with Google, recover a forgotten password, and sign out. An operator with the admin role reaches the admin app; nobody else can tell it exists.

**Explicitly out of scope**, deferred to 1.0: the CV gate, board, stages, jobs, activities, gap analysis, and every AI call. Pages beyond the auth flow are placeholders that prove routing and session handling work.

**Why this is its own phase.** The auth surface is where a mistake is both most likely and most expensive — a cross-user session leak or a self-promotable admin role is not something to discover after the board is built on top of it. Shipping it alone means the security tests in §9 are the entire test suite, not a footnote in it.

---

## 2. Architecture

```
job-tracker/                              ← git repo
├── references/                           design input (read-only)
├── docs/                                 PRD · specs · plans
├── brand/                                superseded SVGs, retained as history
└── job-tracker/                          ← MONOREPO ROOT
    ├── apps/
    │   ├── web/          landing    · no Supabase client at all
    │   ├── dashboard/    user app   · five auth screens + protected shell
    │   └── admin/        admin app  · own sign-in, role gate
    ├── packages/
    │   ├── db/           Supabase clients + generated types
    │   ├── ui/           design system extracted from references
    │   └── config/       tsconfig · eslint · tailwind preset
    ├── supabase/         migrations · config.toml
    ├── turbo.json
    └── pnpm-workspace.yaml
```

`packages/ai` and `packages/core` from PRD §13 are not created in this phase — nothing would go in them yet.

**Toolchain:** Next.js 16.2.12 · React 19.2.8 · `@supabase/ssr` 0.12.4 · `supabase-js` 2.111.0 · Tailwind 4.3.3 · Turborepo 2.10.8 · pnpm 11.18 · Node 26.5.

### Three services, three independent sessions

`web` ships no auth code, so it stays statically cacheable. `dashboard` and `admin` each hold their own session cookie, scoped to their own host. The landing page's "Sign in" is an ordinary link to the dashboard's origin — no session crosses a boundary, and there is no shared-cookie parent domain.

Beyond simplicity, this is the only arrangement that works on Vercel previews: `*.vercel.app` is on the Public Suffix List, so browsers refuse cookies set on a shared parent there. Independent sessions make preview deployments behave exactly like production, which matters because previews are the staging environment.

The cost is that an operator signs in twice — once to the dashboard, once to admin. Accepted: it is one person, occasionally.

---

## 3. Authentication flows

Supabase Auth runs in **PKCE** mode throughout, which is what `@supabase/ssr` requires.

### 3.1 Two callback handlers, and why

This corrects the initial plan, which routed email verification through the OAuth handler. Three inbound link types arrive with two different shapes:

| Flow | Arrives as | Handler | Exchange |
|---|---|---|---|
| Google OAuth | `?code=…` | `/auth/callback` | `exchangeCodeForSession(code)` |
| Email verification | `?token_hash=…&type=email` | `/auth/confirm` | `verifyOtp({ type, token_hash })` |
| Password recovery | `?token_hash=…&type=recovery` | `/auth/confirm` | `verifyOtp({ type, token_hash })` |

Only OAuth uses `code`. Calling `exchangeCodeForSession` on a `token_hash` fails, and it is a failure that looks like a broken email rather than a bug in the handler — which is why it belongs in the spec rather than being left to discovery.

**Both Supabase email templates must be rewritten.** The defaults point at `/auth/v1/verify`, which does not establish a server-side session:

```
Confirm signup:   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
Reset password:   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

`/auth/confirm` validates `next` is a relative path before redirecting, so the parameter cannot be turned into an open redirect.

### 3.2 Sign up

Client submits full name, email, password, confirmed password, terms checkbox. Server action calls `signUp` with `full_name` and `accepted_terms` in user metadata, plus `emailRedirectTo` pointing at `/auth/confirm`.

A database trigger on `auth.users` insert creates the `profiles` row from that metadata (§4). No application code path can leave a user without a profile.

The response is always the same neutral redirect to `/check-email`, whether or not the address was already registered (FR-46). Supabase handles the existing-address case by notifying the original owner rather than creating a duplicate.

### 3.3 Sign in

`signInWithPassword`. On failure, one message — "Email or password is incorrect" — regardless of which was wrong. An account that exists but is unverified does not receive a session; it is routed to `/check-email` with a resend action.

### 3.4 Google

`signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback?next=/dashboard' } })`. Google accounts arrive verified and skip `/check-email`.

The button renders only when `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` is set. When absent, the button and its "OR CONTINUE WITH" divider are both omitted so the card does not show an orphaned separator. A user cancelling at Google returns to `/sign-in` with no error banner — cancelling is a choice, not a failure.

### 3.5 Password recovery

`resetPasswordForEmail(email, { redirectTo: '<origin>/auth/confirm?next=/reset-password' })` → `/check-email` → recovery mail → `/auth/confirm` runs `verifyOtp`, which establishes a session → `/reset-password` → `updateUser({ password })` → `/dashboard`.

Because `verifyOtp` has already put a session in cookies, `/reset-password` needs no token in its own URL. It requires a session with a recovery origin; reached without one, it redirects to `/forgot-password`.

Unknown addresses get the same `/check-email` response as known ones, and no mail is sent (FR-46).

### 3.6 Sign out

`signOut()` in a server action, then redirect to `/sign-in`. Cookies cleared; protected routes redirect thereafter.

---

## 4. Data model

```sql
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  role               text not null default 'user' check (role in ('user','admin')),
  accepted_terms_at  timestamptz,
  onboarding_complete boolean not null default false,
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;
```

### 4.1 Avoiding recursive RLS

The obvious admin policy — "select if a row in `profiles` says I'm an admin" — queries `profiles` from inside a `profiles` policy, and Postgres raises infinite recursion. The fix is a `security definer` function, which runs as the owner and therefore bypasses RLS on its own read:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
```

`set search_path = ''` is not decoration: without it, a `security definer` function is vulnerable to search-path manipulation, and this one runs as owner.

```sql
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
```

### 4.2 Making the role non-self-assignable

The update policy above still permits a user to change their own `role`, because the row is theirs. RLS is the wrong tool for a per-column restriction; column privileges are the right one:

```sql
revoke update on public.profiles from authenticated;
grant update (full_name, accepted_terms_at, onboarding_complete)
  on public.profiles to authenticated;
```

`role` is now unwritable by any user session, and the escalation attempt fails in the database rather than being caught by application code that might later be refactored away. Admin promotion happens through a migration or a service-role script.

### 4.3 Profile creation trigger

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Google sign-ups carry no `accepted_terms`, leaving `accepted_terms_at` null. The dashboard requires acceptance before first use for those accounts — a one-screen interstitial, not a blocking modal.

---

## 5. Session handling

One `middleware.ts` per authenticated app, sharing an implementation from `packages/db`.

```ts
setAll(cookiesToSet, headers) {
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options))
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
}
```

**That second loop is load-bearing (NFR-12).** When auth cookies are set, `@supabase/ssr` supplies `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Expires: 0`, `Pragma: no-cache`. Discard them and a CDN can cache a response carrying one user's session cookie and serve it to another. The failure is invisible in normal use and catastrophic when it happens, so §9 asserts the header directly.

Session checks use `getClaims()`, which verifies the JWT locally and triggers refresh when needed. `getUser()` is reserved for the few places a round trip to the auth server is genuinely required.

**Redirect rules.** Dashboard: no session → `/sign-in?next=<path>`; session with unverified email → `/check-email`; authenticated user on an auth route → `/dashboard`. Admin: no session → `/sign-in`; session without the admin role → **`notFound()`**, a 404. A 403 would confirm the app exists (FR-45, §12.1).

---

## 6. Design system

`packages/ui` is built from tokens first; screens then compose components rather than porting static markup. Porting the reference HTML directly would spread the same hex values across five files and guarantee drift.

**Tokens come from the logo mark, not from `DESIGN.md`.** PRD Appendix A is authoritative. Two departures from the reference designs are deliberate and must survive implementation review:

| Reference says | We use | Why |
|---|---|---|
| `primary: #000000` | `#1E1E1E` | Sampled from the mark. A true-black button next to the real logo makes the logo look faded. |
| Cool-cast greys (`#1a1c1c`, `#444748`, `#c4c7c7`) | Neutral ramp | The mark is pure neutral; the reference greys run cool. |
| One hairline border (`#c4c7c7`, ~1.9:1) | `outline` `#8A8A8A` for controls, `outline-subtle` `#E4E4E4` for decoration | WCAG 1.4.11 requires 3:1 on a control boundary. |
| `secondary-container: #dce2f3` | dropped | The mark licenses no colour. |

A screen that renders `#000000`, or an input bordered with `outline-subtle`, is a bug — the visual diff against `screen.png` will be subtle, so this is checked by token lint rather than by eye.

**Components:** `Button` (primary using the three-facet ink scale for rest/hover/pressed, secondary) · `Input` (leading icon, password visibility toggle, error state) · `Card` · `AuthShell` (two-column split — marketing copy left, form card right) · `Logo` · `Divider` · `FormError` · `Checkbox`.

`AuthShell` collapses to a single column on mobile, dropping the left panel. Geist loads through `next/font` in each app's root layout.

**Logo asset.** `brand/logo-mark.svg` is the primary asset — a verified trace of the raster (IoU 0.9932), filled with `currentColor` so a single component covers light and dark grounds by inheriting colour rather than switching files. `Logo` renders it inline, so it takes `fill` from CSS and needs no `variant` prop. The raster master stays in `brand/` for any future large hero use; nothing in Phase 0.9 loads it.

No wordmark lockup exists yet (it needs Geist converted to outlines), so auth screens use the mark alone — which is what the reference designs show anyway.

---

## 7. Route inventory

**`apps/dashboard`**

| Route | Type | Reference |
|---|---|---|
| `/sign-in` | page | `authentication_job_tracker_ai` |
| `/sign-up` | page | `create_account_job_tracker_ai` |
| `/forgot-password` | page | `forgot_password_job_tracker_ai_refined` |
| `/check-email` | page | `check_email_job_tracker_ai_refined` |
| `/reset-password` | page | `new_password_job_tracker_ai_revamped` |
| `/auth/callback` | handler | OAuth `code` exchange |
| `/auth/confirm` | handler | `token_hash` verification — email and recovery |
| `/auth/auth-code-error` | page | neutral failure with a retry path |
| `/dashboard` | page | placeholder, protected |

**`apps/admin`** — `/sign-in` (password only; no Google, no signup link) and `/` behind the role gate.

**`apps/web`** — `/` (hero from the reference left panel), `/terms`, `/privacy` (FR-44, P9).

---

## 8. Configuration

**Per-app environment:**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL                  # per app; drives every redirectTo
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED       # gates the Google button
SUPABASE_SERVICE_ROLE_KEY             # tests and scripts only — never under apps/
```

**Set in the Supabase dashboard, not in app env** — a routine source of confusion:

- Google client ID and secret → Auth → Providers → Google
- SMTP credentials → Auth → SMTP settings (NFR-13)
- Rewritten email templates (§3.1) → Auth → Email Templates
- Redirect allow-list → all three production callbacks **plus** the Vercel preview wildcard `https://*-zzain10000-3864s-projects.vercel.app/**`. Omit the wildcard and every preview sign-in fails while production works — a confusing failure to debug after the fact.

**Manual prerequisites.** Google Cloud OAuth client with redirect URI `https://rruexatjgmmazyldqirp.supabase.co/auth/v1/callback`; a Resend account with a verified domain. Neither blocks local development, which uses Inbucket for mail and can run without Google configured.

**Environments.** The existing Supabase project `rruexatjgmmazyldqirp` serves as staging, wired to Vercel preview. A production project is created at launch; one migration set applies to both.

---

## 9. Testing

**Security — the reason this phase stands alone:**

1. Cross-user read: A queries B's profile → zero rows.
2. Privilege escalation: a user sets their own `role` to `admin` → rejected by the database.
3. Admin containment: an admin session queries a content table → refused by RLS, not by application code.
4. Cache headers: any response setting an auth cookie carries `Cache-Control: private, no-cache, no-store`.
5. No recursion: selecting from `profiles` as both a normal user and an admin succeeds — a guard against the RLS recursion in §4.1 reappearing.
6. Bundle audit: `SUPABASE_SERVICE_ROLE_KEY` in no client bundle; `apps/web` contains no Supabase code.

**Design tokens** — the palette departs from the reference HTML deliberately (§6), and the diff is too subtle to catch by eye:

7. Token lint: no raw hex literal appears in `apps/**` or `packages/ui/**` outside the Tailwind preset. Enforced by an ESLint rule, failing the build.
8. Forbidden values: `#000000`, and the reference cool greys `#1a1c1c` / `#444748` / `#c4c7c7` / `#747878`, appear nowhere in source.
9. Contrast: a unit test asserts every text-on-background pair in the preset computes ≥4.5:1, and every `outline` pair ≥3:1, using the same formula as PRD Appendix A. A future token edit that breaks accessibility fails CI rather than shipping.

**Integration** (Vitest, local Supabase): signup creates exactly one profile row with `full_name` populated · unverified sign-in yields no session · recovery `verifyOtp` establishes a session · `updateUser` changes the password and invalidates the old one.

**End-to-end** (Playwright, local Supabase + Inbucket): signup → verify → dashboard · sign in → sign out → protected redirect · full recovery round trip, old password rejected · non-admin gets 404 on admin, admin gets the overview · Google button absent when the flag is unset.

**Manual on staging:** Google sign-in completes on a preview URL · recovery mail arrives via Resend within 30s · each screen compared side-by-side with its `references/login_system/*/screen.png`.

No live model calls anywhere — this phase makes none.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| RLS recursion on the admin policy | `security definer` `is_admin()` with a pinned search path (§4.1), plus test 5 |
| Role escalation through the profile update path | Column-level `grant`, not a policy (§4.2), plus test 2 |
| Default email templates silently break server-side auth | Templates rewritten to `token_hash` form as a required setup step (§3.1) |
| Missing preview wildcard in the redirect allow-list | Explicit config step (§8), verified by a manual staging sign-in |
| Auth cookies cached by a CDN | NFR-12; header assertion in test 4 |
| Design drift from porting reference HTML | `packages/ui` built first; screens compose it (§6) |
| Reference HTML's `#000000` and cool greys leak in during implementation | Token lint fails the build on any raw hex outside the Tailwind preset (§6, §9) |
| Lossy PNG logo shipped as the permanent master | `Logo` variant prop from day one, so the SVG swap touches no consumer (§6) |
| Input borders left at the reference hairline, failing WCAG 1.4.11 | Two separate line tokens; using `outline-subtle` on a control is a defect (PRD Appendix A) |

---

## 11. Open questions

None blocking. PRD Q3 (billing) and Q4 (production Supabase project) are both scheduled after this phase.
