# Job Tracker AI — Login System Foundation (Phase 0.9, plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Turborepo monorepo with three Next.js apps, where a user can create an account, confirm their email, sign in, sign out, and recover a forgotten password — all running against a local Supabase with row-level security proven by test.

**Architecture:** Three separately deployable Next.js 16 apps share four workspace packages. Auth runs on Supabase in PKCE mode; sessions live in cookies refreshed by each app's `proxy.ts`. Authorization is enforced in Postgres — the admin role is granted by RLS policy and protected by column privileges, so no application code can be refactored into a privilege-escalation bug.

**Tech Stack:** Next.js 16.2.12 · React 19.2.8 · TypeScript 7.0.2 · Tailwind CSS 4.3.3 · `@supabase/ssr` 0.12.4 · `supabase-js` 2.111.0 · Turborepo 2.10.8 · pnpm 11.18 · Vitest 4.1.10 · Playwright 1.62.1

**Source of truth:** `docs/superpowers/specs/2026-08-01-login-system-design.md` and `docs/PRD.md`. Requirement IDs (FR-n, NFR-n, P-n) refer to the PRD.

**Covers:** FR-1 (password half), FR-3, FR-4, FR-42, FR-43, FR-44 (terms capture), FR-46 · NFR-12 · P8 · §12.1 rows 1–5, 8–10.

**Deferred to plan 2:** Google OAuth (FR-1 OAuth half), the admin app and its role gate (FR-45), the landing page with `/terms` and `/privacy` (FR-44 pages, P9), and Vercel deployment. Plan 2 is listed at the end of this document.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Monorepo root is `job-tracker/`** — the empty directory inside the repo. All paths below are relative to it. `references/` and `docs/` stay outside.
- **Node ≥ 22** (verified present: v26.5.0). **pnpm 11.18.0** (verified present). Docker required for local Supabase (verified: 29.4.0).
- **`supabase` and `vercel` CLIs are not installed.** Invoke via `pnpm dlx supabase@2.111.0` / `pnpm dlx vercel`.
- **Next.js 16 renamed middleware.** The file is `proxy.ts`, not `middleware.ts`, and the export is `export function proxy(...)`, not `middleware`. A file named `middleware.ts` is silently ignored by Next 16 — every protected route would be open with no error. This is the single highest-risk detail in this plan.
- **Tailwind 4 has no JS config.** Theming is CSS-first via `@theme` in a stylesheet. Do not create `tailwind.config.ts`. Classes in workspace packages are only generated if the app's CSS declares `@source` pointing at them.
- **`cookies()` is async.** Always `const cookieStore = await cookies()`.
- **TypeScript 7.0.2 is the native compiler.** If `tsc` rejects a config option or a dependency's types, fall back to `typescript@5.9.3` across all workspaces and note it — do not mix major versions between packages.
- **Colour literals are banned in `apps/**` and `packages/ui/**`.** Use Tailwind token utilities. Task 2 adds an ESLint rule that fails the build on raw hex. The specific values `#000000`, `#1a1c1c`, `#444748`, `#c4c7c7`, `#747878` are forbidden outright — they are the superseded reference palette (PRD §9).
- **Tokens are defined once**, in `packages/config/theme.css`, mirrored in `packages/config/src/tokens.ts` for tests. Changing one without the other is a defect Task 2's test catches.
- **`SUPABASE_SERVICE_ROLE_KEY` may appear only under `test/` and `scripts/`.** Never in `apps/**`, never in a `NEXT_PUBLIC_*` name (NFR-4 precedent).
- **No AI calls in this phase.** There is no Anthropic dependency and no `ANTHROPIC_API_KEY`.
- **Commit at the end of every task**, with the message given in the task's final step.

---

## File Structure

| Path | Responsibility |
|---|---|
| `pnpm-workspace.yaml`, `turbo.json`, `package.json` | Workspace membership, task graph, root scripts |
| `packages/config/theme.css` | **The** token definitions — `@theme` block |
| `packages/config/src/tokens.ts` | Same tokens as data, for tests |
| `packages/config/src/contrast.ts` | WCAG relative luminance and contrast ratio |
| `packages/config/tsconfig.base.json` | Compiler options every workspace extends |
| `packages/config/eslint-rules/no-raw-color.js` | Custom rule banning hex literals |
| `packages/config/eslint.base.mjs` | Flat ESLint config every workspace extends |
| `packages/ui/src/button.tsx` … | One component per file, no barrel logic |
| `packages/ui/src/logo.tsx` | Inlines `brand/logo-mark.svg` as `currentColor` |
| `packages/ui/src/auth-shell.tsx` | Two-column auth layout |
| `packages/db/src/client.ts` | Browser Supabase client |
| `packages/db/src/server.ts` | RSC / Server Action client (cookie-bound) |
| `packages/db/src/proxy.ts` | Session refresh + cookie-preserving redirect |
| `packages/db/src/types.ts` | Generated database types |
| `supabase/migrations/*.sql` | Schema, RLS, functions, grants, trigger |
| `supabase/templates/*.html` | Email templates using `token_hash` |
| `apps/dashboard/proxy.ts` | Route protection for the user app |
| `apps/dashboard/app/(auth)/*` | The five auth screens |
| `apps/dashboard/app/auth/confirm/route.ts` | `token_hash` verification — email + recovery |
| `apps/dashboard/app/auth/callback/route.ts` | OAuth `code` exchange (stub here, used in plan 2) |
| `apps/dashboard/lib/actions/auth.ts` | Server Actions: sign up, sign in, sign out, reset |
| `test/helpers/users.ts` | Disposable users via the service-role client |

**Boundary rationale:** `packages/config` holds no React and no Supabase — it is pure data and pure functions, so its contrast test runs in milliseconds with no environment. `packages/db` holds no UI. `packages/ui` holds no data access. That is what lets Task 2 and Task 3 be reviewed without a database, and Task 4 without a browser.

---

## Task 1: Monorepo skeleton

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `turbo.json`, `.gitignore`, `.nvmrc`
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`
- Create: `apps/{web,dashboard,admin}/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: workspace package names `@job-tracker/config`, `@job-tracker/ui`, `@job-tracker/db`. Dev ports — **web 3000, dashboard 3001, admin 3002** — every later task's URLs depend on these.

There is no unit to test here; the deliverable is verified by build and by HTTP response. TDD resumes in Task 2.

- [ ] **Step 1: Create the branch and the root directory**

```bash
cd /Users/zain/Documents/Development/Projects/job-tracker
git checkout -b feat/login-system-foundation feat/login-system
cd job-tracker
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Write the root `package.json`**

```json
{
  "name": "job-tracker",
  "private": true,
  "packageManager": "pnpm@11.18.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "db:start": "pnpm dlx supabase@2.111.0 start",
    "db:stop": "pnpm dlx supabase@2.111.0 stop",
    "db:reset": "pnpm dlx supabase@2.111.0 db reset"
  },
  "devDependencies": {
    "turbo": "2.10.8",
    "typescript": "7.0.2"
  }
}
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 5: Write `.nvmrc` and `.gitignore`**

`.nvmrc`:
```
22
```

`.gitignore`:
```
node_modules/
.next/
dist/
.turbo/
coverage/
playwright-report/
test-results/
.env
.env*.local
.env.test
supabase/.temp/
supabase/.branches/
*.tsbuildinfo
```

- [ ] **Step 6: Write `packages/config/package.json` and `tsconfig.base.json`**

`packages/config/package.json`:
```json
{
  "name": "@job-tracker/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./theme.css": "./theme.css",
    "./tsconfig.base.json": "./tsconfig.base.json"
  }
}
```

`packages/config/tsconfig.base.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  }
}
```

- [ ] **Step 7: Create the three apps**

Run once per app, substituting the name:

```bash
cd apps
for a in web dashboard admin; do
  pnpm dlx create-next-app@16.2.12 "$a" \
    --typescript --tailwind --app --eslint \
    --src-dir=false --import-alias="@/*" --use-pnpm --yes
done
cd ..
```

- [ ] **Step 8: Set each app's port and workspace deps**

In `apps/web/package.json`, `apps/dashboard/package.json`, `apps/admin/package.json`, replace the `scripts` and add `dependencies` — using port **3000** for web, **3001** for dashboard, **3002** for admin:

```json
"scripts": {
  "dev": "next dev --port 3001",
  "build": "next build",
  "start": "next start --port 3001",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
},
"dependencies": {
  "@job-tracker/config": "workspace:*",
  "next": "16.2.12",
  "react": "19.2.8",
  "react-dom": "19.2.8"
}
```

- [ ] **Step 9: Point each app's tsconfig at the shared base**

Replace `compilerOptions` in each `apps/*/tsconfig.json` with an extends, keeping the `plugins`, `paths`, `include`, and `exclude` that `create-next-app` generated:

```json
{
  "extends": "@job-tracker/config/tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 10: Install and verify all three build**

```bash
pnpm install
pnpm turbo build
```

Expected: three successful builds. If pnpm reports ignored build scripts, run `pnpm approve-builds` and accept them, then re-run.

- [ ] **Step 11: Verify all three dev servers respond on their own ports**

```bash
pnpm turbo dev &
sleep 20
for p in 3000 3001 3002; do
  printf 'port %s -> ' "$p"
  curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$p"
done
kill %1
```

Expected: `200` from each of 3000, 3001, 3002. Any `000` means that app failed to boot — fix before continuing.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold turborepo with three next.js apps"
```

---

## Task 2: Design tokens, contrast enforcement, and the colour lint rule

