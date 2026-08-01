# Product Requirements Document — Job Tracker AI

| Field | Value |
|---|---|
| **Product** | Job Tracker AI |
| **Author** | Zain |
| **Date** | 2026-07-28 · amended 2026-08-01 |
| **Status** | v1 approved; amendment pending approval |
| **Phase covered** | Phase 1 (v1.0). Phases 2–3 specified at summary level only. |

> **Amendment — 2026-08-01.** Finished designs in `references/login_system/` specify email + password authentication, Google OAuth, and a public Create Account form with a terms checkbox. Those designs supersede the magic-link, invite-only model in the original draft.
>
> Changed here: **FR-1** rewritten · **FR-2** and **NG5** withdrawn · **FR-42–FR-46** and **NFR-11–NFR-13** added · **§4**, **§5 J1**, **§8 cost budget**, **§9**, **§13**, **§14**, **§15** revised · **Appendix A** replaced by the design system in `references/login_system/job_tracker_ai_design_system/DESIGN.md` · **Q1** resolved.
>
> Withdrawn IDs are retained rather than renumbered, so references from the implementation plans stay resolvable. Privacy rule **P6** and non-goals **NG1–NG4, NG6** are unchanged. The problem statement (§1) and success metrics (§2) are unchanged — M1 still wins any tradeoff.

---

## 1. Problem

Job searching breaks in four places at once:

1. **You lose the thread.** Forty applications in, you can't recall which companies you applied to, who replied, what stage each is at, or which need a follow-up today.
2. **Your CV doesn't match the posting.** A generic CV against a specific job produces silence, and you can't see the mismatch yourself.
3. **Each application costs ~40 minutes.** Rewriting the CV, writing the cover letter, logging it somewhere.
4. **Rejections explain nothing.** No signal on what's actually missing — a skill, a portfolio piece, how experience is framed.

These are not four problems. They are one loop with no tool: *find a job → understand what it wants → adapt your materials → apply → track → learn.* Spreadsheets cover step 5 badly and nothing else. Existing trackers are CRMs with no opinion about your CV; existing CV tools are one-shot generators with no memory of your search.

## 2. Goals and success metrics

**Primary goal:** replace the spreadsheet. Not augment it — replace it.

| # | Metric | Target | How measured |
|---|---|---|---|
| M1 | Spreadsheet abandonment | Zain logs 100% of applications here, 0 in a spreadsheet, for 4 consecutive weeks | Self-reported; corroborated by job creation rate |
| M2 | Daily active use | Opened ≥5 days/week during an active search | Session timestamps |
| M3 | Nothing falls through | 0 applications with no activity logged for >14 days while in a non-terminal stage | Query on `activities` |
| M4 | Time to log a job | <60 seconds from URL paste to card on board | Instrumented on the add-job flow |
| M5 | Analysis is actually read | ≥70% of created jobs have a gap analysis run | `analyses` count / `jobs` count |

**Anti-metric:** if M5 is high but M1/M2 are low, the product is a novelty CV toy, not a tracker. M1 wins any tradeoff.

## 3. Non-goals

Stated as hard product boundaries, not "later maybe":

| # | The product will not | Rationale |
|---|---|---|
| NG1 | Submit applications on the user's behalf | Keeps the user honest and accountable; avoids account bans on job platforms |
| NG2 | Search for, recommend, or feed jobs | The user always brings the URL. No job board, no daily digest, no scraping of listings at scale. |
| NG3 | Read the user's email to auto-advance stages | Stage changes are manual. Avoids an OAuth mail scope over a mailbox full of unrelated PII. |
| NG4 | Provide a resume design editor | No template gallery, no font pickers. Generated documents use one opinionated layout. |
| ~~NG5~~ | ~~Support public self-serve signup~~ | **Withdrawn 2026-08-01.** Signup is now public (FR-1). This deliberately takes on the ToS and abuse-handling surface the original boundary existed to avoid — see FR-44 and NFR-11. |
| NG6 | Produce rejection post-mortems | Explicitly declined during scoping — speculative and demoralizing without real signal. |

## 4. Users

**Primary — Zain.** Actively job searching, technically fluent, will tolerate rough edges but not slowness. Applies to a mix of LinkedIn, company career pages, Indonesian boards (Jobstreet, Glints, Kalibrr), and remote boards.

**Secondary — anyone who signs up.** Varying technical fluency. Will not read documentation. Will abandon the product on a confusing first screen. Zain absorbs all AI cost, so per-user consumption must stay bounded **by enforced quota, not by trust** (NFR-11). The original draft could assume every user was personally known; it no longer can.

**Access model:** public self-serve signup — email + password, or Google. Email verification is required before the dashboard is reachable (FR-43).

