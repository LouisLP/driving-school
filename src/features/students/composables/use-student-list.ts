import type { ComputedRef } from 'vue'
import type {
  ApiError,
  Page,
  Sort,
  StudentListItem,
  StudentQuery,
  StudentSortField,
} from '@/shared/api'
import type { UseListQuery } from '@/shared/composables/use-list-query'
import type { LicenceClass, StudentStanding } from '@/shared/domain'
import { computed } from 'vue'
import { DEFAULT_PAGE_SIZE, useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'
import { enumCodec, pageCodec, sortCodec, useListQuery } from '@/shared/composables/use-list-query'
import { STUDENT_STANDINGS } from '@/shared/domain'

/**
 * The list's state, one field per control. Deliberately not `StudentQuery` itself: the URL wants
 * `search: ''` for "no search" and the seam wants the key absent, and conflating the two is how a
 * request ends up filtering on an empty string.
 */
export interface StudentListState {
  search: string
  /** `null` is "no filter" — the value a select's "Any" row carries, and what the URL omits. */
  standing: StudentStanding | null
  licenceClass: LicenceClass | null
  sort: Sort<StudentSortField>
  page: number
}

const SORT_FIELDS: readonly StudentSortField[] = ['lastName', 'registeredAt', 'standing']

/** Newest first. A CRM list is opened to see who just arrived. */
export const DEFAULT_STUDENT_SORT: Sort<StudentSortField> = {
  field: 'registeredAt',
  direction: 'desc',
}

export const STUDENT_LIST_DEFAULTS: StudentListState = {
  search: '',
  standing: null,
  licenceClass: null,
  sort: DEFAULT_STUDENT_SORT,
  page: 1,
}

/** The URL-shaped state, translated into what the seam accepts. */
export function toStudentQuery(state: StudentListState): StudentQuery {
  return {
    // The URL says `''` and `null` for "unset"; the seam wants the key absent. Conflating the two
    // is how a request ends up filtering on an empty string.
    search: state.search.trim() || undefined,
    standing: state.standing ?? undefined,
    licenceClass: state.licenceClass ?? undefined,
    sort: state.sort,
    page: state.page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export interface UseStudentList extends UseListQuery<StudentListState> {
  students: ComputedRef<Page<StudentListItem> | null>
  isInitialLoad: ComputedRef<boolean>
  isPending: ComputedRef<boolean>
  error: ComputedRef<ApiError | null>
  refresh: () => Promise<void>
  /**
   * Only the classes the school currently teaches. Filtering by a class it does not teach is a
   * filter that always returns nothing, which is a worse answer than not offering it.
   */
  offeredClasses: ComputedRef<readonly LicenceClass[]>
  /** The four standings, in the order the filter offers them. */
  standings: readonly StudentStanding[]
}

/**
 * Everything the list page reads: the query in the URL, the page of students it selects, and the
 * licence classes the class filter may offer.
 *
 * Two reads rather than one, and they are deliberately independent: the offerings are the
 * school's configuration and change roughly never, so they are fetched once and are not part of
 * what a filter change re-requests.
 */
export function useStudentList(): UseStudentList {
  const api = useApi()

  const list = useListQuery<StudentListState>(STUDENT_LIST_DEFAULTS, {
    codecs: {
      standing: enumCodec<StudentStanding>(STUDENT_STANDINGS),
      sort: sortCodec<StudentSortField>(SORT_FIELDS),
      page: pageCodec,
    },
    debounced: ['search'],
    pageField: 'page',
    sortField: 'sort',
  })

  const students = useAsyncData(
    () => api.students.list(toStudentQuery(list.query.value)),
    { watch: list.query },
  )

  const offerings = useAsyncData(() => api.offerings.list())

  return {
    ...list,
    students: computed(() => students.data.value),
    isInitialLoad: computed(() => students.isInitialLoad.value),
    isPending: computed(() => students.isPending.value),
    error: computed(() => students.error.value),
    refresh: students.refresh,
    offeredClasses: computed(() =>
      (offerings.data.value ?? []).filter(it => it.isOffered).map(it => it.licenceClass),
    ),
    standings: STUDENT_STANDINGS,
  }
}
