/**
 * PROTOTYPE — throwaway. Not production code.
 *
 * The conflict rule set, proposed for
 * [Planner calendar UX (#11)](https://github.com/LouisLP/driving-school/issues/11).
 *
 * This file is the actual argument the prototype is making. The three variants disagree about
 * layout; they all agree about *what counts as a conflict* and *whether a human may proceed*.
 *
 * ── The line between blocking and warning ──────────────────────────────────
 *
 * **Blocking** = the appointment could not physically happen, or would be legally invalid if it
 * did. No override, ever: an override would produce a record the school cannot honour.
 *
 * **Warning** = the school's own policy, a soft resource limit, or a paperwork state. A human
 * behind the desk knows things the database does not ("Petra said she'd come in early", "we
 * carry two extra chairs in"), so these annotate the booking and let it through — with a
 * reason recorded, so the override is visible afterwards rather than silent.
 *
 * The test for a new rule: *if I override this, is the resulting appointment a lie?* Yes →
 * blocking. No → warning.
 */

import type {
  Appointment,
  AppointmentId,
  AppointmentKind,
  Enrolment,
  EnrolmentId,
  Instructor,
  InstructorId,
  IsoDateTime,
  Vehicle,
  VehicleId,
} from '@/shared/domain'

export type ConflictSeverity = 'blocking' | 'warning'

export type ConflictCode
  // blocking
  = | 'instructorDoubleBooked'
    | 'vehicleDoubleBooked'
    | 'studentDoubleBooked'
    | 'instructorNotQualified'
    | 'vehicleNotSuitable'
    | 'instructorNotEmployed'
    | 'vehicleRetired'
  // warning
    | 'instructorAbsent'
    | 'outsideSchoolHours'
    | 'theoryOverCapacity'
    | 'enrolmentNotActive'
    | 'automaticRestriction'
    | 'backToBackNoBuffer'

export interface Conflict {
  code: ConflictCode
  severity: ConflictSeverity
  /** One line, shown on the block and in the drag ghost. */
  message: string
  /** The specific evidence — which appointment, whose licence class. */
  detail?: string
}

/** A day an instructor is not available. Not in the domain model yet — see the write-up. */
export interface InstructorAbsence {
  instructorId: InstructorId
  /** Inclusive, exclusive — plain instants so the prototype needs no calendar model. */
  from: IsoDateTime
  to: IsoDateTime
  reason: string
}

/**
 * A booking being considered — a drag in progress, a form half filled in, or an existing
 * appointment being moved. Deliberately not an `Appointment`: it has no id until it exists, and
 * every relationship is nullable because the planner evaluates it while it is still incomplete.
 */
export interface CandidateAppointment {
  /** Set when moving an existing appointment, so it does not conflict with itself. */
  id: AppointmentId | null
  kind: AppointmentKind
  instructorId: InstructorId | null
  vehicleId: VehicleId | null
  /** Practical and exam: the one enrolment. */
  enrolmentId: EnrolmentId | null
  /** Theory only. */
  attendeeCount: number
  /** Theory only. */
  capacity: number
  startsAt: IsoDateTime
  durationMinutes: number
}

export interface ConflictContext {
  /** Everything already on the calendar in the visible window. Cancelled ones are dropped. */
  appointments: readonly Appointment[]
  instructors: ReadonlyMap<InstructorId, Instructor>
  vehicles: ReadonlyMap<VehicleId, Vehicle>
  enrolments: ReadonlyMap<EnrolmentId, Enrolment>
  absences: readonly InstructorAbsence[]
}

/** The school's opening hours, as minutes from midnight. Configurable per school one day. */
export const SCHOOL_OPENS_MINUTE = 7 * 60
export const SCHOOL_CLOSES_MINUTE = 21 * 60

/** Minutes an instructor needs between two appointments before it counts as tight. */
const BUFFER_MINUTES = 0

export const SEVERITY_ORDER: Record<ConflictSeverity, number> = { blocking: 0, warning: 1 }

/**
 * Every conflict the planner knows how to raise, in the order it presents them.
 *
 * Kept as data rather than scattered through the checks so that the rule set can be read — and
 * argued with — in one screen, which is what issue #11 is asking for.
 */
