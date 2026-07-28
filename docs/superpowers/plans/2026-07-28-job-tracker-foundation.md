# Job Tracker — Foundation Implementation Plan (Phase 1, Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed-ready Next.js app where an invited user signs in by magic link, is forced to upload a CV before reaching the dashboard, and lands on a kanban board showing their six seeded stages.

**Architecture:** Next.js 15 App Router with React Server Components reading Supabase Postgres directly under row-level security. Mutations go through Server Actions. The only AI call in this plan is one-shot CV text extraction, isolated behind a pure function (`lib/ai/extract-cv.ts`) so every test runs against a fake instead of the live API.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Supabase (Postgres + Auth magic link + Storage), `@supabase/ssr`, `@anthropic-ai/sdk` (`claude-opus-5`), Vitest, Playwright.

**Source of truth:** `docs/PRD.md`. Requirement IDs below (FR-n, NFR-n, P-n) refer to it.

**Covers:** FR-1 – FR-10, FR-36 (partial), NFR-3, NFR-4, NFR-5, P1 – P4.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Node ≥ 22.** Verified present: v26.5.0, npm 11.17.0.
- **TypeScript `strict: true`.** No `any` in committed code. No `@ts-ignore` without an adjacent comment explaining why.
- **Model ID is exactly `claude-opus-5`.** Never append a date suffix. Never pass `temperature`, `top_p`, `top_k`, or `thinking.budget_tokens` — all four are rejected with HTTP 400 by this model.
- **NFR-4: `ANTHROPIC_API_KEY` is server-only.** It must never appear in a file under `app/` that carries `"use client"`, and never in a `NEXT_PUBLIC_*` variable.
- **NFR-3: every table gets RLS enabled plus a policy.** A migration that creates a table without `enable row level security` is incomplete.
- **NFR-5 / P1: the CV storage bucket is private.** Access only via `createSignedUrl`. Never `getPublicUrl`.
- **P3: never log CV content, extracted text, or job descriptions.** Log row IDs only. This applies to `console.log` left in during debugging.
- **Brand tokens** (from `brand/job-tracker-logo.svg`): ink `#1F2A24`, canvas `#F4F1EC`, sage `#8FAE8B`, sage-light `#C8D5C3`, surface `#E8F0E4`.
- **Commit after every task.** Conventional commit prefixes (`feat:`, `test:`, `chore:`, `docs:`).
- **Branch:** all work in this plan happens on `feat/foundation`, not `main`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `app/layout.tsx` | Root shell, brand fonts, `<body>` canvas colour |
| `app/globals.css` | Tailwind v4 import + `@theme` brand tokens |
| `app/(auth)/sign-in/page.tsx` | Magic-link request form |
| `app/(auth)/callback/route.ts` | Exchanges the magic-link code for a session |
| `app/(app)/layout.tsx` | Authenticated shell; enforces the CV gate |
| `app/(app)/board/page.tsx` | Board — renders stages as columns |
| `app/(app)/onboarding/page.tsx` | CV upload screen (the gate) |
| `middleware.ts` | Refreshes the Supabase session cookie on every request |
| `lib/supabase/server.ts` | RSC/Server Action client (cookie-bound) |
| `lib/supabase/client.ts` | Browser client |
| `lib/supabase/admin.ts` | Service-role client — tests and scripts only, never request path |
| `lib/supabase/types.ts` | Generated database types |
| `lib/ai/client.ts` | Anthropic SDK singleton |
| `lib/ai/extract-cv.ts` | `(file: Buffer, mime: string) => Promise<string>` — pure |
| `lib/ai/types.ts` | `CvExtractor` interface, so tests inject a fake |
| `lib/cv/upload.ts` | Server Action: validate → store → extract → persist |
| `lib/stages/seed.ts` | Seeds the six default stages for a new user |
| `supabase/migrations/*.sql` | Schema, RLS policies, storage policies |
| `scripts/invite.ts` | Operator script: create an allowlisted user |
| `test/setup.ts` | Vitest global setup |
| `test/helpers/users.ts` | Creates disposable test users via the admin client |

**Boundary rationale:** `lib/ai/*` never touches the database or request context — text in, text out. That is what makes Task 7's tests possible without a network call, and what lets Plan 3 reuse the same shape for gap analysis.

---

## Task 1: Scaffold, brand tokens, and a green test run

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `test/setup.ts`
- Create: `lib/brand.ts`
- Test: `lib/brand.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `BRAND` — `Record<'ink'|'canvas'|'sage'|'sageLight'|'surface', string>` exported from `lib/brand.ts`. Tailwind theme variables `--color-ink`, `--color-canvas`, `--color-sage`, `--color-sage-light`, `--color-surface`, usable as `bg-canvas`, `text-ink`, etc.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/foundation
```

- [ ] **Step 2: Scaffold Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint \
  --src-dir=false --import-alias="@/*" --no-turbopack --yes
```

If the directory-not-empty prompt appears, accept — `brand/` and `docs/` must be preserved. Verify afterwards with `ls brand docs`.

- [ ] **Step 3: Install test tooling**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Write `test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 6: Add the test script to `package.json`**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Write the failing test**

`lib/brand.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BRAND } from '@/lib/brand'

describe('BRAND', () => {
  it('exposes the five brand tokens as hex values', () => {
    expect(BRAND).toEqual({
      ink: '#1F2A24',
      canvas: '#F4F1EC',
      sage: '#8FAE8B',
      sageLight: '#C8D5C3',
      surface: '#E8F0E4',
    })
  })

  it('uses uppercase six-digit hex for every token', () => {
    for (const value of Object.values(BRAND)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/)
    }
  })
})
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/brand"`.

- [ ] **Step 9: Write `lib/brand.ts`**

```ts
/**
 * Brand tokens, derived from brand/job-tracker-logo.svg.
 * Kept in TS as well as CSS so server code (e.g. generated documents)
 * can reference the same values without parsing CSS.
 */
export const BRAND = {
  ink: '#1F2A24',
  canvas: '#F4F1EC',
  sage: '#8FAE8B',
  sageLight: '#C8D5C3',
  surface: '#E8F0E4',
} as const

export type BrandToken = keyof typeof BRAND
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 2 tests.

- [ ] **Step 11: Wire brand tokens into Tailwind v4**

Replace `app/globals.css` entirely. Tailwind v4 is configured in CSS via `@theme`, not a `tailwind.config.js` — do not create that file.

```css
@import "tailwindcss";

@theme {
  --color-ink: #1F2A24;
  --color-canvas: #F4F1EC;
  --color-sage: #8FAE8B;
  --color-sage-light: #C8D5C3;
  --color-surface: #E8F0E4;

  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;

  --radius-card: 0.75rem;
}

body {
  background-color: var(--color-canvas);
  color: var(--color-ink);
}
```

- [ ] **Step 12: Replace `app/page.tsx` with a brand smoke screen**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-[--radius-card] bg-surface px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Job Tracker</h1>
        <p className="mt-2 text-sm text-ink/70">Foundation scaffold is running.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 13: Verify the app builds and renders**

Run: `npm run build`
Expected: build succeeds with no type errors.

Run: `npm run dev`, open `http://localhost:3000`
Expected: cream `#F4F1EC` background, dark green heading. Confirm the colours are the brand values — if the background is white, `@theme` was not picked up.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with brand tokens and Vitest"
```

---

## Task 2: Supabase local, initial schema, and the cross-user RLS test

This task is where NFR-3 is proven, not asserted. The RLS test is the most important test in the plan: it is the only thing standing between one friend and another friend's CV.

**Files:**
- Create: `supabase/config.toml` (via CLI), `supabase/migrations/0001_profiles_and_stages.sql`
- Create: `lib/supabase/admin.ts`, `lib/supabase/types.ts` (generated)
- Create: `test/helpers/users.ts`
- Test: `supabase/migrations/rls.test.ts`
- Modify: `package.json` (scripts), `.env.local`

**Interfaces:**
- Consumes: nothing from Task 1 beyond the project
- Produces:
  - `createAdminClient(): SupabaseClient<Database>` from `lib/supabase/admin.ts` — service-role, bypasses RLS
  - `createTestUser(email?: string): Promise<{ id: string; email: string; client: SupabaseClient<Database> }>` from `test/helpers/users.ts`
  - `deleteTestUser(id: string): Promise<void>` from the same file
  - `Database` type from `lib/supabase/types.ts`
  - Tables `profiles`, `stages`

- [ ] **Step 1: Install the Supabase CLI as a dev dependency**

```bash
npm i -D supabase
npx supabase init
```

When asked about generating VS Code settings or Deno config, answer no.

- [ ] **Step 2: Start local Supabase**

```bash
npx supabase start
```

Expected: a table of local credentials. Copy `API URL`, `anon key`, and `service_role key`.

> Requires Docker running. If it fails with a Docker connection error, start Docker Desktop and retry.

- [ ] **Step 3: Write `.env.local`**

Use the values printed by `supabase start`. The service-role key is only read by tests and scripts.

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
ANTHROPIC_API_KEY=<your key>
```

