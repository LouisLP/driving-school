<script setup lang="ts">
/**
 * One enrolment, and everything about it.
 *
 * Self-contained on purpose: its own progress, its own money, its own appointments. That is what
 * an enrolment *is* — appointments and invoices hang off it, never off the student — and it is
 * why the record page is a stack of these rather than a set of tabs. An "Appointments" tab would
 * be per-enrolment data flattened across enrolments, so every row would have to re-answer *which
 * enrolment?*. See `docs/students-slice.md`, decision 2.
 *
 * Density follows the rule #11 settled: one fact per element, everything else one interaction
 * away. The card answers what a person at the front desk actually asks — how far along are they,
 * do they owe us anything, when are they next in — and puts the history behind a disclosure.
 *
 * Appointments are read-only here. Scheduling belongs to the planner; this slice reads the
 * calendar and never writes it.
 */
import type { AppointmentSummary, EnrolmentSummary } from '@/shared/api'
import type { EnrolmentBalance } from '@/shared/domain'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { useFormat } from '@/shared/composables/use-format'
import { isPositive } from '@/shared/domain'
import { UiBadge, UiCard } from '@/shared/ui'
import EnrolmentProgressPanel from './EnrolmentProgressPanel.vue'
import EnrolmentStatusMenu from './EnrolmentStatusMenu.vue'

const props = defineProps<{
  summary: EnrolmentSummary
  /** The row from `studentBalance.perEnrolment`, so the card and the panel above cannot disagree. */
  balance: EnrolmentBalance | null
}>()

defineEmits<{ changed: [] }>()

const t = useT()
const format = useFormat()

const TONES = {
  enquiring: 'info',
  active: 'success',
  paused: 'warning',
  passed: 'success',
  withdrawn: 'neutral',
} as const

const enrolment = computed(() => props.summary.enrolment)

const tone = computed(() => TONES[enrolment.value.status])

/** Whichever of the three dates are set, on one line. A closed enrolment has all three. */
const dates = computed(() => {
  const it = enrolment.value

  return [
    t('students.enrolment.dates.enquired', { date: format.date(it.enquiredAt) }),
    it.startedAt ? t('students.enrolment.dates.started', { date: format.date(it.startedAt) }) : null,
    it.closedAt ? t('students.enrolment.dates.closed', { date: format.date(it.closedAt) }) : null,
  ].filter((line): line is string => line !== null)
})

function appointmentLine(appointment: AppointmentSummary): string {
  return [
    format.dateTime(appointment.startsAt),
    t(`students.appointmentKind.${appointment.kind}`),
    appointment.instructorName,
  ].filter(Boolean).join(' · ')
}
</script>

<template>
  <UiCard class="card" :level="3">
    <template #title>
      <span class="card__class">{{ enrolment.licenceClass }}</span>
      <UiBadge :tone="tone" dot>
        {{ t(`students.enrolment.status.${enrolment.status}`) }}
      </UiBadge>
      <span class="card__dates">{{ dates.join(' · ') }}</span>
    </template>

    <template #actions>
      <EnrolmentStatusMenu :enrolment="enrolment" @changed="$emit('changed')" />
    </template>

    <EnrolmentProgressPanel :progress="summary.progress" />

    <dl class="lines">
      <div v-if="balance" class="lines__row">
        <dt>{{ t('students.enrolment.balance.label') }}</dt>
        <dd>
          <template v-if="isPositive(balance.outstanding) || isPositive(balance.uninvoiced)">
            <span v-if="isPositive(balance.outstanding)">
              {{ t('students.enrolment.balance.outstanding', {
                amount: format.money(balance.outstanding),
              }) }}
            </span>
            <span v-if="isPositive(balance.uninvoiced)" class="muted">
              · {{ t('students.enrolment.balance.uninvoiced', {
                amount: format.money(balance.uninvoiced),
              }) }}
            </span>
          </template>
          <span v-else class="muted">{{ t('students.enrolment.balance.settled') }}</span>
        </dd>
      </div>

      <div class="lines__row">
        <dt>{{ t('students.enrolment.next.label') }}</dt>
        <dd>
          <span v-if="summary.nextAppointment">
            {{ appointmentLine(summary.nextAppointment) }}
          </span>
          <span v-else class="muted">{{ t('students.enrolment.next.noneBooked') }}</span>
        </dd>
      </div>
    </dl>

    <!-- Collapsed, and native: the history is one fact per line and nobody needs it by default. -->
    <details v-if="summary.recentAppointments.length" class="recent">
      <summary class="recent__summary">
        {{ t('students.enrolment.recent.label') }}
        <span class="muted">
          {{ t('students.enrolment.recent.summary', { count: summary.recentAppointments.length }) }}
        </span>
      </summary>

      <ul class="recent__list">
        <li v-for="appointment in summary.recentAppointments" :key="appointment.id">
          {{ appointmentLine(appointment) }}
          <span class="muted">· {{ t(`students.appointmentStatus.${appointment.status}`) }}</span>
        </li>
      </ul>
    </details>
  </UiCard>
</template>

<style scoped>
.card {
  container-type: inline-size;
}

.card__class {
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-normal);
  text-transform: none;
}

.card__dates {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-regular);
  letter-spacing: var(--tracking-normal);
  text-transform: none;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  font-size: var(--text-sm);
}

.lines__row {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr);
  gap: var(--space-sm);
}

.lines__row dt {
  color: var(--text-muted);
}

.recent__summary {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
}

.recent__summary:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.recent__list {
  margin-block-start: var(--space-xs);
  padding-inline-start: var(--space-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
}

@container (width < 32rem) {
  .lines__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3xs);
  }
}
</style>
