<script setup lang="ts">
/**
 * Rough students list — real data through the seam, so the shell is judged at real density.
 *
 * NOT the specified list: filtering, sorting, pagination, empty and error states and the column
 * set are issue #8's job. This is here to give the shell something honest to hold.
 */
import type { StudentQuery } from '@/shared/api'
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'

const t = useT()
const { locale } = useI18n()
const api = useApi()

const filters = reactive<StudentQuery>({ search: '', pageSize: 20 })

const { data, isPending, error, refresh } = useAsyncData(
  () => api.students.list(filters),
  { watch: filters },
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value)
}
</script>

<template>
  <div class="stack">
    <div class="cluster cluster--between">
      <input
        v-model="filters.search"
        type="search"
        class="search"
        :placeholder="t('shared.actions.search')"
      >

      <button type="button" class="primary">
        <Icon icon="lucide:plus" />
        {{ t('students.actions.create') }}
      </button>
    </div>

    <p v-if="isPending && !data" class="muted">
      {{ t('shared.states.loading') }}
    </p>

    <div v-else-if="error" class="stack">
      <p>{{ t(`shared.errors.${error.kind}`) }}</p>
      <button type="button" @click="refresh">
        {{ t('shared.actions.retry') }}
      </button>
    </div>

    <template v-else-if="data">
      <p class="muted">
        {{ t('students.list.count', data.total) }}
      </p>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">
                {{ t('students.fields.name') }}
              </th>
              <th scope="col">
                {{ t('students.fields.contact') }}
              </th>
              <th scope="col">
                {{ t('students.fields.standing') }}
              </th>
              <th scope="col">
                {{ t('students.fields.licenceClass') }}
              </th>
              <th scope="col">
                {{ t('students.fields.registeredAt') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in data.items" :key="student.id">
              <td>
                <RouterLink :to="{ name: ROUTE.studentDetail, params: { studentId: student.id } }">
                  {{ student.lastName }}, {{ student.firstName }}
                </RouterLink>
              </td>
              <td class="muted">
                {{ student.email ?? student.phone ?? '—' }}
              </td>
              <td>
                <span class="badge" :data-standing="student.standing">
                  {{ t(`students.standing.${student.standing}`) }}
                </span>
              </td>
              <td>
                <span v-for="cls in student.openLicenceClasses" :key="cls" class="chip">{{ cls }}</span>
                <span v-if="!student.openLicenceClasses.length" class="muted">—</span>
              </td>
              <td class="muted">
                {{ formatDate(student.registeredAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.search {
  inline-size: 20rem;
  max-inline-size: 100%;
  padding: var(--padding-control-block) var(--padding-control-inline);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-control);
  background: var(--field-surface);
  color: var(--field-text);
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--padding-control-block) var(--space-sm);
  border: 0;
  border-radius: var(--radius-control);
  background: var(--accent-solid);
  color: var(--text-on-solid);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

.primary:hover {
  background: var(--accent-solid-hover);
}

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
  position: sticky;
  inset-block-start: 0;
  padding: var(--padding-cell) var(--space-md);
  background: var(--surface-raised);
  border-block-end: var(--border-width-hairline) solid var(--border-default);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  text-align: start;
  white-space: nowrap;
}

.table td {
  padding: var(--padding-cell) var(--space-md);
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.table tbody tr:hover {
  background: var(--surface-hover);
}

.badge {
  display: inline-block;
  padding: 0 var(--space-xs);
  border-radius: var(--radius-pill);
  background: var(--surface-sunken);
  color: var(--text-secondary);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  line-height: 1.6;
}

.badge[data-standing="active"] {
  background: var(--success-subtle);
  color: var(--success-text);
}

.badge[data-standing="prospect"] {
  background: var(--info-subtle);
  color: var(--info-text);
}

.badge[data-standing="lapsed"] {
  background: var(--warning-subtle);
  color: var(--warning-text);
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
