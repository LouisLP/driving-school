import type { Appointment, VehicleId } from '@/shared/domain'
import { describe, expect, it } from 'vitest'
import { appointmentsOverlap, isLicenceClassMatched, totalOf } from '@/shared/domain'
import { seedDatabase } from './seed'

const db = seedDatabase()

function vehicleOf(appointment: Appointment): VehicleId | null {
  if (appointment.kind === 'practical')
    return appointment.vehicleId

  return appointment.kind === 'exam' && appointment.examKind === 'practical'
    ? appointment.vehicleId
    : null
}

/**
 * The seed bypasses the write path, so nothing stops it holding data the seam itself would have
 * rejected. These are the rules `schedule()` enforces, checked against what ships.
 */
describe('seed data', () => {
  it('resolves every reference it makes', () => {
    const ids = {
      students: new Set(db.students.map(it => it.id)),
      enrolments: new Set(db.enrolments.map(it => it.id)),
      instructors: new Set(db.instructors.map(it => it.id)),
      vehicles: new Set(db.vehicles.map(it => it.id)),
      locations: new Set(db.locations.map(it => it.id)),
    }

    expect(db.enrolments.every(it => ids.students.has(it.studentId))).toBe(true)
    expect(db.vehicles.every(it => ids.locations.has(it.homeLocationId))).toBe(true)

    for (const appointment of db.appointments) {
      expect(ids.instructors.has(appointment.instructorId)).toBe(true)

      const vehicleId = vehicleOf(appointment)
      if (vehicleId !== null)
        expect(ids.vehicles.has(vehicleId)).toBe(true)

      if (appointment.kind === 'theory')
        expect(appointment.attendees.every(it => ids.enrolments.has(it.enrolmentId))).toBe(true)
      else
        expect(ids.enrolments.has(appointment.enrolmentId)).toBe(true)
    }
  })

  it('double-books nobody', () => {
    const live = db.appointments.filter(it => it.outcome.status !== 'cancelled')

    for (const [index, appointment] of live.entries()) {
      for (const other of live.slice(index + 1)) {
        if (!appointmentsOverlap(appointment, other))
          continue

        expect(appointment.instructorId).not.toBe(other.instructorId)

        const vehicleId = vehicleOf(appointment)
        if (vehicleId !== null)
          expect(vehicleOf(other)).not.toBe(vehicleId)
      }
    }
  })

  it('puts nobody in a car they are not cleared for', () => {
    for (const appointment of db.appointments) {
      const vehicleId = vehicleOf(appointment)

      if (vehicleId === null || appointment.kind === 'theory')
        continue

      const instructor = db.instructors.find(it => it.id === appointment.instructorId)!
      const vehicle = db.vehicles.find(it => it.id === vehicleId)!
      const enrolment = db.enrolments.find(it => it.id === appointment.enrolmentId)!

      expect(isLicenceClassMatched(enrolment.licenceClass, instructor, vehicle)).toBe(true)
    }
  })

  it('keeps every enrolment status consistent with its dates', () => {
    for (const enrolment of db.enrolments) {
      const isClosed = enrolment.status === 'passed' || enrolment.status === 'withdrawn'

      expect(enrolment.closedAt !== null).toBe(isClosed)

      if (enrolment.status !== 'enquiring')
        expect(enrolment.startedAt).not.toBeNull()
    }
  })

  it('bills nothing twice and quotes only agreed prices', () => {
    const lines = db.invoices
      .filter(it => it.state.status !== 'void')
      .flatMap(invoice => invoice.lines.map(line => ({ invoice, line })))

    const keys = lines.map(({ invoice, line }) => `${invoice.enrolmentId}:${line.appointmentId ?? line.reason}`)
    expect(new Set(keys).size).toBe(keys.length)

    for (const invoice of db.invoices) {
      expect(invoice.total).toBe(totalOf(invoice.lines))

      const enrolment = db.enrolments.find(it => it.id === invoice.enrolmentId)!
      const agreed = Object.values(enrolment.agreedPrices)

      expect(invoice.lines.every(line => agreed.includes(line.unitPrice))).toBe(true)
    }
  })

  it('points every payment at money it could have settled', () => {
    const enrolments = new Set(db.enrolments.map(it => it.id))

    for (const payment of db.payments) {
      expect(enrolments.has(payment.enrolmentId)).toBe(true)
      expect(payment.amount).toBeGreaterThan(0)

      if (payment.invoiceId === null)
        continue

      const invoice = db.invoices.find(it => it.id === payment.invoiceId)!

      expect(invoice.enrolmentId).toBe(payment.enrolmentId)
      expect(invoice.state.status).toBe('issued')
    }
  })

  it('anchors the calendar to the current week', () => {
    const now = Date.now()
    const week = 7 * 24 * 60 * 60 * 1000
    const upcoming = db.appointments.filter(it => new Date(it.startsAt).getTime() > now)

    expect(upcoming.length).toBeGreaterThan(0)
    expect(upcoming.every(it => new Date(it.startsAt).getTime() < now + 2 * week)).toBe(true)
  })
})
