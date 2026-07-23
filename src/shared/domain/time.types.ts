import type { Brand } from './brand.types'

/** A calendar day with no time or zone, `YYYY-MM-DD`. Birth dates, employment dates. */
export type IsoDate = Brand<string, 'IsoDate'>

/** An instant, `YYYY-MM-DDTHH:mm:ss.sssZ`. Always UTC; formatted to local at the view edge. */
export type IsoDateTime = Brand<string, 'IsoDateTime'>

/** A wall-clock time of day, `HH:mm`. Opening hours and availability windows. */
export type TimeOfDay = Brand<string, 'TimeOfDay'>

/** ISO 8601 weekday numbering: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