**Operator — Zain.** Holds `profiles.role = 'admin'`, which grants the admin app: user list, signup volume, and aggregate AI token spend. Explicitly *not* granted: any user's CV content, job postings, or analyses (P6, FR-45).

## 5. Core user journeys

**J1 — First run (must complete in under 3 minutes).**
Land on the marketing site → *Create Account* → name, email, password, accept terms → verification email arrives → click through → prompted to upload CV (dashboard is inaccessible until this completes) → CV uploads, text extracted → board appears with six default stages and an empty state pointing at one button: *+ Add job*.
*Alternate entry:* *Continue with Google* skips password creation and email verification, landing directly on the CV gate.
*Returning user who forgot their password:* sign in → *Forgot password?* → recovery email → set a new password → dashboard (FR-42).

**J2 — Log a job (the highest-frequency action; target <60s).**
Click *+ Add job* → paste URL → system fetches and extracts company, title, location, work mode, salary, description, requirements → card appears in *Saved* → optionally run gap analysis.
*Failure branch:* the page can't be read (LinkedIn, login wall, JS-only) → a textarea appears, pre-focused, asking for a paste of the description → same pipeline continues from pasted text.

**J3 — Understand fit before applying.**
Open card → Analysis tab → *Analyze against my CV* → within ~30s: match score, strengths, ranked gaps with evidence, and concrete suggested CV edits. Result is persisted; reopening the card is instant and costs nothing.

**J4 — Track progress.**
Drag card between stages, or `1`–`9` from the keyboard. Add an activity (called, emailed, interviewed, note) with a date. Timeline shows the job's full history.

**J5 — Weekly review.**
Switch board → table view. Scan 50 applications sorted by last activity. Spot what's gone quiet.

## 6. Functional requirements

Each requirement has acceptance criteria. `MUST` = Phase 1 blocking.

### 6.1 Authentication and access

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-1 | MUST authenticate via Supabase Auth with email + password, and with Google OAuth | Valid credentials create a session. Google completes through a PKCE code exchange at `/auth/callback`. The Google button is hidden — not disabled — when the provider is unconfigured, leaving the layout intact. |
| ~~FR-2~~ | ~~MUST restrict access to an invite allowlist~~ | **Withdrawn 2026-08-01** — signup is public. |
| FR-3 | MUST isolate all user data at the database level | Row-level security on every table. An authenticated user issuing a direct query for another user's row receives zero rows. Covered by an automated test. |
| FR-4 | MUST sign out and invalidate the session | Post-sign-out, protected routes redirect to sign-in. |
| FR-42 | MUST support password reset by email | Request → recovery email → set new password → sign in with it. The recovery link is single-use and expires. The previous password stops working, verified by test. |
| FR-43 | MUST require email verification before dashboard access | An unverified account cannot reach any dashboard route. Google accounts arrive already verified and skip this. |
| FR-44 | MUST record terms acceptance at signup | Signup cannot complete without an explicit terms checkbox; `profiles.accepted_terms_at` is set. Terms of Service and Privacy Policy pages exist and are linked from every auth screen. |
| FR-45 | MUST enforce the admin role in Postgres, not in application code | `profiles.role` gates admin access. A user attempting to change their own role is rejected by the database. The admin app holds no service-role key and cannot read CV, job, or analysis content (P6). |
| FR-46 | MUST NOT reveal whether an email is registered | Signing up with an existing address, and requesting reset for an unknown address, both return the same neutral "check your email" response as the success case. |

### 6.2 CV gate

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-5 | MUST block all dashboard routes until a CV is uploaded | A user with no CV visiting any app route is redirected to upload. |
| FR-6 | MUST accept PDF and DOCX up to 10 MB | Valid file uploads to private storage. Oversized or wrong-type files are rejected with a specific message naming the limit and accepted types. |
| FR-7 | MUST extract and cache CV text on upload | `cvs.extracted_text` is populated. A scanned/image-only PDF still yields text (handled by model vision, not OCR tooling). |
| FR-8 | MUST support multiple CVs with one marked primary | User can upload additional CVs, switch which is primary, and delete a non-primary CV. Deleting the only CV re-triggers the gate. |
| FR-9 | MUST let the user view and download their own CV | Download served via a short-lived signed URL, never a public object URL. |

### 6.3 Board and stages

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-10 | MUST seed default stages on first login | Saved, Applied, Screening, Interview, Offer, Closed. Offer and Closed flagged terminal. |
| FR-11 | MUST allow full stage customization | Create, rename, reorder, recolor, delete. Changes persist and reflect immediately. |
| FR-12 | MUST prevent orphaning jobs on stage deletion | Deleting a stage containing jobs is blocked until the user selects a destination stage. |
| FR-13 | MUST support drag-and-drop between stages | Card position persists across reload. Order within a column is user-controlled. |
| FR-14 | MUST show stage age on each card | Card displays days since entering its current stage. |
| FR-15 | MUST provide a table view of the same data | Toggle to a sortable table: company, title, stage, last activity, created. Sorting persists per session. |

