<script setup lang="ts">
/**
 * The six columns, written out as markup over `UiDataTable`.
 *
 * Columns are template and not data, because a column IS markup: the licence-class cell is a row
 * of chips, the contact cell is two lines with a fallback, and the name cell is a link wrapping
 * the whole thing. Describing those as a column config would buy nothing the seam does not
 * already do — see `docs/students-slice.md`, decision 7.
 *
 * The skeleton renders inside the real table chrome, so the header does not jump when the data
 * lands. It is for a first load only; a refresh dims the rows that are already readable.
 */
import type { Page, Sort, StudentListItem, StudentSortField } from '@/shared/api'
import type { UiMenuItem } from '@/shared/ui'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { DEFAULT_PAGE_SIZE } from '@/shared/api'
import { useFormat } from '@/shared/composables/use-format'
import { UiBadge, UiDataTable, UiDropdownMenu, UiSkeleton, UiSortableHeader } from '@/shared/ui'
import StudentStandingBadge from './StudentStandingBadge.vue'

const props = defineProps<{
  page: Page<StudentListItem> | null
  sort: Sort<StudentSortField>
  isInitialLoad: boolean
  isRefreshing: boolean
  isEmpty: boolean
}>()

const emit = defineEmits<{
  sort: [next: Sort<StudentSortField>]
  edit: [student: StudentListItem]
  remove: [student: StudentListItem]
}>()

const t = useT()
const format = useFormat()

const rows = computed(() => props.page?.items ?? [])

/** Enough placeholder rows to fill the viewport once, not a guess at how many will arrive. */
const skeletonRows = computed(() => Array.from(
  { length: Math.min(props.page?.pageSize ?? DEFAULT_PAGE_SIZE, 8) },
  (_, index) => index,
))

const rowActions: readonly UiMenuItem[] = [
  { id: 'edit', label: t('students.actions.edit'), icon: 'lucide:pencil' },
  { id: 'remove', label: t('students.actions.delete'), icon: 'lucide:trash-2', destructive: true },
]

function onRowAction(id: string, student: StudentListItem): void {
  if (id === 'edit')
    emit('edit', student)
  else
    emit('remove', student)
}

function toDetail(student: StudentListItem) {
  return { name: ROUTE.studentDetail, params: { studentId: student.id } }
}
</script>

<template>
  <UiDataTable
    :caption="t('students.list.title')"
    :busy="isRefreshing"
    :is-empty="isEmpty"
  >
    <template #head>
      <tr>
        <UiSortableHeader
          field="lastName"
          :label="t('students.fields.name')"
          :sort="sort"
          @sort="$emit('sort', $event)"
        />

        <th scope="col">
          {{ t('students.fields.contact') }}
        </th>

        <UiSortableHeader
          field="standing"
          :label="t('students.fields.standing')"
          :sort="sort"
          @sort="$emit('sort', $event)"
        />

        <th scope="col">
          {{ t('students.fields.licenceClass') }}
        </th>

        <UiSortableHeader
          field="registeredAt"
          :label="t('students.fields.registeredAt')"
          :sort="sort"
          initial-direction="desc"
          @sort="$emit('sort', $event)"
        />

        <th scope="col">
          <span class="visually-hidden">{{ t('students.columns.actions') }}</span>
        </th>
      </tr>
    </template>

    <template #body>
      <template v-if="isInitialLoad">
        <tr v-for="index in skeletonRows" :key="`skeleton-${index}`">
          <td><UiSkeleton width="9rem" /></td>
          <td><UiSkeleton width="12rem" /></td>
          <td><UiSkeleton width="5rem" rounded /></td>
          <td><UiSkeleton width="3rem" /></td>
          <td><UiSkeleton width="6rem" /></td>
          <td />
        </tr>
      </template>

      <tr v-for="student in rows" v-else :key="student.id">
        <td>
          <!-- The whole cell is the link: a name is what someone aims at to open a record. -->
          <RouterLink class="name" :to="toDetail(student)">
            {{ student.lastName }}, {{ student.firstName }}
          </RouterLink>
        </td>

        <td>
          <template v-if="student.email || student.phone">
            <a v-if="student.email" class="contact" :href="`mailto:${student.email}`">
              {{ student.email }}
            </a>
            <span v-if="student.phone" class="contact contact--secondary">
              {{ student.phone }}
            </span>
          </template>
          <span v-else class="muted">—</span>
        </td>

        <td>
          <StudentStandingBadge :standing="student.standing" />
        </td>

        <td>
          <span v-if="student.openLicenceClasses.length" class="classes">
            <UiBadge
              v-for="licenceClass in student.openLicenceClasses"
              :key="licenceClass"
              variant="outline"
            >
              {{ licenceClass }}
            </UiBadge>
          </span>
          <span v-else class="muted">—</span>
        </td>

        <td class="muted">
          {{ format.date(student.registeredAt) }}
        </td>

        <td class="actions">
          <UiDropdownMenu
            :items="rowActions"
            :trigger-label="t('students.columns.actions')"
            @select="onRowAction($event, student)"
          />
        </td>
      </tr>
    </template>

    <template #empty>
      <slot name="empty" />
    </template>
  </UiDataTable>
</template>

<style scoped>
.name {
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.name:hover {
  text-decoration: underline;
}

.contact {
  display: block;
  color: inherit;
  text-decoration: none;
}

.contact:hover {
  text-decoration: underline;
}

.contact--secondary {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.classes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3xs);
}

.actions {
  inline-size: 0;
  text-align: end;
}

.muted {
  color: var(--text-muted);
}
</style>
