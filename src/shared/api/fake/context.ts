import type { Database } from './database'
import type { FakeNetwork } from './network'
import type { IsoDateTime } from '@/shared/domain'

/**
 * What every fake repository is built from. Passing this rather than reaching for module state is
 * what lets a test spin up an isolated school in one line.
 */
export interface FakeContext {
  db: Database
  network: FakeNetwork
  /** Injectable so a test can freeze time. */
  now: () => IsoDateTime
  /** Called after a successful write — this is where persistence hangs. */
  commit: () => void
}
