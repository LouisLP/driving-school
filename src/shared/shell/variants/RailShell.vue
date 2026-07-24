<script setup lang="ts">
/**
 * VARIANT C — Icon rail + section panel.
 *
 * A 4rem icon rail that never changes, and a second column that only exists when the current
 * section has subsections. Costs a fifth of variant A's horizontal space on the sections that need
 * width most (planner, students), while giving Finances and Driving School a proper column for
 * their own navigation instead of an inline indent.
 *
 * Trade-offs to judge: icon-only top-level nav has to be learned — a tooltip is not a label, and
 * "Finances" vs "Driving School" is not an obvious pair of glyphs. The layout also shifts sideways
 * as you move between sections that have a panel and sections that do not.
 *
 * Below 60rem the rail becomes a bottom tab bar and the panel a horizontal strip.
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
  <div class="shell" :class="{ 'shell--with-panel': activeChildren.length > 0 }">
    <div class="rail">
      <RouterLink :to="{ name: ROUTE.dashboard }" class="rail__brand" :title="t('shared.app.name')">
        <Icon icon="lucide:car-front" />
      </RouterLink>

      <nav class="rail__nav" :aria-label="t('shared.nav.label')">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.section"
          :to="{ name: item.to }"
          class="rail__link"
          :class="{ 'is-active': activeItem?.section === item.section }"
          :title="t(item.labelKey)"
        >
          <Icon :icon="item.icon" />
          <span class="visually-hidden">{{ t(item.labelKey) }}</span>
        </RouterLink>
      </nav>

      <div class="rail__footer">
        <ThemeToggle />
        <LocaleSwitcher class="rail__locale" />
      </div>
    </div>

    <aside v-if="activeItem && activeChildren.length" class="panel">
      <h2 class="panel__title">
        {{ t(activeItem.labelKey) }}
      </h2>
      <nav :aria-label="t(activeItem.labelKey)">
        <ul class="panel__list">
          <li v-for="child in activeChildren" :key="child.to">
            <RouterLink :to="{ name: child.to }" class="panel__link">
              {{ t(child.labelKey) }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <main id="main-content" class="content">
      <header class="content__header">
        <div>
          <AppBreadcrumb :crumbs="crumbs" />
          <h1 class="content__title">
            {{ heading }}
          </h1>
        </div>

        <div class="content__search">
          <Icon icon="lucide:search" />
          <input type="search" :placeholder="t('shared.search.placeholder')">
        </div>
      </header>

      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  block-size: 100dvh;
}

.shell--with-panel {
  grid-template-columns: 4rem 13rem minmax(0, 1fr);
}

/* ── Rail ────────────────────────────────────────────────────────────────── */

.rail {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  justify-items: center;
  gap: var(--space-sm);
  padding-block: var(--space-sm);
  background: var(--surface-sunken);
  border-inline-end: var(--border-width-hairline) solid var(--border-subtle);
}

.rail__brand {
  display: grid;
  place-items: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: var(--radius-card);
  background: var(--accent-solid);
  color: var(--text-on-solid);
  font-size: var(--text-lg);
}

.rail__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.rail__link {
  display: grid;
  place-items: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: var(--radius-card);
  color: var(--text-muted);
  font-size: var(--text-xl);
  text-decoration: none;
  transition:
    background var(--transition-instant) var(--easing-standard),
    color var(--transition-instant) var(--easing-standard);
}

.rail__link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.rail__link.is-active {
  background: var(--accent-solid);
  color: var(--text-on-solid);
}

.rail__footer {
  display: grid;
  justify-items: center;
  gap: var(--space-2xs);
}

/* Two locale codes do not fit side by side in a 4rem rail. */
.rail__locale {
  flex-direction: column;
}

/* ── Section panel ───────────────────────────────────────────────────────── */

.panel {
  padding: var(--space-md) var(--space-sm);
  border-inline-end: var(--border-width-hairline) solid var(--border-subtle);
  background: var(--surface-raised);
  overflow-y: auto;
}

.panel__title {
  padding-inline: var(--space-xs);
  margin-block-end: var(--space-sm);
  font-size: var(--text-base);
}

.panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  padding: 0;
  list-style: none;
}

.panel__link {
  display: block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-control);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-decoration: none;
}

.panel__link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.panel__link.router-link-active {
  background: var(--surface-selected);
  color: var(--accent-text);
  font-weight: var(--weight-medium);
}

/* ── Content ─────────────────────────────────────────────────────────────── */

.content {
  overflow-y: auto;
  padding: var(--space-lg) var(--gutter-page) var(--space-3xl);
}

.content__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-block-end: var(--space-lg);
}

.content__title {
  margin-block-start: var(--space-2xs);
}

.content__search {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding-inline: var(--space-sm);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-control);
  background: var(--field-surface);
  color: var(--text-muted);
}

.content__search input {
  inline-size: 16rem;
  max-inline-size: 40vw;
  padding-block: var(--padding-control-block);
  border: 0;
  background: none;
  color: var(--field-text);
  font-size: var(--text-sm);
  outline: none;
}

/* ── Bottom bar below 60rem ──────────────────────────────────────────────── */

@media (width < 60rem) {
  .shell,
  .shell--with-panel {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .rail {
    order: 3;
    grid-template-rows: none;
    grid-auto-flow: column;
    justify-content: space-between;
    align-items: center;
    inline-size: 100%;
    padding-inline: var(--space-md);
    border-inline-end: 0;
    border-block-start: var(--border-width-hairline) solid var(--border-subtle);
  }

  .rail__brand,
  .rail__footer {
    display: none;
  }

  .rail__nav {
    flex-direction: row;
    inline-size: 100%;
    justify-content: space-around;
  }

  .panel {
    order: 1;
    padding: var(--space-xs) var(--space-md);
    border-inline-end: 0;
    border-block-end: var(--border-width-hairline) solid var(--border-subtle);
  }

  .panel__title {
    display: none;
  }

  .panel__list {
    flex-direction: row;
    overflow-x: auto;
  }

  .content {
    order: 2;
  }
}
</style>
