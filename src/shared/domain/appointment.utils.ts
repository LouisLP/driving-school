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