**Files:**
- Create: `packages/config/theme.css`, `packages/config/src/tokens.ts`, `packages/config/src/contrast.ts`
- Create: `packages/config/src/contrast.test.ts`, `packages/config/src/tokens.test.ts`
- Create: `packages/config/vitest.config.ts`, `packages/config/eslint-rules/no-raw-color.js`, `packages/config/eslint.base.mjs`
- Modify: `packages/config/package.json`, `apps/*/app/globals.css`, `apps/*/eslint.config.mjs`

**Interfaces:**
- Consumes: `@job-tracker/config` from Task 1.
- Produces:
  - `TOKENS: Record<string, string>` from `@job-tracker/config/tokens` — keys are token names (`ink`, `text-muted`, `canvas`, …), values are uppercase hex.
  - `contrastRatio(a: string, b: string): number` and `relativeLuminance(hex: string): number` from `@job-tracker/config/contrast`.
  - Tailwind utilities `bg-ink`, `text-text-muted`, `border-outline`, etc., available in every app **and** in `packages/ui`.

- [ ] **Step 1: Write the failing contrast test**

`packages/config/src/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { relativeLuminance, contrastRatio } from './contrast.js'

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('uses the linear segment below the sRGB threshold', () => {
    // 0x0A = 10 -> 10/255 = 0.0392 which is <= 0.04045, so c/12.92
    expect(relativeLuminance('#0A0A0A')).toBeCloseTo(0.0392157 / 12.92, 6)
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2)
  })

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#1E1E1E', '#1E1E1E')).toBeCloseTo(1, 5)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#1E1E1E', '#FFFFFF'))
      .toBeCloseTo(contrastRatio('#FFFFFF', '#1E1E1E'), 10)
  })

  it('matches the values recorded in PRD Appendix A', () => {
    expect(contrastRatio('#1E1E1E', '#FFFFFF')).toBeCloseTo(16.67, 1)
    expect(contrastRatio('#5C5C5C', '#FFFFFF')).toBeCloseTo(6.68, 1)
    expect(contrastRatio('#8A8A8A', '#FFFFFF')).toBeCloseTo(3.45, 1)
  })

  it('accepts shorthand and lowercase hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 2)
  })
})
```

- [ ] **Step 2: Add Vitest to `packages/config` and configure it**

```bash
cd packages/config
pnpm add -D vitest@4.1.10
cd ../..
```

