import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only registers auto-cleanup when Vitest runs with
// `globals: true`. This project does not, so without this every render would
// pile up in the same jsdom document and getBy* would find duplicates.
afterEach(cleanup)
