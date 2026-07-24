import type { IsoDate, IsoDateTime } from './time.types'

const MILLISECONDS_PER_MINUTE = 60_000

/** The only sanctioned way to mint an `IsoDateTime`. */
export function toIsoDateTime(date: Date): IsoDateTime {
  return date.toISOString() as IsoDateTime
}

/** The only sanctioned way to mint an `IsoDate`. Takes the UTC calendar day. */
export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10) as IsoDate
}

/**
 * Whole years between a birthday and today.
 *
 * Calendar arithmetic rather than milliseconds divided by a year: a year is not a fixed number of
 * days, and someone born on 29 February is not a year older on 28 February.
 */
export function ageInYears(dateOfBirth: IsoDate, now: Date = new Date()): number {
  const born = new Date(`${dateOfBirth}T00:00:00.000Z`)

  if (Number.isNaN(born.getTime()))
    return Number.NaN

  const years = now.getUTCFullYear() - born.getUTCFullYear()
  const hadBirthday = now.getUTCMonth() > born.getUTCMonth()
    || (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() >= born.getUTCDate())

  return hadBirthday ? years : years - 1
}

export function addMinutes(instant: IsoDateTime, minutes: number): IsoDateTime {
  return toIsoDateTime(
    new Date(new Date(instant).getTime() + minutes * MILLISECONDS_PER_MINUTE),
  )
}