`packages/config/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

Add to `packages/config/package.json` — merge into the existing `exports`, and add the rest:
```json
"exports": {
  "./theme.css": "./theme.css",
  "./tsconfig.base.json": "./tsconfig.base.json",
  "./tokens": "./src/tokens.ts",
  "./contrast": "./src/contrast.ts",
  "./eslint": "./eslint.base.mjs"
},
"scripts": {
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @job-tracker/config test`
Expected: FAIL — cannot resolve `./contrast.js`.

- [ ] **Step 4: Implement `contrast.ts`**

`packages/config/src/contrast.ts`:

```ts
function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a hex colour: ${hex}`)
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio. Order-independent; always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @job-tracker/config test`
Expected: PASS, 6 tests.

- [ ] **Step 6: Write the failing token-floor test**

This is the guard that caught a real defect while this plan was written: `#757575` measured 4.41:1 on the canvas, below the AA floor, and was replaced by `#6F6F6F`.

`packages/config/src/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TOKENS } from './tokens.js'
import { contrastRatio } from './contrast.js'

const TEXT_ON = ['surface', 'canvas', 'surface-subtle'] as const
const TEXT = ['text', 'text-muted', 'text-subtle'] as const

describe('TOKENS', () => {
  it('is uppercase 6-digit hex throughout', () => {
    for (const [name, value] of Object.entries(TOKENS)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('contains no value from the superseded reference palette', () => {
    const forbidden = ['#000000', '#1A1C1C', '#444748', '#C4C7C7', '#747878']
    expect(Object.values(TOKENS).filter((v) => forbidden.includes(v))).toEqual([])
  })

  it('takes its ink from the logo mark', () => {
    expect(TOKENS['ink-pressed']).toBe('#181818')
    expect(TOKENS['ink']).toBe('#1E1E1E')
    expect(TOKENS['ink-hover']).toBe('#2A2A2A')
  })
})

describe('accessibility floors', () => {
  it('clears AA 4.5:1 for every text token on every background', () => {
    for (const bg of TEXT_ON) {
      for (const fg of TEXT) {
        const r = contrastRatio(TOKENS[fg]!, TOKENS[bg]!)
        expect(r, `${fg} on ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('clears AA 4.5:1 for text on the primary button', () => {
    for (const ink of ['ink', 'ink-hover', 'ink-pressed'] as const) {
      const r = contrastRatio(TOKENS['text-on-ink']!, TOKENS[ink]!)
      expect(r, `text-on-ink on ${ink} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('clears 1.4.11 non-text 3:1 for control outlines', () => {
    for (const bg of TEXT_ON) {
      const r = contrastRatio(TOKENS['outline']!, TOKENS[bg]!)
      expect(r, `outline on ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('clears AA for error text on both the canvas and the error fill', () => {
    expect(contrastRatio(TOKENS['error']!, TOKENS['canvas']!)).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(TOKENS['text-on-error-surface']!, TOKENS['error-surface']!),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('exempts outline-subtle, which is decorative only', () => {
    expect(contrastRatio(TOKENS['outline-subtle']!, TOKENS['surface']!)).toBeLessThan(3)
  })
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm --filter @job-tracker/config test`
Expected: FAIL — cannot resolve `./tokens.js`.

- [ ] **Step 8: Implement `tokens.ts`**

`packages/config/src/tokens.ts`:

```ts
/**
 * Single source of truth for colour. Mirrored in theme.css as @theme variables —
 * change both together. PRD Appendix A records the derivation: ink-pressed, ink and
 * ink-hover are sampled from the three tonal facets of brand/logo-mark.svg.
 */
export const TOKENS = {
  'ink-pressed': '#181818',
  'ink': '#1E1E1E',
  'ink-hover': '#2A2A2A',

  'text': '#1E1E1E',
  'text-muted': '#5C5C5C',
  'text-subtle': '#6F6F6F',
  'text-on-ink': '#FFFFFF',

  'canvas': '#FAFAFA',
  'surface': '#FFFFFF',
  'surface-subtle': '#F4F4F4',
  'surface-inverse': '#1E1E1E',

  'outline': '#8A8A8A',
  'outline-subtle': '#E4E4E4',

  'error': '#BA1A1A',
  'error-surface': '#FFDAD6',
  'text-on-error-surface': '#93000A',
} as const satisfies Record<string, string>

export type TokenName = keyof typeof TOKENS
```

- [ ] **Step 9: Run it to verify it passes**

Run: `pnpm --filter @job-tracker/config test`
Expected: PASS, 12 tests. If any accessibility floor fails, the token is wrong — change the token, never the floor.

- [ ] **Step 10: Write `theme.css`**

`packages/config/theme.css`:

```css
@theme {
  --color-ink-pressed: #181818;
  --color-ink: #1E1E1E;
  --color-ink-hover: #2A2A2A;

  --color-text: #1E1E1E;
  --color-text-muted: #5C5C5C;
  --color-text-subtle: #6F6F6F;
  --color-text-on-ink: #FFFFFF;

  --color-canvas: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F4F4F4;
  --color-surface-inverse: #1E1E1E;

  --color-outline: #8A8A8A;
  --color-outline-subtle: #E4E4E4;

  --color-error: #BA1A1A;
  --color-error-surface: #FFDAD6;
  --color-text-on-error-surface: #93000A;

  --radius-sm: 0.25rem;
  --radius-DEFAULT: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;

  --font-sans: Geist, ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 11: Wire the theme into all three apps**

Replace the contents of each `apps/*/app/globals.css` with — adjusting nothing, the relative paths are the same from all three apps:

```css
@import "tailwindcss";
@import "@job-tracker/config/theme.css";

/* Tailwind 4 only generates classes it can see. Workspace packages are outside
   the app root, so they must be declared explicitly or every ui component
   renders unstyled. */
@source "../../../packages/ui/src";

body {
  background-color: var(--color-canvas);
  color: var(--color-text);
}
```

- [ ] **Step 12: Write the raw-colour ESLint rule**

`packages/config/eslint-rules/no-raw-color.js`:

```js
const FORBIDDEN = new Set(['#000000', '#1a1c1c', '#444748', '#c4c7c7', '#747878'])

/** @type {import('eslint').Rule.RuleModule} */
export const noRawColor = {
  meta: {
    type: 'problem',
    docs: { description: 'Use design tokens instead of colour literals' },
    schema: [],
    messages: {
      raw: 'Raw colour "{{value}}" — use a token utility (bg-ink, text-text-muted, border-outline). Tokens live in @job-tracker/config.',
      superseded:
        'Colour "{{value}}" belongs to the superseded reference palette (PRD §9). Use a token utility instead.',
    },
  },
  create(context) {
    function check(node, value) {
      if (typeof value !== 'string') return
      for (const m of value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const hex = m[0].toLowerCase()
        const full = hex.length === 4
          ? '#' + hex.slice(1).split('').map((c) => c + c).join('')
          : hex
        context.report({
          node,
          messageId: FORBIDDEN.has(full) ? 'superseded' : 'raw',
          data: { value: m[0] },
        })
      }
    }
    return {
      Literal(node) { check(node, node.value) },
      TemplateElement(node) { check(node, node.value.raw) },
    }
  },
}
```

- [ ] **Step 13: Write the shared flat ESLint config**

`packages/config/eslint.base.mjs`:

```js
import { noRawColor } from './eslint-rules/no-raw-color.js'

export const jobTrackerRules = {
  plugins: { 'job-tracker': { rules: { 'no-raw-color': noRawColor } } },
  rules: { 'job-tracker/no-raw-color': 'error' },
}
```

Append to each `apps/*/eslint.config.mjs`, inside the exported array:

```js
import { jobTrackerRules } from '@job-tracker/config/eslint'
// ...
  jobTrackerRules,
```

- [ ] **Step 14: Prove the rule fires, then prove it passes**

```bash
cat > apps/dashboard/app/lint-probe.ts <<'EOF'
export const bad = '#000000'
EOF
pnpm --filter dashboard lint
```
Expected: FAIL, reporting the superseded-palette message.

```bash
rm apps/dashboard/app/lint-probe.ts
pnpm turbo lint typecheck test
```
Expected: all PASS.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: design tokens with enforced contrast floors and colour lint"
```

---

## Task 3: UI primitives

**Files:**
- Create: `packages/ui/package.json`, `tsconfig.json`, `vitest.config.ts`, `test/setup.ts`
- Create: `packages/ui/src/{cn,button,input,card,checkbox,divider,form-error,logo,auth-shell}.tsx` (`cn` is `.ts`)
- Create: `packages/ui/src/{button,input,logo,auth-shell}.test.tsx`
- Modify: `apps/*/package.json` to depend on `@job-tracker/ui`

**Interfaces:**
- Consumes: token utilities from Task 2.
- Produces, all named exports from `@job-tracker/ui`:
  - `Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; pending?: boolean })`
  - `Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; icon?: React.ReactNode; revealable?: boolean })`
  - `Card`, `Divider({ label?: string })`, `FormError({ message?: string })`
  - `Checkbox(props: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode })`
  - `Logo({ className?: string })` — inline SVG, `fill="currentColor"`
  - `AuthShell({ headline, sub, children })`
  - `cn(...classes: Array<string | false | null | undefined>): string`

- [ ] **Step 1: Create the package**

`packages/ui/package.json`:
```json
{
  "name": "@job-tracker/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": { "@job-tracker/config": "workspace:*" },
  "peerDependencies": { "react": "19.2.8", "react-dom": "19.2.8" },
  "devDependencies": {
    "@testing-library/jest-dom": "7.0.0",
    "@testing-library/react": "16.3.2",
    "@types/react": "19.2.18",
    "@vitejs/plugin-react": "6.0.5",
    "jsdom": "30.0.1",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "vitest": "4.1.10"
  }
}
```

`packages/ui/tsconfig.json`:
```json
{
  "extends": "@job-tracker/config/tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"]
}
```

`packages/ui/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.tsx'],
  },
})
```

`packages/ui/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

```bash
pnpm install
```

- [ ] **Step 2: Write the failing component tests**

`packages/ui/src/button.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button.js'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Sign In</Button>)
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('uses the ink token for the primary variant, never a raw colour', () => {
    render(<Button>Go</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('bg-ink')
    expect(cls).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('is disabled and busy while pending', () => {
    render(<Button pending>Go</Button>)
    const b = screen.getByRole('button')
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })
})
```

`packages/ui/src/input.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './input.js'

describe('Input', () => {
  it('associates its label with the control', () => {
    render(<Input label="Email" name="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('exposes an error to assistive tech and marks the field invalid', () => {
    render(<Input label="Email" name="email" error="Required" />)
    const field = screen.getByLabelText('Email')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
    expect(field.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
  })

  it('bounds a focusable control with the accessible outline token', () => {
    render(<Input label="Email" name="email" />)
    const cls = screen.getByLabelText('Email').className
    expect(cls).toContain('border-outline')
    // outline-subtle fails WCAG 1.4.11 on a control — PRD Appendix A
    expect(cls).not.toContain('border-outline-subtle')
  })

  it('offers a reveal toggle only when asked', () => {
    const { rerender } = render(<Input label="Password" type="password" />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<Input label="Password" type="password" revealable />)
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
  })
})
```

`packages/ui/src/logo.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './logo.js'

describe('Logo', () => {
  it('is labelled for assistive tech', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Job Tracker AI' })).toBeInTheDocument()
  })

  it('inherits colour rather than hard-coding it', () => {
    render(<Logo />)
    const path = screen.getByRole('img', { name: 'Job Tracker AI' }).querySelector('path')
    expect(path).toHaveAttribute('fill', 'currentColor')
  })

  it('keeps the traced viewBox, so the geometry stays verifiable', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Job Tracker AI' }))
      .toHaveAttribute('viewBox', '0 0 556 766')
  })
})
```

`packages/ui/src/auth-shell.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthShell } from './auth-shell.js'

describe('AuthShell', () => {
  it('renders the marketing headline as the page heading and shows the form', () => {
    render(
      <AuthShell headline="Land your next opportunity with AI." sub="Organize applications.">
        <form aria-label="sign in" />
      </AuthShell>,
    )
    expect(screen.getByRole('heading', { level: 1 }))
      .toHaveTextContent('Land your next opportunity with AI.')
    expect(screen.getByRole('form', { name: 'sign in' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Job Tracker AI' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @job-tracker/ui test`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `cn` and `Button`**

`packages/ui/src/cn.ts`:
```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
```

`packages/ui/src/button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn.js'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  pending?: boolean
}

const BASE =
  'inline-flex h-12 w-full items-center justify-center rounded text-sm font-medium ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ink disabled:opacity-60 disabled:cursor-not-allowed'

const VARIANT = {
  primary: 'bg-ink text-text-on-ink hover:bg-ink-hover active:bg-ink-pressed',
  secondary: 'bg-surface-subtle text-text border border-outline-subtle hover:bg-surface',
} as const

export function Button({ variant = 'primary', pending, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled ?? pending}
      aria-busy={pending ? 'true' : undefined}
      className={cn(BASE, VARIANT[variant], className)}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Implement `Input`**

`packages/ui/src/input.tsx`:
```tsx
'use client'

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn.js'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  icon?: ReactNode
  revealable?: boolean
}

export function Input({ label, error, icon, revealable, className, type, ...rest }: Props) {
  const id = rest.id ?? useId()
  const errorId = `${id}-error`
  const [revealed, setRevealed] = useState(false)
  const resolvedType = revealable && revealed ? 'text' : type

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-text-muted">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">
            {icon}
          </span>
        )}
        <input
          {...rest}
          id={id}
          type={resolvedType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-12 w-full rounded border bg-surface-subtle text-sm text-text',
            'placeholder:text-text-subtle focus:outline-2 focus:outline-offset-2 focus:outline-ink',
            icon ? 'pl-10 pr-3' : 'px-3',
            revealable && 'pr-11',
            error ? 'border-error' : 'border-outline',
            className,
          )}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Implement `Card`, `Divider`, `FormError`, `Checkbox`**

`packages/ui/src/card.tsx`:
```tsx
import type { ReactNode } from 'react'
import { cn } from './cn.js'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-subtle bg-surface p-8',
        'shadow-[0_20px_60px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
```

`packages/ui/src/divider.tsx`:
```tsx
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-outline-subtle" />
  return (
    <div className="flex items-center gap-4">
      <hr className="flex-1 border-outline-subtle" />
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <hr className="flex-1 border-outline-subtle" />
    </div>
  )
}
```

`packages/ui/src/form-error.tsx`:
```tsx
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded bg-error-surface px-3 py-2 text-sm text-text-on-error-surface"
    >
      {message}
    </p>
  )
}
```

`packages/ui/src/checkbox.tsx`:
```tsx
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }

export function Checkbox({ label, ...rest }: Props) {
  const id = rest.id ?? useId()
  return (
    <div className="flex items-start gap-3">
      <input
        {...rest}
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 rounded-sm border border-outline accent-ink"
      />
      <label htmlFor={id} className="text-sm text-text-muted">
        {label}
      </label>
    </div>
  )
}
```

- [ ] **Step 7: Implement `Logo`**

The path is copied verbatim from `brand/logo-mark.svg`, which was traced from the raster and verified at IoU 0.9932. Do not re-type it by hand; copy it.

`packages/ui/src/logo.tsx`:
```tsx
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 556 766"
      role="img"
      aria-label="Job Tracker AI"
      className={className ?? 'h-8 w-auto text-ink'}
    >
      <title>Job Tracker AI</title>
      <path
        fill="currentColor"
        d="M0 66A66 66 0 0 1 66 0L490 0A66 66 0 0 1 556 66L556 208.15A60 60 0 0 1 538.43 250.57L311.16 477.84A8 8 0 0 0 311.16 489.16L539.92 717.92A28 28 0 0 1 512.31 764.61L146.11 658.29A6 6 0 0 0 140.19 659.81L58.04 741.96A34 34 0 0 1 0 717.92L0 66Z"
      />
    </svg>
  )
}
```

- [ ] **Step 8: Implement `AuthShell` and the barrel**

`packages/ui/src/auth-shell.tsx`:
```tsx
import type { ReactNode } from 'react'
import { Logo } from './logo.js'

export function AuthShell({
  headline,
  sub,
  children,
}: {
  headline: string
  sub: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-12 md:grid-cols-2 md:px-12 md:py-24">
        {/* Left panel is decorative context; it drops away on small screens. */}
        <section className="hidden flex-col justify-center md:flex">
          <Logo className="mb-12 h-12 w-auto text-ink" />
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-text lg:text-5xl">
            {headline}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-text-muted">{sub}</p>
        </section>
        <section className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md">
            <Logo className="mb-8 h-10 w-auto text-ink md:hidden" />
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
```

`packages/ui/src/index.ts`:
```ts
export { cn } from './cn.js'
export { Button } from './button.js'
export { Input } from './input.js'
export { Card } from './card.js'
export { Checkbox } from './checkbox.js'
export { Divider } from './divider.js'
export { FormError } from './form-error.js'
export { Logo } from './logo.js'
export { AuthShell } from './auth-shell.js'
```

Note: `AuthShell` renders `<h1>` so the test's `heading level 1` query resolves; the mobile `Logo` is hidden by CSS but still in the DOM, which is why the test queries by role rather than counting.

- [ ] **Step 9: Run the tests to verify they pass**

Run: `pnpm --filter @job-tracker/ui test`
Expected: PASS, 11 tests.

- [ ] **Step 10: Add the dependency to all three apps and verify the whole graph**

Add to each `apps/*/package.json` `dependencies`:
```json
"@job-tracker/ui": "workspace:*"
```

```bash
pnpm install
pnpm turbo lint typecheck test build
```
Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: ui primitives built on design tokens"
```

---

## Task 4: Database foundation and the security tests

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/20260801000000_profiles.sql`
- Create: `supabase/templates/confirmation.html`, `supabase/templates/recovery.html`
- Create: `test/package.json`, `test/vitest.config.ts`, `test/helpers/users.ts`, `test/rls.test.ts`
- Create: `.env.test.example`

**Interfaces:**
- Consumes: nothing from earlier tasks — this is independent of the UI work.
- Produces:
  - Table `public.profiles(id, full_name, role, accepted_terms_at, onboarding_complete, created_at)`.
  - Function `public.is_admin() returns boolean`.
  - Trigger `on_auth_user_created` creating the profile row from signup metadata.
  - Test helpers `admin` (service-role client), `createUser(email, password?, opts?)`, `clientFor(email, password?)` from `test/helpers/users.ts`.

- [ ] **Step 1: Initialise Supabase locally**

```bash
pnpm dlx supabase@2.111.0 init --force
pnpm dlx supabase@2.111.0 start
```
Expected: a table of local URLs and keys. Keep the output — Step 7 needs it.

- [ ] **Step 2: Configure auth for local development**

Merge into `supabase/config.toml`. `site_url` is the dashboard's port because the dashboard owns every auth screen:

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3001"
additional_redirect_urls = ["http://127.0.0.1:3001/auth/confirm", "http://127.0.0.1:3001/auth/callback"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = true
double_confirm_changes = true
secure_password_change = true

[auth.email.template.confirmation]
subject = "Confirm your email"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.recovery]
subject = "Reset your password"
content_path = "./supabase/templates/recovery.html"
```

`enable_confirmations = true` is what makes FR-43 hold: `signUp` then returns a user with **no session**, so an unconfirmed account cannot reach the dashboard at all.

- [ ] **Step 3: Write the email templates**

Both must use `token_hash`. The Supabase defaults point at `/auth/v1/verify`, which does not establish a server-side session — using them silently breaks the whole flow.

`supabase/templates/confirmation.html`:
```html
<h2>Confirm your email</h2>
<p>Welcome to Job Tracker AI. Confirm your address to finish setting up your account.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
    Confirm my email
  </a>
</p>
```

`supabase/templates/recovery.html`:
```html
<h2>Reset your password</h2>
<p>Use the link below to choose a new password. It can only be used once.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
    Choose a new password
  </a>
</p>
```

- [ ] **Step 4: Write the migration**

`supabase/migrations/20260801000000_profiles.sql`:

```sql
-- Profiles. One row per auth.users row, created by trigger (never by app code).
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  role                text not null default 'user' check (role in ('user','admin')),
  accepted_terms_at   timestamptz,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admin check. SECURITY DEFINER so it reads profiles with RLS bypassed: a policy on
-- profiles that queries profiles directly raises infinite recursion.
-- search_path is pinned because a definer function is otherwise open to
-- search-path manipulation.
create or replace function public.is_admin()
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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- auth.uid() is wrapped in a subselect so Postgres caches it per statement
-- rather than re-evaluating per row.
create policy profiles_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- FR-45: role must not be self-assignable. RLS cannot express a per-column
-- restriction — the row legitimately belongs to the user — so this is a column
-- privilege. Revoke everything, then grant back precisely what a user may write.
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, accepted_terms_at, onboarding_complete)
  on public.profiles to authenticated;

-- No insert policy and no insert grant: only the trigger below creates rows.
create or replace function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 5: Apply it**

```bash
pnpm dlx supabase@2.111.0 db reset
```
Expected: migration applies with no error.

- [ ] **Step 6: Create the test workspace**

`test/package.json`:
```json
{
  "name": "@job-tracker/test",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "@supabase/supabase-js": "2.111.0",
    "dotenv": "17.2.4",
    "vitest": "4.1.10"
  }
}
```

`test/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

config({ path: '../.env.test' })

export default defineConfig({
  test: { environment: 'node', include: ['**/*.test.ts'], fileParallelism: false },
})
```

Add `- 'test'` to `pnpm-workspace.yaml` `packages`, then `pnpm install`.

`fileParallelism: false` because these tests share one local database.

- [ ] **Step 7: Write `.env.test` from the running stack**

```bash
pnpm dlx supabase@2.111.0 status -o env | \
  sed -e 's/^API_URL=/SUPABASE_URL=/' \
      -e 's/^ANON_KEY=/SUPABASE_PUBLISHABLE_KEY=/' \
      -e 's/^SERVICE_ROLE_KEY=/SUPABASE_SERVICE_ROLE_KEY=/' \
  > .env.test
grep -E '^(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.test
```
Expected: three non-empty lines. Copy the same three names with placeholder values into `.env.test.example` and commit that file, not `.env.test` — `.gitignore` from Task 1 already excludes it.

- [ ] **Step 8: Write the test helpers**

`test/helpers/users.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY
if (!URL || !SERVICE || !PUBLISHABLE) {
  throw new Error('Missing local Supabase env — run: pnpm dlx supabase@2.111.0 status -o env')
}

const NO_PERSIST = { auth: { autoRefreshToken: false, persistSession: false } }
export const DEFAULT_PASSWORD = 'Test-Passw0rd!'

/** Service-role client. Bypasses RLS. Tests and scripts only, never app code. */
export const admin: SupabaseClient = createClient(URL, SERVICE, NO_PERSIST)

export async function createUser(
  email: string,
  password: string = DEFAULT_PASSWORD,
  opts: { fullName?: string; acceptedTerms?: boolean; confirmed?: boolean } = {},
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: opts.confirmed ?? true,
    user_metadata: {
      full_name: opts.fullName ?? 'Test User',
      accepted_terms: (opts.acceptedTerms ?? true) ? 'true' : 'false',
    },
  })
  if (error) throw error
  return data.user
}

export async function promoteToAdmin(userId: string) {
  const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', userId)
  if (error) throw error
}

/** A client authenticated as this user — subject to RLS and column grants. */
export async function clientFor(
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<SupabaseClient> {
  const c = createClient(URL!, PUBLISHABLE!, NO_PERSIST)
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
  return c
}

export async function deleteUser(userId: string) {
  await admin.auth.admin.deleteUser(userId)
}

/** Unique address per run, so tests never collide on a shared database. */
export function uniqueEmail(tag: string) {
  return `${tag}-${Math.random().toString(36).slice(2, 10)}@example.test`
}
```

- [ ] **Step 9: Write the failing security tests**

`test/rls.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  admin, createUser, clientFor, promoteToAdmin, deleteUser, uniqueEmail,
} from './helpers/users.js'

const emailA = uniqueEmail('alice')
const emailB = uniqueEmail('bob')
const emailAdmin = uniqueEmail('root')
let idA = '', idB = '', idAdmin = ''

beforeAll(async () => {
  idA = (await createUser(emailA, undefined, { fullName: 'Alice Example' })).id
  idB = (await createUser(emailB)).id
  idAdmin = (await createUser(emailAdmin)).id
  await promoteToAdmin(idAdmin)
})

afterAll(async () => {
  for (const id of [idA, idB, idAdmin]) await deleteUser(id)
})

describe('FR-3 — tenant isolation', () => {
  it('gives a user their own profile', async () => {
    const c = await clientFor(emailA)
    const { data, error } = await c.from('profiles').select('id, full_name').eq('id', idA)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: idA, full_name: 'Alice Example' }])
  })

  it('returns zero rows for another user, not an error', async () => {
    const c = await clientFor(emailA)
    const { data, error } = await c.from('profiles').select('id').eq('id', idB)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('leaks nothing through an unfiltered select', async () => {
    const c = await clientFor(emailA)
    const { data } = await c.from('profiles').select('id')
    expect(data?.map((r) => r.id)).toEqual([idA])
  })

  it('gives an anonymous client nothing', async () => {
    const anon = (await import('@supabase/supabase-js')).createClient(
      process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await anon.from('profiles').select('id')
    expect(data ?? []).toEqual([])
  })
})

describe('FR-45 — role cannot be self-assigned', () => {
  it('rejects a user promoting themselves', async () => {
    const c = await clientFor(emailA)
    const { error } = await c.from('profiles').update({ role: 'admin' }).eq('id', idA)
    expect(error).not.toBeNull()
  })

  it('leaves the role untouched after the attempt', async () => {
    const { data } = await admin.from('profiles').select('role').eq('id', idA).single()
    expect(data?.role).toBe('user')
  })

  it('still allows a user to update the columns they own', async () => {
    const c = await clientFor(emailA)
    const { error } = await c.from('profiles')
      .update({ full_name: 'Alice Renamed', onboarding_complete: true }).eq('id', idA)
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('full_name').eq('id', idA).single()
    expect(data?.full_name).toBe('Alice Renamed')
  })

  it('rejects a role change even when smuggled alongside a permitted column', async () => {
    const c = await clientFor(emailA)
    const { error } = await c.from('profiles')
      .update({ full_name: 'Nice Try', role: 'admin' }).eq('id', idA)
    expect(error).not.toBeNull()
  })
})

describe('admin read access', () => {
  it('lets an admin read other users without recursion', async () => {
    const c = await clientFor(emailAdmin)
    const { data, error } = await c.from('profiles').select('id')
    expect(error).toBeNull() // a recursive policy would surface as error 42P17 here
    expect(data!.length).toBeGreaterThanOrEqual(3)
    expect(data!.map((r) => r.id)).toContain(idB)
  })
})

describe('profile creation trigger', () => {
  it('creates exactly one row carrying the signup metadata', async () => {
    const email = uniqueEmail('trigger')
    const user = await createUser(email, undefined, { fullName: 'Trigger Case' })
    const { data } = await admin.from('profiles').select('*').eq('id', user.id)
    expect(data).toHaveLength(1)
    expect(data![0]!.full_name).toBe('Trigger Case')
    expect(data![0]!.role).toBe('user')
    expect(data![0]!.accepted_terms_at).not.toBeNull()
    await deleteUser(user.id)
  })

  it('leaves accepted_terms_at null when terms were not accepted', async () => {
    const email = uniqueEmail('noterms')
    const user = await createUser(email, undefined, { acceptedTerms: false })
    const { data } = await admin.from('profiles').select('accepted_terms_at').eq('id', user.id).single()
    expect(data?.accepted_terms_at).toBeNull()
    await deleteUser(user.id)
  })

  it('removes the profile when the user is deleted', async () => {
    const email = uniqueEmail('cascade')
    const user = await createUser(email)
    await deleteUser(user.id)
    const { data } = await admin.from('profiles').select('id').eq('id', user.id)
    expect(data).toEqual([])
  })
})
```

- [ ] **Step 10: Run them**

Run: `pnpm --filter @job-tracker/test test`
Expected: PASS, 13 tests. Two failures to watch for:
- `42P17 infinite recursion detected in policy` — `is_admin()` lost `security definer`.
- The self-promotion test passing without error — the column grants did not apply. Re-run `db reset` and confirm the `revoke`/`grant` block ran.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: profiles schema with postgres-enforced role and rls tests"
```

---

## Task 5: Supabase clients

**Files:**
- Create: `packages/db/package.json`, `tsconfig.json`, `src/{client,server,proxy,types}.ts`, `src/index.ts`
- Modify: `apps/dashboard/package.json`, `apps/admin/package.json` (dependency), `apps/dashboard/.env.local`

**Interfaces:**
- Consumes: the schema from Task 4.
- Produces:
  - `createBrowserSupabase(): SupabaseClient<Database>` from `@job-tracker/db/client`
  - `createServerSupabase(): Promise<SupabaseClient<Database>>` from `@job-tracker/db/server`
  - `refreshSession(request: NextRequest): Promise<{ response: NextResponse; claims: JwtClaims | null; redirect(url: URL): NextResponse }>` from `@job-tracker/db/proxy`
  - `Database` type from `@job-tracker/db/types`

`apps/web` deliberately does **not** get this dependency — it must ship no Supabase code.

- [ ] **Step 1: Create the package**

`packages/db/package.json`:
```json
{
  "name": "@job-tracker/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./client": "./src/client.ts",
    "./server": "./src/server.ts",
    "./proxy": "./src/proxy.ts",
    "./types": "./src/types.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "gen:types": "pnpm dlx supabase@2.111.0 gen types typescript --local > src/types.ts"
  },
  "dependencies": {
    "@supabase/ssr": "0.12.4",
    "@supabase/supabase-js": "2.111.0"
  },
  "peerDependencies": { "next": "16.2.12" },
  "devDependencies": { "next": "16.2.12" }
}
```

`packages/db/tsconfig.json`:
```json
{
  "extends": "@job-tracker/config/tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 2: Generate the database types**

```bash
pnpm install
pnpm --filter @job-tracker/db gen:types
head -20 packages/db/src/types.ts
```
Expected: a `Database` interface containing `profiles`. If the file is empty, local Supabase is not running — `pnpm db:start`.

- [ ] **Step 3: Implement the browser client**

`packages/db/src/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types.js'

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
```

- [ ] **Step 4: Implement the server client**

`packages/db/src/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types.js'

export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
            // Server Components cannot set cookies. proxy.ts refreshes the
            // session on every request, so there is nothing to recover here.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 5: Implement the session refresher**

`packages/db/src/proxy.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types.js'

export type JwtClaims = { sub: string; email?: string; [key: string]: unknown }

/**
 * Refreshes the Supabase session for one request and reports its verified claims.
 *
 * The returned `redirect` must be used for any redirect: a bare
 * NextResponse.redirect() discards the refreshed auth cookies, which logs the
 * user out on the very request that renewed their token.
 */
export async function refreshSession(request: NextRequest) {
  const response = NextResponse.next({ request })
  let authHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
          // NFR-12. @supabase/ssr supplies Cache-Control: private, no-store here.
          // Dropping these lets a CDN cache a response carrying one user's
          // session cookie and serve it to someone else.
          authHeaders = headers
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
        },
      },
    },
  )

  // Verified locally against the JWT signature; refreshes the token when expired.
  const { data: claims } = await supabase.auth.getClaims()

  function redirect(url: URL) {
    const r = NextResponse.redirect(url)
    for (const c of response.cookies.getAll()) r.cookies.set(c)
    for (const [k, v] of Object.entries(authHeaders)) r.headers.set(k, v)
    return r
  }

  return { response, claims: (claims as JwtClaims | null) ?? null, redirect }
}
```

- [ ] **Step 6: Wire env and dependency into the dashboard**

Add to `apps/dashboard/package.json` and `apps/admin/package.json` `dependencies`:
```json
"@job-tracker/db": "workspace:*"
```

`apps/dashboard/.env.local` — take the values from `.env.test` written in Task 4:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from supabase status>
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001
```

Copy `apps/dashboard/.env.local` to `apps/dashboard/.env.local.example` with the key value replaced by `<from: pnpm dlx supabase@2.111.0 status -o env>` and commit the example only.

- [ ] **Step 7: Verify it compiles and no key leaked into a bundle**

```bash
pnpm install
pnpm turbo typecheck build
grep -rl "SUPABASE_SERVICE_ROLE_KEY" apps packages && echo "LEAK — fix before committing" || echo "no service-role reference in apps or packages"
```
Expected: builds pass, and the grep reports no leak.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: supabase browser, server and session-refresh clients"
```

---

## Task 6: Sign up, email confirmation, and check-email

**Files:**
- Create: `apps/dashboard/lib/actions/auth.ts`, `apps/dashboard/lib/validation.ts`
- Create: `apps/dashboard/app/(auth)/sign-up/page.tsx`, `sign-up/sign-up-form.tsx`
- Create: `apps/dashboard/app/(auth)/check-email/page.tsx`
- Create: `apps/dashboard/app/auth/confirm/route.ts`, `apps/dashboard/app/auth/auth-code-error/page.tsx`
- Create: `apps/dashboard/app/dashboard/page.tsx`
- Create: `test/signup.test.ts`

**Interfaces:**
- Consumes: `AuthShell`, `Card`, `Input`, `Button`, `Checkbox`, `FormError` (Task 3); `createServerSupabase` (Task 5); the trigger (Task 4).
- Produces:
  - `type AuthState = { error?: string }` and `signUpAction(prev: AuthState, form: FormData): Promise<AuthState>` from `lib/actions/auth.ts`
  - `validateSignUp(input): string | null` from `lib/validation.ts`
  - Route `GET /auth/confirm?token_hash&type&next`

- [ ] **Step 1: Write the failing validation test**

Add `vitest@4.1.10` to `apps/dashboard` devDependencies, create `apps/dashboard/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
})
```
Add `"test": "vitest run"` to its scripts.

`apps/dashboard/lib/validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateSignUp } from './validation.js'

const ok = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.test',
  password: 'Str0ng-Passphrase',
  confirmPassword: 'Str0ng-Passphrase',
  terms: true,
}

describe('validateSignUp', () => {
  it('accepts a complete, valid submission', () => {
    expect(validateSignUp(ok)).toBeNull()
  })

  it('requires a name', () => {
    expect(validateSignUp({ ...ok, fullName: '  ' })).toMatch(/name/i)
  })

  it('requires a plausible email', () => {
    expect(validateSignUp({ ...ok, email: 'not-an-email' })).toMatch(/email/i)
  })

  it('requires at least 8 characters of password', () => {
    expect(validateSignUp({ ...ok, password: 'short7!', confirmPassword: 'short7!' }))
      .toMatch(/8 characters/i)
  })

  it('requires the two passwords to match', () => {
    expect(validateSignUp({ ...ok, confirmPassword: 'different' })).toMatch(/match/i)
  })

  it('requires the terms checkbox — FR-44', () => {
    expect(validateSignUp({ ...ok, terms: false })).toMatch(/terms/i)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter dashboard test`
Expected: FAIL — cannot resolve `./validation.js`.

- [ ] **Step 3: Implement validation**

`apps/dashboard/lib/validation.ts`:
```ts
export type SignUpInput = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
}

export const MIN_PASSWORD_LENGTH = 8

export function validateSignUp(input: SignUpInput): string | null {
  if (!input.fullName.trim()) return 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return 'Enter a valid email address.'
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
  }
  if (input.password !== input.confirmPassword) return 'The two passwords do not match.'
  if (!input.terms) return 'Accept the Terms of Service to continue.'
  return null
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter dashboard test`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the sign-up Server Action**

`apps/dashboard/lib/actions/auth.ts`:
```ts
'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@job-tracker/db/server'
import { validateSignUp } from '../validation.js'

export type AuthState = { error?: string }

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3001'
}

export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = {
    fullName: String(form.get('fullName') ?? ''),
    email: String(form.get('email') ?? '').trim(),
    password: String(form.get('password') ?? ''),
    confirmPassword: String(form.get('confirmPassword') ?? ''),
    terms: form.get('terms') === 'on',
  }

  const invalid = validateSignUp(input)
  if (invalid) return { error: invalid }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
      data: { full_name: input.fullName.trim(), accepted_terms: 'true' },
    },
  })

  // FR-46: an already-registered address must be indistinguishable from a new
  // one. Supabase notifies the existing owner rather than creating a duplicate,
  // so the only correct response here is the same one as success.
  if (error && !/already registered/i.test(error.message)) {
    return { error: 'Could not create your account. Try again shortly.' }
  }

  redirect(`/check-email?email=${encodeURIComponent(input.email)}&reason=confirm`)
}
```

- [ ] **Step 6: Write the sign-up screen**

`apps/dashboard/app/(auth)/sign-up/sign-up-form.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Card, Checkbox, FormError, Input } from '@job-tracker/ui'
import { signUpAction, type AuthState } from '@/lib/actions/auth'

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Create your account</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Start tracking every application in one place.
      </p>

      <form action={action} aria-label="Create account" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <Input label="Full Name" name="fullName" autoComplete="name" placeholder="John Doe" required />
        <Input label="Email Address" name="email" type="email" autoComplete="email"
               placeholder="you@example.com" required />
        <Input label="Password" name="password" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Input label="Confirm Password" name="confirmPassword" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Checkbox
          name="terms"
          required
          label={
            <>
              I agree to the{' '}
              <Link href="/terms" className="underline hover:text-text">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-text">Privacy Policy</Link>.
            </>
          }
        />
        <Button type="submit" pending={pending}>
          {pending ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-text hover:underline">Sign In</Link>
      </p>
    </Card>
  )
}
```

`apps/dashboard/app/(auth)/sign-up/page.tsx`:
```tsx
import { AuthShell } from '@job-tracker/ui'
import { SignUpForm } from './sign-up-form'

export const metadata = { title: 'Create your account · Job Tracker AI' }

export default function SignUpPage() {
  return (
    <AuthShell
      headline="Land your next opportunity with AI."
      sub="Organize applications, generate tailored resumes, create cover letters, prepare for interviews, and track every opportunity from one beautiful workspace."
    >
      <SignUpForm />
    </AuthShell>
  )
}
```

- [ ] **Step 7: Write check-email, the confirm handler, and the error page**

`apps/dashboard/app/(auth)/check-email/page.tsx`:
```tsx
import Link from 'next/link'
import { AuthShell, Card } from '@job-tracker/ui'

export const metadata = { title: 'Check your inbox · Job Tracker AI' }

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; reason?: string }>
}) {
  const { email, reason } = await searchParams
  const isRecovery = reason === 'recovery'

  return (
    <AuthShell
      headline="Land your dream role faster."
      sub="One workspace for every application, from first save to signed offer."
    >
      <Card>
        <h2 className="text-center text-2xl font-semibold text-text">Check your inbox</h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-text-muted">
          {isRecovery
            ? 'If that address has an account, we have sent a link to choose a new password.'
            : 'We have sent a confirmation link to finish setting up your account.'}
          {email ? <> It is on its way to <span className="text-text">{email}</span>.</> : null}
        </p>
        <p className="mt-6 text-center text-xs text-text-subtle">
          The link can only be used once and expires shortly. Check your spam folder if it has
          not arrived in a few minutes.
        </p>
        <p className="mt-8 text-center text-sm text-text-muted">
          <Link href="/sign-in" className="font-semibold text-text hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
```

`apps/dashboard/app/auth/confirm/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabase } from '@job-tracker/db/server'

/**
 * Verifies emailed links: signup confirmation and password recovery.
 *
 * These arrive as ?token_hash=…&type=… and must go through verifyOtp. They do
 * NOT carry ?code=, so exchangeCodeForSession — which /auth/callback uses for
 * OAuth — fails here. Keeping the two handlers separate is deliberate.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  // Never redirect anywhere but our own paths.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (tokenHash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

`apps/dashboard/app/auth/auth-code-error/page.tsx`:
```tsx
import Link from 'next/link'
import { AuthShell, Button, Card } from '@job-tracker/ui'

export const metadata = { title: 'That link did not work · Job Tracker AI' }

export default function AuthCodeErrorPage() {
  return (
    <AuthShell
      headline="Land your dream role faster."
      sub="One workspace for every application, from first save to signed offer."
    >
      <Card>
        <h2 className="text-center text-2xl font-semibold text-text">That link did not work</h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-text-muted">
          Email links can only be used once, and they expire. Request a fresh one and it will
          work.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/forgot-password"><Button>Send a new link</Button></Link>
          <Link href="/sign-in"><Button variant="secondary">Back to sign in</Button></Link>
        </div>
      </Card>
    </AuthShell>
  )
}
```

- [ ] **Step 8: Write the placeholder protected page**

`apps/dashboard/app/dashboard/page.tsx`:
```tsx
import { createServerSupabase } from '@job-tracker/db/server'
import { Logo } from '@job-tracker/ui'
import { signOutAction } from '@/lib/actions/auth'

export const metadata = { title: 'Dashboard · Job Tracker AI' }

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()

  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between">
        <Logo className="h-8 w-auto text-ink" />
        <form action={signOutAction}>
          <button type="submit" className="text-sm text-text-muted hover:text-text">
            Sign out
          </button>
        </form>
      </div>
      <div className="mx-auto mt-16 max-w-[1200px]">
        <h1 className="text-3xl font-bold tracking-tight text-text">You are signed in</h1>
        <p className="mt-3 text-sm text-text-muted">
          Signed in as {String(claims?.email ?? 'unknown')}. The board arrives in Phase 1.0.
        </p>
      </div>
    </main>
  )
}
```

Add `signOutAction` to `apps/dashboard/lib/actions/auth.ts`:
```ts
export async function signOutAction() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/sign-in')
}
```

- [ ] **Step 9: Write the signup integration test**

`test/signup.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { admin, uniqueEmail, deleteUser } from './helpers/users.js'

