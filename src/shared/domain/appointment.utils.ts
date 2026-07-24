import type { Appointment } from './appointment.types'
import type { Instructor } from './instructor.types'
import type { LicenceClass } from './licence-class.types'
import type { IsoDateTime } from './time.types'
import type { Vehicle } from './vehicle.types'
import { addMinutes } from './time.utils'

/** Appointments store start plus duration; the end instant is always derived. */
export function appointmentEndsAt(appointment: Appointment): IsoDateTime {
  return addMinutes(appointment.startsAt, appointment.durationMinutes)
}

/**
 * Whether two appointments occupy any of the same time. Half-open — an appointment ending at
 * 10:00 does not clash with one starting at 10:00, which is how back-to-back lessons are booked.
 *
 * The building block of every double-booking check; who is double-booked is the caller's
 * question. The full conflict rule set is not settled here.
 */
export function appointmentsOverlap(a: Appointment, b: Appointment): boolean {
  return a.startsAt < appointmentEndsAt(b) && b.startsAt < appointmentEndsAt(a)
}

/**
 * The licence-class match rule: whoever teaches must be qualified for the class, and whatever
 * they teach in must be suitable for it.
 *
 * One of the conflicts the planner detects. The full conflict rule set is not settled here.
 */
export function isLicenceClassMatched(
  licenceClass: LicenceClass,
  instructor: Instructor,
  vehicle: Vehicle,
): boolean {
  return instructor.teachableClasses.includes(licenceClass)
    && vehicle.suitableFor.includes(licenceClass)
}
