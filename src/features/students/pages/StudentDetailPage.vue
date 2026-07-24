<script setup lang="ts">
import type { EnrolmentSummary } from '@/shared/api'
import type { EnrolmentBalance, StudentId } from '@/shared/domain'
/**
 * The student record: who they are, what they owe, and a card per enrolment.
 *
 * No tabs and no `/students/:id/enrolments/:enrolmentId` route. Everything worth knowing about a
 * student's training hangs off an enrolment, so their enrolments are the content of their page —
 * see `docs/students-slice.md`, decision 2. A three-enrolment alumnus gets a long page; that is
 * the correct amount of page for three trainings.
 *
 * Two columns on wide viewports and stacked below, via a **container query** on the page wrapper.
 * #4 settled that container queries are the default and media queries belong to the shell.
 *
 * Three independent reads. A slow balance does not hold up the identity panel, and a failed one
 * degrades to an error inside the account panel rather than blanking a page that could still show
 * a name, an address and a training history.
 */
import type { UiMenuItem } from '@/shared/ui'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { CLOSED_ENROLMENT_STATUSES } from '@/shared/api'
import { deriveStudentStanding } from '@/shared/domain'
import { usePageTitle } from '@/shared/shell/use-shell'
import { useToast } from '@/shared/stores/toast.store'
import { UiButton, UiCard, UiDropdownMenu, UiEmptyState, UiErrorState, UiSkeleton } from '@/shared/ui'
import DeleteStudentDialog from '../components/DeleteStudentDialog.vue'
import EnrolmentCard from '../components/EnrolmentCard.vue'
import NewEnrolmentDialog from '../components/NewEnrolmentDialog.vue'
import StudentAccountPanel from '../components/StudentAccountPanel.vue'
import StudentFormDialog from '../components/StudentFormDialog.vue'
import StudentIdentityPanel from '../components/StudentIdentityPanel.vue'
import StudentStandingBadge from '../components/StudentStandingBadge.vue'
import { useStudentRecord } from '../composables/use-student-record'

const props = defineProps<{ studentId: string }>()

const t = useT()
const router = useRouter()
const toast = useToast()

const studentId = computed(() => props.studentId as StudentId)
const record = useStudentRecord(studentId)

usePageTitle(() => record.fullName.value)

const isFormOpen = ref(false)
const isEnrolmentOpen = ref(false)
const isDeleteOpen = ref(false)

const summaries = computed<readonly EnrolmentSummary[]>(() => record.enrolments.data.value ?? [])

/** The list's derived standing, computed here from the same rule the seam uses. */
const standing = computed(() =>
  deriveStudentStanding(summaries.value.map(it => it.enrolment)),
)

const openLicenceClasses = computed(() =>
  summaries.value
    .filter(it => !CLOSED_ENROLMENT_STATUSES.includes(it.enrolment.status))
    .map(it => it.enrolment.licenceClass),
)

function balanceFor(summary: EnrolmentSummary): EnrolmentBalance | null {
  return record.balance.data.value?.perEnrolment
    .find(it => it.enrolmentId === summary.enrolment.id) ?? null
}

/**
 * Delete is offered and disabled rather than hidden, with the reason as its title. The seam
 * rejects it with `conflict` regardless — a student who has trained here is part of the school's
 * history — and a button whose only outcome is an error should not be pressable.
 */
const overflowActions = computed<readonly UiMenuItem[]>(() => [{
  id: 'delete',
  label: t('students.actions.delete'),
  icon: 'lucide:trash-2',
  destructive: true,
  disabled: summaries.value.length > 0,
  disabledReason: t('students.delete.hasEnrolments'),
}])

function onSaved(): void {
  toast.success(t('students.form.updated', { name: record.fullName.value ?? '' }))
  void record.refresh()
}

function onEnrolmentCreated(licenceClass: string): void {
  toast.success(t('students.newEnrolment.created', { licenceClass }))
  void record.refresh()
}

function onDeleted(name: string): void {
  toast.success(t('students.delete.deleted', { name }))
  void router.push({ name: ROUTE.students })
}
</script>

