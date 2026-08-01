import { defineConfig } from 'eslint/config'
import nextTs from 'eslint-config-next/typescript'
import { jobTrackerRules } from '@job-tracker/config/eslint'

// Not a Next app, but eslint-config-next/typescript is just the TS + JSX parser
// setup, and reusing it keeps this package on the same parser as the apps.
export default defineConfig([
  { ignores: ['node_modules/**'] },
  ...nextTs,
  { files: ['src/**/*.{ts,tsx}'], ...jobTrackerRules },
])