const anon = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

let created: string[] = []
afterEach(async () => {
  for (const id of created) await deleteUser(id)
  created = []
})

describe('FR-43 — confirmation gates the session', () => {
  it('creates a user but no session until the email is confirmed', async () => {
    const email = uniqueEmail('confirm')
    const { data, error } = await anon().auth.signUp({
      email,
      password: 'Str0ng-Passphrase',
      options: { data: { full_name: 'Needs Confirm', accepted_terms: 'true' } },
    })
    expect(error).toBeNull()
    expect(data.user).not.toBeNull()
    expect(data.session).toBeNull() // this is what keeps FR-43 true
    created.push(data.user!.id)
  })

  it('refuses password sign-in while unconfirmed', async () => {
    const email = uniqueEmail('unconfirmed')
    const { data } = await anon().auth.signUp({
      email, password: 'Str0ng-Passphrase',
      options: { data: { full_name: 'Nope', accepted_terms: 'true' } },
    })
    created.push(data.user!.id)
    const { error } = await anon().auth.signInWithPassword({
      email, password: 'Str0ng-Passphrase',
    })
    expect(error).not.toBeNull()
  })

  it('records terms acceptance from signup metadata — FR-44', async () => {
    const email = uniqueEmail('terms')
    const { data } = await anon().auth.signUp({
      email, password: 'Str0ng-Passphrase',
      options: { data: { full_name: 'Terms Ok', accepted_terms: 'true' } },
    })
    created.push(data.user!.id)
    const { data: row } = await admin.from('profiles')
      .select('full_name, accepted_terms_at').eq('id', data.user!.id).single()
    expect(row?.full_name).toBe('Terms Ok')
    expect(row?.accepted_terms_at).not.toBeNull()
  })

  it('does not reveal that an address is already registered — FR-46', async () => {
    const email = uniqueEmail('dupe')
    const first = await anon().auth.signUp({
      email, password: 'Str0ng-Passphrase',
      options: { data: { full_name: 'First', accepted_terms: 'true' } },
    })
    created.push(first.data.user!.id)
    const second = await anon().auth.signUp({
      email, password: 'Different-Passphrase',
      options: { data: { full_name: 'Second', accepted_terms: 'true' } },
    })
    expect(second.error).toBeNull()
    const { count } = await admin.from('profiles')
      .select('id', { count: 'exact', head: true }).eq('id', first.data.user!.id)
    expect(count).toBe(1)
  })
})
```

- [ ] **Step 10: Run everything**

```bash
pnpm --filter @job-tracker/test test
pnpm turbo lint typecheck test build
```
Expected: all PASS.

- [ ] **Step 11: Verify the flow by hand against Inbucket**

```bash
pnpm --filter dashboard dev &
sleep 15
open http://127.0.0.1:3001/sign-up
open http://127.0.0.1:54324
```
Submit the form, open the message in Inbucket, click the confirmation link. Expected: it lands on `/dashboard` showing "You are signed in". Confirm the link contains `token_hash=` and `type=email` — if it contains `/auth/v1/verify`, the template override in Task 4 did not take effect.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: sign up, email confirmation and check-email"
```

