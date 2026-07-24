import type { EnrolmentId, StudentId } from './identifier.types'
import type { LicenceClass } from './licence-class.types'
import type { AgreedPrices } from './pricing.types'
import type { IsoDateTime } from './time.types'

/**
 * ```
 * enquiring ──► active ──► passed
 *     │           │  ▲
 *     │           │  └── paused
 *     └───────────┴──► withdrawn
 * ```
 *
 * `passed` and `withdrawn` are terminal — a returning student gets a new enrolment.
 */
export type EnrolmentStatus
  = | 'enquiring'
    | 'active'
    | 'paused'
    | 'passed'
    | 'withdrawn'

/**
 * One student's training toward one licence class, from enquiry to pass or withdrawal.
 *
 * The unit of progress and of billing: appointments and invoices attach here, never to the
 * student directly, so a student taking B and later A has two independent histories.
 */
export interface Enrolment {
  id: EnrolmentId
  studentId: StudentId
  licenceClass: LicenceClass
  status: EnrolmentStatus
  /**
   * The offering's prices as they stood the day this enrolment was created, copied rather than
   * referenced so a later price rise cannot reprice training already delivered.
   */
  agreedPrices: AgreedPrices
  enquiredAt: IsoDateTime
  /** Set when the enrolment first became `active`. */
  startedAt: IsoDateTime | null
  /** Set when the enrolment reached `passed` or `withdrawn`. */
  closedAt: IsoDateTime | null
}
