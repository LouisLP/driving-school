import type { InjectionKey } from 'vue'
import type { Api } from '../api.contract'
import type { FakeContext } from './context'
import type { Database } from './database'
import type { FakeNetwork, FakeNetworkOptions } from './network'
import type { IsoDateTime } from '@/shared/domain'
import { createAppointmentRepository } from './appointments.fake'
import { createBillingRepository } from './billing.fake'
import { clearDatabase } from './database'
import { createEnrolmentRepository } from './enrolments.fake'
import { nowIso } from './fake.utils'
import { createInstructorRepository } from './instructors.fake'
import { createLocationRepository } from './locations.fake'
import { createFakeNetwork } from './network'
import { createOfferingRepository } from './offerings.fake'
import { createStudentRepository } from './students.fake'
import { createVehicleRepository } from './vehicles.fake'

export interface FakeApiOptions extends FakeNetworkOptions {
  /** Called after every successful write. Wire persistence here; defaults to doing nothing. */
  onChange?: (db: Database) => void
  /** Injectable clock, so a test can pin every minted timestamp. */
  now?: () => IsoDateTime
}

/**
 * Dev-only handles on the fake. Deliberately *not* part of `Api` — an HTTP implementation has no
 * latency dial — so they travel under their own injection key and nothing in a feature can reach
 * them by accident.
 */
export interface FakeApiControls {
  network: FakeNetwork
  /** The live in-memory database, for devtools and tests. */
  db: Database
  /** Drops the stored snapshot. The caller decides whether to reload. */
  resetStorage: () => void
}

export type FakeApi = Api & { readonly controls: FakeApiControls }

export const FAKE_API_CONTROLS_KEY: InjectionKey<FakeApiControls>
  = Symbol('driving-school:fake-api-controls')

/**
 * The fake backend.
 *
 * Takes the database rather than loading one, so tests get an isolated school and the app gets
 * the persisted one — deciding where data comes from is `main.ts`'s job, not the fake's.
 *
 * ```ts
 * const api = createFakeApi(seedDatabase(), { latencyMs: 0 })  // a test
 * const api = createFakeApi(loadDatabase(), {                  // the app
 *   latencyMs: [150, 400],
 *   onChange: createSnapshotWriter(),
 * })
 * ```
 */
export function createFakeApi(db: Database, options: FakeApiOptions = {}): FakeApi {
  const network = createFakeNetwork(options)
  const onChange = options.onChange

  const ctx: FakeContext = {
    db,
    network,
    now: options.now ?? nowIso,
    commit: () => onChange?.(db),
  }

  return {
    students: createStudentRepository(ctx),
    enrolments: createEnrolmentRepository(ctx),
    appointments: createAppointmentRepository(ctx),
    billing: createBillingRepository(ctx),
    instructors: createInstructorRepository(ctx),
    vehicles: createVehicleRepository(ctx),
    locations: createLocationRepository(ctx),
    offerings: createOfferingRepository(ctx),
    controls: { network, db, resetStorage: () => clearDatabase() },
  }
}
