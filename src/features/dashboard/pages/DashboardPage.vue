<script setup lang="ts">
/**
 * Rough dashboard — enough real data to judge the shell against, not the specified dashboard.
 * Issue #1 puts this section last on purpose: it is composition of what the other sections build.
 */
import { useI18n } from 'vue-i18n'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'
import { toIsoDateTime } from '@/shared/domain'

const t = useT()
const { locale } = useI18n()
const api = useApi()

// vue-i18n's `d()` needs `datetimeFormats`, which is part of the unsettled locale-detail work.
// `toLocaleDateString` is the honest stand-in until then.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value)
}

const startOfToday = new Date()
startOfToday.setHours(0, 0, 0, 0)
const startOfTomorrow = new Date(startOfToday)
startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

const { data: activeStudents } = useAsyncData(
  () => api.students.list({ standing: 'active', pageSize: 1 }),
)
const { data: recent } = useAsyncData(
  () => api.students.list({ sort: { field: 'registeredAt', direction: 'desc' }, pageSize: 5 }),
)
const { data: today } = useAsyncData(
  () => api.appointments.list({
    from: toIsoDateTime(startOfToday),
    to: toIsoDateTime(startOfTomorrow),
  }),
)
const { data: fleet } = useAsyncData(() => api.vehicles.list())
</script>

<template>
  <div class="stack" style="--stack-gap: var(--gap-section)">
    <div class="grid" style="--grid-min: 12rem">
      <article class="tile">
        <p class="tile__label">
          {{ t('dashboard.stats.activeStudents') }}
        </p>
        <p class="tile__value">
          {{ activeStudents?.total ?? '—' }}
        </p>
      </article>
      <article class="tile">
        <p class="tile__label">
          {{ t('dashboard.stats.lessonsToday') }}
        </p>
        <p class="tile__value">
          {{ today?.length ?? '—' }}
        </p>
      </article>
      <article class="tile">
        <p class="tile__label">
          {{ t('dashboard.stats.fleet') }}
        </p>
        <p class="tile__value">
          {{ fleet?.length ?? '—' }}
        </p>
      </article>
      <article class="tile">
        <p class="tile__label">
          {{ t('dashboard.stats.openInvoices') }}
        </p>
        <p class="tile__value">
          —
        </p>
      </article>
    </div>

    <section class="stack">
      <h2>{{ t('dashboard.recentStudents') }}</h2>

      <ul v-if="recent?.items.length" class="recent">
        <li v-for="student in recent.items" :key="student.id" class="recent__row">
          <RouterLink :to="{ name: ROUTE.studentDetail, params: { studentId: student.id } }">
            {{ student.lastName }}, {{ student.firstName }}
          </RouterLink>
          <span class="recent__meta">{{ formatDate(student.registeredAt) }}</span>
        </li>
      </ul>

      <p v-else class="muted">
        {{ t('shared.states.loading') }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.tile {
  padding: var(--padding-card);
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
}

.tile__label {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.tile__value {
  margin-block-start: var(--space-2xs);
  font-size: var(--text-3xl);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-none);
}

.recent {
  padding: 0;
  list-style: none;
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
}

.recent__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--padding-cell) var(--space-md);
}

.recent__row + .recent__row {
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.recent__meta {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
}
</style>
