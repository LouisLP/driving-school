import type {
  IsoDate,
  LicenceClass,
  Transmission,
  Vehicle,
  VehicleId,
} from '@/shared/domain'

export interface VehicleQuery {
  /** Matches plate, make or model. */
  search?: string
  suitableFor?: LicenceClass
  transmission?: Transmission
  includeRetired?: boolean
}

export type NewVehicle = Omit<Vehicle, 'id' | 'retiredAt'>

export type VehiclePatch = Partial<NewVehicle>

export interface VehicleRepository {
  list: (query?: VehicleQuery) => Promise<readonly Vehicle[]>
  get: (id: VehicleId) => Promise<Vehicle>
  create: (input: NewVehicle) => Promise<Vehicle>
  update: (id: VehicleId, patch: VehiclePatch) => Promise<Vehicle>
  /** As with instructors: leaving the fleet is a date. Rejects if planned appointments follow it. */
  retire: (id: VehicleId, on: IsoDate) => Promise<Vehicle>
}
