# Product Requirements Document — Job Tracker

| Field | Value |
|---|---|
| **Product** | Job Tracker |
| **Author** | Zain |
| **Date** | 2026-07-28 |
| **Status** | Approved |
| **Phase covered** | Phase 1 (v1.0). Phases 2–3 specified at summary level only. |

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
| NG5 | Support public self-serve signup | Invite-only. No billing, no abuse handling, no ToS surface. |
| NG6 | Produce rejection post-mortems | Explicitly declined during scoping — speculative and demoralizing without real signal. |

## 4. Users

**Primary — Zain.** Actively job searching, technically fluent, will tolerate rough edges but not slowness. Applies to a mix of LinkedIn, company career pages, Indonesian boards (Jobstreet, Glints, Kalibrr), and remote boards.

**Secondary — 10–50 invited friends.** Varying technical fluency. Will not read documentation. Will abandon the product on a confusing first screen. Zain absorbs all AI cost, so per-user consumption must stay bounded by design, not by trust.

**Access model:** invite-only. Access is granted by an allowlist of email addresses; there is no open signup form.

## 5. Core user journeys

**J1 — First run (must complete in under 3 minutes).**
Receive invite → sign in via magic link → prompted to upload CV (dashboard is inaccessible until this completes) → CV uploads, text extracted → board appears with six default stages and an empty state pointing at one button: *+ Add job*.

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
| FR-1 | MUST authenticate via Supabase Auth with email magic link | A valid allowlisted email receives a link; clicking it creates a session. A non-allowlisted email receives no link and sees a neutral "check your email" message (no account enumeration). |
| FR-2 | MUST restrict access to an invite allowlist | An email not on the allowlist cannot obtain a session under any flow. |
| FR-3 | MUST isolate all user data at the database level | Row-level security on every table. An authenticated user issuing a direct query for another user's row receives zero rows. Covered by an automated test. |
| FR-4 | MUST sign out and invalidate the session | Post-sign-out, protected routes redirect to sign-in. |

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

Every table carries `user_id uuid references auth.users`, with row-level security `using (auth.uid() = user_id)`.

```
profiles    id → auth.users, full_name, onboarding_complete
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

**Cost budget:** ~$0.05–0.10 per gap analysis. A user running 30 applications costs ~$3. Fifty users at that volume is ~$150 total — acceptable for an invite-only tool with no billing.

**Behavioral requirement:** the model must not invent qualifications, employers, dates, or achievements not present in the CV, and must not assert requirements not present in the posting. Every gap cites source text (FR-33).

## 9. UX principles

The brief was "simple and minimalist to operate but with hidden advanced features." That resolves to strict progressive disclosure:

- **Default surface: one obvious action.** The board, with a single primary button. Nothing else competes.
- **First layer, on click.** Card opens a side sheet: Overview / Activity / Analysis.
- **Hidden layer, on deliberate gesture.** `⌘K` palette, keyboard navigation, table view, collapsed advanced panel.
- **The rule:** a new user must never encounter a control they don't need. A returning power user must never need the mouse.

**Visual identity** comes from the existing `brand/` assets — ink `#1F2A24`, canvas `#F4F1EC`, sage accent `#8FAE8B`, surface `#E8F0E4`. The logo's ascending-track motif carries into the stage progression indicator. Built with Tailwind and shadcn/ui, restyled to these tokens rather than left at library defaults.

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

## 12. Error states and edge cases

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

```
Next.js 15 (App Router, TypeScript, RSC)
  ├── Server Components   → Supabase Postgres (RLS)
  ├── Server Actions      → mutations: stages, jobs, activities, ordering
  └── Route Handlers      → AI pipeline (streaming), scraper
                              ├── lib/scrape  fetch + readability extraction
                              └── lib/ai      Anthropic SDK, claude-opus-5

Supabase: Postgres + Auth (magic link) + Storage (private CV bucket)
UI: Tailwind + shadcn/ui, restyled to brand tokens
```

`lib/ai/*` are pure functions — text in, validated object out. No database access, no request context. This keeps them independently testable with recorded fixtures and swappable behind a fake everywhere else.

**Testing approach:** unit tests for schemas, scrape extraction (against saved HTML fixtures per source type), prompt-prefix stability (a caching regression guard), and ordering math. Integration tests for server actions against a local Supabase, including the cross-user RLS test. End-to-end coverage of the critical path: sign up → gated → upload CV → add job → analysis renders, plus the paste-fallback branch. No live model calls in CI; one manual smoke script hits the real API to catch drift.

## 14. Release plan

| Phase | Contents | Exit criteria |
|---|---|---|
| **1.0** | FR-1 – FR-36 | Zain runs a real job search entirely in the tool for two weeks with no spreadsheet |
| **1.1** | Invite the first 5 friends | Someone other than Zain completes J1 unaided, with no explanation from Zain |
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

## 16. Open questions

Neither blocks Phase 1 implementation:

| # | Question | Needed by |
|---|---|---|
| Q1 | Deployment target — Vercel, or the existing Coolify instance? | Before first deploy |
| Q2 | Phase 2 document output format — PDF via render service, DOCX, or Markdown→PDF? | Phase 2 scoping |

## Appendix A — Brand tokens

From `brand/job-tracker-logo.svg`:

| Token | Hex | Use |
|---|---|---|
| Ink | `#1F2A24` | Text, primary surfaces, logo mark |
| Canvas | `#F4F1EC` | Page background |
| Sage | `#8FAE8B` | Accent, stage nodes |
| Sage light | `#C8D5C3` | Track/rail, dividers |
| Surface | `#E8F0E4` | Cards, raised surfaces |

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
