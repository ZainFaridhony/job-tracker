import { defineConfig } from 'vitest/config'

// Live Cerebras calls. Separate config so `turbo test` can never pick them up:
//   pnpm --filter @job-tracker/ai smoke
export default defineConfig({
  test: { environment: 'node', include: ['smoke/**/*.test.ts'], testTimeout: 60_000 },
})
