<script setup lang="ts">
/**
 * The trail, from `useShell().crumbs`. Renders nothing for a single crumb — a breadcrumb showing
 * only where you already are is decoration.
 */
import type { Crumb } from './use-shell'
import { useT } from '@/i18n/use-t'

defineProps<{ crumbs: readonly Crumb[] }>()

const t = useT()

function label(crumb: Crumb): string {
  return crumb.label ?? (crumb.labelKey ? t(crumb.labelKey) : '')
}
</script>

<template>
  <nav v-if="crumbs.length > 1" :aria-label="t('shared.breadcrumb.label')">
    <ol class="crumbs">
      <li v-for="(crumb, index) in crumbs" :key="index" class="crumbs__item">
        <RouterLink v-if="crumb.to" :to="crumb.to" class="crumbs__link">
          {{ label(crumb) }}
        </RouterLink>
        <span v-else aria-current="page">{{ label(crumb) }}</span>

        <Icon v-if="index < crumbs.length - 1" icon="lucide:chevron-right" class="crumbs__sep" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.crumbs__item {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
}

.crumbs__link {
  color: inherit;
  text-decoration: none;
}

.crumbs__link:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.crumbs__sep {
  color: var(--text-disabled);
  font-size: var(--text-sm);
}
</style>