### 6.4 Jobs

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-16 | MUST create a job from a URL | Given a fetchable posting URL, the system produces a job with company, title, and description populated, in <60s. |
| FR-17 | MUST fall back to pasted text when fetching fails | On block/thin content, the UI presents a pre-focused textarea. Submitting text produces an equivalent job. Fallback is presented as a normal path, not an error. |
| FR-18 | MUST extract structured fields from the posting | Company, title, location, work mode, salary text, description, and a requirements list. Fields the posting doesn't state are left empty, never invented. |
| FR-19 | MUST flag low-confidence extractions for review | When extraction fails validation, the job is saved with status `needs_review` and all fields are hand-editable. |
| FR-20 | MUST allow manual creation and editing of any job | A job can be created entirely by hand with no URL. Every field is editable afterwards. |
| FR-21 | MUST preserve the source URL and raw text | Both retained on the job for later re-analysis and user verification. |
| FR-22 | MUST support deleting a job | Deletion cascades to its activities and analyses, with a confirm step. |

### 6.5 Activities

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-23 | MUST support a typed activity timeline per job | Kinds: note, applied, email, call, interview, assessment, offer, rejection, follow-up. Each has a date and optional note. |
| FR-24 | MUST allow backdating | Activity date is user-settable, defaulting to today. |
| FR-25 | MUST display the timeline newest-first with last-activity surfaced on the card | Card shows days since last activity. |
| FR-26 | MUST allow editing and deleting activities | Both available from the timeline. |

### 6.6 Gap analysis

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-27 | MUST run gap analysis on explicit user action only | No analysis is triggered by page load or navigation. |
| FR-28 | MUST return a structured, actionable result | Match score (0–100), strengths, ranked gaps each with severity + evidence quoted from the posting + a suggestion, concrete CV edit suggestions naming the section, and a summary. |
| FR-29 | MUST persist results | Reopening a job displays the stored analysis with no new model call. |
| FR-30 | MUST stream progress | The user sees output appearing during the run, not a spinner for 30 seconds. |
| FR-31 | MUST support re-running against a different CV | Re-run stores a new analysis row; prior analyses remain viewable. |
| FR-32 | MUST show cost and token usage in the advanced panel | Per-analysis input/output tokens are visible to the user. |
| FR-33 | MUST never fabricate evidence | Every gap must cite text from the posting. A gap with no citation is a defect. |

### 6.7 Advanced layer (progressive disclosure)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-34 | MUST provide a command palette on `⌘K` | Jump to job, change stage, add activity, run analysis, switch view. |
| FR-35 | MUST support keyboard navigation of the board | `j`/`k` move focus, `1`–`9` move stage, `n` add note, `/` search, `?` shows shortcuts. |
| FR-36 | MUST keep advanced surfaces out of the default view | Raw scraped text, token cost, and re-run controls live in a collapsed section. The default board shows one primary action. |

### 6.8 Deferred (specified, not built in Phase 1)

| ID | Phase | Requirement |
|---|---|---|
| FR-37 | 2 | Generate a tailored CV for a specific job, as a downloadable document |
| FR-38 | 2 | Generate a cover letter for a specific job, editable before download |
| FR-39 | 2 | Store generated documents per job with version history |
| FR-40 | 3 | Cross-job pattern report — skills recurring across saved jobs and absent from the CV |
| FR-41 | 3 | Portfolio project briefs targeting the largest recurring gaps |

Phase 3 is deferred for a substantive reason, not convenience: pattern analysis over fewer than ~20 saved jobs produces noise indistinguishable from signal. Phase 1 must run long enough to generate its input.

## 7. Data model

Every table except `profiles` carries `user_id uuid references auth.users`, with row-level security `using (auth.uid() = user_id)`. `profiles` keys on `id` directly.

```
profiles    id → auth.users, full_name, role, accepted_terms_at,
            onboarding_complete, created_at
cvs         id, user_id, storage_path, file_name, extracted_text,
            is_primary, created_at
stages      id, user_id, name, position, color, is_terminal
jobs        id, user_id, stage_id, position, source_url, company, title,
            location, work_mode, salary_text, description_md,
            requirements jsonb, raw_text, scrape_status, applied_at,
            created_at, updated_at
activities  id, user_id, job_id, kind, note, occurred_at, created_at
analyses    id, user_id, job_id, cv_id, kind, status, result jsonb, error,
            model, input_tokens, output_tokens, created_at
```

