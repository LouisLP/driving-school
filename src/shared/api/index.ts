/**
 * The fake-API seam. Settled by
 * [Fake-API seam contract (#3)](https://github.com/LouisLP/driving-school/issues/3);
 * written up in `docs/api-seam.md`.
 *
 * Features import the contract from here. The fake implementation lives under `./fake` and is
 * imported by `main.ts` and by tests — nothing else should reach for it.
 */
export * from './api.contract'
export * from './api.error'
export * from './api.key'
export * from './contracts/appointments.contract'
export * from './contracts/enrolments.contract'
export * from './contracts/instructors.contract'
export * from './contracts/locations.contract'
export * from './contracts/offerings.contract'
export * from './contracts/students.contract'
export * from './contracts/vehicles.contract'
export * from './query.contract'
