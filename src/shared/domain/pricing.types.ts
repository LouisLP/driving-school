import type { Money } from './money.types'
import type { IsoDateTime } from './time.types'

/**
 * What the school charges for one licence class.
 *
 * Every chargeable thing the school does is one of these five, which is what keeps the billing
 * rule a lookup rather than a rules engine. Drives are priced per 45-minute unit — the unit the
 * school actually sells — so a 90-minute overland drive is two units at one price, not a second
 * price that can drift out of step with the first.
 *
 * Lives on the `LicenceClassOffering`: what a class costs is school configuration in exactly the
 * way its `requirements` are, and both are edited on the same screen. Unlike the requirements it is
 * frozen onto an enrolment — see `AgreedPrices` and `docs/training-model.md`.
 */
export interface PriceList {
  /** The one-off fee that covers enrolment paperwork and the theory course. Grundbetrag. */
  basicFee: Money
  /** One 45-minute unit of an ordinary practical lesson. */
  practicalLessonUnit: Money
  /** One 45-minute unit of a legally mandated special drive — overland, autobahn or night. */
  specialDriveUnit: Money
  /** Presenting the student for the official theory test. */
  theoryExamFee: Money
  /** Presenting the student for the official practical test. */
  practicalExamFee: Money
}

/**
 * The prices an enrolment was signed up at, copied from the offering the day it was created.
 *
 * A copy rather than a reference, because a price rise in March must not silently reprice a
 * lesson driven in January. The school raises its prices by editing the offering; enrolments
 * already running keep quoting the numbers their student agreed to, and only new enrolments get
 * the new ones.
 *
 * This is why an invoice can be rebuilt from the appointment record at any time and still come
 * out the same — the rule reads the enrolment, never today's price list.
 */
export interface AgreedPrices extends PriceList {
  /** When the copy was taken. What a "prices as of" line on an invoice would show. */
  agreedAt: IsoDateTime
}
