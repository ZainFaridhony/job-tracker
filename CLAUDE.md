# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The monorepo root is nested

The git repo root is `job-tracker/`. **The pnpm/Turborepo root is one level deeper, at `job-tracker/job-tracker/`.** Run every `pnpm` command from the inner directory.

The outer directory holds inputs and history, not code: `docs/` (PRD, specs, plans), `references/` (the design source of truth — finished auth screens and the logo raster), `brand/` (generated SVGs), `.superpowers/` (scratch).

## Commands

All from `job-tracker/job-tracker/`:

```bash
pnpm turbo lint typecheck test build   # the full gate — 17 tasks, run this before committing
pnpm turbo dev                         # web :3000, dashboard :3001, admin :3002

pnpm --filter dashboard test           # one workspace
pnpm --filter @job-tracker/ui test
pnpm --filter @job-tracker/config test

# a single test file / single case
pnpm --filter dashboard exec vitest run lib/validation.test.ts
pnpm --filter dashboard exec vitest run -t 'rejects backslash'
```

**Turbo masks which task actually failed.** When one task fails it SIGINTs its siblings, which then report as failures too (exit 130/144). Always re-run the suspect workspace alone before believing the summary.

## Architecture

Three separately deployable Next.js 16 apps over four workspace packages:

- `apps/web` (:3000) — landing. **Ships no Supabase client at all**, deliberately.
- `apps/dashboard` (:3001) — owns every auth screen and the protected shell.
- `apps/admin` (:3002) — its own sign-in, role-gated.
- `packages/config` — design tokens + WCAG contrast functions + the colour ESLint rule. No React, no Supabase.
- `packages/ui` — presentational only. No data access.
- `packages/db` — Supabase clients only. No UI.

**Sessions are deliberately not shared between apps.** Each owns a cookie scoped to its own host; the landing page links to the dashboard rather than passing a session. Cross-subdomain cookies cannot work on Vercel previews (`*.vercel.app` is on the Public Suffix List), so this is what makes previews behave like production.

Database is the **cloud** Supabase project `rruexatjgmmazyldqirp` (ap-southeast-1), not a local stack. Migrations live in `supabase/migrations/` and are applied through the Supabase MCP tools. Docker/local Supabase is not part of the workflow.

## Traps that cost real debugging time

**Next 16 renamed middleware.** The file is `proxy.ts` and the export is `proxy`, not `middleware`. A file named `middleware.ts` is ignored silently — no warning, build passes, and every protected route is open. See `apps/dashboard/proxy.ts`.

**TypeScript 6.0.3, not 7.** Next 16 rejects TS 7 outright ("does not provide the compiler API required by Next.js"). All workspaces must stay on one major — never mix.

**Turbopack will not resolve `.js` specifiers pointing at TypeScript sources.** Vitest and `tsc` both do, so this only surfaces at build. Keep relative imports extensionless.

**Tailwind 4 has no JS config.** Theming is `@theme` in `packages/config/theme.css`. Two rules there:
- Keep `@theme` to plain declarations. A multi-line prose comment inside it breaks the dev PostCSS parser while the production build tolerates it — so `turbo build` passes and `next dev` fails.
- Workspace packages need an explicit `@source` in each app's `globals.css`, or every `packages/ui` component renders unstyled with no error.

**`getClaims()` resolves to `{ claims, header, signature }`.** The payload is `data.claims`, not `data`. Docs snippets showing `const { data: claims }` are misleading.

**Never hardcode the host in a redirect.** `127.0.0.1` and `localhost` are different hosts to a browser, so cookies do not cross between them — a PKCE verifier set on one is absent on the other and the exchange fails silently. Use `requestOrigin()` (`apps/dashboard/lib/origin.ts`), which reads `x-forwarded-host`/`host`. `new URL(request.url).origin` is not safe here: Next normalises `127.0.0.1` to `localhost` in dev.

