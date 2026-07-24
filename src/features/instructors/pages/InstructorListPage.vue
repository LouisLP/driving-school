<script setup lang="ts">
/**
 * Rough instructor list. Second real list in the shell — one list could be tuned to flatter the
 * chrome, two cannot. Not the specified section.
 */
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'

const t = useT()
const api = useApi()

const { data, isPending } = useAsyncData(() => api.instructors.list())
</script>

<template>
  <p v-if="isPending && !data" class="muted">
    {{ t('shared.states.loading') }}
  </p>

  <ul v-else-if="data?.length" class="grid" style="--grid-min: 18rem">
    <li v-for="instructor in data" :key="instructor.id" class="card">
      <p class="card__name">
        {{ instructor.firstName }} {{ instructor.lastName }}
      </p>
      <p class="card__meta">
        {{ instructor.email ?? instructor.phone ?? '—' }}
      </p>
      <p class="card__classes">
        <span v-for="cls in instructor.teachableClasses" :key="cls" class="chip">{{ cls }}</span>
      </p>
    </li>
  </ul>

  <p v-else class="muted">
    {{ t('shared.states.empty') }}
  </p>
</template>

<style scoped>
.grid {
  padding: 0;
  list-style: none;
}

.card {
  padding: var(--padding-card);
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
}

.card__name {
  font-weight: var(--weight-semibold);
}

.card__meta {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.card__classes {
  margin-block-start: var(--space-sm);
}

.chip {
  display: inline-block;
  padding: 0 var(--space-2xs);
  margin-inline-end: var(--space-3xs);
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
}

.muted {
  color: var(--text-muted);
}
</style>
