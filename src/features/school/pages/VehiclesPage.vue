<script setup lang="ts">
/**
 * Rough fleet table. Exists so one subsection of a tabbed section holds real content — the tab
 * strip is one of the things the three shell variants disagree most about.
 */
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'

const t = useT()
const api = useApi()

const { data, isPending } = useAsyncData(() => api.vehicles.list())
</script>

<template>
  <p v-if="isPending && !data" class="muted">
    {{ t('shared.states.loading') }}
  </p>

  <div v-else-if="data?.length" class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">
            {{ t('school.vehicles.plate') }}
          </th>
          <th scope="col">
            {{ t('school.vehicles.model') }}
          </th>
          <th scope="col">
            {{ t('school.vehicles.transmission') }}
          </th>
          <th scope="col">
            {{ t('school.vehicles.suitableFor') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="vehicle in data" :key="vehicle.id">
          <td class="plate">
            {{ vehicle.licencePlate }}
          </td>
          <td>{{ vehicle.make }} {{ vehicle.model }}</td>
          <td class="muted">
            {{ t(`school.vehicles.${vehicle.transmission}`) }}
          </td>
          <td>
            <span v-for="cls in vehicle.suitableFor" :key="cls" class="chip">{{ cls }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <p v-else class="muted">
    {{ t('shared.states.empty') }}
  </p>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
}

.table {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table th {
  padding: var(--padding-cell) var(--space-md);
  border-block-end: var(--border-width-hairline) solid var(--border-default);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  text-align: start;
}

.table td {
  padding: var(--padding-cell) var(--space-md);
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.plate {
  font-family: var(--font-mono);
  font-weight: var(--weight-medium);
}

.chip {
  display: inline-block;
  padding: 0 var(--space-2xs);
  margin-inline-end: var(--space-3xs);
  border: var(--border-width-hairline) solid var(--border-default);
  border-radius: var(--radius-sm);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
}

.muted {
  color: var(--text-muted);
}
</style>