**Testing Library needs explicit cleanup.** Auto-cleanup only registers under `globals: true`, which this project does not use. `packages/ui/test/setup.ts` calls `afterEach(cleanup)` — without it renders accumulate and every `getBy*` finds duplicates.

## Invariants the build enforces

**No raw colour.** A custom ESLint rule (`packages/config/eslint-rules/no-raw-color.js`) fails the build on any hex literal in `apps/**` or `packages/ui/**`, and rejects the five superseded reference-palette values (`#000000`, `#1a1c1c`, `#444748`, `#c4c7c7`, `#747878`) by name. The sole exemption is `apps/dashboard/app/(auth)/google-button.tsx` — Google forbids recolouring their mark. Keep that exemption per-file.

**Contrast floors are asserted, not documented.** `packages/config/src/tokens.test.ts` computes WCAG ratios and requires ≥4.5:1 for text on every background and ≥3:1 for control outlines. If a floor fails, **change the token, not the floor** — this test already caught `#757575` failing on canvas.

Tokens are defined twice on purpose: `theme.css` for Tailwind, `src/tokens.ts` as data for the tests. Change both together.

`outline` vs `outline-subtle` is a functional distinction, not stylistic: `outline` clears WCAG 1.4.11 and belongs on anything focusable; `outline-subtle` is decorative dividers only. Using `outline-subtle` on a control is a defect.

## Auth model

Email+password and Google OAuth, public signup. See `docs/PRD.md` for requirement IDs (FR-n) and `docs/superpowers/specs/2026-08-01-login-system-design.md` for the design.

**Two callback handlers, and they are not interchangeable.** OAuth arrives as `?code=` → `/auth/callback` → `exchangeCodeForSession`. Email verification and password recovery arrive as `?token_hash=&type=` → `/auth/confirm` → `verifyOtp`. Calling the wrong one fails in a way that looks like a broken email rather than a bug.

**Authorization lives in Postgres, not application code.** `private.is_admin()` is `SECURITY DEFINER` with a pinned `search_path` — it is in `private` rather than `public` because Postgres grants EXECUTE to PUBLIC on every new function, which would make it a callable endpoint for `anon`. A policy on `profiles` that queries `profiles` raises 42P17 recursion, which is why the helper exists at all.

`profiles.role` is protected by a **column grant**, not a policy — RLS cannot express a per-column restriction when the row legitimately belongs to the user. Adding a writable column means updating that grant.

**`/reset-password` requires a recovery marker, not just a session.** `verifyOtp` mints an ordinary session, indistinguishable from a password sign-in, so a session alone would let anyone with a stolen cookie change the password. `/auth/confirm` sets an httpOnly `jt-recovery` cookie; the page *and* the action both check it (a Server Action is reachable without rendering its page).

**NFR-12: responses that set auth cookies must not be shared-cacheable.** `refreshSession` propagates the headers `@supabase/ssr` supplies; GET route handlers that mint a session build their own response and must wrap it in `noStore()` from `@job-tracker/db/proxy`. Server Actions are POSTs and are not shared-cached.

Redirect targets always go through `safeNext()` (`apps/dashboard/lib/validation.ts`). It normalises before checking, because the URL parser strips tab/LF/CR and treats `\` as `/` — so a naive `startsWith('//')` check let `/\evil.com` through as a working open redirect.

## Known outstanding

- **Email confirmation and password recovery do not work.** Supabase's default templates point at `/auth/v1/verify`, which never establishes a server-side session. They must be changed in the dashboard to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email|recovery&next=...`. No custom SMTP either — the built-in sender caps at a few messages/hour.
- **The RLS suite does not run.** `test/` is not a member in `pnpm-workspace.yaml`, so its 12 tenant-isolation and privilege-escalation assertions are excluded from `turbo test`. The guarantees were verified by impersonating roles in Postgres instead, but nothing re-checks them.
- **No Playwright e2e**, despite the plan budgeting for it. `.gitignore` already reserves the output directories.
- `supabase/config.toml` is stale local-stack config (wrong port, `enable_confirmations = false`) and contradicts the deployed setup.
