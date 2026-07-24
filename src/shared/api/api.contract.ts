import type { AppointmentRepository } from './contracts/appointments.contract'
import type { BillingRepository } from './contracts/billing.contract'
import type { EnrolmentRepository } from './contracts/enrolments.contract'
import type { InstructorRepository } from './contracts/instructors.contract'
import type { LocationRepository } from './contracts/locations.contract'
import type { OfferingRepository } from './contracts/offerings.contract'
import type { StudentRepository } from './contracts/students.contract'
import type { VehicleRepository } from './contracts/vehicles.contract'

/**
 * The seam between this app and its backend.
 *
 * Everything the app knows about persistence is on this interface. `createFakeApi` implements it
 * against in-memory arrays today; a `createHttpApi` would implement it against `fetch` tomorrow,
 * and the only file that would change is `main.ts`, where the instance is provided.
 *
 * Rules the implementations agree on, in full in `docs/api-seam.md`:
 *
 * - reads return domain entities, except where a list needs a join the client should not do
 * - writes take `NewX` / `XPatch`; ids and timestamps are minted here, never by a caller
 * - failures reject with `ApiError`; nothing else is ever thrown
 * - nothing is deleted that history points at — entities retire, appointments cancel
 */
export interface Api {
  students: StudentRepository
  enrolments: EnrolmentRepository
  appointments: AppointmentRepository
  billing: BillingRepository
  instructors: InstructorRepository
  vehicles: VehicleRepository
  locations: LocationRepository
  offerings: OfferingRepository
}
