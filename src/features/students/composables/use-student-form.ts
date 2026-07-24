import type { NewStudent } from '@/shared/api'
import type { UseForm } from '@/shared/composables/use-form'
import type { FieldErrors, IsoDate, PostalAddress, Student } from '@/shared/domain'
import { useForm } from '@/shared/composables/use-form'
import { validateStudent } from '@/shared/domain'

/**
 * What the controls are bound to.
 *
 * The same key set as `NewStudent`, deliberately — `validateStudent` reports its errors against
 * those keys, including one against `address` as a whole, and a form shape that renamed or
 * flattened them would need a translation layer between the validator and the controls. There
 * isn't one, and that is the point.
 *
 * The types differ where a control differs from the domain: a text input's empty state is `''`
 * and the domain's is `null`, and the address is always an object here because five inputs have
 * to bind to something. Both differences are resolved in one direction, in `toNewStudent`.
 */
export interface StudentFormValues {
  firstName: string
  lastName: string
  /** `UiDateField` models "empty" as null; the domain requires a date, so null fails validation. */
  dateOfBirth: IsoDate | null
  email: string
  phone: string
  address: PostalAddress
  notes: string
}

/** The country a Frankfurt driving school's students overwhelmingly live in. */
const DEFAULT_COUNTRY_CODE = 'DE'

function emptyAddress(): PostalAddress {
  return { street: '', houseNumber: '', postalCode: '', city: '', countryCode: DEFAULT_COUNTRY_CODE }
}

export function emptyStudentForm(): StudentFormValues {
  return {
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    email: '',
    phone: '',
    address: emptyAddress(),
    notes: '',
  }
}

export function toStudentForm(student: Student): StudentFormValues {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth,
    email: student.email ?? '',
    phone: student.phone ?? '',
    address: student.address ? { ...student.address } : emptyAddress(),
    notes: student.notes,
  }
}

/**
 * Form values as the seam wants them.
 *
 * **Empty strings become `null`.** The domain models "no email" as `null`, and `''` is not a
 * second way to say it — one that would round-trip through the seam, get stored, and eventually
 * make `student.email ?? '—'` render an empty cell instead of a dash.
 *
 * An address is all-or-nothing, which is also how `validateStudent` judges it: an address with
 * nothing in it is no address, and an address with three of five parts filled is an error rather
 * than a partial record.
 */
export function toNewStudent(values: StudentFormValues): NewStudent {
  const address = isBlankForm(values.address) ? null : trimAddress(values.address)

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    // An empty date field cannot be a valid date, and the validator says so in the usual way.
    dateOfBirth: values.dateOfBirth ?? ('' as IsoDate),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    address,
    notes: values.notes,
  }
}

function isBlankForm(address: PostalAddress): boolean {
  // The country code is prefilled, so it does not count as someone having entered an address.
  const { countryCode: _countryCode, ...entered } = address
  return Object.values(entered).every(part => part.trim().length === 0)
}

function trimAddress(address: PostalAddress): PostalAddress {
  return {
    street: address.street.trim(),
    houseNumber: address.houseNumber.trim(),
    postalCode: address.postalCode.trim(),
    city: address.city.trim(),
    countryCode: address.countryCode.trim().toUpperCase(),
  }
}

/**
 * The student form: `useForm` driven by the domain's own validator.
 *
 * The validator is called on exactly the object the seam will be sent, so the live feedback in
 * the dialog and the check the fake performs on write are the same computation over the same
 * input — which is what makes "one validator, two callers" true rather than aspirational.
 *
 * The two key sets are identical (`StudentFormValues` mirrors `NewStudent`), so the errors the
 * domain reports land on the controls with no mapping.
 */
export function useStudentForm(initial: StudentFormValues): UseForm<StudentFormValues> {
  return useForm(initial, values =>
    validateStudent(toNewStudent(values)) as FieldErrors<StudentFormValues> | null)
}
