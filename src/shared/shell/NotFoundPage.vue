<script setup lang="ts">
/**
 * The catch-all. Sits inside the shell on purpose: a mistyped URL should leave the navigation
 * intact so it can be corrected with one click.
 */
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'

const t = useT()
</script>

<template>
  <div class="not-found stack">
    <Icon icon="lucide:map-pin-off" class="not-found__icon" />
    <p>{{ t('shared.notFound.description') }}</p>
    <RouterLink :to="{ name: ROUTE.dashboard }">
      {{ t('shared.notFound.action') }}
    </RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  align-items: center;
  text-align: center;
  padding-block: var(--space-3xl);
  color: var(--text-muted);
}

.not-found__icon {
  font-size: var(--text-3xl);
  color: var(--text-disabled);
}
</style>
