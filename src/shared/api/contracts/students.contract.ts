import type { Page, Sort } from '../query.contract'
import type {
  LicenceClass,
  Student,
  StudentId,
  StudentStanding,
} from '@/shared/domain'

/**
 * What the CRM list renders, joined at the seam.
 *
 * `standing` is derived from the student's enrolments, so the list cannot be assembled from the
 * students collection alone. A real backend would do this join rather than make the client fetch
 * every enrolment in the school to render page one — so the fake does it too.
 */
export interface StudentListItem {
  id: StudentId
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  registeredAt: Student['registeredAt']
  standing: StudentStanding
  /** Licence classes of every enrolment that has not closed — what the list shows as chips. */
  openLicenceClasses: readonly LicenceClass[]
}

export type StudentSortField = 'lastName' | 'registeredAt' | 'standing'

export interface StudentQuery {
  /** Matches name or email. Case- and diacritic-folded, so `mul` finds `Müller`. */
  search?: string
  standing?: StudentStanding
  /** Students holding an open enrolment in this class. */
  licenceClass?: LicenceClass
  sort?: Sort<StudentSortField>
  /** 1-based. */
  page?: number
  pageSize?: number
}

/** Everything about a student except what the seam mints. */
export type NewStudent = Omit<Student, 'id' | 'registeredAt'>

export type StudentPatch = Partial<NewStudent>

export interface StudentRepository {
  list: (query?: StudentQuery) => Promise<Page<StudentListItem>>
  get: (id: StudentId) => Promise<Student>
  create: (input: NewStudent) => Promise<Student>
  update: (id: StudentId, patch: StudentPatch) => Promise<Student>
  /**
   * Only a student with no enrolments can be erased — anyone who has trained here is part of the
   * school's history. Anything else rejects with `conflict`.
   */
  remove: (id: StudentId) => Promise<void>
}
