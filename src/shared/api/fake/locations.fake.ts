import type {
  LocationQuery,
  LocationRepository,
  NewLocation,
} from '../contracts/locations.contract'
import type { FakeContext } from './context'
import type { Appointment, Location, LocationId } from '@/shared/domain'
import { ApiError } from '../api.error'
import { applyPatch, detach, matchesSearch, mintId } from './fake.utils'

export function createLocationRepository(ctx: FakeContext): LocationRepository {
  const { db } = ctx

  function findLocation(id: LocationId): Location {
    const location = db.locations.find(it => it.id === id)

    if (!location)
      throw ApiError.notFound('location', id)

    return location
  }

  return {
    async list(query: LocationQuery = {}) {
      await ctx.network.roundTrip()

      const matching = db.locations
        .filter(it => query.kind === undefined || it.kind === query.kind)
        .filter(it => matchesSearch(query.search, it.name, it.address.city))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))

      return detach(matching)
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findLocation(id))
    },

    async create(input: NewLocation) {
      await ctx.network.roundTrip()

      const location: Location = { ...detach(input), id: mintId<LocationId>() }

      db.locations.push(location)
      ctx.commit()

      return detach(location)
    },

    async update(id, patch) {
      await ctx.network.roundTrip()

      const location = findLocation(id)
      applyPatch(location, detach(patch))
      ctx.commit()

      return detach(location)
    },

    async remove(id) {
      await ctx.network.roundTrip()

      const location = findLocation(id)
      const referencing = db.appointments.filter(it => usesLocation(it, id)).length

      if (referencing > 0) {
        throw ApiError.conflict(
          `${location.name} is used by ${referencing} appointment(s) and cannot be deleted.`,
        )
      }

      db.locations = db.locations.filter(it => it.id !== id)
      ctx.commit()
    },
  }
}

function usesLocation(appointment: Appointment, id: LocationId): boolean {
  if (appointment.kind === 'practical')
    return appointment.meetingPointId === id

  return appointment.locationId === id
}
