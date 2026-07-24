import type { IsoDate } from './time.types'
import { describe, expect, it } from 'vitest'
import { validateStudent } from './student.validation'
import { VALIDATION_KEYS } from './validation.types'

const NOW = new Date('2026-07-23T12:00:00.000Z')

type StudentInput = Parameters<typeof validateStudent>[0]

const ADDRESS = {
  street: 'Zeil',
  houseNumber: '10',
  postalCode: '60313',
  city: 'Frankfurt am Main',
  countryCode: 'DE',
}

function student(overrides: Partial<StudentInput> = {}): StudentInput {
  return {
    firstName: 'Lena',
    lastName: 'Müller',
    dateOfBirth: '2006-03-12' as IsoDate,
    email: 'lena@example.de',
    phone: '+49 170 5550000',
    address: ADDRESS,
    notes: '',
    ...overrides,
  }
}

describe('validateStudent', () => {
  it('returns null when there is nothing wrong', () => {
    expect(validateStudent(student(), NOW)).toBeNull()
  })

  it('treats whitespace as missing', () => {
    expect(validateStudent(student({ lastName: '   ' }), NOW))
      .toEqual({ lastName: VALIDATION_KEYS.required })
  })

  it('accepts absent optional contact details', () => {
    expect(validateStudent(student({ email: null, phone: null, address: null }), NOW)).toBeNull()
  })

  it('rejects a birth date in the future', () => {
    expect(validateStudent(student({ dateOfBirth: '2030-01-01' as IsoDate }), NOW))
      .toEqual({ dateOfBirth: VALIDATION_KEYS.dateInFuture })
  })

  it('rejects an implausibly young student', () => {
    expect(validateStudent(student({ dateOfBirth: '2020-01-01' as IsoDate }), NOW))
      .toEqual({ dateOfBirth: VALIDATION_KEYS.tooYoung })
  })

  it('rejects a malformed date outright', () => {
    expect(validateStudent(student({ dateOfBirth: '12.03.2006' as IsoDate }), NOW))
      .toEqual({ dateOfBirth: VALIDATION_KEYS.invalidDate })
  })

  it('checks the postal code only for German addresses', () => {
    const german = student({ address: { ...ADDRESS, postalCode: '603' } })
    expect(validateStudent(german, NOW)).toEqual({ address: VALIDATION_KEYS.invalidPostalCode })

    const austrian = student({
      address: { ...ADDRESS, postalCode: '1010', countryCode: 'AT' },
    })
    expect(validateStudent(austrian, NOW)).toBeNull()
  })

  it('reports every bad field at once, not the first', () => {
    const errors = validateStudent(
      student({ firstName: '', email: 'nope', phone: 'x' }),
      NOW,
    )

    expect(Object.keys(errors ?? {})).toHaveLength(3)
  })
})
