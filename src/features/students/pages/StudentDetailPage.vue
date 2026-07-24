<script setup lang="ts">
/**
 * Rough student detail — here to prove three shell contracts, not to be the specified record page:
 *
 * 1. A flat detail route renders inside the section it belongs to (`meta.section`).
 * 2. `usePageTitle` lets the page rename the header, breadcrumb and tab title once it knows who it
 *    is looking at.
 * 3. The route param is the only input; a reload lands on the same student.
 *
 * What a student record actually shows is issue #8.
 */
import type { StudentId } from '@/shared/domain'
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'
import { usePageTitle } from '@/shared/shell/use-shell'

const props = defineProps<{ studentId: string }>()

const t = useT()
const { locale } = useI18n()
const api = useApi()

const { data: student, isPending, error } = useAsyncData(
  () => api.students.get(props.studentId as StudentId),
  { watch: toRef(props, 'studentId') },
)

const fullName = computed(() =>
  student.value ? `${student.value.firstName} ${student.value.lastName}` : null,
)

usePageTitle(() => fullName.value)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value)
}
</script>

<template>
  <p v-if="isPending && !student" class="muted">
    {{ t('shared.states.loading') }}
  </p>
  <p v-else-if="error">
    {{ t(`shared.errors.${error.kind}`) }}
  </p>

  <dl v-else-if="student" class="facts">
    <div class="facts__row">
      <dt>{{ t('students.fields.contact') }}</dt>
      <dd>{{ student.email ?? student.phone ?? '—' }}</dd>
    </div>
    <div class="facts__row">
      <dt>{{ t('students.fields.registeredAt') }}</dt>
      <dd>{{ formatDate(student.registeredAt) }}</dd>
    </div>
    <div class="facts__row">
      <dt>{{ t('students.fields.dateOfBirth') }}</dt>
      <dd>{{ formatDate(student.dateOfBirth) }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.facts {
  max-inline-size: var(--measure-prose);
  padding: var(--padding-card);
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
}

.facts__row {
  display: grid;
  grid-template-columns: 12rem minmax(0, 1fr);
  gap: var(--space-md);
  padding-block: var(--space-xs);
}

.facts__row + .facts__row {
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.facts dt {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
}
</style>
