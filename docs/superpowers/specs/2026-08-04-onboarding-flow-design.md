# Onboarding flow — design

**Date:** 2026-08-04
**Status:** implemented
**Supersedes:** the six-step wizard shipped in `a6e3141`, which had no spec

## Why this exists

The six-step wizard went from a Stitch-generated brief (`references/onboarding/project_brief.md`) straight to code. It is the only subsystem in this repo that got neither a spec nor a plan, and it shows in four places:

1. **Five of six steps had no requirement.** PRD §6 covers the CV gate only (FR-5 to FR-9). Career goals, roles, skills, work preferences and the summary had no acceptance criteria and no test obligation.
2. **The wizard's copy sold a non-goal.** The reference screens say "Help us tailor your job feed and recommendations"; NG2 forbids job discovery. The implementation quietly stripped those promises while keeping the data collection, and that rewrite was recorded nowhere.
3. **It cost a stranger ~6 minutes for zero delivered value.** Steps 2–5 write nine columns nothing reads. PRD §5 re-baselined J1 from 3 minutes to ~6 to accommodate this, and named the fallback itself: "making steps 2-5 skippable is the first thing to try."
4. **The gate's own rule was violated.** PRD §9: "a new user must never encounter a control they don't need."

Alongside those, a design review found defects: three controls bounded with `outline-subtle` (asserted below 3:1 in `tokens.test.ts`, which PRD Appendix A calls "a defect, not a style choice"), a progress bar that could not distinguish "here" from "done", two dead CSS transitions, a dashed dropzone promising drag-and-drop that did not exist, card-level-only validation messages, and static subtitles claiming an AI pre-fill that a Groq outage had not performed.

## The shape

Four steps, grouped by **who knows the answer** rather than by topic.

| n | slug | what it asks | who knows it |
|---|---|---|---|
| 1 | `resume` | the CV | the user's file |
| 2 | `profile` | target roles, skills, years of experience | the CV — all pre-filled, the job is to correct |
| 3 | `preferences` | career goal, work location, salary | only the user |
| 4 | `done` | nothing; hands off | — |

Career goal sits on step 3, not beside the roles Groq read off the CV: a CV is a record of what someone has done, and step 3 is about what they want next.

Roles and skills share step 2, which is what forces their two chip treatments to reconcile. As adjacent steps they had drifted into outlined-vs-filled pills and two different interaction models for editing a list.

The same nine columns are collected. Nothing was dropped; the regrouping halves the page transitions.

### Decisions taken 2026-08-04 (Zain)

- Restructure to four steps rather than making steps 2–5 skippable or polishing the six in place.
- Step 4 reports what the product did, then hands off — not a receipt of what the user typed.
- The extraction wait is narrated with the pipeline's real stages, not a skeleton or a spinner.
- Step 4 shows current state rather than "N identified, M kept". The diff would report the user's own deletions back at them and would need a `jsonb` snapshot of the original extraction; `cvs.file_name` and `cvs.char_count` already exist.

## Progressive enhancement

Step 1 has two submit paths over **one** pipeline, `ingestCv({ userId, file, onStage? })`.

- **No JavaScript, or no streaming support:** the form posts `uploadCvAction`, which calls `ingestCv` with no reporter and redirects. Behaviourally identical to the six-step wizard.
- **Enhanced:** the component takes the submit over, POSTs to `/onboarding/ingest`, and reads NDJSON progress lines.

`enhanced` comes from `useSyncExternalStore` with a server snapshot of `false`, not from an effect. Two reasons: `ReadableStream` exists in the Node runtime, so a lazy `useState` initialiser would answer `true` during SSR and silently ship HTML with no form action; and the `action`/`onSubmit` swap must not depend on React's ordering between a user submit handler and a form action, because getting that wrong uploads the file twice.

### Stages

Emitted at the boundary the work actually crosses, never on a timer.

| stage | crossed when | carries |
|---|---|---|
| `read` | file accepted, size and type valid | `fileName` |
| `extracted` | local text extraction succeeded | `chars` |
| `stored` | storage object written and `cvs` row inserted | — |
| `understanding` | about to call Groq | — |
| `prefilled` | Groq answered | `prefilled: boolean` |
| `done` | columns persisted | `next` |
| `error` | a named failure | a `FAILURE_COPY` message |

A Groq failure resolves `understanding` **neutrally** — neither a tick nor an error — because it does not stop onboarding. The line reads "Couldn't read the details — you can add them next", which is also what step 2's subtitle then says.