export const CONFLICT_RULES: Record<ConflictCode, { severity: ConflictSeverity, why: string }> = {
  instructorDoubleBooked: {
    severity: 'blocking',
    why: 'One instructor, one place. An override would promise a person who cannot be there.',
  },
  vehicleDoubleBooked: {
    severity: 'blocking',
    why: 'The car is already out. Same physical impossibility as the instructor.',
  },
  studentDoubleBooked: {
    severity: 'blocking',
    why: 'The student cannot drive and sit in the classroom at once.',
  },
  instructorNotQualified: {
    severity: 'blocking',
    why: 'Teaching a class you are not licensed for voids the training hours. Legally invalid.',
  },
  vehicleNotSuitable: {
    severity: 'blocking',
    why: 'Hours driven in the wrong category do not count toward the licence.',
  },
  instructorNotEmployed: {
    severity: 'blocking',
    why: 'A leaver cannot hold a future appointment; the record would name someone gone.',
  },
  vehicleRetired: {
    severity: 'blocking',
    why: 'The vehicle is out of the fleet. There is nothing to drive.',
  },
  instructorAbsent: {
    severity: 'warning',
    why: 'Absences are the school\'s own record and often out of date. The desk knows better.',
  },
  outsideSchoolHours: {
    severity: 'warning',
    why: 'Night drives and early exams are real. Opening hours are a default, not a law.',
  },
  theoryOverCapacity: {
    severity: 'warning',
    why: 'Room capacity is a hint. Chairs get carried in; a 13th student is a decision, not an error.',
  },
  enrolmentNotActive: {
    severity: 'warning',
    why: 'A trial lesson before signing, or a lesson booked the day paperwork lands, is normal.',
  },
  automaticRestriction: {
    severity: 'warning',
    why: 'Training in an automatic restricts the licence (code 78). The student may want that — '
      + 'but it must never happen by accident.',
  },
  backToBackNoBuffer: {
    severity: 'warning',
    why: 'Legal, and sometimes deliberate. Worth seeing before the instructor discovers it.',
  },
}

/**
 * The whole rule set, run against one candidate.
 *
 * Pure and synchronous on purpose: the planner calls this on every pointer move during a drag, so
 * it can never be a round trip. The seam re-runs the blocking half on write — the client's copy
 * is for feedback, not for trust.
 */