Confirm `.gitignore` already excludes `.env*.local` — it does. Verify with `git check-ignore .env.local`, which must print the filename.

- [ ] **Step 4: Disable public signup (FR-2)**

In `supabase/config.toml`, under `[auth]`, set:

```toml
[auth]
enable_signup = false
```

This is the allowlist mechanism: a magic link can only be issued to a user that already exists, so an uninvited email cannot obtain a session. No custom gating code is needed, and the sign-in page shows the same neutral message either way (FR-1).

Apply it: `npx supabase stop && npx supabase start`

- [ ] **Step 5: Write the migration**

`supabase/migrations/0001_profiles_and_stages.sql`:

```sql
-- Profiles: one row per auth user, created by trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile: select" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile: update" on public.profiles
  for update using (auth.uid() = id);

-- Stages: user-defined kanban columns (FR-10, FR-11).
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  position integer not null,
  color text not null default '#8FAE8B',
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stages enable row level security;

create policy "own stages: select" on public.stages
  for select using (auth.uid() = user_id);
create policy "own stages: insert" on public.stages
  for insert with check (auth.uid() = user_id);
create policy "own stages: update" on public.stages
  for update using (auth.uid() = user_id);
create policy "own stages: delete" on public.stages
  for delete using (auth.uid() = user_id);

create index stages_user_position_idx on public.stages (user_id, position);

-- Auto-create a profile whenever an auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 6: Apply the migration**

```bash
npx supabase migration up
```

Expected: `0001_profiles_and_stages` applied, no errors.

- [ ] **Step 7: Generate database types**

```bash
npx supabase gen types typescript --local > lib/supabase/types.ts
```

Add to `package.json` scripts so this is repeatable:

```json
"db:types": "supabase gen types typescript --local > lib/supabase/types.ts",
"db:reset": "supabase db reset"
```

Verify `lib/supabase/types.ts` exports `Database` and contains `profiles` and `stages`.

- [ ] **Step 8: Install the Supabase JS clients**

```bash
npm i @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 9: Write `lib/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/**
 * Service-role client. Bypasses row-level security.
 *
 * NEVER import this from anything under app/ that serves a user request.
 * Tests and operator scripts only.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'createAdminClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

- [ ] **Step 10: Write `test/helpers/users.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

const PASSWORD = 'test-password-12345'

export type TestUser = {
  id: string
  email: string
  client: ReturnType<typeof createClient<Database>>
}

/**
 * Creates a confirmed auth user and returns a client authenticated as them.
 * The returned client is subject to RLS, unlike the admin client.
 */
export async function createTestUser(email?: string): Promise<TestUser> {
  const admin = createAdminClient()
  const address = email ?? `test-${crypto.randomUUID()}@example.com`

  const { data, error } = await admin.auth.admin.createUser({
    email: address,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  if (!data.user) throw new Error('createUser returned no user')

  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const signIn = await client.auth.signInWithPassword({
    email: address,
    password: PASSWORD,
  })
  if (signIn.error) throw signIn.error

  return { id: data.user.id, email: address, client }
}

export async function deleteTestUser(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw error
}
```

- [ ] **Step 11: Load `.env.local` into Vitest**

Vitest does not read `.env.local` automatically. Add to `vitest.config.ts` — import `loadEnv` and merge:

```ts
import { defineConfig, loadEnv } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
    env: loadEnv(mode, process.cwd(), ''),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
}))
```

- [ ] **Step 12: Write the failing RLS test**

`supabase/migrations/rls.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from '@/test/helpers/users'

describe('row-level security (NFR-3)', () => {
  let alice: TestUser
  let bob: TestUser
  let aliceStageId: string

  beforeAll(async () => {
    alice = await createTestUser()
    bob = await createTestUser()

    const { data, error } = await alice.client
      .from('stages')
      .insert({ user_id: alice.id, name: 'Alice Saved', position: 0 })
      .select('id')
      .single()
    if (error) throw error
    aliceStageId = data.id
  })

  afterAll(async () => {
    await deleteTestUser(alice.id)
    await deleteTestUser(bob.id)
  })

  it('lets a user read their own stage', async () => {
    const { data } = await alice.client.from('stages').select('id, name')
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Alice Saved')
  })

  it('returns zero rows when another user queries that stage by id', async () => {
    const { data, error } = await bob.client
      .from('stages')
      .select('id')
      .eq('id', aliceStageId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('returns zero rows when another user selects all stages', async () => {
    const { data } = await bob.client.from('stages').select('id')
    expect(data).toEqual([])
  })

  it('refuses an insert that claims another user as owner', async () => {
    const { error } = await bob.client
      .from('stages')
      .insert({ user_id: alice.id, name: 'Injected', position: 99 })
    expect(error).not.toBeNull()
  })

  it('silently affects nothing when another user updates that stage', async () => {
    await bob.client.from('stages').update({ name: 'Hijacked' }).eq('id', aliceStageId)
    const { data } = await alice.client
      .from('stages')
      .select('name')
      .eq('id', aliceStageId)
      .single()
    expect(data!.name).toBe('Alice Saved')
  })

  it('silently affects nothing when another user deletes that stage', async () => {
    await bob.client.from('stages').delete().eq('id', aliceStageId)
    const { data } = await alice.client.from('stages').select('id').eq('id', aliceStageId)
    expect(data).toHaveLength(1)
  })

  it("cannot read another user's profile", async () => {
    const { data } = await bob.client.from('profiles').select('id').eq('id', alice.id)
    expect(data).toEqual([])
  })

  it('auto-created a profile for each user via trigger', async () => {
    const { data } = await alice.client.from('profiles').select('id').eq('id', alice.id)
    expect(data).toHaveLength(1)
  })
})
```

- [ ] **Step 13: Run the test to verify it passes**

Run: `npm test -- rls`
Expected: PASS — 8 tests.

> These tests pass on first run because the migration in Step 5 already includes the policies. That is intentional: the failing state you must confirm is the *inverse*. Do Step 14 to prove the test has teeth.

- [ ] **Step 14: Prove the RLS test actually catches a hole**

Temporarily weaken the policy and confirm the suite goes red:

```bash
npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c 'drop policy "own stages: select" on public.stages;' \
  -c 'create policy "broken" on public.stages for select using (true);'
npm test -- rls
```

Expected: the two "returns zero rows" tests FAIL. Then restore:

```bash
npx supabase db reset && npx supabase migration up
npm test -- rls
```

Expected: PASS — 8 tests. Do not commit until green.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: add profiles and stages schema with verified RLS isolation"
```

---

## Task 3: Supabase request clients and session middleware

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`
- Test: `lib/supabase/server.test.ts`

**Interfaces:**
- Consumes: `Database` from `lib/supabase/types.ts` (Task 2)
- Produces:
  - `createServerSupabase(): Promise<SupabaseClient<Database>>` from `lib/supabase/server.ts` — cookie-bound, RLS-subject, for RSCs and Server Actions. **Async**, because `cookies()` is async in Next 15.
  - `createBrowserSupabase(): SupabaseClient<Database>` from `lib/supabase/client.ts`
  - `middleware` default export refreshing the auth cookie

- [ ] **Step 1: Write the failing test**

`lib/supabase/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = {
  getAll: vi.fn(() => [{ name: 'sb-access-token', value: 'stub' }]),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))

describe('createServerSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('returns a client exposing from() and auth', async () => {
    const { createServerSupabase } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabase()
    expect(typeof supabase.from).toBe('function')
    expect(supabase.auth).toBeDefined()
  })

  it('reads cookies from the Next.js cookie store', async () => {
    const { createServerSupabase } = await import('@/lib/supabase/server')
    await createServerSupabase()
    // @supabase/ssr calls getAll during client construction or first use.
    // Touching auth forces it.
    expect(cookieStore.getAll).toHaveBeenCalled()
  })

  it('throws a clear error when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    vi.resetModules()
    const { createServerSupabase } = await import('@/lib/supabase/server')
    await expect(createServerSupabase()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- server`
Expected: FAIL — cannot resolve `@/lib/supabase/server`.

- [ ] **Step 3: Write `lib/supabase/server.ts`**

```ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

/**
 * Supabase client for Server Components and Server Actions.
 * Bound to the request cookie jar and subject to RLS.
 */
export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session instead, so this is safe.
        }
      },
    },
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- server`
Expected: PASS — 3 tests.

> If the "reads cookies" test fails because `getAll` was not called during construction, change that test to call `await supabase.auth.getUser()` before asserting. Do not delete the assertion.

- [ ] **Step 5: Write `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 6: Write `middleware.ts`**

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refreshes the Supabase auth cookie on every request so Server Components
 * always see a valid session. Route protection itself lives in
 * app/(app)/layout.tsx, not here.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Required: this call is what triggers the token refresh.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
