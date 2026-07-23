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

export function addMinutes(instant: IsoDateTime, minutes: number): IsoDateTime {
  return toIsoDateTime(
    new Date(new Date(instant).getTime() + minutes * MILLISECONDS_PER_MINUTE),
  )
}
