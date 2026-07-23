import type { PostalAddress } from './address.types'
import type { LocationId } from './identifier.types'

/**
 * - `branch` — an office of the school itself
 * - `classroom` — a room theory appointments are held in
 * - `meetingPoint` — a pickup point a practical appointment can start from
 * - `examCentre` — a testing centre exams are sat at, not owned by the school
 */
export type LocationKind = 'branch' | 'classroom' | 'meetingPoint' | 'examCentre'

/** A physical place the school uses. */
export interface Location {
  id: LocationId
  name: string
  kind: LocationKind
  address: PostalAddress
}
