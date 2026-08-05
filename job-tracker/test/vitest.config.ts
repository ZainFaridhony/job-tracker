import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

config({ path: '../.env.test' })

export default defineConfig({
  // One local database is shared by every file here, so they must not race.
  test: { environment: 'node', include: ['**/*.test.ts'], fileParallelism: false },
})
