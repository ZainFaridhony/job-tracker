import { defineConfig } from 'vitest/config'

// Live Cerebras calls over the labelled CV set. Separate config so `turbo test` can
// never pick them up, and a long timeout because a full run is ~60 calls:
//   pnpm --filter @job-tracker/ai eval
export default defineConfig({
  test: {
    environment: 'node',
    include: ['eval/**/*.eval.ts'],
    testTimeout: 15 * 60_000,
    // Strategies share a rate limit, so running them concurrently just produces
    // 429s that look like quality regressions.
    fileParallelism: false,
    // Without this vitest swallows console.log when stdout is not a TTY, so a
    // redirected run loses the entire comparison table it exists to print.
    disableConsoleIntercept: true,
  },
})
