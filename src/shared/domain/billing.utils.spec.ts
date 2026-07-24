import type { Appointment, AppointmentOutcome, PracticalDriveType } from './appointment.types'
import type { Invoice, InvoiceLine, Payment } from './billing.types'
import type { Enrolment } from './enrolment.types'
import type {
  AppointmentId,
  EnrolmentId,
  InstructorId,
  InvoiceId,
  LocationId,
  PaymentId,
  StudentId,
  VehicleId,
} from './identifier.types'
import type { AgreedPrices } from './pricing.types'
import type { IsoDateTime } from './time.types'
import { describe, expect, it } from 'vitest'
import {
  basicFeeItem,
  billableItemFor,
  chargeableUnits,
  deriveEnrolmentBalance,
  deriveStudentBalance,
  isLateCancellation,
  settleInvoices,
  totalOf,
} from './billing.utils'
import { fromEuros } from './money.utils'

const ENROLMENT = 'enr-1' as EnrolmentId
const LESSON_START = '2026-03-10T09:00:00.000Z' as IsoDateTime

const PRICES: AgreedPrices = {
  agreedAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
  basicFee: fromEuros(399),
  practicalLessonUnit: fromEuros(62),
  specialDriveUnit: fromEuros(75),
  theoryExamFee: fromEuros(35),
  practicalExamFee: fromEuros(130),
}

function practical(
  outcome: AppointmentOutcome,
  driveType: PracticalDriveType = 'standard',
  durationMinutes = 45,
): Appointment {
  return {
    id: 'apt-1' as AppointmentId,
    kind: 'practical',
    instructorId: 'ins-1' as InstructorId,
    vehicleId: 'veh-1' as VehicleId,
    enrolmentId: ENROLMENT,
    driveType,
    meetingPointId: null,
    startsAt: LESSON_START,
    durationMinutes,
    outcome,
    notes: '',
  }
}

function invoice(
  id: string,
  total: number,
  state: Invoice['state'],
  enrolmentId: EnrolmentId = ENROLMENT,
): Invoice {
  const line: InvoiceLine = {
    reason: 'practicalLesson',
    appointmentId: null,
    occurredAt: LESSON_START,
    quantity: 1,
    unitPrice: fromEuros(total),
    amount: fromEuros(total),
  }

  return {
    id: id as InvoiceId,
    enrolmentId,
    reference: id,
    createdAt: LESSON_START,
    state,
    lines: [line],
    total: fromEuros(total),
  }
}

function issued(dueAt: string): Invoice['state'] {
  return {
    status: 'issued',
    issuedAt: LESSON_START,
    dueAt: dueAt as IsoDateTime,
  }
}

function payment(
  amount: number,
  invoiceId: string | null,
  enrolmentId: EnrolmentId = ENROLMENT,
): Payment {
  return {
    id: `pay-${amount}-${invoiceId ?? 'account'}` as PaymentId,
    enrolmentId,
    invoiceId: invoiceId === null ? null : invoiceId as InvoiceId,
    receivedAt: LESSON_START,
    amount: fromEuros(amount),
    method: 'bankTransfer',
    reference: '',
  }
}

describe('chargeableUnits', () => {
  it('bills a lesson in 45-minute units, rounding up', () => {
    expect(chargeableUnits(45)).toBe(1)
    expect(chargeableUnits(90)).toBe(2)
    expect(chargeableUnits(60)).toBe(2)
  })

  it('never bills less than one unit', () => {
    expect(chargeableUnits(10)).toBe(1)
    expect(chargeableUnits(0)).toBe(1)
  })
})

describe('isLateCancellation', () => {
  it('is late inside the notice window', () => {
    const appointment = practical({
      status: 'cancelled',
      cancelledAt: '2026-03-09T20:00:00.000Z' as IsoDateTime,
      cancelledBy: 'student',
    })

    expect(isLateCancellation(appointment)).toBe(true)
  })

  it('is not late three weeks out', () => {
    const appointment = practical({
      status: 'cancelled',
      cancelledAt: '2026-02-17T09:00:00.000Z' as IsoDateTime,
      cancelledBy: 'student',
    })

    expect(isLateCancellation(appointment)).toBe(false)
  })

  it('is never late when the school is the one cancelling', () => {
    const appointment = practical({
      status: 'cancelled',
      cancelledAt: '2026-03-10T08:00:00.000Z' as IsoDateTime,
      cancelledBy: 'school',
    })

    expect(isLateCancellation(appointment)).toBe(false)
  })
})

