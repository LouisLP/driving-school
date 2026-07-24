import type { OfferingRepository } from '../contracts/offerings.contract'
import type { FakeContext } from './context'
import type { LicenceClass, LicenceClassOffering } from '@/shared/domain'
import { LICENCE_CLASSES } from '@/shared/domain'
import { ApiError } from '../api.error'
import { applyPatch, detach } from './fake.utils'

export function createOfferingRepository(ctx: FakeContext): OfferingRepository {
  const { db } = ctx

  function findOffering(licenceClass: LicenceClass): LicenceClassOffering {
    const offering = db.offerings.find(it => it.licenceClass === licenceClass)

    if (!offering)
      throw ApiError.notFound('offering', licenceClass)

    return offering
  }

  return {
    async list() {
      await ctx.network.roundTrip()

      // Always in the legal order, whatever order the snapshot happens to hold.
      const ordered = LICENCE_CLASSES
        .map(licenceClass => db.offerings.find(it => it.licenceClass === licenceClass))
        .filter((offering): offering is LicenceClassOffering => offering !== undefined)

      return detach(ordered)
    },

    async get(licenceClass) {
      await ctx.network.roundTrip()
      return detach(findOffering(licenceClass))
    },

    async update(licenceClass, patch) {
      await ctx.network.roundTrip()

      const offering = findOffering(licenceClass)

      if ((patch.minimumPracticalAppointments ?? 0) < 0
        || (patch.minimumTheoryAppointments ?? 0) < 0) {
        throw ApiError.validation({
          minimumPracticalAppointments: 'shared.validation.notPositive',
        })
      }

      applyPatch(offering, detach(patch))
      ctx.commit()

      return detach(offering)
    },
  }
}
