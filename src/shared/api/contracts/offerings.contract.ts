import type { LicenceClass, LicenceClassOffering } from '@/shared/domain'

export type OfferingPatch = Partial<Omit<LicenceClassOffering, 'licenceClass'>>

/**
 * The school's configuration for the licence classes it teaches.
 *
 * Keyed by `LicenceClass`, not by an id: the classes are a closed legal vocabulary, so there is
 * one row per code and nothing to create or delete — only to configure.
 */
export interface OfferingRepository {
  list: () => Promise<readonly LicenceClassOffering[]>
  get: (licenceClass: LicenceClass) => Promise<LicenceClassOffering>
  update: (licenceClass: LicenceClass, patch: OfferingPatch) => Promise<LicenceClassOffering>
}
