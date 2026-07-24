<script setup lang="ts">
/**
 * The app shell — the route component every section renders inside.
 *
 * A fixed sidebar beside a scrolling content pane, chosen over a top nav and an icon rail in the
 * prototype on #7: the six sections keep their grouping and their labels, and the two sections with
 * subsections show them without a second bar or a second column. The cost, accepted, is 16rem of
 * every screen — the appointment planner will want it back and can take it by collapsing the
 * sidebar to icons later, which is a change to this file and no other.
 *
 * The variants that lost live on the `prototype/shell-variants-7` branch.
 *
 * What this component owns:
 *
 * - the layout, and the drawer the sidebar becomes below 60rem
 * - the skip link and the `#main-content` target
 * - the shell context (`provideShell`), including the channel a detail page renames itself through
 *
 * Everything else belongs to the pages: the shell renders the `<h1>` from route meta and gets out
 * of the way.
 */
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useT } from '@/i18n/use-t'
import ApiDevPanel from '@/shared/dev/ApiDevPanel.vue'
import AppBreadcrumb from './AppBreadcrumb.vue'
import AppSidebar from './AppSidebar.vue'
import { provideShell } from './use-shell'

const t = useT()
const route = useRoute()

const { crumbs, heading, pageTitle } = provideShell()

const isDev = import.meta.env.DEV

const isNavOpen = ref(false)

// A drawer that survives navigation is a trap on a phone.
watch(() => route.fullPath, () => {
  isNavOpen.value = false
})

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
  <div class="shell" :class="{ 'shell--nav-open': isNavOpen }">
    <a class="skip-link" href="#main-content">{{ t('shared.nav.skipToContent') }}</a>

    <div class="shell__scrim" @click="isNavOpen = false" />

    <AppSidebar class="shell__sidebar" />

    <div class="shell__body">
      <header class="topbar">
        <button
          type="button"
          class="topbar__menu"
          :aria-label="t('shared.nav.open')"
          @click="isNavOpen = true"
        >
          <Icon icon="lucide:menu" />
        </button>

        <AppBreadcrumb :crumbs="crumbs" />

        <div class="topbar__search">
          <Icon icon="lucide:search" />
          <input type="search" :placeholder="t('shared.search.placeholder')">
        </div>
      </header>

      <main id="main-content" class="content">
        <h1 class="content__title">
          {{ heading }}
        </h1>
        <RouterView />
      </main>
    </div>

    <ApiDevPanel v-if="isDev" />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 16rem minmax(0, 1fr);
  block-size: 100dvh;
}

.shell__body {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-inline-size: 0;
}

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

/* ── Topbar ──────────────────────────────────────────────────────────────── */

.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--gutter-page);
  border-block-end: var(--border-width-hairline) solid var(--border-subtle);
  background: var(--surface-page);
}

.topbar__menu {
  display: none;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-lg);
  cursor: pointer;
  transition:
    background var(--transition-instant) var(--easing-standard),
    color var(--transition-instant) var(--easing-standard);
}

.topbar__menu:hover {
  background: var(--accent-subtle);
  color: var(--accent-text);
}

.topbar__search {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-inline-start: auto;
  padding-inline: var(--space-sm);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-pill);
  background: var(--field-surface);
  color: var(--text-muted);
  transition:
    border-color var(--transition-instant) var(--easing-standard),
    box-shadow var(--transition-instant) var(--easing-standard);
}

/*
 * The ring goes on the wrapper because the wrapper is what looks like the field — the `<input>`
 * inside it is borderless and its own focus ring would draw inside the pill. The inner input drops
 * its outline for exactly this reason (`outline: none` below), so this rule owes it a replacement
 * and this is it.
 */
.topbar__search:focus-within {
  border-color: var(--field-border-focus);
  box-shadow: 0 0 0 var(--focus-ring-width) var(--accent-subtle);
  color: var(--accent-text);
}

.topbar__search input {
  inline-size: 18rem;
  max-inline-size: 30vw;
  padding-block: var(--padding-control-block);
  border: 0;
  background: none;
  color: var(--field-text);
  font-size: var(--text-sm);
  outline: none;
}

/* ── Content ─────────────────────────────────────────────────────────────── */

.content {
  overflow-y: auto;
  padding: var(--space-lg) var(--gutter-page) var(--space-3xl);
  scroll-behavior: smooth;
}

.content__title {
  margin-block-end: var(--space-lg);
}

/* ── Drawer below 60rem ──────────────────────────────────────────────────── */

/*
 * `.shell__sidebar` lands on `AppSidebar`'s root element. Position is the shell's business, so it
 * is set here; the sidebar's own file never learns that it is sometimes a drawer.
 */
.shell__scrim {
  display: none;
}

@media (width < 60rem) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .topbar__menu {
    display: grid;
  }

  .topbar__search input {
    inline-size: 8rem;
  }

  .shell__sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: var(--layer-modal);
    inline-size: 16rem;
    transform: translateX(-100%);
    transition: transform var(--transition-slow) var(--easing-emphasized);
  }

  .shell--nav-open .shell__sidebar {
    transform: translateX(0);
    box-shadow: var(--shadow-xl);
  }

  .shell--nav-open .shell__scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: var(--layer-scrim);
    background: var(--surface-scrim);
  }
}
</style>
