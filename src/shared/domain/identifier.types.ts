import type { Brand } from './brand.types'

/**
 * Entity identities. UUID strings underneath, minted by the fake API — no code should ever
 * construct one by hand outside of seed data and tests.
 */
export type StudentId = Brand<string, 'StudentId'>
export type InstructorId = Brand<string, 'InstructorId'>
export type VehicleId = Brand<string, 'VehicleId'>
export type LocationId = Brand<string, 'LocationId'>
export type EnrolmentId = Brand<string, 'EnrolmentId'>
export type AppointmentId = Brand<string, 'AppointmentId'>
export type InvoiceId = Brand<string, 'InvoiceId'>
export type PaymentId = Brand<string, 'PaymentId'>
