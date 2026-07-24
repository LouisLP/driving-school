/**
 * Per-field validation messages, keyed by the field they belong to.
 *
 * Values are i18n message keys, never prose — validators are pure and locale-blind, and the same
 * result travels from a form's live feedback to an `ApiError` thrown by the seam.
 */
export type FieldErrors<T> = Partial<Record<keyof T & string, string>>

/** The message keys validators may produce. Every one has an entry in `shared/i18n`. */
export const VALIDATION_KEYS = {
  required: 'shared.validation.required',
  invalidEmail: 'shared.validation.invalidEmail',
  invalidPhone: 'shared.validation.invalidPhone',
  invalidDate: 'shared.validation.invalidDate',
  dateInFuture: 'shared.validation.dateInFuture',
  tooYoung: 'shared.validation.tooYoung',
  invalidPostalCode: 'shared.validation.invalidPostalCode',
  notPositive: 'shared.validation.notPositive',
} as const

export type ValidationKey = typeof VALIDATION_KEYS[keyof typeof VALIDATION_KEYS]

/** `null` when there is nothing wrong — so `if (errors)` reads as "if invalid". */
export function toFieldErrors<T>(
  entries: Partial<Record<keyof T & string, string | null>>,
): FieldErrors<T> | null {
  const errors = Object.fromEntries(
    Object.entries(entries).filter(([, message]) => message != null),
  ) as FieldErrors<T>

  return Object.keys(errors).length > 0 ? errors : null
}
