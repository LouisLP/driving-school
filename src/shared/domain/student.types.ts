import type { PostalAddress } from './address.types'
import type { StudentId } from './identifier.types'
import type { IsoDate, IsoDateTime } from './time.types'

/**
 * A person the school trains.
 *
 * Deliberately has no status field: a student's standing is derived from their enrolments, so
 * the CRM list and the student record can never disagree. See `deriveStudentStanding`.
 */
export interface Student {
  id: StudentId
  firstName: string
  lastName: string
  dateOfBirth: IsoDate
  email: string | null
  phone: string | null
  address: PostalAddress | null
  notes: string
  /** When the student first appeared, enquiry or otherwise. */
  registeredAt: IsoDateTime
}

/**
 * A student's current relationship with the school. Derived, never stored.
 *
 * - `prospect` — enquired, nothing under way
 * - `active` — training, or temporarily paused
 * - `alumnus` — has passed something and has nothing running
 * - `lapsed` — every enrolment was withdrawn
 */
export type StudentStanding = 'prospect' | 'active' | 'alumnus' | 'lapsed'
