import type { LICENCE_CLASSES } from './licence-class.constants'
import type { PriceList } from './pricing.types'

/** An EU driving licence category, by its official code. */
export type LicenceClass = typeof LICENCE_CLASSES[number]

/** The school's own configuration for one licence class: what it teaches, and what it costs. */
export interface LicenceClassOffering {
  licenceClass: LicenceClass
  /** Whether the school currently teaches this class. Unoffered classes stay configurable. */
  isOffered: boolean
  /**
   * Today's prices. Editing them changes what new enrolments are quoted and nothing else —
   * running enrolments keep the copy they took at `agreedPrices`.
   */
  prices: PriceList
  /** Minimum standard practical appointments before the student may sit the practical exam. */
  minimumPracticalAppointments: number
  /** Minimum theory appointments before the student may sit the theory exam. */
  minimumTheoryAppointments: number
}
