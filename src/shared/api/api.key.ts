import type { InjectionKey } from 'vue'
import type { Api } from './api.contract'
import { inject } from 'vue'

export const API_KEY: InjectionKey<Api> = Symbol('driving-school:api')

/**
 * The only way application code reaches the seam.
 *
 * Injection rather than a module-level singleton so that the choice of implementation lives in
 * exactly one place (`main.ts`) and a test can hand a component a stub without mocking modules.
 * Setup-scope only, like every other `use*`.
 */
export function useApi(): Api {
  const api = inject(API_KEY)

  if (!api) {
    throw new Error(
      'No Api provided. Call app.provide(API_KEY, …) before mounting, or pass it via '
      + 'global.provide in tests.',
    )
  }

  return api
}