<template>
  <UiErrorState
    v-if="record.student.error.value"
    :title="t('students.error.record')"
    :description="t(`shared.errors.${record.student.error.value.kind}`)"
    :retry-label="t('shared.actions.retry')"
    @retry="record.student.refresh"
  />

  <div v-else class="record stack">
    <div class="cluster cluster--between">
      <StudentStandingBadge v-if="record.student.data.value" :standing="standing" />
      <UiSkeleton v-else width="6rem" rounded />

      <div class="cluster">
        <UiButton :disabled="!record.student.data.value" @click="isFormOpen = true">
          <Icon icon="lucide:pencil" aria-hidden="true" />
          {{ t('students.actions.edit') }}
        </UiButton>

        <UiButton variant="primary" @click="isEnrolmentOpen = true">
          <Icon icon="lucide:plus" aria-hidden="true" />
          {{ t('students.actions.newEnrolment') }}
        </UiButton>

        <UiDropdownMenu
          :items="overflowActions"
          :trigger-label="t('students.actions.more')"
          @select="isDeleteOpen = true"
        />
      </div>
    </div>

    <div class="record__panels">
      <StudentIdentityPanel v-if="record.student.data.value" :student="record.student.data.value" />

      <UiCard v-else :title="t('students.detail.identity')">
        <UiSkeleton width="70%" />
        <UiSkeleton width="55%" />
        <UiSkeleton width="60%" />
      </UiCard>

      <StudentAccountPanel
        :balance="record.balance.data.value"
        :is-loading="record.balance.isInitialLoad.value"
        :error="record.balance.error.value"
        @retry="record.balance.refresh"
      />
    </div>

    <section class="record__enrolments stack">
      <h2 class="record__heading">
        {{ t('students.detail.enrolments') }}
      </h2>

      <UiErrorState
        v-if="record.enrolments.error.value"
        :title="t('students.error.enrolments')"
        :description="t(`shared.errors.${record.enrolments.error.value.kind}`)"
        :retry-label="t('shared.actions.retry')"
        @retry="record.enrolments.refresh"
      />

      <UiCard v-else-if="record.enrolments.isInitialLoad.value">
        <UiSkeleton width="40%" />
        <UiSkeleton />
        <UiSkeleton width="80%" />
      </UiCard>

      <!--
        The prospect case, and the common first screen of a new record — so it is a designed state
        rather than a blank area.
      -->
      <UiEmptyState
        v-else-if="summaries.length === 0"
        icon="lucide:graduation-cap"
        :title="t('students.detail.noEnrolments')"
        :description="t('students.detail.noEnrolmentsBody')"
      >
        <UiButton variant="primary" @click="isEnrolmentOpen = true">
          <Icon icon="lucide:plus" aria-hidden="true" />
          {{ t('students.actions.newEnrolment') }}
        </UiButton>
      </UiEmptyState>

      <template v-else>
        <EnrolmentCard
          v-for="summary in summaries"
          :key="summary.enrolment.id"
          :summary="summary"
          :balance="balanceFor(summary)"
          @changed="record.refresh"
        />
      </template>
    </section>

    <StudentFormDialog
      v-model:open="isFormOpen"
      :student="record.student.data.value"
      @saved="onSaved"
    />

    <NewEnrolmentDialog
      v-model:open="isEnrolmentOpen"
      :student-id="studentId"
      :open-licence-classes="openLicenceClasses"
      @created="onEnrolmentCreated"
    />

    <DeleteStudentDialog
      v-model:open="isDeleteOpen"
      :student-id="studentId"
      :name="record.fullName.value ?? ''"
      @deleted="onDeleted"
    />
  </div>
</template>

<style scoped>
.record {
  container-type: inline-size;
}

.record__panels {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
  gap: var(--gap-stack);
}

.record__enrolments {
  margin-block-start: var(--space-lg);
}

.record__heading {
  font-size: var(--text-lg);
}

/* The shell's breakpoints are the shell's. A panel stacks when its own column runs out. */
@container (width < 48rem) {
  .record__panels {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
