import { noRawColor } from './eslint-rules/no-raw-color.js'

/**
 * Flat-config block shared by every workspace. Append it to the exported array
 * in each app's eslint.config.mjs.
 */
export const jobTrackerRules = {
  plugins: { 'job-tracker': { rules: { 'no-raw-color': noRawColor } } },
  rules: { 'job-tracker/no-raw-color': 'error' },
}
