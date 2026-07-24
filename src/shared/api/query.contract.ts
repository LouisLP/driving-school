/**
 * The vocabulary every repository query is built from.
 *
 * Deliberately small: entities declare their own query types (`StudentQuery`,
 * `AppointmentQuery`) so that a filter an entity does not support will not compile. What is
 * shared is only the shape of a sort, a page, and the errors a write can report per field.
 */

export type SortDirection = 'asc' | 'desc'

/**
 * A sort instruction over a closed set of fields. Each repository names its own sortable
 * fields — sorting students by `vehicleId` is not a runtime error, it is a type error.
 */
export interface Sort<TField extends string> {
  field: TField
  direction: SortDirection
}

/** One page of a list, plus what a pager needs to render itself. */
export interface Page<T> {
  items: readonly T[]
  /** Matching rows across every page, not the length of `items`. */
  total: number
  /** 1-based. */
  page: number
  pageSize: number
}

/**
 * Re-exported so a caller handling a rejected write imports one thing from one place. Defined in
 * the domain because validators — not the seam — are what produce it.
 */
export type { FieldErrors } from '@/shared/domain'

export const DEFAULT_PAGE_SIZE = 25
