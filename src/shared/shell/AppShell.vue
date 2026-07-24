<script setup lang="ts">
/**
 * The app shell — the route component every section renders inside.
 *
 * It owns three things and delegates the rest:
 *
 * 1. The skip link and the `#main-content` target contract every variant honours.
 * 2. The page-title channel (`providePageTitle`), so a detail page can rename the header.
 * 3. Which chrome is rendered.
 *
 * Point 3 is temporary. While issue #7 is open there are three chrome variants behind `?shell=`;
 * when one is chosen, this component keeps that one and the `prototype/` folder goes away.
 */
import { watch } from 'vue'
import { useT } from '@/i18n/use-t'
import ApiDevPanel from '@/shared/dev/ApiDevPanel.vue'
import ShellSwitcher from './prototype/ShellSwitcher.vue'
import { useShellVariant } from './prototype/use-shell-variant'
import { providePageTitle } from './use-shell'
import RailShell from './variants/RailShell.vue'
import SidebarShell from './variants/SidebarShell.vue'
import TopNavShell from './variants/TopNavShell.vue'

const t = useT()
const pageTitle = providePageTitle()
const { current } = useShellVariant()

const isDev = import.meta.env.DEV

const VARIANTS = { A: SidebarShell, B: TopNavShell, C: RailShell }

/**
 * The router sets the tab title from `meta.titleKey`; a page that knows better (a student's name)
 * refines it here. Kept in the shell so no page has to touch `document.title` itself.
 */
watch(pageTitle, (title) => {
  if (title)
    document.title = `${title} · ${t('shared.app.name')}`
})
</script>

<template>
  <a class="skip-link" href="#main-content">{{ t('shared.nav.skipToContent') }}</a>

  <component :is="VARIANTS[current]" />

  <ApiDevPanel v-if="isDev" />
  <ShellSwitcher v-if="isDev" />
</template>

<style scoped>
.skip-link {
  position: fixed;
  inset-block-start: var(--space-xs);
  inset-inline-start: var(--space-xs);
  z-index: var(--layer-toast);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-control);
  background: var(--surface-overlay);
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
  text-decoration: none;
}

/* Off-screen until tabbed to. */
.skip-link:not(:focus-visible) {
  transform: translateY(-200%);
}
</style>