```

- [ ] **Step 7: Verify build and full suite**

Run: `npm run build && npm test`
Expected: build succeeds; 13 tests pass (2 brand + 8 RLS + 3 server).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Supabase server/browser clients and session middleware"
```

---

## Task 4: Magic-link sign-in and the invite script

**Files:**
- Create: `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-in/actions.ts`, `app/(auth)/callback/route.ts`, `scripts/invite.ts`
- Test: `app/(auth)/sign-in/actions.test.ts`
- Modify: `package.json` (invite script)

**Interfaces:**
- Consumes: `createServerSupabase` (Task 3)
- Produces:
  - `requestMagicLink(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }>` from `app/(auth)/sign-in/actions.ts`
  - `GET /callback?code=…` exchanging a code for a session, redirecting to `/board`
  - `npm run invite -- <email>` creating an allowlisted user

- [ ] **Step 1: Write the failing test**

`app/(auth)/sign-in/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const signInWithOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: vi.fn(async () => ({
    auth: { signInWithOtp },
  })),
}))

function form(email: unknown): FormData {
  const fd = new FormData()
  if (typeof email === 'string') fd.set('email', email)
  return fd
}

describe('requestMagicLink (FR-1, FR-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInWithOtp.mockResolvedValue({ error: null })
  })

  it('sends a magic link for a well-formed email', async () => {
    const { requestMagicLink } = await import('@/app/(auth)/sign-in/actions')
    const result = await requestMagicLink(form('zain@qiscus.com'))
    expect(result).toEqual({ ok: true })
    expect(signInWithOtp).toHaveBeenCalledOnce()
  })

  it('rejects a malformed email without calling Supabase', async () => {
    const { requestMagicLink } = await import('@/app/(auth)/sign-in/actions')
    const result = await requestMagicLink(form('not-an-email'))
    expect(result.ok).toBe(false)
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('rejects a missing email field', async () => {
    const { requestMagicLink } = await import('@/app/(auth)/sign-in/actions')
    const result = await requestMagicLink(form(undefined))
    expect(result.ok).toBe(false)
  })

  it('returns ok even when the user does not exist, to avoid account enumeration', async () => {
    signInWithOtp.mockResolvedValue({
      error: { message: 'Signups not allowed for otp', status: 422 },
    })
    const { requestMagicLink } = await import('@/app/(auth)/sign-in/actions')
    const result = await requestMagicLink(form('stranger@example.com'))
    expect(result).toEqual({ ok: true })
  })

  it('surfaces a genuine infrastructure failure', async () => {
    signInWithOtp.mockResolvedValue({
      error: { message: 'service unavailable', status: 503 },
    })
    const { requestMagicLink } = await import('@/app/(auth)/sign-in/actions')
    const result = await requestMagicLink(form('zain@qiscus.com'))
    expect(result.ok).toBe(false)
  })

  it('normalises the email to lowercase and trims whitespace', async () => {
    const { requestMagicLink } = await import('@/app/(auth)/sign-in/actions')
    await requestMagicLink(form('  Zain@Qiscus.COM  '))
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'zain@qiscus.com' }),
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- sign-in`
Expected: FAIL — cannot resolve the actions module.

- [ ] **Step 3: Write `app/(auth)/sign-in/actions.ts`**

The enumeration behaviour in the fourth test is the security-relevant part: an uninvited address must get the same response as an invited one.

```ts
'use server'

import { createServerSupabase } from '@/lib/supabase/server'

export type MagicLinkResult = { ok: true } | { ok: false; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Signup-not-allowed statuses. Public signup is disabled (FR-2), so an
 * uninvited address lands here. We report success anyway: revealing which
 * addresses are invited would be account enumeration (FR-1).
 */
const ENUMERATION_STATUSES = new Set([400, 422])

export async function requestMagicLink(formData: FormData): Promise<MagicLinkResult> {
  const raw = formData.get('email')
  if (typeof raw !== 'string') {
    return { ok: false, message: 'Enter your email address.' }
  }

  const email = raw.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'That does not look like an email address.' }
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/callback`,
    },
  })

  if (error) {
    if (ENUMERATION_STATUSES.has(error.status ?? 0)) {
      return { ok: true }
    }
    return { ok: false, message: 'Could not send the link. Try again shortly.' }
  }

  return { ok: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- sign-in`
Expected: PASS — 6 tests.

- [ ] **Step 5: Add `NEXT_PUBLIC_SITE_URL` to `.env.local`**

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 6: Write `app/(auth)/sign-in/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { requestMagicLink } from './actions'

export default function SignInPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await requestMagicLink(formData)
    setPending(false)
    if (result.ok) setSent(true)
    else setError(result.message)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Job Tracker</h1>

        {sent ? (
          <p className="mt-6 rounded-[--radius-card] bg-surface p-4 text-sm text-ink/80">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form action={onSubmit} className="mt-6 space-y-3">
            <label htmlFor="email" className="block text-sm text-ink/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-sage-light bg-white px-3 py-2 text-ink outline-none focus:border-sage focus:ring-2 focus:ring-sage/30"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-ink px-3 py-2 text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Sending…' : 'Send sign-in link'}
            </button>
            {error && <p className="text-sm text-red-700">{error}</p>}
          </form>
        )}

        <p className="mt-6 text-xs text-ink/50">Job Tracker is invite-only.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Write `app/(auth)/callback/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`)
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=invalid_link`)
  }

  return NextResponse.redirect(`${origin}/board`)
}
```

- [ ] **Step 8: Write `scripts/invite.ts`**

```ts
/**
 * Creates an allowlisted user (FR-2). Public signup is disabled, so this is
 * the only way in.
 *
 *   npm run invite -- friend@example.com
 */
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Usage: npm run invite -- <email>')
    process.exit(1)
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (error) {
    console.error(`Failed to invite ${email}: ${error.message}`)
    process.exit(1)
  }

  console.log(`Invited ${email} (id ${data.user!.id}). They can now request a sign-in link.`)
}

void main()
```

