import { ref, watch } from 'vue'

/**
 * The in-app light/dark switch.
 *
 * The token layer already renders both schemes from `color-scheme: light dark` on `<html>`, so
 * "theming" is one CSS property: narrowing that declaration to a single keyword pins the scheme,
 * and removing the override hands control back to the OS. No token is touched, no class is toggled
 * on the body, and nothing has to re-render.
 */

export type ColorSchemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'driving-school:color-scheme'

const PREFERENCES: readonly ColorSchemePreference[] = ['system', 'light', 'dark']

/**
 * `window.localStorage`, not the bare global: Node ≥22 defines an unusable one that shadows
 * jsdom's. Null when storage is missing or blocked — the preference is then session-only rather
 * than a crash. Same accessor shape as the fake API's snapshot storage.
 */
function storage(): Storage | null {
  try {
    return globalThis.window?.localStorage ?? null
  }
  catch {
    return null
  }
}

function isPreference(value: unknown): value is ColorSchemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value)
}

// One preference for the whole app, so every switch and every reader agrees. Populated on first
// use rather than at import: a module that touches the DOM as a side effect of being imported
// cannot be loaded outside a browser.
const preference = ref<ColorSchemePreference>('system')

let isInstalled = false

function install(): void {
  if (isInstalled)
    return
  isInstalled = true

  const stored = storage()?.getItem(STORAGE_KEY)
  if (isPreference(stored))
    preference.value = stored

  watch(preference, (value) => {
    document.documentElement.style.colorScheme = value === 'system' ? '' : value
    storage()?.setItem(STORAGE_KEY, value)
  }, { immediate: true })
}

export function useColorScheme() {
  install()

  function cycle(): void {
    const count = PREFERENCES.length
    const next = PREFERENCES[(PREFERENCES.indexOf(preference.value) + 1) % count]
    preference.value = next ?? 'system'
  }

  return { preference, options: PREFERENCES, cycle }
}
