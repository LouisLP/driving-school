import type { PostalAddress } from './address.types'
import type { Student } from './student.types'
import type { IsoDate } from './time.types'
import type { FieldErrors } from './validation.types'
import { toFieldErrors, VALIDATION_KEYS } from './validation.types'

/** The seam mints `id` and `registeredAt`; everything else is the caller's to get right. */
type StudentInput = Omit<Student, 'id' | 'registeredAt'>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** Deliberately loose: an address-shaped string with an `@` and a dot in the domain. */
const EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/
/** Digits, spaces and the punctuation German numbers are written with. */
const PHONE = /^[+\d][\d\s\-/()]{4,}$/
const GERMAN_POSTAL_CODE = /^\d{5}$/

/**
 * The youngest a driving school will take: `B` theory can start at 16½ for BF17, and schools
 * take enquiries before that. Below this, it is a typo in the year.
 */
const MINIMUM_AGE_YEARS = 14

/**
 * The rules a student record must satisfy, as one pure function.
 *
 * Called by the fake API on every write — so the seam is authoritative exactly like a server —
 * and by the form for live feedback, so the two can never disagree about what "valid" means.
 */
export function validateStudent(
  input: StudentInput,
  now: Date = new Date(),
): FieldErrors<StudentInput> | null {
  return toFieldErrors<StudentInput>({
    firstName: isBlank(input.firstName) ? VALIDATION_KEYS.required : null,
    lastName: isBlank(input.lastName) ? VALIDATION_KEYS.required : null,
    dateOfBirth: validateDateOfBirth(input.dateOfBirth, now),
    email: input.email != null && !EMAIL.test(input.email)
      ? VALIDATION_KEYS.invalidEmail
      : null,
    phone: input.phone != null && !PHONE.test(input.phone)
      ? VALIDATION_KEYS.invalidPhone
      : null,
    address: input.address == null ? null : validateAddress(input.address),
  })
}

function validateDateOfBirth(dateOfBirth: IsoDate, now: Date): string | null {
  if (!ISO_DATE.test(dateOfBirth))
    return VALIDATION_KEYS.invalidDate

  const born = new Date(`${dateOfBirth}T00:00:00.000Z`)

  if (Number.isNaN(born.getTime()))
    return VALIDATION_KEYS.invalidDate

  if (born.getTime() > now.getTime())
    return VALIDATION_KEYS.dateInFuture

  const earliestBirthday = new Date(now)
  earliestBirthday.setUTCFullYear(earliestBirthday.getUTCFullYear() - MINIMUM_AGE_YEARS)

  return born.getTime() > earliestBirthday.getTime() ? VALIDATION_KEYS.tooYoung : null
}

/**
 * Reported against the `address` field as a whole rather than per sub-field: the address is one
 * input group in the form, and a nested error shape would leak form layout into the domain.
 */
function validateAddress(address: PostalAddress): string | null {
  const hasEveryPart = !isBlank(address.street)
    && !isBlank(address.houseNumber)
    && !isBlank(address.postalCode)
    && !isBlank(address.city)
    && !isBlank(address.countryCode)

  if (!hasEveryPart)
    return VALIDATION_KEYS.required

  const isGerman = address.countryCode.toUpperCase() === 'DE'

  return isGerman && !GERMAN_POSTAL_CODE.test(address.postalCode)
    ? VALIDATION_KEYS.invalidPostalCode
    : null
}

function isBlank(value: string): boolean {
  return value.trim().length === 0
}