Reporting stops at the boundary that failed. A scanned PDF emits `read` and nothing else, so nothing is claimed that did not happen.

## `cv_prefilled_at`

New nullable `timestamptz` on `profiles`, set by ingest **only** when the model returned something non-empty. Step 2's subtitle keys off it.

The six-step wizard's step 3 said "We pulled these from your CV" as a static string, so a Groq outage left that sentence sitting above empty fields. Keying off the field values instead would break as soon as the user edited them by hand; keying off a recorded event does not. Groq can also succeed and still return an empty profile (a CV below the minimum useful length, or a malformed response the validator falls back on), so the flag tracks "found something", not "the call returned".

## Migration

`20260804000000_onboarding_four_steps.sql`. The ordering is load-bearing: `profiles_onboarding_step_check` pinned `1..6`, so values are remapped **before** the narrower constraint goes on, or every row above 4 rejects and the migration aborts.

```
old 1 resume -> 1    old 4 skills -> 2
old 2 goals  -> 2    old 5 work   -> 3
old 3 roles  -> 2    old 6 done   -> 4
```

Applied to finished users too, whose marker is 6 and would violate the new bound even though the gate never reads it again. Nobody moves forward past work they have not done. Old steps 3 and 4 had already answered `career_goal`, so step 3 shows it pre-selected rather than asking twice.

Retired slugs (`goals`, `roles`, `skills`, `work`) redirect to whichever step now owns their content, clamped so an old URL cannot jump ahead. This gets its own case ahead of `gate.ts`'s unknown-slug 404: a slug we ourselves used to serve is not a typo, and anyone standing mid-wizard when this deployed has one in their address bar. A genuine typo still 404s.

## Where the ingest route lives, and why

`app/(onboarding)/onboarding/ingest/route.ts`, **not** `/api/onboarding/ingest`.

`gate.ts` redirects any non-wizard path to the user's current step, so the same handler under `/api/` would have its POST bounced to `/onboarding/resume` and silently never run. Inside `/onboarding/`, the gate lets a slug it does not recognise fall through untouched, so no gate change is needed. A static segment also outranks the sibling `[step]` dynamic segment, so it does not 404 as an unknown step.

The route uses `persistStep`, not `saveStep`: `redirect()` throws, and unwinding mid-stream would abort the response instead of finishing it. `currentUserId` and `persistStep` therefore live in `lib/onboarding/persist.ts` rather than in the `'use server'` module — every export of one of those becomes an RPC endpoint the browser can call, and `persistStep(userId, from, values)` is exactly the shape you do not want reachable from the client, RLS behind it or not.

## Defects closed

| Defect | Fix |
|---|---|
| `outline-subtle` on three focusable controls (`OptionCard`, `ChipField` chips, Back via `CONTROL_VARIANT.secondary`) | `outline` at rest; chips became filled, retiring the border entirely |
| Progress bar painted "current" identically to "done"; every segment solid on the last step | Three states — solid done, half-filled current, empty ahead |
| `transition-colors` on progress segments and `transition-shadow` on `Card` were dead code | Removed; the current segment now grows via `--animate-fill`, which fires on a fresh load where a transition cannot |
| Dashed dropzone signalled drag-and-drop that did not exist | Real `onDrop`, written back into the input so it stays the single source of truth |
| Size and type errors cost a server round trip | `checkFile` in `lib/cv/limits.ts`, shared by client and server; the server still checks, because a client check is a courtesy not a boundary |
| One card-level error string, rendered far from the control it named | `StepState.field` plus `FieldError`; card-level `FormError` kept for failures belonging to no field |
| Centred title over left-aligned card — three axes in one column | One left axis |
| `AmountField` at `text-3xl`, matching the `h1`, for a nullable field | `text-2xl` |
| Progress bar outside the animated region; two stagger beats vs `AuthShell`'s four | Four beats, progress included |
| Reduced-motion reset zeroed every `transition-duration`, stripping colour and focus feedback | `transition-property` allowlist: transforms and sizes stop, fades survive |
| "Groq" named bare to a jobseeker | "our AI provider (Groq)" |

## Revision, same day: fitting the viewport

Three problems found by looking at the built screens rather than the code.

### The shell is two columns now

