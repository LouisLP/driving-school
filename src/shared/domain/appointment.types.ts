import type {
  AppointmentId,
  EnrolmentId,
  InstructorId,
  LocationId,
  VehicleId,
} from './identifier.types'
import type { IsoDateTime } from './time.types'

/**
 * The lifecycle of an appointment, as a union so that the fields only exist where they mean
 * something. `completed` is what makes an appointment invoiceable; `noShow` stays distinct from
 * `cancelled` because a school bills them under different rules, and `cancelledAt` is what lets
 * finance tell a three-weeks-out cancellation from a same-day one.
 */
export type AppointmentOutcome
  = | { status: 'planned' }
    | { status: 'completed', completedAt: IsoDateTime }
    | { status: 'cancelled', cancelledAt: IsoDateTime, cancelledBy: 'student' | 'school' }
    | { status: 'noShow', recordedAt: IsoDateTime }

/** Fields every appointment has, whatever its kind. */
interface AppointmentBase {
  id: AppointmentId
  /** Exactly one, always — this is what the planner's instructor columns are keyed on. */
  instructorId: InstructorId
  startsAt: IsoDateTime
  /** Start plus duration rather than start and end: 45 minutes is the unit the school sells. */
  durationMinutes: number
  outcome: AppointmentOutcome
  notes: string
}

/**
 * The legally-mandated drive types, counted separately from ordinary lessons toward an
 * enrolment's requirements.
 */
export type PracticalDriveType = 'standard' | 'overland' | 'autobahn' | 'night'

/** One enrolled student drives, with a vehicle. */
export interface PracticalAppointment extends AppointmentBase {
  kind: 'practical'
  enrolmentId: EnrolmentId
  vehicleId: VehicleId
  driveType: PracticalDriveType
  /** Where the student is collected. Null means the school's default pickup arrangement. */
  meetingPointId: LocationId | null
}

/** A numbered classroom lesson. */
export interface TheoryTopic {
  /** `basic` is taught to every class; `classSpecific` is the per-class supplement. */
  scope: 'basic' | 'classSpecific'
  /** Lesson number within its scope, 1-based. */
  number: number
}

/** One student's participation in a theory appointment, recorded per person. */
export interface Attendance {
  enrolmentId: EnrolmentId
  status: 'registered' | 'attended' | 'absent' | 'excused'
}

/** Many enrolled students attend a classroom session. No vehicle. */
export interface TheoryAppointment extends AppointmentBase {
  kind: 'theory'
  locationId: LocationId
  topic: TheoryTopic
  /** Seats in the room. Booking beyond it is a conflict, not an error. */
  capacity: number
  /** Per-person, so one absence does not mark the whole class absent. */
  attendees: readonly Attendance[]
}

export type ExamResult = 'passed' | 'failed'

/**
 * One enrolled student sits the official test. Occupies the instructor exactly as a lesson does,
 * and a practical exam occupies a vehicle too — which is why the vehicle lives on that variant
 * rather than being nullable on both.
 */
export type ExamAppointment = AppointmentBase & {
  kind: 'exam'
  enrolmentId: EnrolmentId
  locationId: LocationId
  /** Null until the exam has been sat. */
  result: ExamResult | null
} & (
  | { examKind: 'theory' }
  | { examKind: 'practical', vehicleId: VehicleId }
)

/**
 * A block of time on the school's calendar. Every scheduled thing is an appointment — the kind
 * says which, and carries only the relationships that kind actually has.
 */
export type Appointment
  = | PracticalAppointment
    | TheoryAppointment
    | ExamAppointment

export type AppointmentKind = Appointment['kind']
export type AppointmentStatus = AppointmentOutcome['status']
