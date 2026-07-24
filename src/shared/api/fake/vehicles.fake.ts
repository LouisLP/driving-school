import type {
  NewVehicle,
  VehicleQuery,
  VehicleRepository,
} from '../contracts/vehicles.contract'
import type { FakeContext } from './context'
import type { Appointment, Vehicle, VehicleId } from '@/shared/domain'
import { ApiError } from '../api.error'
import { applyPatch, detach, matchesSearch, mintId } from './fake.utils'

export function createVehicleRepository(ctx: FakeContext): VehicleRepository {
  const { db } = ctx

  function findVehicle(id: VehicleId): Vehicle {
    const vehicle = db.vehicles.find(it => it.id === id)

    if (!vehicle)
      throw ApiError.notFound('vehicle', id)

    return vehicle
  }

  return {
    async list(query: VehicleQuery = {}) {
      await ctx.network.roundTrip()

      const matching = db.vehicles
        .filter(it => query.includeRetired === true || it.retiredAt === null)
        .filter(it => matchesSearch(query.search, it.licencePlate, it.make, it.model))
        .filter(it => query.suitableFor === undefined
          || it.suitableFor.includes(query.suitableFor))
        .filter(it => query.transmission === undefined || it.transmission === query.transmission)
        .sort((a, b) => a.licencePlate.localeCompare(b.licencePlate, 'de'))

      return detach(matching)
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findVehicle(id))
    },

    async create(input: NewVehicle) {
      await ctx.network.roundTrip()

      const vehicle: Vehicle = {
        ...detach(input),
        id: mintId<VehicleId>(),
        retiredAt: null,
      }

      db.vehicles.push(vehicle)
      ctx.commit()

      return detach(vehicle)
    },

    async update(id, patch) {
      await ctx.network.roundTrip()

      const vehicle = findVehicle(id)
      applyPatch(vehicle, detach(patch))
      ctx.commit()

      return detach(vehicle)
    },

    async retire(id, on) {
      await ctx.network.roundTrip()

      const vehicle = findVehicle(id)
      const lastDay = `${on}T23:59:59.999Z`
      const stranded = db.appointments.filter(it =>
        usesVehicle(it, id)
        && it.outcome.status === 'planned'
        && it.startsAt > lastDay,
      )

      if (stranded.length > 0) {
        throw ApiError.conflict(
          `${vehicle.licencePlate} is booked for ${stranded.length} planned appointment(s) after `
          + 'that date. Move or cancel them first.',
        )
      }

      vehicle.retiredAt = on
      ctx.commit()

      return detach(vehicle)
    },
  }
}

function usesVehicle(appointment: Appointment, id: VehicleId): boolean {
  if (appointment.kind === 'practical')
    return appointment.vehicleId === id

  return appointment.kind === 'exam'
    && appointment.examKind === 'practical'
    && appointment.vehicleId === id
}