- `scrape_status`: `ok | needs_review | manual`
- `analyses.kind`: `gap_analysis` (Phase 1); `tailored_cv`, `cover_letter` (Phase 2)
- `analyses.status`: `pending | complete | failed`
- CV files in a private Supabase Storage bucket; access exclusively via signed URLs
- `position` is a gap-spaced integer; fractional ordering is unnecessary at this scale
- `profiles.role`: `user | admin`, defaulting to `user`. Not user-updatable — the column is withheld from the user's own update policy, so self-promotion fails at the database (FR-45)
- `profiles` rows are created by a trigger on `auth.users` insert, taking `full_name` from signup metadata. No application code path can leave a user without a profile
- Passwords are held solely by Supabase Auth in `auth.users`. No application table stores a password, hash, or reset token (P8)

## 8. AI requirements

**Model:** `claude-opus-5` for all calls. Adaptive thinking (on by default). Sampling parameters and thinking budgets are not used — both are rejected by this model.

**Three distinct calls:**

| Call | Frequency | Notes |
|---|---|---|
| CV text extraction | Once per CV upload | PDF sent as a native document block; no parsing library, and scanned PDFs work via vision. Result cached so no later call re-reads the file. |
| Job extraction | Once per job | Schema-constrained structured output, so the result is guaranteed-shaped rather than parsed-and-hoped. Low effort — this is mechanical. |
| Gap analysis | On user action | The quality-sensitive call. Default effort. Streamed. |

**Cost control is architectural, not advisory:**

1. **Prompt caching.** The CV is identical across every job the user analyses. Request structure is: system prompt + CV text (cache breakpoint) → job posting. The CV is written to cache once and read at ~10% cost thereafter. Requirement: cache reads must be verified non-zero on a second analysis; a volatile element leaking into the prefix silently multiplies cost with no error.
2. **Persisted results.** AI never runs on render — only on explicit action.
3. **Per-analysis token accounting** stored on the row and surfaced to the user.

**Cost budget — the denominator was invalidated on 2026-08-01.** The per-user figures still hold: ~$0.05–0.10 per gap analysis, ~$3 for a user running 30 applications. What no longer holds is "fifty users is ~$150 total" — that assumed a known, invited population. Public signup makes the total unbounded, and Zain still absorbs every dollar with no billing in place.

**NFR-11 (per-user quota) is therefore blocking before any AI feature ships.** Phase 1 contains no AI calls, so nothing is at risk today; the exposure begins the moment gap analysis lands.

**Behavioral requirement:** the model must not invent qualifications, employers, dates, or achievements not present in the CV, and must not assert requirements not present in the posting. Every gap cites source text (FR-33).

## 9. UX principles

The brief was "simple and minimalist to operate but with hidden advanced features." That resolves to strict progressive disclosure:

- **Default surface: one obvious action.** The board, with a single primary button. Nothing else competes.
- **First layer, on click.** Card opens a side sheet: Overview / Activity / Analysis.
- **Hidden layer, on deliberate gesture.** `⌘K` palette, keyboard navigation, table view, collapsed advanced panel.
- **The rule:** a new user must never encounter a control they don't need. A returning power user must never need the mouse.

**Visual identity** (revised 2026-08-01) is derived from the logo mark at `references/brand/logo.png`, in the "premium minimalist" register of `DESIGN.md` — Linear, Raycast. The full token set is Appendix A.

**The mark is the source, not a decoration applied afterwards.** It is a folded ribbon reading as an implied *R*, and the fold gives the mark three tonal facets — `#181818`, `#1E1E1E`, `#2A2A2A`. Those become the ink scale: the dominant `#1E1E1E` is primary, the deepest facet is the pressed state, the fold highlight is hover. Interaction states are the logo's own geometry rather than arbitrary tints of it.

Two consequences follow, and both correct `DESIGN.md`:

1. **Nothing in the interface is pure black.** `DESIGN.md` frontmatter names `primary: #000000`, but the mark's ink is `#1E1E1E`. A true-black button beside the real logo makes the logo look faded. Primary is `#1E1E1E`.
2. **The neutral ramp is neutral.** Every grey in `DESIGN.md` carries a faint cool cast — `#1a1c1c`, `#444748`, `#c4c7c7`, `#747878` all have green and blue channels above red. The mark is pure neutral. Anchoring on the mark means the greys lose that cast, which removes a temperature clash nobody would name but everybody would feel.

**The mark licenses no colour at all.** It is one ink on one ground. `DESIGN.md`'s `secondary-container: #dce2f3` — a pale blue, its single non-monochrome token — is therefore dropped. Colour appears only where meaning demands it: error states. Status is otherwise carried by weight, position, and space.

