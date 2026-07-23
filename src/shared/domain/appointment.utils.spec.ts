import type { PracticalAppointment } from './appointment.types'
import type {
  AppointmentId,
  EnrolmentId,
  InstructorId,
  LocationId,
  VehicleId,
} from './identifier.types'
import type { Instructor } from './instructor.types'
import type { LicenceClass } from './licence-class.types'
import type { IsoDate, IsoDateTime } from './time.types'
import type { Vehicle } from './vehicle.types'
import { describe, expect, it } from 'vitest'
import { appointmentEndsAt, isLicenceClassMatched } from './appointment.utils'

function instructor(teachableClasses: readonly LicenceClass[]): Instructor {
  return {
    id: 'instructor-1' as InstructorId,
    firstName: 'Anke',
    lastName: 'Brandt',
    email: null,
    phone: null,
    teachableClasses,
    employedSince: '2020-03-01' as IsoDate,
    employedUntil: null,
  }
}

function vehicle(suitableFor: readonly LicenceClass[]): Vehicle {
  return {
    id: 'vehicle-1' as VehicleId,
    licencePlate: 'M-FS 1234',
    make: 'VW',
    model: 'Golf',
    transmission: 'manual',
    suitableFor,
    homeLocationId: 'location-1' as LocationId,
    inServiceSince: '2024-01-15' as IsoDate,
    retiredAt: null,
  }
}

describe('isLicenceClassMatched', () => {
  it('matches when instructor and vehicle both cover the class', () => {
    expect(isLicenceClassMatched('B', instructor(['B', 'BE']), vehicle(['B']))).toBe(true)
  })

  it('rejects an instructor who may not teach the class', () => {
    expect(isLicenceClassMatched('A', instructor(['B']), vehicle(['A', 'B']))).toBe(false)
  })

  it('rejects a vehicle unsuitable for the class', () => {
    expect(isLicenceClassMatched('A', instructor(['A']), vehicle(['B']))).toBe(false)
  })

  it('rejects when neither side covers the class', () => {
    expect(isLicenceClassMatched('C', instructor(['B']), vehicle(['B']))).toBe(false)
  })
})

describe('appointmentEndsAt', () => {
  const appointment: PracticalAppointment = {
    id: 'appointment-1' as AppointmentId,
    kind: 'practical',
    instructorId: 'instructor-1' as InstructorId,
    enrolmentId: 'enrolment-1' as EnrolmentId,
    vehicleId: 'vehicle-1' as VehicleId,
    driveType: 'standard',
    meetingPointId: null,
    startsAt: '2026-09-14T09:00:00.000Z' as IsoDateTime,
    durationMinutes: 45,
    outcome: { status: 'planned' },
    notes: '',
  }

  it('derives the end from start plus duration', () => {
    expect(appointmentEndsAt(appointment)).toBe('2026-09-14T09:45:00.000Z')
  })

  it('carries a double lesson across the hour', () => {
    expect(appointmentEndsAt({ ...appointment, durationMinutes: 90 }))
      .toBe('2026-09-14T10:30:00.000Z')
  })
})