A step has to fit at 100% zoom without scrolling. Single-column could not: step 3's card runs ~684px, and the logo, progress bar, caption, heading and subtitle stacked above it added ~272px — ~956px against the 700-800px a laptop actually has. No amount of tightening closes a 200px gap.

So the chrome moved *beside* the card, which is what the reference designs in `references/onboarding` do. Above `lg`: left column carries the logo, the step list, the heading and the subtitle; right column carries the card and is the only scroll container, under `lg:h-[100dvh]` + `lg:overflow-hidden` on `main`. The page therefore cannot scroll however short the viewport gets — on one too short even for two columns, the form scrolls inside its column while the left side stays put. `100dvh` and not `100vh`, because mobile Safari's address bar makes `vh` taller than the visible area.

AuthShell's two columns are still the wrong shape: its left side sells the product to a stranger who has, by this point, signed up. This left side is wayfinding.

The step list replaces the segment bar above `lg` because it can name what is coming, which a bar cannot. Below `lg` the bar returns — four labelled rows are worth a column, not a third of a phone screen. Both ship and CSS picks; `display: none` removes the hidden one from the accessibility tree, so a screen reader gets exactly one. `STEPS` gained a `short` field for the list, deliberately not the title: the list names the stage, the heading asks the question, and printing near-identical strings twice in one viewport reads as a bug.

### Career goal is a grid of cards, not a stack of rows

Four full-width radio rows cost ~284px; a 2x2 grid costs ~172px, which is most of what made the step overflow. It also reads as one question with four answers rather than four independent questions — the argument `SegmentedField` already makes, for labels too long to segment.

`ChoiceGrid` replaces `OptionCard`, which nothing else used and which is now deleted. Still real `<input type="radio">`s driven by `has-[:checked]`, so keyboard, form submission and screen-reader semantics come free and selection survives with JavaScript off. Checked state is an ink border plus an inset ring rather than a 2px border, because a 2px border would shift the grid by a pixel on select. The glyph is a `ReactNode` the caller supplies: `packages/ui` has no icon library and should not gain one to draw a card, and `CAREER_GOALS` names its icon as a string because `steps.ts` is imported by `gate.ts` and the proxy.

The `Divider` between career goal and the location/salary pair went too — each group carries its own uppercase label, which separates them without it.

### Roles use the same picker as skills

Roles were a `ChipField`: a text box and an Add button, sitting next to a skills field that offered a searchable list. Two ways to edit the same kind of value, on what is now one card. The picker wins — picking beats typing from memory — and nothing is lost, because anything not on the list is still addable.

`SkillsCombobox` became `TagPicker`, and `lib/onboarding/skill-items.ts` became `tag-items.ts`; the logic was already generic. `ROLE_SUGGESTIONS` is a new seed list, cross-domain for the same stated reason as `SKILL_SUGGESTIONS` — a list of only engineering titles is useless to the sales and finance CVs this also serves.

### Also found: `Math.sumPrecise`

Watching the dev log during a real upload turned up `TypeError: Math.sumPrecise is not a function`, three times per PDF. `unpdf`'s bundled pdf.js calls it; it is a TC39 proposal no Node ships. pdf.js swallows the error, so extraction still returns text — but every call site is font work, and a font pdf.js cannot rebuild is one whose glyphs it may map to the wrong characters. The failure mode is not an error, it is quietly wrong `extracted_text` going to the model as if it were the CV (FR-7).

Pre-existing, not introduced here. `lib/cv/math-sum-precise.ts` polyfills it with Kahan-Babuska-Neumaier summation, installed inside `extractText` rather than at import time so module ordering cannot defeat it. Its own test caught a bug in the first version: the compensation term computes `Infinity - Infinity` and returned `NaN` where the answer was `Infinity`.

**Not verified:** that the polyfill removes the warning for a specific real CV. That needs another upload. What is verified is that the extraction path installs it.

## Revision, 2026-08-05: single column, and a Continue that cannot hide

The previous revision paired roles beside skills to save height. That was wrong, and looking at the built screen showed why.

### Match column width to content width

The rule I applied was "pair fields of similar height". The rule that matters is similar *content width*. A real extracted title is long: `Brand Partner Specialist - Automation` renders as a ~330px chip. In a 396px lane that is one chip per row, so three roles wrapped to three rows, while short skills (`Python`, `Figma`) packed four to a row. The pairing starved the field that needed the measure.