**Shape language** comes from the mark's one structural idea: generously rounded outer corners against a hard internal diagonal. Containers take a wide radius, interactive elements a tighter one, and the diagonal is available as a progress motif — but only where it means something, never as ornament.

Type is **Geist** throughout, retained from `DESIGN.md`; its geometric construction suits the mark.

This replaces the sage/canvas/ink palette of the original draft. The four SVGs in `brand/` belong to that superseded identity and remain only as history.

**Assets.** The mark has been traced to SVG from the raster and verified at **IoU 0.9932** against an independent WebKit render; geometry and provenance are in `brand/README.md`. `brand/` now holds the flat mark in three forms (`currentColor`, ink, reversed), an SVG favicon, and the raster master. The superseded sage assets moved to `brand/archive/`.

Two gaps remain, neither blocking Phase 0.9: a **wordmark lockup**, which needs "Job Tracker AI" set in Geist and converted to outlines — fabricating those glyphs would produce something that is not Geist; and **raster favicon fallbacks** for older browsers. A two-tone vector carrying the fold should come from the original design source rather than from tracing a lossy raster: `logo.png` holds 2,761 distinct colours for what is a two-colour mark.

**Accessibility note (NFR-8).** `DESIGN.md`'s hairline borders (`#c4c7c7` on white, ~1.9:1) fail WCAG 1.4.11, which requires 3:1 for the boundary of a user-interface component. Appendix A therefore separates two tokens: `outline` `#8A8A8A` (3.1:1) for input borders and anything focusable, and `outline-subtle` `#E4E4E4` for purely decorative dividers, where no contrast minimum applies. The visual difference is small; the compliance difference is not. Reverting to a uniform hairline is a one-token change if the lighter look is preferred, and is then a knowing tradeoff rather than an oversight.

## 10. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Board renders in <1s with 100 jobs. Drag-and-drop is optimistic — no waiting on the server. |
| NFR-2 | Performance | Opening a job card with an existing analysis is instant (no model call). |
| NFR-3 | Security | Row-level security on every table, verified by an automated cross-user test. |
| NFR-4 | Security | The model API key exists only server-side and is never present in a client bundle. |
| NFR-5 | Security | CV files are never publicly addressable; access only via short-lived signed URLs. |
| NFR-6 | Reliability | A failed AI call leaves a visible failed state with a retry action — never a silent empty panel. |
| NFR-7 | Reliability | Scrape failure is a designed path, not an error state (FR-17). |
| NFR-8 | Accessibility | Keyboard operable throughout; visible focus states; board columns reachable without a mouse. |
| NFR-9 | Responsive | Usable on mobile: board scrolls horizontally, sheets go full-screen. |
| NFR-10 | Observability | Token usage and cost queryable per user and per analysis. |
| NFR-11 | Cost | **Blocking before any AI feature ships.** A per-user quota caps AI spend. Exceeding it blocks further analyses with a clear message rather than degrading silently or billing the operator. Added 2026-08-01 because public signup removed the invite gate that previously bounded cost. |
| NFR-12 | Security | Any HTTP response that sets an auth cookie must carry `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`. `@supabase/ssr` supplies these headers to the middleware `setAll` handler; discarding them lets a CDN serve one user's session cookie to another. Verified by test. |
| NFR-13 | Deliverability | Transactional email (verification, password recovery) goes through a dedicated SMTP provider, not Supabase's built-in sender, which is rate-limited to a few messages per hour and cannot support public signup. |

## 11. Privacy and data handling

This product stores CVs. A CV is dense PII — legal name, phone number, address, employment history, education, sometimes date of birth. That makes privacy a functional requirement, not a footnote.

| ID | Requirement |
|---|---|
| P1 | CV files and extracted text are treated as PII. Stored in a private bucket, RLS-protected, never logged. |
| P2 | CV text is sent to the model provider (Anthropic) for extraction and analysis. This must be stated plainly on the upload screen before the first upload — not buried in a policy. |
| P3 | No CV content, extracted text, or job data appears in application logs, error reports, or analytics payloads. Error logs carry IDs, never content. |
| P4 | A user can delete a CV, and deletion removes both the stored file and its extracted text. |
| P5 | A user can delete their account, cascading to all CVs, jobs, activities, and analyses. |
| P6 | No user's CV or job data is ever visible to another user, including the operator, through the application UI. |
| P7 | No third-party analytics, session recording, or error-tracking service receives page content from authenticated routes. |
| P8 | Credentials are held solely by Supabase Auth. No application table stores a password, hash, or reset token, and no password value is ever logged — including on failed sign-in. |
| P9 | The Privacy Policy states plainly, before signup, that CV content is sent to Anthropic for extraction and analysis. This restates P2 for users who now arrive without a personal introduction from the operator. |

