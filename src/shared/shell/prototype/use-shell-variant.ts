import type { Router } from 'vue-router'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * PROTOTYPE — delete once the shell layout is settled (issue #7).
 *
 * Three structurally different answers to "what does the app shell look like", switchable in the
 * browser via `?shell=A|B|C` so they can be judged against the real nav, real routes and real data
 * rather than against three mockups.
 *
 * When one wins: keep its variant component as `AppShell`'s only body, and delete this folder,
 * the two losers, and the `?shell=` plumbing.
 */

export const SHELL_VARIANTS = ['A', 'B', 'C'] as const

export type ShellVariant = typeof SHELL_VARIANTS[number]

export const SHELL_VARIANT_NAMES: Record<ShellVariant, string> = {
  A: 'Fixed sidebar',
  B: 'Top nav',
  C: 'Icon rail + section panel',
}

export const DEFAULT_SHELL_VARIANT: ShellVariant = 'A'

const QUERY_PARAM = 'shell'

function parse(value: unknown): ShellVariant {
  return (SHELL_VARIANTS as readonly unknown[]).includes(value)
    ? value as ShellVariant
    : DEFAULT_SHELL_VARIANT
}

export function useShellVariant() {
  const route = useRoute()
  const router = useRouter()

  const current = computed(() => parse(route.query[QUERY_PARAM]))

  /** `replace`, not `push`: flipping through variants should not fill the back button. */
  function select(variant: ShellVariant): void {
    void router.replace({ query: { ...route.query, [QUERY_PARAM]: variant } })
  }

  function step(offset: number): void {
    const count = SHELL_VARIANTS.length
    const index = SHELL_VARIANTS.indexOf(current.value)
    // `+ count` so stepping back from A wraps to C rather than going negative.
    const next = SHELL_VARIANTS[(index + offset + count) % count]
    if (next)
      select(next)
  }

  return { current, select, step, variants: SHELL_VARIANTS, names: SHELL_VARIANT_NAMES }
}

/**
 * Keeps `?shell=` across in-app navigation, so clicking through the sections does not silently drop
 * you back to variant A halfway through evaluating variant C.
 */
export function installShellVariantGuard(router: Router): void {
  router.beforeEach((to, from) => {
    const carried = from.query[QUERY_PARAM]
    if (carried === undefined || to.query[QUERY_PARAM] !== undefined)
      return true

    return { ...to, query: { ...to.query, [QUERY_PARAM]: carried } }
  })
}
