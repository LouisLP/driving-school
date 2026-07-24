import type { LICENCE_CLASSES } from './licence-class.constants'
import type { PriceList } from './pricing.types'
import type { TrainingRequirements } from './training.types'

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
  /**
   * How much training this class demands. Seeded from `LEGAL_TRAINING_MINIMUMS`, then the school's.
   *
   * Unlike `prices` it is **not** copied onto an enrolment: exam readiness is measured against
   * today's rules, because a school may not certify a student against last year's ones.
   */
  requirements: TrainingRequirements
}
