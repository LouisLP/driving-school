import type { Location, LocationId, LocationKind } from '@/shared/domain'

export interface LocationQuery {
  kind?: LocationKind
  /** Matches name or city. */
  search?: string
}

export type NewLocation = Omit<Location, 'id'>

export type LocationPatch = Partial<NewLocation>

export interface LocationRepository {
  /** A handful of rows the whole app needs; never paged. */
  list: (query?: LocationQuery) => Promise<readonly Location[]>
  get: (id: LocationId) => Promise<Location>
  create: (input: NewLocation) => Promise<Location>
  update: (id: LocationId, patch: LocationPatch) => Promise<Location>
  /**
   * A location has no retirement date of its own, so removal is allowed — but only while no
   * appointment still points at it. Otherwise `conflict`.
   */
  remove: (id: LocationId) => Promise<void>
}
