import type { InstructorId } from './identifier.types'
import type { LicenceClass } from './licence-class.types'
import type { IsoDate } from './time.types'

/**
 * A member of teaching staff who may hold appointments.
 *
 * "Professional Driver" is the label of the nav section that lists instructors — a UI string,
 * never a type name.
 */
export interface Instructor {
  id: InstructorId
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  /** The licence classes this instructor is qualified to teach. */
  teachableClasses: readonly LicenceClass[]
  employedSince: IsoDate
  /** Set for leavers. Their past appointments stay; they are not offered for new ones. */
  employedUntil: IsoDate | null
}
