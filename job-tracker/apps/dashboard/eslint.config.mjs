import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { jobTrackerRules } from "@job-tracker/config/eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jobTrackerRules,
  {
    // Google's brand guidelines forbid recolouring their mark, so this single
    // file is exempt from the monochrome token rule. Nothing else should be.
    files: ['app/(auth)/google-button.tsx'],
    rules: { 'job-tracker/no-raw-color': 'off' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
