<script setup lang="ts">
/**
 * The identity `<dl>`: one row per fact about the person.
 *
 * Every row renders, empty or not. A page that hides the notes row when there is no note changes
 * shape depending on data, so the eye has to re-find the address every time — a dash costs one
 * line and keeps the layout still.
 *
 * Email and phone are links, because the reason someone opens a student record at the front desk
 * is usually to contact them.
 */
import type { Student } from '@/shared/domain'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { useFormat } from '@/shared/composables/use-format'
import { ageInYears, formatPostalAddress } from '@/shared/domain'
import { UiCard } from '@/shared/ui'

const props = defineProps<{ student: Student }>()

const t = useT()
const format = useFormat()

/** Computed at the formatting edge: an age is a reading of a birthday, not a stored fact. */
const age = computed(() => ageInYears(props.student.dateOfBirth))

const addressLines = computed(() =>
  props.student.address ? formatPostalAddress(props.student.address) : [],
)
</script>

<template>
  <UiCard :title="t('students.detail.identity')">
    <dl class="facts">
      <div class="facts__row">
        <dt>{{ t('students.fields.dateOfBirth') }}</dt>
        <dd>
          {{ format.date(student.dateOfBirth) }}
          <span v-if="Number.isFinite(age)" class="muted">
            · {{ t('students.detail.age', { years: age }) }}
          </span>
        </dd>
      </div>

      <div class="facts__row">
        <dt>{{ t('students.fields.email') }}</dt>
        <dd>
          <a v-if="student.email" :href="`mailto:${student.email}`">{{ student.email }}</a>
          <span v-else class="muted">—</span>
        </dd>
      </div>

      <div class="facts__row">
        <dt>{{ t('students.fields.phone') }}</dt>
        <dd>
          <a v-if="student.phone" :href="`tel:${student.phone}`">{{ student.phone }}</a>
          <span v-else class="muted">—</span>
        </dd>
      </div>

      <div class="facts__row">
        <dt>{{ t('students.fields.address') }}</dt>
        <dd>
          <template v-if="addressLines.length">
            <span v-for="line in addressLines" :key="line" class="facts__line">{{ line }}</span>
          </template>
          <span v-else class="muted">—</span>
        </dd>
      </div>

      <div class="facts__row">
        <dt>{{ t('students.fields.registeredAt') }}</dt>
        <dd>{{ format.date(student.registeredAt) }}</dd>
      </div>

      <div class="facts__row">
        <dt>{{ t('students.fields.notes') }}</dt>
        <dd>
          <!-- Whitespace-preserved: someone typed those line breaks on purpose. -->
          <p v-if="student.notes.trim()" class="facts__notes">
            {{ student.notes }}
          </p>
          <span v-else class="muted">—</span>
        </dd>
      </div>
    </dl>
  </UiCard>
</template>

<style scoped>
.facts {
  display: flex;
  flex-direction: column;
}

.facts__row {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr);
  gap: var(--space-md);
  padding-block: var(--space-xs);
  font-size: var(--text-sm);
}

.facts__row + .facts__row {
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.facts dt {
  color: var(--text-muted);
}

.facts__line {
  display: block;
}

.facts__notes {
  white-space: pre-wrap;
}

.muted {
  color: var(--text-muted);
}

@container (width < 26rem) {
  .facts__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3xs);
  }
}
</style>
