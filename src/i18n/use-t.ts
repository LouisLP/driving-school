import type { DefineLocaleMessage } from 'vue-i18n'
import { useI18n } from 'vue-i18n'

/** Drops the `[key: string]` escape hatch vue-i18n bakes into its schema. */
type Explicit<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K]
}

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`
}[keyof T & string]

/**
 * Every message key in the app, as `namespace.path.to.key`. Generated from the
 * `en.json` files via `DefineLocaleMessage` — see `locale-messages.generated.d.ts`.
 *
 * Useful as a prop type when a shared component takes a caller-supplied label:
 * `defineProps<{ labelKey: MessageKey }>()`.
 */
export type MessageKey = LeafPaths<Explicit<DefineLocaleMessage>>

export interface Translate {
  (key: MessageKey): string
  (key: MessageKey, plural: number): string
  (key: MessageKey, named: Record<string, unknown>): string
}

/**
 * The way to translate in this app.
 *
 * vue-i18n's own `t()` (and the global `$t`) accept any string — the typed
 * schema only drives autocomplete there, so a typo compiles. This narrows the
 * key to {@link MessageKey}, which turns a stale or misspelled key into a
 * build error. Prefer it over `useI18n().t` and never use `$t` in templates.
 */
export function useT(): Translate {
  const { t } = useI18n()
  return t as Translate
}
