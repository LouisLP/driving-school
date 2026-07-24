import type {
  Appointment,
  AppointmentId,
  AppointmentKind,
  Attendance,
  EnrolmentId,
  ExamAppointment,
  ExamResult,
  InstructorId,
  IsoDateTime,
  PracticalAppointment,
  StudentId,
  TheoryAppointment,
  VehicleId,
} from '@/shared/domain'

/**
 * A calendar query, not a page. The planner asks for a window — a week, a day — and gets every
 * appointment in it; "page 3 of Tuesday" is not a thing anyone wants. The window is required so
 * that no caller can accidentally ask for the school's entire history.
 */
export interface AppointmentQuery {
  /** Inclusive. */
  from: IsoDateTime
  /** Exclusive. Appointments overlapping the window are returned, not only those inside it. */
  to: IsoDateTime
  instructorIds?: readonly InstructorId[]
  vehicleIds?: readonly VehicleId[]
  kind?: AppointmentKind
  /** Everything on one student's training record. */
  enrolmentId?: EnrolmentId
  /** Every appointment across every enrolment this student holds. */
  studentId?: StudentId
}

/**
 * What it takes to put an appointment on the calendar: the whole thing minus the id, minus the
 * outcome (everything is born `planned`), with notes optional.
 */
type Draft<T extends Appointment> = Omit<T, 'id' | 'outcome' | 'notes'> & { notes?: string }

export type NewPracticalAppointment = Draft<PracticalAppointment>
export type NewTheoryAppointment = Draft<TheoryAppointment>

/**
 * Spelled out as a union rather than `Draft<ExamAppointment>`: `Omit` over an intersection with a
 * union flattens it, and would quietly let a practical exam be booked without a vehicle.
 */
type ExamDraft = Omit<ExamAppointment, 'id' | 'outcome' | 'notes' | 'examKind' | 'vehicleId'> & {
  notes?: string
}

export type NewExamAppointment
  = | (ExamDraft & { examKind: 'theory' })
    | (ExamDraft & { examKind: 'practical', vehicleId: VehicleId })

export type NewAppointment
  = | NewPracticalAppointment
    | NewTheoryAppointment
    | NewExamAppointment

/** Moving an appointment changes when it is and how long it runs — never what it is. */
export interface AppointmentReschedule {
  startsAt: IsoDateTime
  durationMinutes: number
}

/**
 * The write vocabulary is the domain's, not CRUD's. `outcome` is a discriminated union whose
 * timestamps only exist on the right variant, so there is no honest way to expose it as a patch:
 * `cancel` and `recordNoShow` are what a caller can actually mean.
 */
export interface AppointmentRepository {
  list: (query: AppointmentQuery) => Promise<readonly Appointment[]>
  get: (id: AppointmentId) => Promise<Appointment>
  /** Rejects with `conflict` on a double-booked instructor or vehicle, or a licence-class mismatch. */
  schedule: (input: NewAppointment) => Promise<Appointment>
  reschedule: (id: AppointmentId, move: AppointmentReschedule) => Promise<Appointment>
  complete: (id: AppointmentId) => Promise<Appointment>
  cancel: (id: AppointmentId, cancelledBy: 'student' | 'school') => Promise<Appointment>
  recordNoShow: (id: AppointmentId) => Promise<Appointment>
  /** Adds the attendee if they are not registered yet; rejects with `conflict` beyond capacity. */
  setAttendance: (
    id: AppointmentId,
    enrolmentId: EnrolmentId,
    status: Attendance['status'],
  ) => Promise<TheoryAppointment>
  recordExamResult: (id: AppointmentId, result: ExamResult) => Promise<ExamAppointment>
}
