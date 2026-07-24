<script setup lang="ts">
/**
 * The permanent navigation: brand, the six sections in their groups, and the two global switches.
 *
 * Renders `NAV_GROUPS` and nothing else — it holds no state and knows nothing about the drawer it
 * becomes on a narrow screen. Where it sits and whether it is visible is `AppShell`'s business;
 * what it looks like is this file's.
 *
 * Subsections expand inline under the active section rather than on hover or click: the two
 * sections that have them (Finances, Driving School) are the ones staff move around inside, and a
 * disclosure that has to be opened every visit is a tax on the common case.
 */
import { useT } from '@/i18n/use-t'
import { NAV_GROUPS } from '@/router/nav'
import { ROUTE } from '@/router/route-names'
import LocaleSwitcher from './LocaleSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'
import { useShell } from './use-shell'

const t = useT()
const { activeItem } = useShell()
</script>

<template>
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
</template>

<style scoped>
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
</style>
