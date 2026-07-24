<script setup lang="ts">
/**
 * VARIANT B — Top nav.
 *
 * All six sections as tabs across the top, subsections on a second row that only appears where a
 * section has them. Gives the full viewport width to content, which is what the planner and the
 * wider tables want, and reads as an app rather than an admin panel.
 *
 * Trade-offs to judge: six top-level items is near the limit for a horizontal bar in German
 * ("Terminplaner", "Berufskraftfahrer" are long), the grouping from the nav model is lost, and two
 * stacked bars eat vertical space — the scarcer axis on a laptop.
 *
 * Below 60rem the tab row scrolls horizontally rather than collapsing into a menu.
 */
import { useT } from '@/i18n/use-t'
import { NAV_ITEMS } from '@/router/nav'
import { ROUTE } from '@/router/route-names'
import AppBreadcrumb from '../AppBreadcrumb.vue'
import LocaleSwitcher from '../LocaleSwitcher.vue'
import ThemeToggle from '../ThemeToggle.vue'
import { useShell } from '../use-shell'

const t = useT()
const { activeItem, activeChildren, crumbs, heading } = useShell()
</script>

<template>
  <div class="shell">
    <header class="masthead">
      <div class="masthead__bar">
        <RouterLink :to="{ name: ROUTE.dashboard }" class="brand">
          <Icon icon="lucide:car-front" class="brand__mark" />
          <strong>{{ t('shared.app.name') }}</strong>
        </RouterLink>

        <nav class="tabs" :aria-label="t('shared.nav.label')">
          <RouterLink
            v-for="item in NAV_ITEMS"
            :key="item.section"
            :to="{ name: item.to }"
            class="tabs__tab"
            :class="{ 'is-active': activeItem?.section === item.section }"
          >
            <Icon :icon="item.icon" />
            {{ t(item.labelKey) }}
          </RouterLink>
        </nav>

        <div class="masthead__actions cluster">
          <button type="button" class="icon-button" :aria-label="t('shared.actions.search')">
            <Icon icon="lucide:search" />
          </button>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <nav
        v-if="activeItem && activeChildren.length"
        class="subtabs"
        :aria-label="t(activeItem.labelKey)"
      >
        <RouterLink
          v-for="child in activeChildren"
          :key="child.to"
          :to="{ name: child.to }"
          class="subtabs__tab"
        >
          {{ t(child.labelKey) }}
        </RouterLink>
      </nav>
    </header>

    <main id="main-content" class="content">
      <div class="content__inner">
        <AppBreadcrumb :crumbs="crumbs" />
        <h1 class="content__title">
          {{ heading }}
        </h1>
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  block-size: 100dvh;
}

/* ── Masthead ────────────────────────────────────────────────────────────── */

.masthead {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--layer-sticky);
  background: var(--surface-raised);
  border-block-end: var(--border-width-hairline) solid var(--border-subtle);
}

.masthead__bar {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  padding-inline: var(--gutter-page);
  padding-block: var(--space-xs);
}

.masthead__actions {
  margin-inline-start: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
}

.brand__mark {
  color: var(--accent-solid);
  font-size: var(--text-xl);
}

.tabs {
  display: flex;
  gap: var(--space-3xs);
  min-inline-size: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs__tab {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-control);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--transition-instant) var(--easing-standard);
}

.tabs__tab:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.tabs__tab.is-active {
  background: var(--accent-solid);
  color: var(--text-on-solid);
}

.subtabs {
  display: flex;
  gap: var(--space-md);
  padding-inline: var(--gutter-page);
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
  background: var(--surface-page);
  overflow-x: auto;
}

.subtabs__tab {
  padding-block: var(--space-xs);
  border-block-end: var(--border-width-thick) solid transparent;
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-decoration: none;
  white-space: nowrap;
}

.subtabs__tab:hover {
  color: var(--text-primary);
}

.subtabs__tab.router-link-active {
  border-block-end-color: var(--accent-solid);
  color: var(--text-primary);
  font-weight: var(--weight-medium);
}

.icon-button {
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-lg);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

/* ── Content ─────────────────────────────────────────────────────────────── */

.content {
  overflow-y: auto;
  padding: var(--space-lg) var(--gutter-page) var(--space-3xl);
}

.content__inner {
  /* Centred and capped: a full-width line of text at 2560px is unreadable. */
  max-inline-size: var(--size-2xl);
  margin-inline: auto;
}

.content__title {
  margin-block: var(--space-2xs) var(--space-lg);
}

@media (width < 60rem) {
  .masthead__bar {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .tabs {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
