<script setup lang="ts">
/**
 * Scaffolding for routes that exist but are not specified yet.
 *
 * It is here so the shell can be judged with every section reachable — an app where four of six
 * nav items 404 tells you nothing about the navigation. Each of these disappears as its section
 * gets built; when the last one goes, so does this file.
 */
import type { MessageKey } from '@/i18n/use-t'
import { useT } from '@/i18n/use-t'

withDefaults(defineProps<{ bodyKey?: MessageKey }>(), { bodyKey: 'shared.states.empty' })

const t = useT()
</script>

<template>
  <div class="placeholder">
    <Icon icon="lucide:hard-hat" class="placeholder__icon" />
    <p>{{ t(bodyKey) }}</p>
  </div>
</template>

<style scoped>
.placeholder {
  display: grid;
  place-items: center;
  gap: var(--space-sm);
  padding: var(--space-3xl) var(--space-lg);
  border: var(--border-width-hairline) dashed var(--border-default);
  border-radius: var(--radius-card);
  color: var(--text-muted);
  text-align: center;
}

.placeholder__icon {
  font-size: var(--text-3xl);
  color: var(--text-disabled);
}
</style>