## 12. Error states and edge cases

### 12.1 Authentication (added 2026-08-01)

| Case | Required behavior |
|---|---|
| Wrong email or password | One neutral message — "Email or password is incorrect" — naming neither field. Never reveal which was wrong (FR-46). |
| Signup with an already-registered address | Identical "check your email" response to the success case. No duplicate account, and the response time must not differ measurably (FR-46). |
| Password reset for an unknown address | Identical "check your email" response to the success case. No email sent. |
| Unverified account attempts sign-in | No session established. Route to check-email with a resend action (FR-43). |
| Recovery link expired or already used | Neutral failure page with a path back to requesting a fresh link. Never a stack trace or raw provider error. |
| Google sign-in cancelled by the user | Return to sign-in with no error banner. Cancelling is a choice, not a failure. |
| OAuth callback arrives with no code, or exchange fails | Redirect to `/auth/auth-code-error` with a retry path. |
| New password fails policy, or doesn't match confirmation | Inline field validation before submit; no round trip needed to learn this. |
| Rate limit reached on signup or reset requests | Explicit message stating that too many attempts were made and to try again shortly — not a generic failure. |
| Session expires mid-use | Next navigation redirects to sign-in, preserving the intended destination for after sign-in. |
| Non-admin reaches any admin route | **404, not 403.** A non-admin must not learn the admin app exists (FR-45). |

### 12.2 Jobs, CVs, and analysis

| Case | Required behavior |
|---|---|
| Posting URL is blocked (LinkedIn, login wall) | Paste fallback, presented as a normal path with neutral copy |
| Posting page has thin/no content | Same fallback, copy noting the page appeared empty |
| Extraction returns implausible data | Saved as `needs_review`, all fields hand-editable |
| Model call fails or is rate-limited | Automatic retry on transient failures; persistent failure yields a failed status with error text and a retry button |
| Model declines a request | Detected before reading response content; user sees an explanatory message rather than a crash |
| CV is scanned/image-only | Handled natively via model vision — no OCR dependency |
| CV upload is a corrupt or encrypted PDF | Rejected with a specific message; the gate is not silently satisfied |
| Stage deleted while holding jobs | Blocked; user must select a destination stage |
| Duplicate URL added | Warned with a link to the existing job; adding anyway is permitted |
| Empty board / empty timeline / no analysis yet | Each has a designed empty state pointing at the next useful action |
| Offline or failed mutation | Optimistic UI reverts with a toast; no silent data loss |

## 13. Technical architecture

Revised 2026-08-01: three separately deployed applications in one Turborepo, replacing the single app of the original draft.

```
job-tracker/                    Turborepo · pnpm workspaces
├── apps/
│   ├── web/         landing · PUBLIC · ships no Supabase client at all
│   ├── dashboard/   user app · auth screens, board, jobs, preferences
│   └── admin/       admin app · own sign-in, Postgres-enforced role gate
├── packages/
│   ├── db/          Supabase clients (browser · server · middleware) + types
│   ├── ai/          PURE model calls — no db, no request context
│   ├── core/        domain logic; takes a client as a parameter
│   ├── ui/          design system from DESIGN.md
│   └── config/      shared tsconfig · eslint · tailwind preset
└── supabase/        migrations · config.toml

Next.js 16 (App Router, TypeScript, RSC) · React 19
Supabase: Postgres + Auth (email+password, Google OAuth) + Storage (private CV bucket)
Deployment: three Vercel projects, one repo; preview environments are staging
```

**Sessions are deliberately not shared across the three apps.** `web` needs no auth, so it ships zero Supabase code and stays fully cacheable. `dashboard` and `admin` each own a session cookie scoped to their own host; the landing page's "Sign in" is a plain link. Beyond being simpler, this is the only arrangement that works on Vercel previews — `*.vercel.app` is on the Public Suffix List, so browsers refuse cookies set on a shared parent domain there. Independent sessions make previews behave exactly like production.

**Admin authorization lives in Postgres.** The admin app receives no service-role key; admin read access is granted by RLS policy evaluated against the caller's own `profiles.role`. P6 then holds structurally rather than by convention — the admin app cannot query content tables because the database refuses, not because the code declines to ask.

`packages/ai/*` are pure functions — text in, validated object out. No database access, no request context. This keeps them independently testable with recorded fixtures and swappable behind a fake everywhere else.