- [ ] **Step 9: Wire the invite script**

```bash
npm i -D tsx dotenv-cli
```

Add to `package.json` scripts:

```json
"invite": "dotenv -e .env.local -- tsx scripts/invite.ts"
```

- [ ] **Step 10: Verify the sign-in path end to end, by hand**

```bash
npm run invite -- zain@qiscus.com
npm run dev
```

1. Visit `http://localhost:3000/sign-in`, enter `zain@qiscus.com`, submit → "Check your email".
2. Open the local mail catcher at `http://127.0.0.1:54324`, click the link.
3. Expected: redirected to `/board` (404 for now — the route arrives in Task 10). The session cookie must be set; confirm `sb-` cookies exist in devtools.
4. Enter `stranger@example.com` on the sign-in page → **also** shows "Check your email", and no mail arrives at the catcher. That is FR-2 behaving correctly.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add magic-link sign-in, callback route, and invite script"
```

---

## Task 5: CV schema and private storage bucket

**Files:**
- Create: `supabase/migrations/0002_cvs_and_storage.sql`
- Test: `supabase/migrations/storage.test.ts`
- Modify: `lib/supabase/types.ts` (regenerate)

**Interfaces:**
- Consumes: `createTestUser`, `deleteTestUser` (Task 2)
- Produces: table `cvs`; storage bucket `cvs` (private) with per-user-folder policies

- [ ] **Step 1: Write the migration**

`supabase/migrations/0002_cvs_and_storage.sql`. Storage paths are `{user_id}/{uuid}.{ext}`, so `storage.foldername(name)[1]` is the owner.

```sql
create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  storage_path text not null,
  file_name text not null,
  extracted_text text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cvs enable row level security;

create policy "own cvs: select" on public.cvs
  for select using (auth.uid() = user_id);
create policy "own cvs: insert" on public.cvs
  for insert with check (auth.uid() = user_id);
create policy "own cvs: update" on public.cvs
  for update using (auth.uid() = user_id);
create policy "own cvs: delete" on public.cvs
  for delete using (auth.uid() = user_id);

-- At most one primary CV per user (FR-8).
create unique index cvs_one_primary_per_user
  on public.cvs (user_id) where is_primary;

create index cvs_user_created_idx on public.cvs (user_id, created_at desc);

-- Private bucket (NFR-5, P1). public = false means no unauthenticated reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  10485760, -- 10 MB (FR-6)
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Users may only touch objects inside their own {user_id}/ folder.
create policy "own cv files: select" on storage.objects
  for select using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own cv files: insert" on storage.objects
  for insert with check (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own cv files: delete" on storage.objects
  for delete using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Apply and regenerate types**

```bash
npx supabase migration up
npm run db:types
```

Expected: `lib/supabase/types.ts` now contains `cvs`.

- [ ] **Step 3: Write the failing storage isolation test**

`supabase/migrations/storage.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from '@/test/helpers/users'

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // "%PDF-1.4"

function pdfBlob() {
  return new Blob([PDF_BYTES], { type: 'application/pdf' })
}

describe('CV storage isolation (NFR-5, P1)', () => {
  let alice: TestUser
  let bob: TestUser
  let alicePath: string

  beforeAll(async () => {
    alice = await createTestUser()
    bob = await createTestUser()
    alicePath = `${alice.id}/cv.pdf`

    const { error } = await alice.client.storage
      .from('cvs')
      .upload(alicePath, pdfBlob(), { contentType: 'application/pdf' })
    if (error) throw error
  })

  afterAll(async () => {
    await alice.client.storage.from('cvs').remove([alicePath])
    await deleteTestUser(alice.id)
    await deleteTestUser(bob.id)
  })

  it('lets the owner create a signed URL', async () => {
    const { data, error } = await alice.client.storage
      .from('cvs')
      .createSignedUrl(alicePath, 60)
    expect(error).toBeNull()
    expect(data?.signedUrl).toContain('token=')
  })

  it("refuses another user's attempt to sign that URL", async () => {
    const { data, error } = await bob.client.storage
      .from('cvs')
      .createSignedUrl(alicePath, 60)
    expect(data?.signedUrl).toBeUndefined()
    expect(error).not.toBeNull()
  })

  it("refuses an upload into another user's folder", async () => {
    const { error } = await bob.client.storage
      .from('cvs')
      .upload(`${alice.id}/injected.pdf`, pdfBlob(), { contentType: 'application/pdf' })
    expect(error).not.toBeNull()
  })

  it("does not list another user's folder contents", async () => {
    const { data } = await bob.client.storage.from('cvs').list(alice.id)
    expect(data ?? []).toEqual([])
  })

  it('enforces one primary CV per user', async () => {
    const first = await alice.client
      .from('cvs')
      .insert({
        user_id: alice.id,
        storage_path: alicePath,
        file_name: 'cv.pdf',
        is_primary: true,
      })
      .select('id')
      .single()
    expect(first.error).toBeNull()

    const second = await alice.client.from('cvs').insert({
      user_id: alice.id,
      storage_path: `${alice.id}/other.pdf`,
      file_name: 'other.pdf',
      is_primary: true,
    })
    expect(second.error).not.toBeNull()

    await alice.client.from('cvs').delete().eq('id', first.data!.id)
  })
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- storage`
Expected: PASS — 5 tests.

> If "does not list another user's folder" fails with rows returned, the select policy is wrong — check that `storage.foldername(name)[1]` is compared against `auth.uid()::text` and not `auth.uid()`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add cvs table and private CV storage bucket with isolation tests"
```

---

## Task 6: CV text extraction behind an injectable interface

This is the only model call in the plan. It exists as a pure function so nothing else in the codebase needs to know about the SDK, and so Task 7 can test the upload flow without a network call.

**Files:**
- Create: `lib/ai/client.ts`, `lib/ai/types.ts`, `lib/ai/extract-cv.ts`, `lib/ai/fakes.ts`
- Test: `lib/ai/extract-cv.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type CvExtractor = (input: { bytes: Buffer; mimeType: string }) => Promise<string>` from `lib/ai/types.ts`
  - `extractCvText: CvExtractor` from `lib/ai/extract-cv.ts` (real, calls the API)
  - `fakeCvExtractor(text?: string): CvExtractor` from `lib/ai/fakes.ts`
  - `getAnthropic(): Anthropic` from `lib/ai/client.ts`

- [ ] **Step 1: Install the SDK**

```bash
npm i @anthropic-ai/sdk
```

- [ ] **Step 2: Write `lib/ai/types.ts`**

```ts
export type CvExtractInput = {
  bytes: Buffer
  mimeType: string
}

/**
 * Extracts plain text from a CV file. Implementations must be pure with
 * respect to application state: no database access, no request context.
 */
export type CvExtractor = (input: CvExtractInput) => Promise<string>

export class CvExtractionError extends Error {
  constructor(
    message: string,
    readonly reason: 'unsupported_type' | 'empty_result' | 'refused' | 'api_error',
  ) {
    super(message)
    this.name = 'CvExtractionError'
  }
}
```

- [ ] **Step 3: Write the failing test**

`lib/ai/extract-cv.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CvExtractionError } from '@/lib/ai/types'

const create = vi.fn()

vi.mock('@/lib/ai/client', () => ({
  getAnthropic: () => ({ messages: { create } }),
}))

const PDF = Buffer.from('%PDF-1.4 fake')

function textResponse(text: string) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] }
}

