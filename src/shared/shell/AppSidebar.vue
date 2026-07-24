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

  /* The brand colour, bled in from the top corner and gone by a third of the way down. It is what
     stops a 16rem column of grey links from being the first thing anyone sees. */
  background-image: linear-gradient(
    180deg,
    light-dark(var(--violet-100), var(--violet-950)) 0%,
    transparent 30%
  );
  background-repeat: no-repeat;
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
  background: var(--accent-gradient);
  box-shadow: var(--accent-glow);
  color: var(--text-on-solid);
  font-size: var(--text-lg);
  transition: transform var(--transition-base) var(--easing-emphasized);
}

.brand:hover .brand__mark {
  transform: rotate(-6deg) scale(1.06);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: var(--leading-tight);
}

.brand__text strong {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
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
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-control);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  transition:
    background var(--transition-instant) var(--easing-standard),
    color var(--transition-instant) var(--easing-standard);
}

.nav__link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.nav__link.is-active {
  background: var(--surface-selected);
  color: var(--accent-text);
  font-weight: var(--weight-semibold);
}

/*
 * A solid rail on the leading edge of the active item. The tinted fill alone is easy to miss on a
 * bright screen; the rail is the part that survives at a glance.
 *
 * `--border-accent` and not `--accent-solid`, and not the gradient: those land at ~2.8:1 against
 * the selected surface in dark mode. `--border-accent` is the role that exists to clear 3:1 as a
 * non-text mark in both schemes, which is exactly what this is.
 */
.nav__link.is-active::before {
  content: "";
  position: absolute;
  inset-block: 20%;
  inset-inline-start: 0;
  inline-size: 3px;
  border-radius: var(--radius-pill);
  background: var(--border-accent);
}

.nav__icon {
  flex: none;
  font-size: var(--text-lg);
  color: var(--text-muted);
  transition: color var(--transition-instant) var(--easing-standard);
}

.nav__link:hover .nav__icon {
  color: var(--text-secondary);
}

.nav__link.is-active .nav__icon {
  color: var(--border-accent);
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
