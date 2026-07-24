<script setup lang="ts">
/**
 * VARIANT A — Fixed sidebar.
 *
 * The conservative back-office answer. A 16rem sidebar carries the whole information architecture
 * at once: groups, labels, and the active section's subsections expanded inline. Everything is one
 * click away and nothing is hidden behind a hover.
 *
 * Trade-off to judge: it spends ~16rem of every screen on navigation that changes rarely, which is
 * width the appointment planner would rather have for instructor columns.
 *
 * Below 60rem the sidebar becomes an off-canvas drawer behind a hamburger.
 */
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useT } from '@/i18n/use-t'
import { NAV_GROUPS } from '@/router/nav'
import { ROUTE } from '@/router/route-names'
import AppBreadcrumb from '../AppBreadcrumb.vue'
import LocaleSwitcher from '../LocaleSwitcher.vue'
import ThemeToggle from '../ThemeToggle.vue'
import { useShell } from '../use-shell'

const t = useT()
const route = useRoute()
const { activeItem, crumbs, heading } = useShell()

const isNavOpen = ref(false)

// A drawer that survives navigation is a trap on a phone.
watch(() => route.fullPath, () => {
  isNavOpen.value = false
})
</script>

<template>
  <div class="shell" :class="{ 'shell--nav-open': isNavOpen }">
    <div class="shell__scrim" @click="isNavOpen = false" />

    <aside class="sidebar">
      <RouterLink :to="{ name: ROUTE.dashboard }" class="brand">
        <span class="brand__mark"><Icon icon="lucide:car-front" /></span>
        <span class="brand__text">
          <strong>{{ t('shared.app.name') }}</strong>
          <small>{{ t('shared.app.tagline') }}</small>
        </span>
      </RouterLink>

      <nav class="nav" :aria-label="t('shared.nav.label')">
        <div v-for="(group, index) in NAV_GROUPS" :key="index" class="nav__group">
          <h2 v-if="group.labelKey" class="nav__heading">
            {{ t(group.labelKey) }}
          </h2>

          <ul class="nav__list">
            <li v-for="item in group.items" :key="item.section">
              <RouterLink
                :to="{ name: item.to }"
                class="nav__link"
                :class="{ 'is-active': activeItem?.section === item.section }"
              >
                <Icon :icon="item.icon" class="nav__icon" />
                <span class="truncate">{{ t(item.labelKey) }}</span>
              </RouterLink>

              <ul v-if="item.children && activeItem?.section === item.section" class="nav__sublist">
                <li v-for="child in item.children" :key="child.to">
                  <RouterLink :to="{ name: child.to }" class="nav__sublink">
                    {{ t(child.labelKey) }}
                  </RouterLink>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>

      <div class="sidebar__footer cluster cluster--between">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </aside>

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

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

.sidebar {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-inline-end: var(--border-width-hairline) solid var(--border-subtle);
  background: var(--surface-raised);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  color: var(--text-primary);
  text-decoration: none;
}

.brand__mark {
  display: grid;
  place-items: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: var(--radius-card);
  background: var(--accent-solid);
  color: var(--text-on-solid);
  font-size: var(--text-lg);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: var(--leading-tight);
}

.brand__text small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.nav {
  overflow-y: auto;
  padding-inline: var(--space-sm);
}

.nav__group + .nav__group {
  margin-block-start: var(--space-lg);
}

.nav__heading {
  padding-inline: var(--space-xs);
  margin-block-end: var(--space-2xs);
  color: var(--text-muted);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

.nav__list,
.nav__sublist {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  padding: 0;
  list-style: none;
}

.nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-control);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  transition: background var(--transition-instant) var(--easing-standard);
}

.nav__link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.nav__link.is-active {
  background: var(--surface-selected);
  color: var(--accent-text);
}

.nav__icon {
  flex: none;
  font-size: var(--text-lg);
}

.nav__sublist {
  /* Aligned under the parent's label, not its icon — the indent reads as "inside". */
  margin: var(--space-3xs) 0 var(--space-2xs) calc(var(--space-sm) + var(--space-lg));
  border-inline-start: var(--border-width-hairline) solid var(--border-default);
}

.nav__sublink {
  display: block;
  padding: var(--space-2xs) var(--space-sm);
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-decoration: none;
}

.nav__sublink:hover {
  color: var(--text-primary);
}

.nav__sublink.router-link-active {
  color: var(--accent-text);
  font-weight: var(--weight-medium);
}

.sidebar__footer {
  padding: var(--space-sm) var(--space-md);
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
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

  .sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: var(--layer-modal);
    inline-size: 16rem;
    transform: translateX(-100%);
    transition: transform var(--transition-slow) var(--easing-emphasized);
  }

  .shell--nav-open .sidebar {
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
