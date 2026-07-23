/**
 * Nominal typing for primitives.
 *
 * `Brand<string, 'StudentId'>` is a `string` at runtime but is not assignable to
 * `Brand<string, 'VehicleId'>`, so ids and formatted values cannot be swapped by accident.
 */
export type Brand<T, K extends string> = T & { readonly __brand: K }
