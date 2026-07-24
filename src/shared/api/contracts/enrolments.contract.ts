import type {
  AppointmentId,
  AppointmentKind,
  AppointmentStatus,
  Enrolment,
  EnrolmentId,
  EnrolmentProgress,
  EnrolmentStatus,
  IsoDateTime,
  LicenceClass,
  StudentId,
} from '@/shared/domain'

/**
 * Re-exported so the record page imports its read model and the rule behind it from one place.
 * Defined in the domain because `deriveEnrolmentProgress` — not the seam — is what produces it,
 * and the domain may not import the seam. Same arrangement as `FieldErrors`.
 */
export type { EnrolmentExam, EnrolmentProgress } from '@/shared/domain'

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

/** One appointment as a card renders it: when, what, and who is taking it. */
export interface AppointmentSummary {
  id: AppointmentId
  kind: AppointmentKind
  startsAt: IsoDateTime
  /** Joined at the seam — the client should not fetch the staff list to render a card. */
  instructorName: string
  status: AppointmentStatus
}

/**
 * Everything the student record shows about one enrolment, in one row.
 *
 * A read model, not an entity: read-only, never written back, exactly like `StudentListItem` and
 * `DebtorListItem`. It exists because `appointments.list` requires a `{ from, to }` window
 * — deliberately, so no caller can ask for the school's whole history — which leaves "every
 * lesson this enrolment has ever had" inexpressible above the seam. Counting client-side would
 * also mean one windowed query per enrolment per page view, which is the N+1 the seam rule in
 * `docs/api-seam.md` exists to prevent.
 */
export interface EnrolmentSummary {
  enrolment: Enrolment
  progress: EnrolmentProgress
  /** The soonest appointment still to come, or null when nothing is booked. */
  nextAppointment: AppointmentSummary | null
  /** The five most recent past appointments, newest first. */
  recentAppointments: readonly AppointmentSummary[]
}

/**
 * A union rather than two optional fields: "summaries of nothing in particular" is not a question
 * the record page or the planner ever asks, and an object with neither set should not compile.
 */
export type EnrolmentSummaryQuery
  = | { studentId: StudentId }
    | { enrolmentId: EnrolmentId }

export interface EnrolmentRepository {
  list: (query?: EnrolmentQuery) => Promise<readonly Enrolment[]>
  get: (id: EnrolmentId) => Promise<Enrolment>
  /**
   * The record page's read: enrolments joined with their progress, their next appointment and
   * their recent history. Ordered open first, then closed by `closedAt` descending.
   *
   * Rejects with `notFound` when the student or enrolment does not exist — an empty array means
   * "this student has no enrolments", which is a different answer and a different screen.
   */
  summaries: (query: EnrolmentSummaryQuery) => Promise<readonly EnrolmentSummary[]>
  create: (input: NewEnrolment) => Promise<Enrolment>
  /**
   * The only way an enrolment's status moves. The seam owns the transition table — `passed` and
   * `withdrawn` are terminal, and `startedAt` / `closedAt` are stamped here, never by a caller.
   * An illegal transition rejects with `conflict`.
   */
  setStatus: (id: EnrolmentId, status: EnrolmentStatus) => Promise<Enrolment>
}

/**
 * The transition table from `docs/domain-model.md`, encoded once.
 *
 * `passed` and `withdrawn` have no exits: a returning student gets a new enrolment.
 *
 * On the contract rather than private to the fake, because a status menu offering an illegal
 * transition is a control whose only possible outcome is an `ApiError` — and the seam is the one
 * place that knows the table. An HTTP implementation would answer with the same list.
 */
export const ALLOWED_ENROLMENT_TRANSITIONS: Readonly<
  Record<EnrolmentStatus, readonly EnrolmentStatus[]>
> = {
  enquiring: ['active', 'withdrawn'],
  active: ['paused', 'passed', 'withdrawn'],
  paused: ['active', 'withdrawn'],
  passed: [],
  withdrawn: [],
}

/** `passed` and `withdrawn` — an enrolment that has stopped. */
export const CLOSED_ENROLMENT_STATUSES: readonly EnrolmentStatus[] = ['passed', 'withdrawn']
