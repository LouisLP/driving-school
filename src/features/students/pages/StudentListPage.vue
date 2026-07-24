<script setup lang="ts">
/**
 * The students list.
 *
 * The five states are the point of this page, and they are not interchangeable — every later list
 * in this app copies them:
 *
 * | first load  | skeleton rows inside the real table chrome, so nothing jumps when data lands   |
 * | refreshing  | the existing rows, dimmed, with `aria-busy`. Never a skeleton                  |
 * | empty       | "no students yet" + the action that fixes it                                   |
 * | no matches  | "nothing matched" + clear filters — a different problem needs a different button |
 * | error       | keyed on `ApiError.kind`, so all four kinds are handled by construction        |
 *
 * The fake API's artificial latency makes the first two visible on every navigation, by design.
 *
 * State lives in the URL and not in this component: coming back from a student record has to
 * restore the filters, and a filtered list has to be linkable.
 */
import type { StudentListItem } from '@/shared/api'
import type { Student } from '@/shared/domain'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { DEFAULT_PAGE_SIZE, useApi } from '@/shared/api'
import { useToast } from '@/shared/stores/toast.store'
import { UiButton, UiEmptyState, UiErrorState, UiPagination } from '@/shared/ui'
import DeleteStudentDialog from '../components/DeleteStudentDialog.vue'
import StudentFilters from '../components/StudentFilters.vue'
import StudentFormDialog from '../components/StudentFormDialog.vue'
import StudentTable from '../components/StudentTable.vue'
import { useStudentList } from '../composables/use-student-list'

const t = useT()
const api = useApi()
const router = useRouter()
const toast = useToast()

const list = useStudentList()

const isFormOpen = ref(false)
const editing = ref<Student | null>(null)

const isDeleteOpen = ref(false)
const deleting = ref<StudentListItem | null>(null)

const total = computed(() => list.students.value?.total ?? 0)

/** `total === 0` is not one state: with a filter set it is a different problem with a different fix. */
const isEmpty = computed(() =>
  !list.isInitialLoad.value && !list.error.value && total.value === 0,
)

const deletingName = computed(() =>
  deleting.value ? `${deleting.value.firstName} ${deleting.value.lastName}` : '',
)

function create(): void {
  editing.value = null
  isFormOpen.value = true
}

/**
 * A row carries a `StudentListItem` and the form needs the whole `Student` — the join the list is
 * built from has no address and no notes on it. One read, on the way into the dialog.
 */
async function edit(student: StudentListItem): Promise<void> {
  editing.value = await api.students.get(student.id)
  isFormOpen.value = true
}

function confirmDelete(student: StudentListItem): void {
  deleting.value = student
  isDeleteOpen.value = true
}

function onSaved(student: Student, wasCreated: boolean): void {
  const name = `${student.firstName} ${student.lastName}`

  if (wasCreated) {
    // Straight to the record: you made it in order to look at it.
    toast.success(t('students.form.created', { name }))
    void router.push({ name: ROUTE.studentDetail, params: { studentId: student.id } })
    return
  }

  toast.success(t('students.form.updated', { name }))
  void list.refresh()
}

function onDeleted(name: string): void {
  toast.success(t('students.delete.deleted', { name }))
  void list.refresh()
}
</script>

<template>
  <div class="page stack">
    <div class="cluster cluster--between">
      <p class="subtitle">
        {{ t('students.subtitle') }}
      </p>

      <UiButton variant="primary" @click="create">
        <Icon icon="lucide:plus" aria-hidden="true" />
        {{ t('students.actions.create') }}
      </UiButton>
    </div>

    <StudentFilters
      v-model:search="list.draft.search"
      v-model:standing="list.draft.standing"
      v-model:licence-class="list.draft.licenceClass"
      :standings="list.standings"
      :offered-classes="list.offeredClasses.value"
      :is-filtered="list.isFiltered.value"
      @clear="list.reset"
    />

    <UiErrorState
      v-if="list.error.value"
      :title="t('students.error.list')"
      :description="t(`shared.errors.${list.error.value.kind}`)"
      :retry-label="t('shared.actions.retry')"
      @retry="list.refresh"
    />

    <template v-else>
      <!-- Matches across every page, not the length of this one. -->
      <p class="count" aria-live="polite">
        {{ t('students.list.count', total) }}
      </p>

      <StudentTable
        :page="list.students.value"
        :sort="list.query.value.sort"
        :is-initial-load="list.isInitialLoad.value"
        :is-refreshing="list.isPending.value && !list.isInitialLoad.value"
        :is-empty="isEmpty"
        @sort="list.draft.sort = $event"
        @edit="edit"
        @remove="confirmDelete"
      >
        <template #empty>
          <UiEmptyState
            v-if="list.isFiltered.value"
            icon="lucide:search-x"
            :title="t('students.empty.noMatch')"
            :description="t('students.empty.noMatchBody')"
          >
            <UiButton @click="list.reset">
              {{ t('students.filters.clear') }}
            </UiButton>
          </UiEmptyState>

          <UiEmptyState
            v-else
            icon="lucide:users"
            :title="t('students.empty.none')"
            :description="t('students.empty.noneBody')"
          >
            <UiButton variant="primary" @click="create">
              <Icon icon="lucide:plus" aria-hidden="true" />
              {{ t('students.actions.create') }}
            </UiButton>
          </UiEmptyState>
        </template>
      </StudentTable>

      <UiPagination
        v-model:page="list.draft.page"
        :total="total"
        :page-size="list.students.value?.pageSize ?? DEFAULT_PAGE_SIZE"
      />
    </template>

    <StudentFormDialog v-model:open="isFormOpen" :student="editing" @saved="onSaved" />

    <DeleteStudentDialog
      v-model:open="isDeleteOpen"
      :student-id="deleting?.id ?? null"
      :name="deletingName"
      @deleted="onDeleted"
    />
  </div>
</template>

<style scoped>
.page {
  container-type: inline-size;
}

.subtitle {
  color: var(--text-muted);
}

.count {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
