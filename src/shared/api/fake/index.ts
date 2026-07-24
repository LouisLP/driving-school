/**
 * The fake backend behind the seam.
 *
 * Imported by `main.ts` and by tests, and by nothing else — a feature that reaches past
 * `@/shared/api` into this folder has broken the one rule the seam exists to enforce.
 */
export * from './create-fake-api'
export * from './database'
export * from './network'
export { seedDatabase } from './seed'