describe('extractCvText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the extracted text for a PDF', async () => {
    create.mockResolvedValue(textResponse('Zain\nSenior Engineer\nQiscus'))
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    const text = await extractCvText({ bytes: PDF, mimeType: 'application/pdf' })
    expect(text).toBe('Zain\nSenior Engineer\nQiscus')
  })

  it('sends the PDF as a base64 document block using claude-opus-5', async () => {
    create.mockResolvedValue(textResponse('text'))
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    await extractCvText({ bytes: PDF, mimeType: 'application/pdf' })

    const args = create.mock.calls[0][0]
    expect(args.model).toBe('claude-opus-5')
    const doc = args.messages[0].content.find((b: { type: string }) => b.type === 'document')
    expect(doc.source).toMatchObject({
      type: 'base64',
      media_type: 'application/pdf',
    })
    expect(doc.source.data).toBe(PDF.toString('base64'))
  })

  it('never sends parameters this model rejects', async () => {
    create.mockResolvedValue(textResponse('text'))
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    await extractCvText({ bytes: PDF, mimeType: 'application/pdf' })

    const args = create.mock.calls[0][0]
    expect(args.temperature).toBeUndefined()
    expect(args.top_p).toBeUndefined()
    expect(args.top_k).toBeUndefined()
    expect(args.thinking?.budget_tokens).toBeUndefined()
  })

  it('rejects an unsupported mime type without calling the API', async () => {
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    await expect(
      extractCvText({ bytes: PDF, mimeType: 'image/gif' }),
    ).rejects.toThrow(CvExtractionError)
    expect(create).not.toHaveBeenCalled()
  })

  it('throws with reason empty_result when the model returns blank text', async () => {
    create.mockResolvedValue(textResponse('   '))
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    await expect(
      extractCvText({ bytes: PDF, mimeType: 'application/pdf' }),
    ).rejects.toMatchObject({ reason: 'empty_result' })
  })

  it('throws with reason refused when stop_reason is refusal, without reading content', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    await expect(
      extractCvText({ bytes: PDF, mimeType: 'application/pdf' }),
    ).rejects.toMatchObject({ reason: 'refused' })
  })

  it('wraps an SDK failure as api_error', async () => {
    create.mockRejectedValue(new Error('socket hang up'))
    const { extractCvText } = await import('@/lib/ai/extract-cv')
    await expect(
      extractCvText({ bytes: PDF, mimeType: 'application/pdf' }),
    ).rejects.toMatchObject({ reason: 'api_error' })
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- extract-cv`
Expected: FAIL — cannot resolve `@/lib/ai/extract-cv`.

- [ ] **Step 5: Write `lib/ai/client.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'

let cached: Anthropic | null = null

/**
 * Anthropic client singleton. Server-only (NFR-4) — importing this from a
 * "use client" module would leak ANTHROPIC_API_KEY into the browser bundle.
 */
export function getAnthropic(): Anthropic {
  if (cached) return cached
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY')
  cached = new Anthropic({ apiKey })
  return cached
}
```

- [ ] **Step 6: Write `lib/ai/extract-cv.ts`**

```ts
import { getAnthropic } from '@/lib/ai/client'
import { CvExtractionError, type CvExtractor } from '@/lib/ai/types'

export const MODEL = 'claude-opus-5'

const SUPPORTED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const SYSTEM = [
  'You extract the plain text of a CV so it can be reused later.',
  'Return the text only: no commentary, no summary, no markdown fences.',
  'Preserve section headings and line breaks. Preserve dates verbatim.',
  'Do not add, infer, or correct any information that is not in the document.',
].join(' ')

/**
 * Reads a CV file and returns its plain text.
 *
 * PDFs are sent as native document blocks, so scanned/image-only CVs work
 * via vision with no OCR dependency (FR-7). The result is cached by the
 * caller in cvs.extracted_text so this runs once per upload, not per analysis.
 */
export const extractCvText: CvExtractor = async ({ bytes, mimeType }) => {
  if (!SUPPORTED.has(mimeType)) {
    throw new CvExtractionError(`Unsupported file type: ${mimeType}`, 'unsupported_type')
  }

  let response
  try {
    response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: bytes.toString('base64'),
              },
            },
            { type: 'text', text: 'Extract the full plain text of this CV.' },
          ],
        },
      ],
    })
  } catch (cause) {
    throw new CvExtractionError('CV extraction request failed', 'api_error')
  }

  // Check stop_reason before touching content: a refusal has empty content
  // and indexing content[0] would throw.
  if (response.stop_reason === 'refusal') {
    throw new CvExtractionError('The model declined to process this file', 'refused')
  }

  const text = response.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!text) {
    throw new CvExtractionError('No text could be read from this file', 'empty_result')
  }

  return text
}
```

> DOCX is accepted by the mime allowlist but sent through the same document block. If the model errors on DOCX during Step 10's manual check, restrict `SUPPORTED` to PDF only and update FR-6 in the PRD to match — do not leave a type accepted at upload that fails at extraction.

- [ ] **Step 7: Write `lib/ai/fakes.ts`**

```ts
import type { CvExtractor } from '@/lib/ai/types'

/** Deterministic extractor for tests. Never touches the network. */
export function fakeCvExtractor(text = 'Zain\nSenior Engineer\nQiscus'): CvExtractor {
  return async () => text
}

export function failingCvExtractor(error: Error): CvExtractor {
  return async () => {
    throw error
  }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- extract-cv`
Expected: PASS — 7 tests.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add CV text extraction via claude-opus-5 behind an injectable interface"
```

- [ ] **Step 10: Verify against the real API, by hand**

Create `scripts/smoke-extract.ts`:

```ts
import { readFileSync } from 'node:fs'
import { extractCvText } from '@/lib/ai/extract-cv'

const path = process.argv[2]
if (!path) {
  console.error('Usage: npm run smoke:extract -- <path-to-cv.pdf>')
  process.exit(1)
}

const text = await extractCvText({
  bytes: readFileSync(path),
  mimeType: 'application/pdf',
})
// P3: print length and a short head only — never the whole CV to a terminal log.
console.log(`Extracted ${text.length} chars. First 120:`)
console.log(text.slice(0, 120))
```

Add to scripts: `"smoke:extract": "dotenv -e .env.local -- tsx scripts/smoke-extract.ts"`

Run with a real CV: `npm run smoke:extract -- ~/path/to/cv.pdf`
Expected: a plausible character count and readable head. If you have a scanned CV, run it too — text must still appear.

```bash
git add -A && git commit -m "chore: add CV extraction smoke script"
```

---

## Task 7: CV upload server action

**Files:**
- Create: `lib/cv/upload.ts`
- Test: `lib/cv/upload.test.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 3), `CvExtractor` / `CvExtractionError` (Task 6), `fakeCvExtractor` (Task 6), `cvs` table (Task 5)
- Produces: `uploadCv(formData: FormData, deps?: { extractor?: CvExtractor }): Promise<UploadCvResult>` from `lib/cv/upload.ts`, where

```ts
type UploadCvResult = { ok: true; cvId: string } | { ok: false; message: string }
```

- [ ] **Step 1: Write the failing test**

`lib/cv/upload.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeCvExtractor, failingCvExtractor } from '@/lib/ai/fakes'
import { CvExtractionError } from '@/lib/ai/types'

const getUser = vi.fn()
const storageUpload = vi.fn()
const storageRemove = vi.fn()
const insertSingle = vi.fn()
const updateEq = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: vi.fn(async () => ({
    auth: { getUser },
    storage: {
      from: () => ({ upload: storageUpload, remove: storageRemove }),
    },
    from: () => ({
      insert: () => ({ select: () => ({ single: insertSingle }) }),
      update: () => ({ eq: updateEq }),
    }),
  })),
}))

function form(file: File | null) {
  const fd = new FormData()
  if (file) fd.set('file', file)
  return fd
}

function pdf(sizeBytes = 1024, name = 'cv.pdf') {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'application/pdf' })
}

