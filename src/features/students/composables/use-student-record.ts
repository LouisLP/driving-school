import type { ComputedRef, Ref } from 'vue'
import type { EnrolmentSummary } from '@/shared/api'
import type { UseAsyncData } from '@/shared/composables/use-async-data'
import type { Student, StudentBalance, StudentId } from '@/shared/domain'
import { computed } from 'vue'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'

export interface UseStudentRecord {
  student: UseAsyncData<Student>
  enrolments: UseAsyncData<readonly EnrolmentSummary[]>
  balance: UseAsyncData<StudentBalance>
  /** `Lena Müller`, or null before the person has arrived. What `usePageTitle` is handed. */
  fullName: ComputedRef<string | null>
  /** Re-reads all three. What a write on this page calls when it succeeds. */
  refresh: () => Promise<void>
}

/**
 * The student record's three reads, composed so the page reads as one thing.
 *
 * Three calls and no N+1: the person, their enrolments joined with progress and appointments, and
 * their money already summed per enrolment. Everything the page renders comes from these; nothing
 * on it fetches per card.
 *
 * Each is its own `useAsyncData` on purpose. A slow balance must not hold up the identity panel,
 * and a failed balance degrades to an error inside the account panel rather than blanking a page
 * that could otherwise show a name, an address and a training history.
 */
export function useStudentRecord(studentId: Ref<StudentId>): UseStudentRecord {
  const api = useApi()

  const student = useAsyncData(() => api.students.get(studentId.value), { watch: studentId })

  const enrolments = useAsyncData(
    () => api.enrolments.summaries({ studentId: studentId.value }),
    { watch: studentId },
  )

  const balance = useAsyncData(
    () => api.billing.studentBalance(studentId.value),
    { watch: studentId },
  )

  const fullName = computed(() =>
    student.data.value ? `${student.data.value.firstName} ${student.data.value.lastName}` : null,
  )

  async function refresh(): Promise<void> {
    // In parallel: they are independent reads, and awaiting them in turn would make a write feel
    // three times slower than the slowest of them.
    await Promise.all([student.refresh(), enrolments.refresh(), balance.refresh()])
  }

  return { student, enrolments, balance, fullName, refresh }
}
