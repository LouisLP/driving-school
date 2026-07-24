import type {
  Enrolment,
  EnrolmentId,
  EnrolmentStatus,
  LicenceClass,
  StudentId,
} from '@/shared/domain'

export interface EnrolmentQuery {
  studentId?: StudentId
  status?: EnrolmentStatus
  licenceClass?: LicenceClass
  /** Enrolments that have not reached `passed` or `withdrawn`. */
  openOnly?: boolean
}

/**
 * An enrolment is only ever born `enquiring`, and its dates are the seam's to keep. All the
 * caller chooses is who is training for what.
 */
export interface NewEnrolment {
  studentId: StudentId
  licenceClass: LicenceClass
}

export interface EnrolmentRepository {
  list: (query?: EnrolmentQuery) => Promise<readonly Enrolment[]>
  get: (id: EnrolmentId) => Promise<Enrolment>
  create: (input: NewEnrolment) => Promise<Enrolment>
  /**
   * The only way an enrolment's status moves. The seam owns the transition table — `passed` and
   * `withdrawn` are terminal, and `startedAt` / `closedAt` are stamped here, never by a caller.
   * An illegal transition rejects with `conflict`.
   */
  setStatus: (id: EnrolmentId, status: EnrolmentStatus) => Promise<Enrolment>
}
