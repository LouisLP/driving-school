import type { DefineLocaleMessage } from 'vue-i18n'
import type { Locale } from './locales'
import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, SOURCE_LOCALE } from './locales'
import { buildMessages, diffMessageKeys } from './messages'

export { DEFAULT_LOCALE, isLocale, SOURCE_LOCALE, SUPPORTED_LOCALES } from './locales'
export type { Locale } from './locales'

export function createAppI18n() {
  return createI18n({
    legacy: false,
    locale: DEFAULT_LOCALE,
    // An untranslated key renders the English string rather than the raw key.
    fallbackLocale: SOURCE_LOCALE,
    // ...but it is never silent in dev: vue-i18n warns per lookup, and
    // `reportMessageDrift()` lists every gap once at startup.
    missingWarn: import.meta.env.DEV,
    fallbackWarn: import.meta.env.DEV,
    // `import.meta.glob` is untyped by nature, so this is the one place where
    // the runtime shape meets the generated schema. The parity test is what
    // guarantees the cast is honest for non-source locales.
    messages: buildMessages() as Record<Locale, DefineLocaleMessage>,
  })
}

/**
 * Logs untranslated / stale keys once, in dev only. The same check runs as a
 * unit test (`src/i18n/__tests__/messages.spec.ts`), which is what fails CI.
 */
export function reportMessageDrift() {
  for (const { locale, missing, stale } of diffMessageKeys()) {
    if (missing.length > 0)
      console.error(`[i18n] ${locale} is missing ${missing.length} key(s):`, missing)
    if (stale.length > 0)
      console.warn(`[i18n] ${locale} has ${stale.length} key(s) that no longer exist in ${SOURCE_LOCALE}:`, stale)
  }
}

export const i18n = createAppI18n()
