import { createRouter, createWebHistory } from 'vue-router'
import { i18n } from '@/i18n'
import { routes } from './routes'

// Side-effect import: augments vue-router's `RouteMeta` with what this app puts on a route.
import './route-meta'

/*
 * Deliberately exports only the router instance. `nav.ts` and `route-names.ts` are imported from
 * directly (`@/router/nav`, `@/router/route-names`) — re-exporting them here would mean the shell,
 * which the route tree imports, importing the module that builds the router. That cycle is real:
 * it leaves `routes` undefined at router-construction time.
 */

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...routes],

  /**
   * Back returns you to where you were in a long list; a fresh navigation starts at the top.
   */
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

/**
 * The tab title follows the route. One place, rather than every page remembering to set it.
 *
 * Uses `i18n.global.t` because this runs outside a component; the key itself is still typed, since
 * `meta.titleKey` is a `MessageKey`.
 */
router.afterEach((to) => {
  const { titleKey } = to.meta
  const appName = i18n.global.t('shared.app.name')
  document.title = titleKey ? `${i18n.global.t(titleKey)} · ${appName}` : appName
})

export default router