export function evaluateConflicts(
  candidate: CandidateAppointment,
  context: ConflictContext,
): Conflict[] {
  const conflicts: Conflict[] = []
  const raise = (code: ConflictCode, message: string, detail?: string): void => {
    conflicts.push({ code, severity: CONFLICT_RULES[code].severity, message, detail })
  }

  const start = Date.parse(candidate.startsAt)
  const end = start + candidate.durationMinutes * 60_000
  const others = context.appointments.filter(
    appointment => appointment.id !== candidate.id && appointment.outcome.status !== 'cancelled',
  )

  const instructor = candidate.instructorId === null
    ? null
    : context.instructors.get(candidate.instructorId) ?? null
  const vehicle = candidate.vehicleId === null
    ? null
    : context.vehicles.get(candidate.vehicleId) ?? null
  const enrolment = candidate.enrolmentId === null
    ? null
    : context.enrolments.get(candidate.enrolmentId) ?? null

  // ── Double bookings ───────────────────────────────────────────────────────
  for (const other of others) {
    if (!overlaps(start, end, other))
      continue

    if (other.instructorId === candidate.instructorId) {
      raise(
        'instructorDoubleBooked',
        `${instructor ? fullName(instructor) : 'The instructor'} is already booked`,
        describe(other),
      )
    }

    if (candidate.vehicleId !== null && vehicleOf(other) === candidate.vehicleId) {
      raise(
        'vehicleDoubleBooked',
        `${vehicle?.licencePlate ?? 'The vehicle'} is already out`,
        describe(other),
      )
    }

    if (candidate.enrolmentId !== null && involvesEnrolment(other, candidate.enrolmentId)) {
      raise('studentDoubleBooked', 'The student is already booked', describe(other))
    }
  }

  // ── Back-to-back (warning; the tight-turnaround nudge) ────────────────────
  if (candidate.instructorId !== null) {
    const tight = others.find(
      other =>
        other.instructorId === candidate.instructorId
        && !overlaps(start, end, other)
        && gapMinutes(start, end, other) <= BUFFER_MINUTES,
    )

    if (tight && BUFFER_MINUTES > 0)
      raise('backToBackNoBuffer', 'No gap before the next appointment', describe(tight))
  }

  // ── Staffing and fleet state ──────────────────────────────────────────────
  if (instructor?.employedUntil && `${instructor.employedUntil}T23:59:59.999Z` < candidate.startsAt) {
    raise(
      'instructorNotEmployed',
      `${fullName(instructor)} left the school`,
      `Employed until ${instructor.employedUntil}`,
    )
  }

  if (vehicle?.retiredAt && `${vehicle.retiredAt}T23:59:59.999Z` < candidate.startsAt)
    raise('vehicleRetired', `${vehicle.licencePlate} is out of the fleet`, `Retired ${vehicle.retiredAt}`)

  const absence = context.absences.find(
    entry =>
      entry.instructorId === candidate.instructorId
      && start < Date.parse(entry.to)
      && Date.parse(entry.from) < end,
  )

  if (absence && instructor)
    raise('instructorAbsent', `${fullName(instructor)} is marked away`, absence.reason)

  // ── Licence class ─────────────────────────────────────────────────────────
  if (enrolment) {
    if (instructor && !instructor.teachableClasses.includes(enrolment.licenceClass)) {
      raise(
        'instructorNotQualified',
        `${fullName(instructor)} does not teach class ${enrolment.licenceClass}`,
        `Qualified for ${instructor.teachableClasses.join(', ')}`,
      )
    }

    if (vehicle && !vehicle.suitableFor.includes(enrolment.licenceClass)) {
      raise(
        'vehicleNotSuitable',
        `${vehicle.licencePlate} is not a class ${enrolment.licenceClass} vehicle`,
        `Suitable for ${vehicle.suitableFor.join(', ')}`,
      )
    }

    if (vehicle?.transmission === 'automatic') {
      raise(
        'automaticRestriction',
        'Automatic vehicle — restricts the licence to code 78',
        `${vehicle.make} ${vehicle.model}`,
      )
    }

    if (enrolment.status !== 'active') {
      raise(
        'enrolmentNotActive',
        `Enrolment is ${enrolment.status}`,
        'Only active enrolments normally take appointments',
      )
    }
  }

  // ── Room and hours ────────────────────────────────────────────────────────
  if (candidate.kind === 'theory' && candidate.attendeeCount > candidate.capacity) {
    raise(
      'theoryOverCapacity',
      `${candidate.attendeeCount} registered for ${candidate.capacity} seats`,
      'Someone has to stand, or a chair comes in',
    )
  }

  const startMinute = minuteOfDay(candidate.startsAt)
  const endMinute = startMinute + candidate.durationMinutes

  if (startMinute < SCHOOL_OPENS_MINUTE || endMinute > SCHOOL_CLOSES_MINUTE) {
    raise(
      'outsideSchoolHours',
      'Outside school hours',
      `School is open ${formatMinute(SCHOOL_OPENS_MINUTE)}–${formatMinute(SCHOOL_CLOSES_MINUTE)}`,
    )
  }

  return conflicts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

export function worstSeverity(conflicts: readonly Conflict[]): ConflictSeverity | null {
  if (conflicts.some(conflict => conflict.severity === 'blocking'))
    return 'blocking'

  return conflicts.length > 0 ? 'warning' : null
}

export function isBlocked(conflicts: readonly Conflict[]): boolean {
  return conflicts.some(conflict => conflict.severity === 'blocking')
}

// --- small helpers -----------------------------------------------------------------------------

function overlaps(start: number, end: number, other: Appointment): boolean {
  const otherStart = Date.parse(other.startsAt)

  return start < otherStart + other.durationMinutes * 60_000 && otherStart < end
}

function gapMinutes(start: number, end: number, other: Appointment): number {
  const otherStart = Date.parse(other.startsAt)
  const otherEnd = otherStart + other.durationMinutes * 60_000

  return Math.min(Math.abs(otherStart - end), Math.abs(start - otherEnd)) / 60_000
}

export function vehicleOf(appointment: Appointment): VehicleId | null {
  if (appointment.kind === 'practical')
    return appointment.vehicleId

  if (appointment.kind === 'exam' && appointment.examKind === 'practical')
    return appointment.vehicleId

  return null
}

export function involvesEnrolment(appointment: Appointment, enrolmentId: EnrolmentId): boolean {
  if (appointment.kind === 'theory')
    return appointment.attendees.some(attendee => attendee.enrolmentId === enrolmentId)

  return appointment.enrolmentId === enrolmentId
}

function describe(appointment: Appointment): string {
  return `${appointment.kind} at ${formatMinute(minuteOfDay(appointment.startsAt))}`
}

export function minuteOfDay(instant: IsoDateTime): number {
  const date = new Date(instant)

  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

export function formatMinute(minute: number): string {
  const hour = Math.floor(minute / 60)
  const rest = minute % 60

  return `${hour.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}

function fullName(instructor: Instructor): string {
  return `${instructor.firstName} ${instructor.lastName}`
}