describe('uploadCv (FR-6, FR-7, P1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    storageUpload.mockResolvedValue({ error: null })
    storageRemove.mockResolvedValue({ error: null })
    insertSingle.mockResolvedValue({ data: { id: 'cv-1' }, error: null })
    updateEq.mockResolvedValue({ error: null })
  })

  it('stores the file, extracts text, and returns the new cv id', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(pdf()), { extractor: fakeCvExtractor('CV TEXT') })
    expect(result).toEqual({ ok: true, cvId: 'cv-1' })
    expect(storageUpload).toHaveBeenCalledOnce()
  })

  it('uploads into a folder named after the user id', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    await uploadCv(form(pdf()), { extractor: fakeCvExtractor() })
    const [path] = storageUpload.mock.calls[0]
    expect(path).toMatch(/^user-1\//)
  })

  it('persists the extracted text on the row', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    await uploadCv(form(pdf()), { extractor: fakeCvExtractor('EXTRACTED') })
    expect(updateEq).toHaveBeenCalled()
  })

  it('rejects a file over 10 MB naming the limit', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(pdf(11 * 1024 * 1024)), {
      extractor: fakeCvExtractor(),
    })
    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toMatch(/10 ?MB/i)
    expect(storageUpload).not.toHaveBeenCalled()
  })

  it('rejects a wrong file type naming what is accepted', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    const png = new File([new Uint8Array(10)], 'photo.png', { type: 'image/png' })
    const result = await uploadCv(form(png), { extractor: fakeCvExtractor() })
    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toMatch(/PDF/i)
  })

  it('rejects a missing file', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(null), { extractor: fakeCvExtractor() })
    expect(result.ok).toBe(false)
  })

  it('refuses when there is no signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(pdf()), { extractor: fakeCvExtractor() })
    expect(result.ok).toBe(false)
    expect(storageUpload).not.toHaveBeenCalled()
  })

  it('deletes the stored object when extraction fails, so the gate is not silently satisfied', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(pdf()), {
      extractor: failingCvExtractor(
        new CvExtractionError('no text', 'empty_result'),
      ),
    })
    expect(result.ok).toBe(false)
    expect(storageRemove).toHaveBeenCalledOnce()
  })

  it('reports a specific message for an unreadable file', async () => {
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(pdf()), {
      extractor: failingCvExtractor(
        new CvExtractionError('no text', 'empty_result'),
      ),
    })
    expect((result as { message: string }).message).toMatch(/could not read/i)
  })

  it('reports failure when storage upload fails', async () => {
    storageUpload.mockResolvedValue({ error: { message: 'quota exceeded' } })
    const { uploadCv } = await import('@/lib/cv/upload')
    const result = await uploadCv(form(pdf()), { extractor: fakeCvExtractor() })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- upload`
Expected: FAIL — cannot resolve `@/lib/cv/upload`.

- [ ] **Step 3: Write `lib/cv/upload.ts`**

```ts
'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { extractCvText } from '@/lib/ai/extract-cv'
import { CvExtractionError, type CvExtractor } from '@/lib/ai/types'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export type UploadCvResult = { ok: true; cvId: string } | { ok: false; message: string }

/**
 * Validates, stores, and extracts text from a CV (FR-6, FR-7).
 *
 * The order matters: on extraction failure we delete the stored object, so a
 * CV that cannot be read never satisfies the onboarding gate (FR-5).
 */
export async function uploadCv(
  formData: FormData,
  deps: { extractor?: CvExtractor } = {},
): Promise<UploadCvResult> {
  const extractor = deps.extractor ?? extractCvText

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose a CV file to upload.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'That file is over the 10 MB limit.' }
  }
  const ext = ACCEPTED[file.type]
  if (!ext) {
    return { ok: false, message: 'Upload a PDF or DOCX file.' }
  }

  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return { ok: false, message: 'Your session expired. Sign in again.' }
  }

  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const upload = await supabase.storage
    .from('cvs')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })
  if (upload.error) {
    return { ok: false, message: 'Could not store the file. Try again.' }
  }

  const inserted = await supabase
    .from('cvs')
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: file.name,
      is_primary: true,
    })
    .select('id')
    .single()

  if (inserted.error || !inserted.data) {
    await supabase.storage.from('cvs').remove([storagePath])
    // P3: log the path, never the file contents.
    console.error('cv insert failed', { storagePath })
    return { ok: false, message: 'Could not save the CV. Try again.' }
  }

  const cvId = inserted.data.id

  try {
    const text = await extractor({ bytes, mimeType: file.type })
    await supabase.from('cvs').update({ extracted_text: text }).eq('id', cvId)
  } catch (error) {
    await supabase.storage.from('cvs').remove([storagePath])
    await supabase.from('cvs').delete().eq('id', cvId)

    const reason = error instanceof CvExtractionError ? error.reason : 'api_error'
    const message =
      reason === 'empty_result'
        ? 'We could not read any text from that file. Try a different export.'
        : reason === 'unsupported_type'
          ? 'Upload a PDF or DOCX file.'
          : 'We could not process that file right now. Try again shortly.'
    return { ok: false, message }
  }

  return { ok: true, cvId }
}
```

> The test mock returns `{ error: null }` from `from().delete()` implicitly via `update`. If the delete call causes a mock failure, extend the mock's `from()` to include `delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) })` — do not remove the delete from the implementation.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- upload`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add CV upload server action with rollback on extraction failure"
```

---

## Task 8: Stage seeding on first login

**Files:**
- Create: `lib/stages/seed.ts`
- Test: `lib/stages/seed.test.ts`

**Interfaces:**
- Consumes: `stages` table (Task 2), `createTestUser` (Task 2)
- Produces:
  - `DEFAULT_STAGES: ReadonlyArray<{ name: string; is_terminal: boolean }>` from `lib/stages/seed.ts`
  - `seedDefaultStages(supabase: SupabaseClient<Database>, userId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

This test runs against real Postgres via the authenticated test client, so it also proves the insert policy allows seeding.

`lib/stages/seed.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from '@/test/helpers/users'
import { DEFAULT_STAGES, seedDefaultStages } from '@/lib/stages/seed'

describe('seedDefaultStages (FR-10)', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await createTestUser()
  })

  afterAll(async () => {
    await deleteTestUser(user.id)
  })

  it('defines exactly the six PRD stages in order', () => {
    expect(DEFAULT_STAGES.map((s) => s.name)).toEqual([
      'Saved',
      'Applied',
      'Screening',
      'Interview',
      'Offer',
      'Closed',
    ])
  })

  it('flags Offer and Closed as terminal', () => {
    const terminal = DEFAULT_STAGES.filter((s) => s.is_terminal).map((s) => s.name)
    expect(terminal).toEqual(['Offer', 'Closed'])
  })

  it('inserts the six stages with sequential positions', async () => {
    await seedDefaultStages(user.client, user.id)
    const { data } = await user.client
      .from('stages')
      .select('name, position, is_terminal')
      .order('position')

    expect(data).toHaveLength(6)
    expect(data!.map((s) => s.name)).toEqual([
      'Saved',
      'Applied',
      'Screening',
      'Interview',
      'Offer',
      'Closed',
    ])
    expect(data!.map((s) => s.position)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('is idempotent — calling it again does not duplicate stages', async () => {
    await seedDefaultStages(user.client, user.id)
    const { data } = await user.client.from('stages').select('id')
    expect(data).toHaveLength(6)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- seed`
Expected: FAIL — cannot resolve `@/lib/stages/seed`.

- [ ] **Step 3: Write `lib/stages/seed.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { BRAND } from '@/lib/brand'

/** The six stages every new user starts with (FR-10). Fully editable after (FR-11). */
export const DEFAULT_STAGES = [
  { name: 'Saved', is_terminal: false },
  { name: 'Applied', is_terminal: false },
  { name: 'Screening', is_terminal: false },
  { name: 'Interview', is_terminal: false },
  { name: 'Offer', is_terminal: true },
  { name: 'Closed', is_terminal: true },
] as const

/**
 * Seeds default stages for a user. Idempotent: does nothing if the user
 * already has any stage, so it is safe to call on every login.
 */
export async function seedDefaultStages(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data: existing, error } = await supabase
    .from('stages')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (error) throw error
  if (existing && existing.length > 0) return

  const rows = DEFAULT_STAGES.map((stage, index) => ({
    user_id: userId,
    name: stage.name,
    position: index,
    is_terminal: stage.is_terminal,
    color: BRAND.sage,
  }))

  const { error: insertError } = await supabase.from('stages').insert(rows)
  if (insertError) throw insertError
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- seed`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed six default stages for new users, idempotently"
```

---

## Task 9: The CV gate

FR-5 is the requirement most likely to be implemented as a leaky client-side check. It belongs in the authenticated layout so every route under `(app)` inherits it.

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/onboarding/page.tsx`, `app/(app)/onboarding/upload-form.tsx`
- Test: `app/(app)/gate.test.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 3), `seedDefaultStages` (Task 8), `uploadCv` (Task 7)
- Produces: `resolveGate(supabase): Promise<GateDecision>` exported from `app/(app)/layout.tsx`, where

```ts
type GateDecision =
  | { kind: 'redirect'; to: '/sign-in' | '/onboarding' }
  | { kind: 'allow'; userId: string }
```

Extracting the decision as a pure function is what makes it testable — the layout itself just acts on the result.

- [ ] **Step 1: Write the failing test**

`app/(app)/gate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUser = vi.fn()
const cvSelect = vi.fn()

function supabaseStub() {
  return {
    auth: { getUser },
    from: (table: string) => {
      if (table !== 'cvs') throw new Error(`unexpected table ${table}`)
      return { select: () => ({ eq: () => ({ limit: cvSelect }) }) }
    },
  }
}

describe('resolveGate (FR-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to sign-in when there is no session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const { resolveGate } = await import('@/app/(app)/layout')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decision = await resolveGate(supabaseStub() as any)
    expect(decision).toEqual({ kind: 'redirect', to: '/sign-in' })
  })

  it('redirects to onboarding when the user has no CV', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    cvSelect.mockResolvedValue({ data: [], error: null })
    const { resolveGate } = await import('@/app/(app)/layout')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decision = await resolveGate(supabaseStub() as any)
    expect(decision).toEqual({ kind: 'redirect', to: '/onboarding' })
  })

  it('allows through when the user has a CV', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    cvSelect.mockResolvedValue({ data: [{ id: 'cv1' }], error: null })
    const { resolveGate } = await import('@/app/(app)/layout')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decision = await resolveGate(supabaseStub() as any)
    expect(decision).toEqual({ kind: 'allow', userId: 'u1' })
  })

  it('redirects to onboarding rather than allowing through when the CV query errors', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    cvSelect.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { resolveGate } = await import('@/app/(app)/layout')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decision = await resolveGate(supabaseStub() as any)
    expect(decision).toEqual({ kind: 'redirect', to: '/onboarding' })
  })
})
```

The fourth test is the important one: a database error must fail closed, not open.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- gate`
Expected: FAIL — cannot resolve `@/app/(app)/layout`.