---

## Task 7: Sign in, route protection, and sign out

**Files:**
- Create: `apps/dashboard/proxy.ts`, `apps/dashboard/app/(auth)/sign-in/page.tsx`, `sign-in/sign-in-form.tsx`
- Create: `apps/dashboard/app/auth/callback/route.ts`
- Create: `apps/dashboard/e2e/auth.spec.ts`, `apps/dashboard/playwright.config.ts`
- Modify: `apps/dashboard/lib/actions/auth.ts`

**Interfaces:**
- Consumes: `refreshSession` (Task 5), `AuthState` (Task 6).
- Produces: `signInAction(prev: AuthState, form: FormData): Promise<AuthState>`; the route-protection contract — unauthenticated requests to anything outside the public list redirect to `/sign-in?next=<path>`.

- [ ] **Step 1: Write `proxy.ts` — note the filename**

This file **must** be `proxy.ts` with an export named `proxy`. Next.js 16 renamed both. A file called `middleware.ts` is ignored without warning, which would leave every protected route open.

`apps/dashboard/proxy.ts`:
```ts
import { type NextRequest } from 'next/server'
import { refreshSession } from '@job-tracker/db/proxy'

const PUBLIC_PREFIXES = [
  '/sign-in', '/sign-up', '/forgot-password', '/check-email', '/reset-password', '/auth',
]

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { response, claims, redirect } = await refreshSession(request)
  const { pathname } = request.nextUrl

  if (!claims && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.search = ''
    url.searchParams.set('next', pathname)
    return redirect(url)
  }

  // A signed-in user has no business on the sign-in or sign-up screen.
  if (claims && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

- [ ] **Step 2: Add the sign-in action**

Append to `apps/dashboard/lib/actions/auth.ts`:
```ts
export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const next = String(form.get('next') ?? '/dashboard')

  if (!email || !password) return { error: 'Enter your email and password.' }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // §12.1: an unconfirmed account gets the helpful path. This does reveal that
    // the address exists, a knowing narrowing of FR-46 limited to unconfirmed
    // accounts — the PRD chose the resend affordance over strict opacity here.
    if (/email not confirmed/i.test(error.message)) {
      redirect(`/check-email?email=${encodeURIComponent(email)}&reason=confirm`)
    }
    // Everything else collapses to one message naming neither field.
    return { error: 'Email or password is incorrect.' }
  }

  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
}
```

- [ ] **Step 3: Write the sign-in screen**

`apps/dashboard/app/(auth)/sign-in/sign-in-form.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Card, FormError, Input } from '@job-tracker/ui'
import { signInAction, type AuthState } from '@/lib/actions/auth'

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Welcome back</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Sign in to continue to Job Tracker AI
      </p>

      <form action={action} aria-label="Sign in" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <input type="hidden" name="next" value={next} />
        <Input label="Email" name="email" type="email" autoComplete="email"
               placeholder="you@example.com" required />
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium tracking-wide text-text-muted">Password</span>
            <Link href="/forgot-password" className="text-xs font-semibold text-text hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input label="Password" name="password" type="password" revealable
                 autoComplete="current-password" placeholder="••••••••" required
                 className="mt-0" />
        </div>
        <Button type="submit" pending={pending}>{pending ? 'Signing in…' : 'Sign In'}</Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-semibold text-text hover:underline">Create Account</Link>
      </p>
    </Card>
  )
}
```

The reference design shows the "Forgot password?" link on the same line as the Password label, which is why that field is wrapped rather than using the plain `Input` label. `Input` still renders its own label for assistive tech; the visible duplicate is hidden from the accessibility tree in Step 4.

`apps/dashboard/app/(auth)/sign-in/page.tsx`:
```tsx
import { AuthShell } from '@job-tracker/ui'
import { SignInForm } from './sign-in-form'