describe('billableItemFor', () => {
  it('bills a completed standard lesson at the lesson price', () => {
    const item = billableItemFor(
      practical({ status: 'completed', completedAt: LESSON_START }),
      PRICES,
    )

    expect(item).toMatchObject({ reason: 'practicalLesson', quantity: 1, amount: fromEuros(62) })
  })

  it('bills a 90-minute special drive as two units at the special price', () => {
    const item = billableItemFor(
      practical({ status: 'completed', completedAt: LESSON_START }, 'overland', 90),
      PRICES,
    )

    expect(item).toMatchObject({ reason: 'specialDrive', quantity: 2, amount: fromEuros(150) })
  })

  it('bills a no-show at the price of the lesson that did not happen', () => {
    const item = billableItemFor(
      practical({ status: 'noShow', recordedAt: LESSON_START }),
      PRICES,
    )

    expect(item).toMatchObject({ reason: 'noShow', amount: fromEuros(62) })
  })

  it('bills a late cancellation the same way, and dates it to the cancellation', () => {
    const cancelledAt = '2026-03-09T20:00:00.000Z' as IsoDateTime
    const item = billableItemFor(
      practical({ status: 'cancelled', cancelledAt, cancelledBy: 'student' }),
      PRICES,
    )

    expect(item).toMatchObject({ reason: 'lateCancellation', amount: fromEuros(62), occurredAt: cancelledAt })
  })

  it('bills nothing for a cancellation in good time', () => {
    const item = billableItemFor(
      practical({
        status: 'cancelled',
        cancelledAt: '2026-02-17T09:00:00.000Z' as IsoDateTime,
        cancelledBy: 'student',
      }),
      PRICES,
    )

    expect(item).toBeNull()
  })

  it('bills nothing for an appointment that has not happened yet', () => {
    expect(billableItemFor(practical({ status: 'planned' }), PRICES)).toBeNull()
  })

  it('bills nothing for theory, which the basic fee already covers', () => {
    const theory: Appointment = {
      id: 'apt-t' as AppointmentId,
      kind: 'theory',
      instructorId: 'ins-1' as InstructorId,
      locationId: 'loc-1' as LocationId,
      topic: { scope: 'basic', number: 3 },
      capacity: 12,
      attendees: [{ enrolmentId: ENROLMENT, status: 'attended' }],
      startsAt: LESSON_START,
      durationMinutes: 90,
      outcome: { status: 'completed', completedAt: LESSON_START },
      notes: '',
    }

    expect(billableItemFor(theory, PRICES)).toBeNull()
  })

  it('bills a sat exam at the presentation fee for its kind', () => {
    const exam: Appointment = {
      id: 'apt-e' as AppointmentId,
      kind: 'exam',
      examKind: 'practical',
      instructorId: 'ins-1' as InstructorId,
      vehicleId: 'veh-1' as VehicleId,
      locationId: 'loc-1' as LocationId,
      enrolmentId: ENROLMENT,
      result: 'failed',
      startsAt: LESSON_START,
      durationMinutes: 60,
      outcome: { status: 'completed', completedAt: LESSON_START },
      notes: '',
    }

    // A failed exam is still a chargeable one — the school presented the student either way.
    expect(billableItemFor(exam, PRICES)).toMatchObject({
      reason: 'practicalExam',
      amount: fromEuros(130),
    })
  })
})

describe('basicFeeItem', () => {
  it('dates the fee to the day training started', () => {
    const enrolment: Enrolment = {
      id: ENROLMENT,
      studentId: 'stu-1' as StudentId,
      licenceClass: 'B',
      status: 'active',
      agreedPrices: PRICES,
      enquiredAt: '2026-01-01T09:00:00.000Z' as IsoDateTime,
      startedAt: '2026-01-08T09:00:00.000Z' as IsoDateTime,
      closedAt: null,
    }

    expect(basicFeeItem(enrolment)).toMatchObject({
      reason: 'basicFee',
      appointmentId: null,
      amount: fromEuros(399),
      occurredAt: '2026-01-08T09:00:00.000Z',
    })
  })
})