- [ ] **Step 3: Write `app/(app)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { createServerSupabase } from '@/lib/supabase/server'
import { seedDefaultStages } from '@/lib/stages/seed'

export type GateDecision =
  | { kind: 'redirect'; to: '/sign-in' | '/onboarding' }
  | { kind: 'allow'; userId: string }

/**
 * Decides whether a request may reach the dashboard (FR-5).
 * Fails closed: any error routes to onboarding rather than allowing through.
 */
export async function resolveGate(
  supabase: SupabaseClient<Database>,
): Promise<GateDecision> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return { kind: 'redirect', to: '/sign-in' }

  const { data, error } = await supabase
    .from('cvs')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (error || !data || data.length === 0) {
    return { kind: 'redirect', to: '/onboarding' }
  }

  return { kind: 'allow', userId: user.id }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const decision = await resolveGate(supabase)

  if (decision.kind === 'redirect') redirect(decision.to)

  // Safe to call on every request: idempotent (Task 8).
  await seedDefaultStages(supabase, decision.userId)

  return <div className="min-h-screen">{children}</div>
}
```

> `/onboarding` lives inside `(app)` but must not be gated by it, or it redirects to itself. Put `onboarding` **outside** the gated layout: move it to `app/onboarding/page.tsx`. Adjust the paths in Step 5 accordingly and re-run the gate test — the test asserts the decision, not the file location, so it stays green.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- gate`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write `app/onboarding/upload-form.tsx`**

Note the P2 disclosure: it appears above the file input, before the first upload, not in a linked policy.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadCv } from '@/lib/cv/upload'

export function UploadForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await uploadCv(formData)
    setPending(false)
    if (result.ok) router.push('/board')
    else setError(result.message)
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <p className="rounded-[--radius-card] bg-surface p-3 text-sm text-ink/80">
        Your CV is stored privately and is only visible to you. Its text is sent to
        Anthropic&apos;s Claude to read it and to compare it against jobs you save.
      </p>

      <input
        name="file"
        type="file"
        accept="application/pdf,.pdf,.docx"
        required
        className="block w-full rounded-lg border border-sage-light bg-white p-2 text-sm text-ink"
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-ink px-3 py-2 text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Reading your CV…' : 'Upload and continue'}
      </button>

      <p className="text-xs text-ink/50">PDF or DOCX, up to 10 MB.</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 6: Write `app/onboarding/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { UploadForm } from './upload-form'

export default async function OnboardingPage() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) redirect('/sign-in')

  const { data: cvs } = await supabase
    .from('cvs')
    .select('id')
    .eq('user_id', auth.user.id)
    .limit(1)

  if (cvs && cvs.length > 0) redirect('/board')

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Add your CV to get started
      </h1>
      <p className="mt-2 text-sm text-ink/70">
        Job Tracker compares every job you save against your CV, so it needs your CV first.
      </p>
      <div className="mt-6">
        <UploadForm />
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Verify the full suite and build**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: gate the dashboard behind CV upload, failing closed on error"
```

---

## Task 10: The board

**Files:**
- Create: `app/(app)/board/page.tsx`, `app/(app)/board/stage-column.tsx`, `lib/stages/queries.ts`
- Test: `lib/stages/queries.test.ts`, `app/(app)/board/stage-column.test.tsx`

**Interfaces:**
- Consumes: `stages` table (Task 2), `createServerSupabase` (Task 3)
- Produces:
  - `listStages(supabase, userId): Promise<Stage[]>` from `lib/stages/queries.ts`, where `Stage = Database['public']['Tables']['stages']['Row']`
  - `<StageColumn stage={stage} jobCount={n} />` from `app/(app)/board/stage-column.tsx`

- [ ] **Step 1: Write the failing query test**

`lib/stages/queries.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUser, type TestUser } from '@/test/helpers/users'
import { seedDefaultStages } from '@/lib/stages/seed'
import { listStages } from '@/lib/stages/queries'

