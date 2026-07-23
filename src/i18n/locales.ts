/**
 * The locales the app ships. `en` is the source of truth for the key set:
 * the typed `t()` schema is generated from the `en.json` files, and every
 * other locale is checked against them (see `diffMessageKeys`).
 */
export const SUPPORTED_LOCALES = ['en', 'de'] as const

export type Locale = typeof SUPPORTED_LOCALES[number]

/** The locale whose keys define the schema. Never falls back to anything. */
export const SOURCE_LOCALE = 'en' satisfies Locale

export const DEFAULT_LOCALE = 'en' satisfies Locale

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