export const metadata = { title: 'Sign in · Job Tracker AI' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthShell
      headline="Land your next opportunity with AI."
      sub="Organize applications, generate tailored resumes, create cover letters, prepare for interviews, and track every opportunity from one beautiful workspace."
    >
      <SignInForm next={next && next.startsWith('/') ? next : '/dashboard'} />
    </AuthShell>
  )
}
```

- [ ] **Step 4: Remove the duplicated password label from the accessibility tree**

In `packages/ui/src/input.tsx`, add a `labelHidden` prop so the sign-in screen can render the label visually once:

```tsx
// add to Props
  labelHidden?: boolean
```
```tsx
// replace the <label> element
      <label
        htmlFor={id}
        className={
          labelHidden
            ? 'sr-only'
            : 'text-xs font-medium tracking-wide text-text-muted'
        }
      >
        {label}
      </label>
```

`sr-only` ships with Tailwind 4 — no utility needs defining. Pass `labelHidden` on the sign-in password field, and add to `packages/ui/src/input.test.tsx`:
```tsx
  it('keeps the label accessible when visually hidden', () => {
    render(<Input label="Password" labelHidden type="password" />)
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
```

- [ ] **Step 5: Add the OAuth callback stub**

Plan 2 fills this in. It exists now so the public-path list and the redirect allow-list are complete and do not need revisiting.

`apps/dashboard/app/auth/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@job-tracker/db/server'

/** OAuth only. Email links use ?token_hash and are handled by /auth/confirm. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

- [ ] **Step 6: Set up Playwright**

```bash
cd apps/dashboard
pnpm add -D @playwright/test@1.62.1
pnpm dlx playwright install chromium
cd ../..
```

`apps/dashboard/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:3001' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3001/sign-in',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

Add to `apps/dashboard/package.json` scripts: `"e2e": "playwright test"`.

- [ ] **Step 7: Write the end-to-end auth test**

`apps/dashboard/e2e/auth.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

const INBUCKET = 'http://127.0.0.1:54324'
const PASSWORD = 'Str0ng-Passphrase'
const email = () => `e2e-${Math.random().toString(36).slice(2, 10)}@example.test`

/** Newest message for this address, via the local Inbucket API. */
async function latestLink(request: import('@playwright/test').APIRequestContext, addr: string) {
  const mailbox = addr.split('@')[0]!
  const list = await (await request.get(`${INBUCKET}/api/v1/mailbox/${mailbox}`)).json()
  expect(list.length, 'no message arrived').toBeGreaterThan(0)
  const id = list[list.length - 1].id
  const msg = await (await request.get(`${INBUCKET}/api/v1/mailbox/${mailbox}/${id}`)).json()
  const body: string = msg.body.html || msg.body.text
  const href = body.match(/href="([^"]+auth\/confirm[^"]*)"/)?.[1]
  expect(href, 'no /auth/confirm link in the email').toBeTruthy()
  return href!.replace(/&amp;/g, '&')
}

test('unauthenticated access redirects to sign-in and remembers the destination', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/)
})

