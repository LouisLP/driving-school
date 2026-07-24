<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Route host for
 * [Planner calendar UX (#11)](https://github.com/LouisLP/driving-school/issues/11).
 *
 * Three variants of the planner on one route, switchable with `?variant=A|B|C` or the arrow keys.
 * They read one week of the real seeded school through the real fake-API seam and share one
 * conflict rule set (`conflicts.ts`); everything else — layout, how you book, how a conflict
 * shows up — is each variant's own answer.
 *
 *   A — Resource grid       classic dispatch board, drag anywhere, optimistic moves with undo
 *   B — Agenda              no grid; free slots are rows; booking is a form that narrows choices
 *   C — Overview + rail     week heatmap over a focused day; drag students from a demand queue
 *
 * Bookings are in-memory: nothing is written back through the seam.
 * Times are UTC throughout, matching the seed, so the grid does not shift with the reader's zone.
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PrototypeSwitcher from './PrototypeSwitcher.vue'
import { usePlannerData } from './use-planner-data'
import VariantAResourceGrid from './VariantAResourceGrid.vue'
import VariantBAgenda from './VariantBAgenda.vue'
import VariantCOverviewFocus from './VariantCOverviewFocus.vue'

const VARIANTS = [
  { key: 'A', name: 'Resource grid' },
  { key: 'B', name: 'Agenda' },
  { key: 'C', name: 'Overview + demand rail' },
] as const

const route = useRoute()
const planner = usePlannerData()

const variant = computed(() => {
  const key = String(route.query.variant ?? 'A').toUpperCase()

  return VARIANTS.some(entry => entry.key === key) ? key : 'A'
})
</script>

<template>
  <div class="host">
    <p v-if="planner.isLoading.value" class="loading">
      Loading the week…
    </p>

    <template v-else>
      <VariantAResourceGrid v-if="variant === 'A'" :planner="planner" />
      <VariantBAgenda v-else-if="variant === 'B'" :planner="planner" />
      <VariantCOverviewFocus v-else :planner="planner" />
    </template>

    <PrototypeSwitcher :variants="VARIANTS" />
  </div>
</template>

<style scoped>
.host {
  block-size: 100dvh;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  background: var(--surface-page);
  color: var(--text-primary);
}

.loading {
  place-self: center;
  color: var(--text-muted);
}
</style>