**Testing approach:** unit tests for schemas, scrape extraction (against saved HTML fixtures per source type), prompt-prefix stability (a caching regression guard), and ordering math. Integration tests for server actions against a local Supabase, including the cross-user RLS test and a privilege-escalation test proving a user cannot set their own `role` to `admin`. End-to-end coverage of the critical path: sign up → verify email → gated → upload CV → add job → analysis renders, plus the paste-fallback branch, the password-recovery round trip, and the admin gate returning 404 to a non-admin. No live model calls in CI; one manual smoke script hits the real API to catch drift.

## 14. Release plan

| Phase | Contents | Exit criteria |
|---|---|---|
| **0.9** | Monorepo foundation + login system: FR-1, FR-3, FR-4, FR-42 – FR-46, NFR-12, NFR-13, P8, P9 | All three apps deploy to Vercel preview. Signup, email verification, Google sign-in, password recovery, sign-out, and the admin role gate all work on staging. No job tracking yet. |
| **1.0** | FR-5 – FR-36 | Zain runs a real job search entirely in the tool for two weeks with no spreadsheet. **NFR-11 (per-user quota) must ship with the first AI feature, not after it.** |
| **1.1** | Open to the first 5 outside users | Someone other than Zain completes J1 unaided, with no explanation from Zain |
| **2.0** | FR-37 – FR-39 (documents) | A generated CV and cover letter are good enough to send without rewriting |
| **3.0** | FR-40 – FR-41 (cross-job intelligence) | Requires ≥20 jobs in a real account; report surfaces at least one gap the user hadn't noticed |