Un-pairing costs less than the pairing saved, because full width reflows the chips: roles go from three rows (~156px) to one (~72px), skills from three to two (~114px). Sum plus gap is ~210px against the paired ~156px, so ~54px for role chips on one line, one question at a time, and no two anchored popovers sharing a row.

Steps 2 and 3 are now single column at 880px. Step 3's career-goal cards go four across in one row (`ChoiceGrid columns={4}`), ~124px where a 2x2 costs ~172px and four stacked rows cost ~284px. `ChoiceGrid` takes the count through a literal lookup table, following `segmented-field.tsx`'s `COLS`: Tailwind emits nothing for a computed `md:grid-cols-${n}`.

### The footer had to leave the Card

A defect in what the previous revision shipped. `Continue` lived inside the `Card`, and the `Card` region was the scroll container, so on a short viewport the CTA scrolled out of reach *inside* the card. The page held still, which is what the tests checked, while the button people were looking for disappeared, which is what the requirement was actually about.

Fixed structurally rather than by budget: `lib/onboarding/step-layout.ts` holds the two class strings every step shares, with the `Card` taking the slack (`min-h-0 flex-1 md:overflow-y-auto`) and `WizardFooter` as its sibling. `min-h-0` is the mechanism: a flex item defaults to `min-height: auto` and refuses to shrink below its content, which would push the footer off the bottom instead of scrolling. `WizardShell` gives up its own `overflow-y-auto` and hands the step a height instead.

Chosen over `position: sticky` on the footer, which inside a padded card needs negative-margin bleed matched to `Card`'s `p-6 sm:p-8` and couples two components through a value nothing enforces.

Two knock-ons. `WizardFooter` loses its `border-t`: the rule divided fields from actions inside one card, and across a gap between two boxes there is nothing to divide. And `CONTROL_VARIANT.secondary` moves to `bg-surface`, because Back now sits on `canvas` where `surface-subtle` (`#F4F4F4`) on `#FAFAFA` is barely a fill.

`step-layout.test.ts` asserts the arrangement, including `min-h-0`, so it cannot be undone by accident. The dashboard's vitest is node-only, so these are string assertions rather than rendered ones.

### Header trimmed

`md:py-10` to `md:py-8`, logo `mb-8` to `mb-6`, heading `mt-8` to `mt-6`, and the visible "Step N of 4" caption removed. It was needed when the stepper was an unlabelled bar; with numbered nodes and a ring on the current one it repeated what the stepper shows, and the count still reaches a screen reader through the list's `aria-label`.

Step 2 lands around 714px and step 3 around 734px against the ~690-790px a laptop has. Those are arithmetic, not measurements. The scroll structure is what makes being wrong about them survivable.

## What this does not resolve

**NG2 is still owed a verdict.** Steps 2 and 3 write columns nothing reads. This makes that cost ~3 minutes instead of ~6 and stops the copy promising a feed that does not exist, but it does not decide whether job discovery is real scope. Until it is, those columns remain storage rather than a feature (PRD §3).

## Verification

259 tests across the monorepo. The ones specific to this work:

- `lib/onboarding/steps.test.ts` — four steps, no retired slug still resolving, the `subNoPrefill` variant, and `TOTAL_STEPS` within the check constraint's bound
- `lib/onboarding/gate.test.ts` — retired-slug redirects, clamping, a genuine typo still 404ing, six-step values surviving as clamped input
- `lib/onboarding/actions.test.ts` — every invariant the six-step suite protected, plus `field` on rejections and `cv_prefilled_at` set only on a real pre-fill (not on a Groq failure, not on an empty profile)
- `lib/cv/ingest.test.ts` — the stage sequence, stopping at the failed boundary, neutral resolution on provider failure, and the whole pipeline with no reporter attached
- `lib/cv/read-lines.test.ts` — partial chunks, several lines per chunk, a multi-byte character split down the middle, early consumer exit releasing the reader
- `lib/cv/limits.test.ts` — the shared client/server validation contract
- `packages/ui/src/wizard-shell.test.tsx` — the three progress states, including that the current segment is not painted as finished and the last step stays distinguishable from a completed wizard

Not covered by tests, and needing a signed-in browser: the stage narration rendering, drag-and-drop, and the no-JS form post against a real session. `apps/dashboard` runs vitest in a node environment with `include: ['lib/**/*.test.ts']`, so it has no component-test harness; the NDJSON parser was extracted to `lib/cv/read-lines.ts` precisely so the awkward part could be tested without one.
