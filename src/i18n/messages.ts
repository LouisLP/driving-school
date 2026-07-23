import type { Locale } from './locales'
import { isLocale, SOURCE_LOCALE, SUPPORTED_LOCALES } from './locales'

export interface MessageTree {
  [key: string]: string | MessageTree
}

/** Namespace -> message tree, for a single locale. */
export type NamespacedMessages = Record<string, MessageTree>

/**
 * Every message file in the app. One rule:
 *
 *   <owner>/i18n/<locale>.json  ->  keys live under `<owner>.`
 *
 * `<owner>` is a feature folder (`src/features/students/`) or `src/shared/`
 * for cross-cutting strings. Adding a feature means adding the folder — there
 * is no registry to update.
 */
const MESSAGE_MODULES: Record<string, unknown> = {
  ...import.meta.glob('../features/*/i18n/*.json', { eager: true, import: 'default' }),
  ...import.meta.glob('../shared/i18n/*.json', { eager: true, import: 'default' }),
}

interface MessageFile {
  namespace: string
  locale: Locale
}

/** `../features/students/i18n/de.json` -> `{ namespace: 'students', locale: 'de' }` */
export function parseMessagePath(path: string): MessageFile {
  const match = /([^/]+)\/i18n\/([^/]+)\.json$/.exec(path)
  if (!match)
    throw new Error(`[i18n] Message file outside the <owner>/i18n/<locale>.json convention: ${path}`)

  const [, namespace = '', locale = ''] = match
  if (!isLocale(locale)) {
    throw new Error(
      `[i18n] Unknown locale "${locale}" in ${path}. `
      + `Add it to SUPPORTED_LOCALES in src/i18n/locales.ts or the file will never be loaded.`,
    )
  }

  return { namespace, locale }
}

function emptyByLocale(): Record<Locale, NamespacedMessages> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map(locale => [locale, {}]),
  ) as Record<Locale, NamespacedMessages>
}

/** Merges every colocated message file into the shape vue-i18n wants. */
export function buildMessages(
  modules: Record<string, unknown> = MESSAGE_MODULES,
): Record<Locale, NamespacedMessages> {
  const messages = emptyByLocale()

  for (const [path, tree] of Object.entries(modules)) {
    const { namespace, locale } = parseMessagePath(path)
    messages[locale][namespace] = tree as MessageTree
  }

  return messages
}

/** Flattened dot-paths of a message tree, e.g. `students.list.title`. */
export function collectKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? [path] : collectKeys(value, path)
  })
}

export interface KeyDrift {
  locale: Locale
  /** Keys present in the source locale but not translated here. */
  missing: string[]
  /** Keys here that no longer exist in the source locale. */
  stale: string[]
}

/**
 * Compares every locale against {@link SOURCE_LOCALE}. This is the single
 * definition of "the translations are in sync": the unit test asserts it is
 * empty, and dev-mode startup logs it.
 */
export function diffMessageKeys(
  messages: Record<Locale, NamespacedMessages> = buildMessages(),
): KeyDrift[] {
  const sourceKeys = new Set(collectKeys(messages[SOURCE_LOCALE]))

  return SUPPORTED_LOCALES
    .filter(locale => locale !== SOURCE_LOCALE)
    .map((locale) => {
      const keys = new Set(collectKeys(messages[locale]))
      return {
        locale,
        missing: [...sourceKeys].filter(key => !keys.has(key)),
        stale: [...keys].filter(key => !sourceKeys.has(key)),
      }
    })
    .filter(drift => drift.missing.length > 0 || drift.stale.length > 0)
}
