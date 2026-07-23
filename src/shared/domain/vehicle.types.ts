import type { LocationId, VehicleId } from './identifier.types'
import type { LicenceClass } from './licence-class.types'
import type { IsoDate } from './time.types'

/**
 * Matters in Germany: training in an automatic-only car restricts the resulting licence, so it
 * is a property of the vehicle the planner has to surface.
 */
export type Transmission = 'manual' | 'automatic'

/** A vehicle the school owns and teaches in. */
export interface Vehicle {
  id: VehicleId
  /** The registration plate. The plate is how staff refer to a vehicle, so it doubles as its name. */
  licencePlate: string
  make: string
  model: string
  transmission: Transmission
  /** The licence classes this vehicle may be used to teach. */
  suitableFor: readonly LicenceClass[]
  /** Where the vehicle normally lives. */
  homeLocationId: LocationId
  inServiceSince: IsoDate
  /** Set when withdrawn from the fleet. Its past appointments stay. */
  retiredAt: IsoDate | null
}
