<script setup lang="ts">
/**
 * The bars, the special drives, the readiness lines and the exams.
 *
 * Every number here is read off `progress.readiness`, which already carries the completed count
 * and the required count for each line — so this component does no arithmetic and re-derives
 * nothing. Adding a rule here would be the third place progress is computed.
 *
 * Three rules the layout encodes, all settled in `docs/training-model.md` (#21):
 *
 * - **Theory is two bars, not one.** Basic and class-specific courses complete independently, and
 *   a student who has sat fourteen basic lessons and no class-specific one has not finished a
 *   fourteen-lesson course.
 * - **Special drives are never summed.** Overland, autobahn and night are different skills; one
 *   number would let four autobahn drives stand in for the missing night ones.
 * - **Readiness is advisory.** It disables nothing and blocks nothing. The school decides when a
 *   student is presented; this line only says what the requirements say.
 */
import type { EnrolmentProgress } from '@/shared/api'
import type { ExamReadinessGroup, TrainingRequirement } from '@/shared/domain'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { useFormat } from '@/shared/composables/use-format'
import { unmetRequirements } from '@/shared/domain'
import { UiBadge, UiProgressBar } from '@/shared/ui'

const props = defineProps<{ progress: EnrolmentProgress }>()

const t = useT()
const format = useFormat()

function find(group: ExamReadinessGroup, kind: TrainingRequirement['kind']) {
  return group.requirements.find(it => it.kind === kind)
}

const theory = computed(() => props.progress.readiness.theory)
const practical = computed(() => props.progress.readiness.practical)

const standard = computed(() => find(practical.value, 'standardPractical'))

const theoryBars = computed(() =>
  ['basicTheory', 'classSpecificTheory']
    .map(kind => find(theory.value, kind as TrainingRequirement['kind']))
    .filter((it): it is TrainingRequirement => it !== undefined && it.required > 0),
)

const specialDrives = computed(() =>
  ['overlandDrive', 'autobahnDrive', 'nightDrive']
    .map(kind => find(practical.value, kind as TrainingRequirement['kind']))
    .filter((it): it is TrainingRequirement => it !== undefined),
)

/** How many lines of a group are still short. What the readiness summary counts. */
function shortfall(group: ExamReadinessGroup): number {
  return unmetRequirements(group).length
}

function count(requirement: TrainingRequirement): string {
  return t('students.enrolment.progress.count', {
    completed: requirement.completed,
    required: requirement.required,
  })
}

function requirementLabel(requirement: TrainingRequirement): string {
  return t(`students.enrolment.requirement.${requirement.kind}`)
}

/** "Theory passed", "Practical failed", or "Theory sat, no result yet". */
function examLabel(exam: EnrolmentProgress['exams'][number]): string {
  const kind = t(`students.appointmentKind.${exam.examKind}`)

  if (exam.result === 'passed')
    return t('students.enrolment.exams.passed', { exam: kind })

  if (exam.result === 'failed')
    return t('students.enrolment.exams.failed', { exam: kind })

  return t('students.enrolment.exams.awaitingResult', { exam: kind })
}
</script>

<template>
  <div class="progress">
    <!-- Standard lessons are the school's own policy, not the law's — but they are what a
         receptionist is asked about, so they lead. -->
    <div v-if="standard && standard.required > 0" class="progress__bar">
      <span class="progress__label">{{ t('students.enrolment.progress.standard') }}</span>
      <UiProgressBar
        :value="standard.completed"
        :max="standard.required"
        :value-label="`${requirementLabel(standard)}: ${count(standard)}`"
      />
      <span class="progress__count">{{ count(standard) }}</span>
    </div>

    <div v-for="bar in theoryBars" :key="bar.kind" class="progress__bar">
      <span class="progress__label">{{ requirementLabel(bar) }}</span>
      <UiProgressBar
        :value="bar.completed"
        :max="bar.required"
        :value-label="`${requirementLabel(bar)}: ${count(bar)}`"
      />
      <span class="progress__count">{{ count(bar) }}</span>
    </div>

    <div v-if="specialDrives.length" class="progress__row">
      <span class="progress__label">{{ t('students.enrolment.progress.specialDrives') }}</span>
      <span class="drives">
        <span v-for="drive in specialDrives" :key="drive.kind" class="drives__item">
          <span class="drives__count" :data-met="drive.isMet ? '' : undefined">
            {{ count(drive) }}
          </span>
          {{ requirementLabel(drive) }}
        </span>
      </span>
    </div>

    <div class="progress__row">
      <span class="progress__label">{{ t('students.enrolment.readiness.label') }}</span>
      <span class="readiness">
        <span class="readiness__item">
          {{ t('students.enrolment.readiness.theory') }}
          <UiBadge :tone="theory.isMet ? 'success' : 'neutral'">
            {{ theory.isMet
              ? t('students.enrolment.readiness.ready')
              : t('students.enrolment.readiness.short', { count: shortfall(theory) }) }}
          </UiBadge>
        </span>

        <span class="readiness__item">
          {{ t('students.enrolment.readiness.practical') }}
          <UiBadge :tone="practical.isMet ? 'success' : 'neutral'">
            {{ practical.isMet
              ? t('students.enrolment.readiness.ready')
              : t('students.enrolment.readiness.short', { count: shortfall(practical) }) }}
          </UiBadge>
        </span>
      </span>
    </div>

    <div class="progress__row">
      <span class="progress__label">{{ t('students.enrolment.exams.label') }}</span>
      <span>
        <template v-if="progress.exams.length">
          <span v-for="exam in progress.exams" :key="exam.satAt" class="exam">
            {{ examLabel(exam) }}
            <span class="muted">· {{ format.date(exam.satAt) }}</span>
          </span>
        </template>
        <span v-else class="muted">{{ t('students.enrolment.exams.notSat') }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: var(--text-sm);
}

.progress__bar,
.progress__row {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-sm);
}

.progress__row {
  grid-template-columns: 9rem minmax(0, 1fr);
}

.progress__label {
  color: var(--text-muted);
}

.progress__count {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.drives,
.readiness {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-md);
}

.drives__item,
.readiness__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  color: var(--text-muted);
}

.drives__count {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.drives__count[data-met] {
  color: var(--success-text);
}

.exam {
  display: block;
}

.muted {
  color: var(--text-muted);
}

@container (width < 32rem) {
  .progress__bar,
  .progress__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3xs);
  }

  .progress__count {
    justify-self: start;
  }
}
</style>