test('sign up, confirm, land on the dashboard, sign out', async ({ page, request }) => {
  const addr = email()

  await page.goto('/sign-up')
  await page.getByLabel('Full Name').fill('E2E User')
  await page.getByLabel('Email Address').fill(addr)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm Password').fill(PASSWORD)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create Account' }).click()

  await expect(page).toHaveURL(/\/check-email/)
  await expect(page.getByText('Check your inbox')).toBeVisible()

  await page.goto(await latestLink(request, addr))
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'You are signed in' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in/)
})

test('wrong password names neither field', async ({ page, request }) => {
  const addr = email()
  await page.goto('/sign-up')
  await page.getByLabel('Full Name').fill('E2E User')
  await page.getByLabel('Email Address').fill(addr)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm Password').fill(PASSWORD)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.goto(await latestLink(request, addr))

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByLabel('Email').fill(addr)
  await page.getByLabel('Password').fill('completely-wrong')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')
})

test('NFR-12 — a response that sets an auth cookie forbids shared caching', async ({ page, request }) => {
  const addr = email()
  await page.goto('/sign-up')
  await page.getByLabel('Full Name').fill('E2E User')
  await page.getByLabel('Email Address').fill(addr)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm Password').fill(PASSWORD)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create Account' }).click()

  // The confirm response is the one that establishes the session, so it is the
  // one that must never be cacheable by a shared proxy.
  const response = await page.goto(await latestLink(request, addr))
  expect(response!.headers()['cache-control'] ?? '').toContain('no-store')
})
```

- [ ] **Step 8: Run everything**

```bash
pnpm db:start
pnpm turbo lint typecheck test build
pnpm --filter dashboard e2e
```
Expected: unit and integration suites PASS; four Playwright tests PASS.

If the first e2e test fails with the dashboard rendering instead of redirecting, the proxy is not running — confirm the file is named `proxy.ts` and exports `proxy`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: sign in, route protection via proxy.ts, sign out"
```

---

## Task 8: Password recovery

**Files:**
- Create: `apps/dashboard/app/(auth)/forgot-password/page.tsx`, `forgot-password/forgot-form.tsx`
- Create: `apps/dashboard/app/(auth)/reset-password/page.tsx`, `reset-password/reset-form.tsx`
- Modify: `apps/dashboard/lib/actions/auth.ts`, `apps/dashboard/lib/validation.ts`
- Modify: `apps/dashboard/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `/auth/confirm` (Task 6), `refreshSession` (Task 5).
- Produces: `requestResetAction`, `updatePasswordAction`, and `validateNewPassword(password, confirm): string | null`.

- [ ] **Step 1: Write the failing validation test**

Append to `apps/dashboard/lib/validation.test.ts`:
```ts
import { validateNewPassword } from './validation.js'