## 15. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scraping is unreliable across four very different source families | High — this is the entry point to every job | Paste fallback is a first-class designed path (FR-17), not an error handler. Success is measured on "job got logged," not "scrape succeeded." |
| CV-as-text model produces inconsistent generated documents in Phase 2 | Medium | Accepted knowingly (user's decision). Cached text keeps cost sane. Revisit structured extraction only if Phase 2 output disappoints. |
| Prompt-cache regression silently multiplies cost | Medium — invisible until the bill | Automated test on prompt-prefix stability; cache-read verification in the manual smoke check |
| AI output feels generic and gets ignored (M5 collapses) | Medium | FR-33: every gap must cite posting text. Non-citing output is a defect, not a quality nit. |
| Feature creep back toward the full five-subsystem vision | High — it's what makes this never ship | Phasing in §14 with concrete exit criteria; NG1–NG6 as hard boundaries |
| Friends bounce on first run | Medium | J1 under 3 minutes is a requirement; 1.1 exit criterion is unaided completion by someone else |
| **Public signup makes AI cost unbounded** (added 2026-08-01) | **High — the operator pays, with no billing and no cap** | NFR-11 is blocking before any AI feature ships. Phase 0.9 contains no AI calls, so the risk is scheduled, not live. Revisit whether billing is needed before 1.0 opens beyond a handful of users. |
| Transactional email undeliverable at signup volume | High — three of five auth screens depend on it | NFR-13: dedicated SMTP provider from the start. Supabase's built-in sender caps at a few messages per hour and would fail on day one. |
| Abuse of public signup (throwaway accounts, scripted registration) | Medium | Email verification gates dashboard access (FR-43); Supabase Auth rate limits stand in front of signup. Not fully mitigated — accepted for 0.9, revisit before 1.1. |
| Auth cookies cached by a CDN and served to the wrong user | High — silent cross-user session leak | NFR-12: middleware must propagate the cache headers `@supabase/ssr` supplies. Asserted by test, because the failure is invisible in normal use. |

## 16. Open questions

| # | Question | Status |
|---|---|---|
| ~~Q1~~ | ~~Deployment target — Vercel, or the existing Coolify instance?~~ | **Resolved 2026-08-01: Vercel.** Three projects, one repo; preview environments serve as staging. |
| Q2 | Phase 2 document output format — PDF via render service, DOCX, or Markdown→PDF? | Open. Needed by Phase 2 scoping; does not block 0.9 or 1.0. |
| Q3 | Does the product need billing before opening beyond a handful of users? | Open. Follows from withdrawing NG5 — NFR-11 caps cost but does not recover it. Needed before 1.1. |
| Q4 | Separate production Supabase project, or Supabase branching? | Open. 0.9 uses the single existing project as staging. Needed before the first production deploy. |

## Appendix A — Design tokens

Replaced 2026-08-01, derived from the logo mark at `references/brand/logo.png`. Structure, type, and spacing come from `references/login_system/job_tracker_ai_design_system/DESIGN.md`; the palette is re-anchored on the mark for the reasons in §9. Contrast ratios below are computed, not estimated.

### Ink scale — sampled directly from the mark

The mark's fold produces three tonal facets. They are the interaction states.

| Token | Hex | Origin | Use | On white |
|---|---|---|---|---|
| `ink-pressed` | `#181818` | deepest facet (18% of mark) | Primary button, active/pressed | 17.8:1 |
| `ink` | `#1E1E1E` | dominant face (29%) | Primary button rest, headings, the mark itself | 16.7:1 |
| `ink-hover` | `#2A2A2A` | fold highlight (8%) | Primary button hover | 14.4:1 |

Nothing in the interface uses `#000000`.

### Text

| Token | Hex | Use | On white | On canvas |
|---|---|---|---|---|
| `text` | `#1E1E1E` | Headings, body | 16.7:1 | 16.0:1 |
| `text-muted` | `#5C5C5C` | Secondary copy, labels, helper text | 6.7:1 | 6.4:1 |
| `text-subtle` | `#6F6F6F` | Placeholders, inactive icons | 5.02:1 | 4.81:1 |
| `text-on-ink` | `#FFFFFF` | Text on primary buttons | 16.7:1 | — |

Every text token clears WCAG AA (4.5:1) on both white and canvas — including placeholders, which are commonly allowed to fail.

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#FAFAFA` | Page background |
| `surface` | `#FFFFFF` | Cards, the auth panel |
| `surface-subtle` | `#F4F4F4` | Input fills, hover rows |
| `surface-inverse` | `#1E1E1E` | Dark callouts (the "AI INSIGHT" chip) |

Cards are white on a `#FAFAFA` ground, so they read as raised without needing a heavy shadow.

### Lines — two tokens, deliberately

| Token | Hex | Use | On white |
|---|---|---|---|
| `outline` | `#8A8A8A` | Input borders, focusable boundaries, control edges | 3.45:1 — clears WCAG 1.4.11 |
| `outline-subtle` | `#E4E4E4` | Decorative dividers only, where no minimum applies | 1.3:1 |

Splitting these is what lets the interface stay visually light without the input fields becoming legally invisible. Using `outline-subtle` on a control is a defect, not a style choice.

**Focus** is a 2px `ink` ring at 2px offset — never a colour change alone, and never removed.

### Error — the only colour in the system

| Token | Hex | Use | On white |
|---|---|---|---|
| `error` | `#BA1A1A` | Error text, invalid input border | 6.5:1 |
| `error-surface` | `#FFDAD6` | Error banner fill | — |
| `text-on-error-surface` | `#93000A` | Text on that fill | — |

Retained from `DESIGN.md`. Error is never signalled by colour alone — always colour plus an icon or explicit text.

### Typography

Geist throughout. Display 48px/700, tracking `-0.02em` (36px on mobile) · Headline-lg 32px/600, `-0.01em` · Headline-md 24px/600 · Body-lg 16px/400, line-height 1.6 · Body-md 14px/400 · Label-sm 12px/500, tracking `0.02em`.

### Radius

`sm` 0.25rem · default 0.5rem · `md` 0.75rem · `lg` 1rem · `xl` 1.5rem · `full` 9999px.

Containers take `xl`, interactive elements the default — echoing the mark, whose rounded outer corners sit against a hard internal diagonal.

### Spacing and grid

1200px container max · 24px gutter · 16px mobile margin, 48px desktop · stack scale 8 / 16 / 32px on an 8px grid · 12 columns desktop, 8 tablet, 4 mobile.

### Elevation

Cards sit on a 1px `outline-subtle` border with a wide diffuse shadow. No inner shadows, no bevels, no gradients; surfaces read flat and matte. The mark's own gradient is a property of the logo, not of the interface.

### Logo usage

Clear space on all sides is at least **20% of the mark's height**; nothing sits inside it. Minimum size **24px tall** — below that use the flat SVG rather than the raster, whose fold gradient turns to mud at small scale.

The mark appears in `ink` on light grounds and reversed to white on `surface-inverse`. It is never recoloured, outlined, rotated, stretched, or given a shadow, and the raster's gradient is never applied to the SVG — the gradient belongs to the logo, not the interface.

The outline is one closed path over seven vertices on a `0 0 556 766` viewBox; every edge is vertical, horizontal, or exactly 45° except the leg's inner edge. Both fold creases radiate from the inner notch, which makes that vertex the mark's structural centre. Full geometry, corner radii, and usage rules: `brand/README.md`.

## Appendix B — Model reference

| Item | Value |
|---|---|
| Model | `claude-opus-5` |
| Pricing | $5.00 / 1M input, $25.00 / 1M output |
| Context | 1M tokens |
| PDF input | Native, via base64 document block. No parsing library required. |
| Structured output | Schema-constrained JSON, validated at the API layer |
| Prompt cache minimum | 512 tokens (a typical CV is 2–4k, comfortably above) |
| Cache economics | Writes ~1.25×, reads ~0.1× of base input price |
