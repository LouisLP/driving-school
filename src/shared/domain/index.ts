/**
 * The shared vocabulary — the entities every feature quotes, as persisted behind the fake-API
 * seam. Features own their own view models, form state and stores; they do not redefine these.
 *
 * Written model: `docs/domain-model.md`. Glossary: `CONTEXT.md`.
 */
export * from './address.types'
export * from './appointment.types'
export * from './appointment.utils'
export * from './brand.types'
export * from './enrolment.types'
export * from './identifier.types'
export * from './instructor.types'
export * from './licence-class.constants'
export * from './licence-class.types'
export * from './location.types'
export * from './student.types'
export * from './student.utils'
export * from './time.types'
export * from './time.utils'
export * from './vehicle.types'