describe('settleInvoices', () => {
  const now = '2026-04-01T00:00:00.000Z' as IsoDateTime

  it('settles an invoice with the payment that names it', () => {
    const bill = invoice('inv-1', 100, issued('2026-05-01T00:00:00.000Z'))
    const [settlement] = settleInvoices([bill], [payment(100, 'inv-1')], now)

    expect(settlement).toMatchObject({ paid: fromEuros(100), outstanding: 0, isOverdue: false })
  })

  it('marks an unpaid invoice past its due date as overdue', () => {
    const bill = invoice('inv-1', 100, issued('2026-03-01T00:00:00.000Z'))
    const [settlement] = settleInvoices([bill], [], now)

    expect(settlement).toMatchObject({ outstanding: fromEuros(100), isOverdue: true })
  })

  it('spends money taken on account on the oldest bill first', () => {
    const older = invoice('inv-1', 100, issued('2026-03-01T00:00:00.000Z'))
    const newer = invoice('inv-2', 100, issued('2026-05-01T00:00:00.000Z'))

    const settlements = settleInvoices([newer, older], [payment(150, null)], now)

    expect(settlements.map(it => it.invoiceId)).toEqual(['inv-1', 'inv-2'])
    expect(settlements[0]).toMatchObject({ outstanding: 0, isOverdue: false })
    expect(settlements[1]?.outstanding).toBe(fromEuros(50))
  })

  it('spills an overpayment onto the next bill rather than onto the one that took it', () => {
    const first = invoice('inv-1', 100, issued('2026-03-01T00:00:00.000Z'))
    const second = invoice('inv-2', 100, issued('2026-05-01T00:00:00.000Z'))

    const settlements = settleInvoices([first, second], [payment(180, 'inv-1')], now)

    expect(settlements[0]).toMatchObject({ paid: fromEuros(100), outstanding: 0 })
    expect(settlements[1]).toMatchObject({ paid: fromEuros(80), outstanding: fromEuros(20) })
  })

  it('ignores drafts and voided invoices — neither is money owed', () => {
    const draft = invoice('inv-1', 100, { status: 'draft' })
    const voided = invoice('inv-2', 100, {
      status: 'void',
      issuedAt: LESSON_START,
      voidedAt: LESSON_START,
      reason: 'wrong student',
    })

    expect(settleInvoices([draft, voided], [], now)).toHaveLength(0)
  })
})

describe('deriveEnrolmentBalance', () => {
  const now = '2026-04-01T00:00:00.000Z' as IsoDateTime

  it('counts only issued invoices as money owed', () => {
    const balance = deriveEnrolmentBalance({
      enrolmentId: ENROLMENT,
      invoices: [
        invoice('inv-1', 300, issued('2026-05-01T00:00:00.000Z')),
        invoice('inv-2', 500, { status: 'draft' }),
      ],
      payments: [payment(100, 'inv-1')],
      now,
    })

    expect(balance).toMatchObject({
      invoiced: fromEuros(300),
      paid: fromEuros(100),
      outstanding: fromEuros(200),
      overdue: 0,
    })
  })

  it('reports what is past due separately from what is merely unpaid', () => {
    const balance = deriveEnrolmentBalance({
      enrolmentId: ENROLMENT,
      invoices: [
        invoice('inv-1', 300, issued('2026-03-01T00:00:00.000Z')),
        invoice('inv-2', 200, issued('2026-05-01T00:00:00.000Z')),
      ],
      payments: [],
      now,
    })

    expect(balance.outstanding).toBe(fromEuros(500))
    expect(balance.overdue).toBe(fromEuros(300))
  })

  it('reads a deposit with no invoice as credit, not as debt', () => {
    const balance = deriveEnrolmentBalance({
      enrolmentId: ENROLMENT,
      invoices: [],
      payments: [payment(300, null)],
      now,
    })

    expect(balance.outstanding).toBe(fromEuros(-300))
    expect(balance.overdue).toBe(0)
  })

  it('keeps unbilled work out of what is owed', () => {
    const balance = deriveEnrolmentBalance({
      enrolmentId: ENROLMENT,
      invoices: [],
      payments: [],
      uninvoiced: [billableItemFor(practical({ status: 'completed', completedAt: LESSON_START }), PRICES)]
        .filter(item => item !== null),
      now,
    })

    expect(balance.uninvoiced).toBe(fromEuros(62))
    expect(balance.outstanding).toBe(0)
  })

  it('ignores the invoices and payments of another enrolment', () => {
    const other = 'enr-2' as EnrolmentId

    const balance = deriveEnrolmentBalance({
      enrolmentId: ENROLMENT,
      invoices: [invoice('inv-9', 900, issued('2026-05-01T00:00:00.000Z'), other)],
      payments: [payment(400, 'inv-9', other)],
      now,
    })

    expect(balance).toMatchObject({ invoiced: 0, paid: 0, outstanding: 0 })
  })
})

describe('deriveStudentBalance', () => {
  it('sums the enrolments and keeps the rows it summed', () => {
    const now = '2026-04-01T00:00:00.000Z' as IsoDateTime
    const other = 'enr-2' as EnrolmentId

    const invoices = [
      invoice('inv-1', 300, issued('2026-03-01T00:00:00.000Z')),
      invoice('inv-2', 200, issued('2026-05-01T00:00:00.000Z'), other),
    ]

    const balance = deriveStudentBalance('stu-1' as StudentId, [
      deriveEnrolmentBalance({ enrolmentId: ENROLMENT, invoices, payments: [], now }),
      deriveEnrolmentBalance({ enrolmentId: other, invoices, payments: [], now }),
    ])

    expect(balance.invoiced).toBe(fromEuros(500))
    expect(balance.overdue).toBe(fromEuros(300))
    expect(balance.perEnrolment).toHaveLength(2)
  })
})

describe('totalOf', () => {
  it('sums the lines of a bill', () => {
    const bill = invoice('inv-1', 120, { status: 'draft' })
    expect(totalOf(bill.lines)).toBe(fromEuros(120))
  })
})
