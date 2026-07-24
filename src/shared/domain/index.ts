/**
 * The shared vocabulary — the entities every feature quotes, as persisted behind the fake-API
 * seam. Features own their own view models, form state and stores; they do not redefine these.
 *
 * Written model: `docs/domain-model.md`. Glossary: `CONTEXT.md`.
 */
export * from './address.types'
export * from './appointment.types'
export * from './appointment.utils'
export * from './billing.constants'
export * from './billing.types'
export * from './billing.utils'
export * from './brand.types'
export * from './enrolment.types'
export * from './identifier.types'
export * from './instructor.types'
export * from './licence-class.constants'
export * from './licence-class.types'
export * from './location.types'
export * from './money.types'
export * from './money.utils'
export * from './pricing.types'
export * from './student.types'
export * from './student.utils'
export * from './student.validation'
export * from './time.types'
export * from './time.utils'
export * from './training.constants'
export * from './training.types'
export * from './training.utils'
export * from './validation.types'
export * from './vehicle.types'