describe('listStages', () => {
  let user: TestUser

  beforeAll(async () => {
    user = await createTestUser()
    await seedDefaultStages(user.client, user.id)
  })

  afterAll(async () => {
    await deleteTestUser(user.id)
  })

  it('returns the stages ordered by position', async () => {
    const stages = await listStages(user.client, user.id)
    expect(stages.map((s) => s.name)).toEqual([
      'Saved',
      'Applied',
      'Screening',
      'Interview',
      'Offer',
      'Closed',
    ])
  })

  it('returns an empty array for a user with no stages', async () => {
    const other = await createTestUser()
    const stages = await listStages(other.client, other.id)
    expect(stages).toEqual([])
    await deleteTestUser(other.id)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- queries`
Expected: FAIL — cannot resolve `@/lib/stages/queries`.

- [ ] **Step 3: Write `lib/stages/queries.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type Stage = Database['public']['Tables']['stages']['Row']

export async function listStages(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- queries`
Expected: PASS — 2 tests.

- [ ] **Step 5: Write the failing component test**

`app/(app)/board/stage-column.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageColumn } from '@/app/(app)/board/stage-column'
import type { Stage } from '@/lib/stages/queries'

function stage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 's1',
    user_id: 'u1',
    name: 'Applied',
    position: 1,
    color: '#8FAE8B',
    is_terminal: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('StageColumn', () => {
  it('renders the stage name', () => {
    render(<StageColumn stage={stage()} jobCount={0} />)
    expect(screen.getByText('Applied')).toBeInTheDocument()
  })

  it('shows the job count', () => {
    render(<StageColumn stage={stage()} jobCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows an empty hint when the column has no jobs', () => {
    render(<StageColumn stage={stage()} jobCount={0} />)
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument()
  })

  it('does not show the empty hint when the column has jobs', () => {
    render(<StageColumn stage={stage()} jobCount={2} />)
    expect(screen.queryByText(/nothing here yet/i)).not.toBeInTheDocument()
  })

  it('exposes the column as a labelled region for keyboard users (NFR-8)', () => {
    render(<StageColumn stage={stage()} jobCount={0} />)
    expect(screen.getByRole('region', { name: 'Applied' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- stage-column`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 7: Write `app/(app)/board/stage-column.tsx`**

```tsx
import type { Stage } from '@/lib/stages/queries'

export function StageColumn({
  stage,
  jobCount,
}: {
  stage: Stage
  jobCount: number
}) {
  return (
    <section
      aria-label={stage.name}
      className="flex w-72 shrink-0 flex-col rounded-[--radius-card] bg-surface/60 p-3"
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <h2 className="text-sm font-medium text-ink">{stage.name}</h2>
        <span className="ml-auto text-xs text-ink/50">{jobCount}</span>
      </header>

      <div className="mt-3 min-h-24">
        {jobCount === 0 && (
          <p className="text-xs text-ink/40">Nothing here yet.</p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- stage-column`
Expected: PASS — 5 tests.

- [ ] **Step 9: Write `app/(app)/board/page.tsx`**

```tsx
import { createServerSupabase } from '@/lib/supabase/server'
import { listStages } from '@/lib/stages/queries'
import { StageColumn } from './stage-column'

export default async function BoardPage() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  const stages = await listStages(supabase, auth!.user!.id)

  return (
    <main className="px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Board</h1>
        <button
          type="button"
          className="rounded-lg bg-ink px-3 py-1.5 text-sm text-canvas transition-opacity hover:opacity-90"
        >
          + Add job
        </button>
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn key={stage.id} stage={stage} jobCount={0} />
        ))}
      </div>
    </main>
  )
}
```

> **+ Add job** is inert in this plan — it becomes functional in Plan 3. It is present now because FR-36 requires the default surface to show exactly one primary action, and the board's empty state is meaningless without it.

- [ ] **Step 10: Verify the whole path by hand**

```bash
npm run dev
```

1. Sign out (clear cookies) and visit `/board` → redirected to `/sign-in`.
2. Sign in with the invited address via the mail catcher at `http://127.0.0.1:54324`.
3. Expected: redirected to `/onboarding`, not `/board` — the gate is working.
4. Upload a real PDF CV. Expected: "Reading your CV…" then the board with six sage-headed columns on a cream background.
5. Visit `/onboarding` again → redirected to `/board`.
6. Tab through the page. Every interactive element must show a visible focus ring (NFR-8).
7. Narrow the window to 375px. The board must scroll horizontally without the page scrolling horizontally (NFR-9).

- [ ] **Step 11: Confirm the CV row is populated**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "select id, file_name, is_primary, length(extracted_text) as text_len from public.cvs;"
```

Expected: one row, `is_primary = t`, `text_len` in the low thousands. A null `text_len` means extraction silently failed — investigate before continuing.

- [ ] **Step 12: Run the full suite**

Run: `npm test && npm run build`
Expected: 45 tests pass across 9 files; build succeeds.

- [ ] **Step 13: Commit and open a PR**

```bash
git add -A
git commit -m "feat: render the board with seeded stage columns"
git push -u origin feat/foundation
gh pr create --title "Foundation: auth, CV gate, and board" --body "$(cat <<'EOF'
Implements Plan 1 of Phase 1 (docs/superpowers/plans/2026-07-28-job-tracker-foundation.md).

Covers FR-1 – FR-10, FR-36 (partial), NFR-3/4/5/8/9, P1 – P4.

- Magic-link auth with public signup disabled as the allowlist mechanism (FR-1, FR-2)
- Verified cross-user RLS isolation on every table, plus storage-object isolation (NFR-3, NFR-5)
- CV upload with one-shot text extraction via claude-opus-5, rolled back if extraction fails
- Dashboard gated behind CV upload, failing closed on database error (FR-5)
- Six default stages seeded idempotently on first login (FR-10)
- Board rendering stage columns in brand colours

Not in this PR: stage editing, drag-and-drop, jobs, activities, gap analysis.
Those are Plans 2 and 3.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage for this plan's scope:**

| Requirement | Task |
|---|---|
| FR-1 magic link | 4 |
| FR-2 allowlist | 4 (signup disabled + invite script) |
| FR-3 RLS isolation | 2 (proven), 5 (storage) |
| FR-4 sign out | **Gap — deferred to Plan 2** (no nav shell exists yet to hold the button) |
| FR-5 CV gate | 9 |
| FR-6 file validation | 7 |
| FR-7 text extraction and caching | 6, 7 |
| FR-8 multiple CVs, one primary | 5 (unique index) — UI in Plan 2 |
| FR-9 download via signed URL | 5 (policy + test) — UI in Plan 2 |
| FR-10 default stages | 8 |
| FR-36 one primary action | 10 |
| NFR-3, NFR-4, NFR-5 | 2, 5, 6 |
| NFR-8, NFR-9 | 10 (manual check) |
| P1, P3, P4 | 5, 7 |
| P2 disclosure before upload | 9 |

**Known gaps, carried forward explicitly:** FR-4 (sign out) and the UI halves of FR-8 and FR-9 need a navigation shell and a settings screen, neither of which exists yet. They are Plan 2 Task 1. Flagging rather than pretending this plan covers them.

**Type consistency:** `CvExtractor` (Task 6) is the parameter type in Task 7. `Stage` (Task 10) is derived from generated types, not hand-written. `GateDecision` is exported from the layout so the test imports the same type the implementation uses. `seedDefaultStages(supabase, userId)` has the same signature in Tasks 8, 9, and 10.

---

## Plans 2 and 3 — task lists

Written when their predecessor merges, so their code reflects what actually exists.

**Plan 2 — Manual tracker (FR-4, FR-8, FR-9, FR-11 – FR-15, FR-20, FR-22 – FR-26).** A tracker you can run entirely by hand, no AI.
1. App shell: header, nav, sign out (FR-4)
2. Settings: CV list, switch primary, delete, download via signed URL (FR-8, FR-9)
3. Stage editing: rename, recolor, add, reorder (FR-11)
4. Stage deletion with mandatory job reassignment (FR-12)
5. `jobs` migration + RLS + cross-user test
6. Manual job creation and editing (FR-20)
7. Job card and detail sheet
8. Drag-and-drop with optimistic reordering (FR-13, NFR-1)
9. Stage age on cards (FR-14)
10. `activities` migration + timeline UI (FR-23 – FR-26)
11. Job deletion with cascade (FR-22)
12. Table view (FR-15)

**Plan 3 — AI ingestion and analysis (FR-16 – FR-19, FR-21, FR-27 – FR-35).**
1. `lib/scrape`: fetch + readability, `ScrapeOutcome` union, fixtures per source family
2. Job extraction with schema-constrained output (FR-18)
3. Add-job-by-URL flow (FR-16, FR-21)
4. Paste fallback as a first-class path (FR-17)
5. Needs-review editing (FR-19)
6. `analyses` migration + RLS
7. Gap analysis with the CV cached in the prompt prefix (FR-28) — includes the prefix-stability regression test
8. Streaming route handler and persistence (FR-29, FR-30)
9. Analysis panel, failure state, retry (NFR-6)
10. Re-run against a different CV (FR-31)
11. Cost and token display (FR-32, NFR-10)
12. Command palette and keyboard navigation (FR-34, FR-35)
13. Playwright end-to-end: the critical path plus the paste-fallback branch
