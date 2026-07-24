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
    <span class="placeholder__icon" aria-hidden="true">
      <Icon icon="lucide:hard-hat" />
    </span>
    <p>{{ t(bodyKey) }}</p>
  </div>
</template>

<style scoped>
.placeholder {
  display: grid;
  place-items: center;
  gap: var(--space-sm);
  padding: var(--space-3xl) var(--space-lg);
  border: var(--border-width-hairline) dashed var(--accent-border);
  border-radius: var(--radius-card);

  /* Faint enough to read as "not built yet" rather than as a real surface, but coloured, so an
     unbuilt section still looks like part of this app. */
  background: var(--accent-wash);
  color: var(--text-muted);
  text-align: center;
}

.placeholder__icon {
  display: grid;
  place-items: center;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: var(--radius-full);
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: var(--text-xl);
}
</style>