describe('validateNewPassword', () => {
  it('accepts a long enough matching pair', () => {
    expect(validateNewPassword('Str0ng-Passphrase', 'Str0ng-Passphrase')).toBeNull()
  })

  it('requires 8 characters', () => {
    expect(validateNewPassword('short7!', 'short7!')).toMatch(/8 characters/i)
  })

  it('requires the pair to match', () => {
    expect(validateNewPassword('Str0ng-Passphrase', 'other')).toMatch(/match/i)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter dashboard test`
Expected: FAIL — `validateNewPassword` is not exported.

- [ ] **Step 3: Implement it**

Append to `apps/dashboard/lib/validation.ts`:
```ts
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
  }
  if (password !== confirm) return 'The two passwords do not match.'
  return null
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter dashboard test`
Expected: PASS, 9 tests.

- [ ] **Step 5: Add both recovery actions**

Append to `apps/dashboard/lib/actions/auth.ts`:
```ts
import { validateNewPassword } from '../validation.js'

export async function requestResetAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const supabase = await createServerSupabase()
  // Recovery mail carries ?token_hash=…&type=recovery, so it lands on
  // /auth/confirm — not /auth/callback, which only handles OAuth codes.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  })

  // FR-46: unknown addresses get the same answer as known ones, and no mail.
  redirect(`/check-email?email=${encodeURIComponent(email)}&reason=recovery`)
}

export async function updatePasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '')
  const confirm = String(form.get('confirmPassword') ?? '')

  const invalid = validateNewPassword(password, confirm)
  if (invalid) return { error: invalid }

  const supabase = await createServerSupabase()
  // verifyOtp already put a recovery session in cookies, so this needs no token.
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: 'That link has expired. Request a new one and try again.' }
  }

  redirect('/dashboard')
}
```

- [ ] **Step 6: Write the forgot-password screen**

`apps/dashboard/app/(auth)/forgot-password/forgot-form.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Card, FormError, Input } from '@job-tracker/ui'
import { requestResetAction, type AuthState } from '@/lib/actions/auth'

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestResetAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Reset your password</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Enter your email and we will send you a link to choose a new one.
      </p>

      <form action={action} aria-label="Reset password" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <Input label="Email Address" name="email" type="email" autoComplete="email"
               placeholder="you@example.com" required />
        <Button type="submit" pending={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        <Link href="/sign-in" className="font-semibold text-text hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  )
}
```

`apps/dashboard/app/(auth)/forgot-password/page.tsx`:
```tsx
import { AuthShell } from '@job-tracker/ui'
import { ForgotForm } from './forgot-form'

export const metadata = { title: 'Reset your password · Job Tracker AI' }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      headline="Land your dream role faster."
      sub="One workspace for every application, from first save to signed offer."
    >
      <ForgotForm />
    </AuthShell>
  )
}
```

- [ ] **Step 7: Write the reset-password screen**

`apps/dashboard/app/(auth)/reset-password/reset-form.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import { Button, Card, FormError, Input } from '@job-tracker/ui'
import { updatePasswordAction, type AuthState } from '@/lib/actions/auth'

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePasswordAction, {})

  return (
    <Card>
      <h2 className="text-center text-2xl font-semibold text-text">Set new password</h2>
      <p className="mt-2 text-center text-sm text-text-muted">
        Choose something you have not used here before.
      </p>

      <form action={action} aria-label="Set new password" className="mt-8 flex flex-col gap-5">
        <FormError message={state.error} />
        <Input label="New Password" name="password" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Input label="Confirm Password" name="confirmPassword" type="password" revealable
               autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        <Button type="submit" pending={pending}>
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </Card>
  )
}
```

`apps/dashboard/app/(auth)/reset-password/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { AuthShell } from '@job-tracker/ui'
import { createServerSupabase } from '@job-tracker/db/server'
import { ResetForm } from './reset-form'

export const metadata = { title: 'Set new password · Job Tracker AI' }

export default async function ResetPasswordPage() {
  // Reaching this page without a session means the recovery link was never
  // verified — send them back to ask for a fresh one rather than showing a form
  // whose submit could only fail.
  const supabase = await createServerSupabase()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims) redirect('/forgot-password')

  return (
    <AuthShell
      headline="The intelligent way to land your next role."
      sub="One workspace for every application, from first save to signed offer."
    >
      <ResetForm />
    </AuthShell>
  )
}
```

- [ ] **Step 8: Extend the e2e suite with the recovery round trip**

Append to `apps/dashboard/e2e/auth.spec.ts`:
```ts
test('recover a forgotten password, and the old one stops working', async ({ page, request }) => {
  const addr = email()
  const NEW_PASSWORD = 'Rotated-Passphrase-2'

  // Create and confirm an account.
  await page.goto('/sign-up')
  await page.getByLabel('Full Name').fill('Recovery User')
  await page.getByLabel('Email Address').fill(addr)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm Password').fill(PASSWORD)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.goto(await latestLink(request, addr))
  await page.getByRole('button', { name: 'Sign out' }).click()

  // Ask for a reset.
  await page.goto('/forgot-password')
  await page.getByLabel('Email Address').fill(addr)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page).toHaveURL(/\/check-email/)

  // Follow the recovery link and choose a new password.
  await page.goto(await latestLink(request, addr))
  await expect(page).toHaveURL(/\/reset-password/)
  await page.getByLabel('New Password').fill(NEW_PASSWORD)
  await page.getByLabel('Confirm Password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // The old password must be dead.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByLabel('Email').fill(addr)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')

  // The new one must work.
  await page.getByLabel('Password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
})

test('reset-password without a verified link sends you back', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('an unknown address gets the same answer as a known one — FR-46', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('Email Address').fill('definitely-not-registered@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page).toHaveURL(/\/check-email/)
  await expect(page.getByText('Check your inbox')).toBeVisible()
})
```

- [ ] **Step 9: Run the full suite**

```bash
pnpm db:start
pnpm turbo lint typecheck test build
pnpm --filter @job-tracker/test test
pnpm --filter dashboard e2e
```
Expected: everything PASS — 7 Playwright tests total.

If the recovery link lands on `/auth/auth-code-error`, the recovery template is still using `{{ .ConfirmationURL }}`. Fix `supabase/templates/recovery.html` and `pnpm db:reset`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: password recovery round trip"
```

---

## Self-review

**Spec coverage.** Every section of the spec maps to a task:

| Spec section | Task |
|---|---|
| §2 architecture, three apps, packages | 1, 3, 5 |
| §3.1 two callback handlers, email templates | 4 (templates), 6 (`/auth/confirm`), 7 (`/auth/callback` stub) |
| §3.2 sign up | 6 |
| §3.3 sign in | 7 |
| §3.4 Google | **plan 2** |
| §3.5 password recovery | 8 |
| §3.6 sign out | 7 |
| §4 data model, RLS, recursion, column grants, trigger | 4 |
| §5 session handling, `setAll` headers, redirect rules | 5, 7 |
| §6 design system, token departures | 2, 3 |
| §7 route inventory — dashboard | 6, 7, 8 |
| §7 route inventory — admin, web | **plan 2** |
| §8 configuration | 4 (`config.toml`), 5 (`.env.local`) |
| §9 security tests 1–5 | 4 |
| §9 security test 6 (bundle audit) | 5 step 7 |
| §9 design-token tests 7–9 | 2 |
| §9 integration and e2e | 6, 7, 8 |

**Gaps found and closed while reviewing.** Spec §5 said "one `middleware.ts` per authenticated app" — wrong for Next.js 16, which requires `proxy.ts`. The spec has been corrected, and the constraint is now repeated in three places in this plan. Spec §6 called for a `Logo` `variant` prop to allow a later SVG swap; the SVG now exists, so the prop was dropped and the component inlines the verified path with `currentColor` instead.

**Placeholder scan.** No TBD/TODO. Every code step carries runnable code. Task 1 has no unit test because scaffolding has no unit — stated explicitly rather than faked, with build and HTTP verification in its place.

**Type consistency.** `AuthState` is defined once (Task 6) and reused in Tasks 7 and 8. `createServerSupabase` / `createBrowserSupabase` / `refreshSession` keep their Task 5 names throughout. `TOKENS` keys in Task 2's `tokens.ts` match the `--color-*` names in `theme.css` and the utilities used in Task 3. `validateSignUp` and `validateNewPassword` both return `string | null`.

**One deliberate deviation recorded.** §12.1's unverified-sign-in row routes to `/check-email`, which reveals that an address exists. That narrows FR-46 for unconfirmed accounts only. It is the PRD's own choice, commented at the call site in Task 7 so a later reader does not "fix" it into silence.

---

## Plan 2 — remaining Phase 0.9 scope

To be written after this plan is executed and reviewed, since its tasks build on these interfaces:

| Task | Deliverable |
|---|---|
| 9 | Google OAuth: env-gated button, provider config, `/auth/callback` completion, `accepted_terms_at` interstitial for OAuth accounts (FR-1, FR-44) |
| 10 | `apps/admin`: own sign-in, role gate returning 404 not 403, `admin_user_usage` view, containment test (FR-45, P6) |
| 11 | `apps/web`: landing hero, `/terms`, `/privacy`; assert zero Supabase code in its bundle (FR-44, P9) |
| 12 | Vercel: three projects with root directories, env per environment, Supabase redirect allow-list including the preview wildcard, Resend SMTP (NFR-13) |

Blocking prerequisites for Task 9 and Task 12, both requiring Zain: a Google Cloud OAuth client with redirect URI `https://rruexatjgmmazyldqirp.supabase.co/auth/v1/callback`, and a Resend account with a verified domain.
