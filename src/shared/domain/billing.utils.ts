import type { Appointment } from './appointment.types'
import type {
  BillableItem,
  ChargeReason,
  EnrolmentBalance,
  Invoice,
  InvoiceLine,
  InvoiceSettlement,
  Payment,
  StudentBalance,
} from './billing.types'
import type { Enrolment } from './enrolment.types'
import type { EnrolmentId, StudentId } from './identifier.types'
import type { Money } from './money.types'
import type { PriceList } from './pricing.types'
import type { IsoDateTime } from './time.types'
import { LATE_CANCELLATION_NOTICE_HOURS, LESSON_UNIT_MINUTES } from './billing.constants'
import {
  addMoney,
  clampToZero,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  toMoney,
  ZERO,
} from './money.utils'
import { addMinutes } from './time.utils'

const MINUTES_PER_HOUR = 60

/**
 * How many 45-minute units an appointment is billed as. Always at least one — a lesson cut short
 * is still a lesson the instructor turned up for.
 */
export function chargeableUnits(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / LESSON_UNIT_MINUTES))
}

/**
 * Whether a cancellation came too late to be free.
 *
 * Only the student's cancellations can be late: when the school cancels — a sick instructor, a
 * car off the road — nothing is charged however short the notice. That asymmetry is the whole
 * reason `cancelledBy` exists on the outcome.
 */
export function isLateCancellation(
  appointment: Appointment,
  noticeHours: number = LATE_CANCELLATION_NOTICE_HOURS,
): boolean {
  const { outcome } = appointment

  if (outcome.status !== 'cancelled' || outcome.cancelledBy !== 'student')
    return false

  const deadline = addMinutes(appointment.startsAt, -noticeHours * MINUTES_PER_HOUR)

  return outcome.cancelledAt > deadline
}

/**
 * The rule that turns one appointment into money, or into nothing.
 *
 * ```
 * completed             → billed at the price of what was taught
 * noShow                → billed at the same price, reason `noShow`
 * cancelled, late, by student → billed at the same price, reason `lateCancellation`
 * cancelled otherwise   → nothing
 * planned               → nothing, yet
 * ```
 *
 * Theory appointments are never billed: the theory course is what the basic fee buys, and a
 * classroom evening has no per-student price. `null` for them is the answer, not an omission.
 *
 * Priced from the enrolment's agreed prices, which is what makes the rule replayable — running it
 * again next year over the same calendar produces the same numbers.
 */
export function billableItemFor(
  appointment: Appointment,
  prices: PriceList,
): BillableItem | null {
  if (appointment.kind === 'theory')
    return null

  const { unitPrice, quantity, completedReason } = priceOf(appointment, prices)
  const { outcome } = appointment

  const charge = (reason: ChargeReason, occurredAt: IsoDateTime): BillableItem => ({
    reason,
    appointmentId: appointment.id,
    occurredAt,
    quantity,
    unitPrice,
    amount: multiplyMoney(unitPrice, quantity),
  })

  switch (outcome.status) {
    case 'completed':
      return charge(completedReason, outcome.completedAt)
    case 'noShow':
      return charge('noShow', outcome.recordedAt)
    case 'cancelled':
      return isLateCancellation(appointment)
        ? charge('lateCancellation', outcome.cancelledAt)
        : null
    case 'planned':
      return null
  }
}

function priceOf(
  appointment: Exclude<Appointment, { kind: 'theory' }>,
  prices: PriceList,
): { unitPrice: Money, quantity: number, completedReason: ChargeReason } {
  if (appointment.kind === 'exam') {
    return appointment.examKind === 'theory'
      ? { unitPrice: prices.theoryExamFee, quantity: 1, completedReason: 'theoryExam' }
      : { unitPrice: prices.practicalExamFee, quantity: 1, completedReason: 'practicalExam' }
  }

  const isSpecial = appointment.driveType !== 'standard'

  return {
    unitPrice: isSpecial ? prices.specialDriveUnit : prices.practicalLessonUnit,
    quantity: chargeableUnits(appointment.durationMinutes),
    completedReason: isSpecial ? 'specialDrive' : 'practicalLesson',
  }
}

/**
 * The one charge that has no appointment behind it: the fee for enrolling at all.
 *
 * Dated to the day training started, or to the enquiry when it has not — so it lands on the first
 * invoice of the enrolment rather than floating outside every billing period.
 */
export function basicFeeItem(enrolment: Enrolment): BillableItem {
  return {
    reason: 'basicFee',
    appointmentId: null,
    occurredAt: enrolment.startedAt ?? enrolment.enquiredAt,
    quantity: 1,
    unitPrice: enrolment.agreedPrices.basicFee,
    amount: enrolment.agreedPrices.basicFee,
  }
}

export function totalOf(lines: readonly InvoiceLine[]): Money {
  return sumMoney(lines.map(line => line.amount))
}

/**
 * Applies an enrolment's payments to its issued invoices.
 *
 * Direct payments settle the invoice they name. Whatever is left over — money taken on account
 * before an invoice existed, an overpayment, or a payment whose invoice was later voided — is
 * spread across the unsettled invoices oldest due date first, which is both what a bookkeeper
 * does by hand and what stops a student with a deposit on file showing up as overdue.
 *
 * Drafts and voided invoices are not in the answer: neither is money anybody owes.
 */
export function settleInvoices(
  invoices: readonly Invoice[],
  payments: readonly Payment[],
  now: IsoDateTime,
): readonly InvoiceSettlement[] {
  const issued = invoices
    .filter(invoice => invoice.state.status === 'issued')
    .sort((a, b) => dueAtOf(a).localeCompare(dueAtOf(b)))

  const issuedIds = new Set(issued.map(invoice => invoice.id))
  const direct = new Map(issued.map(invoice => [invoice.id, ZERO as Money]))

  let pool = ZERO

  for (const payment of payments) {
    const target = payment.invoiceId

    if (target !== null && issuedIds.has(target))
      direct.set(target, addMoney(direct.get(target) ?? ZERO, payment.amount))
    else
      pool = addMoney(pool, payment.amount)
  }

  // An overpayment is credit on the enrolment, not on the invoice that happened to receive it.
  for (const invoice of issued) {
    const paid = direct.get(invoice.id) ?? ZERO

    if (paid > invoice.total) {
      direct.set(invoice.id, invoice.total)
      pool = addMoney(pool, subtractMoney(paid, invoice.total))
    }
  }

  return issued.map((invoice) => {
    const dueAt = dueAtOf(invoice)
    const paidDirectly = direct.get(invoice.id) ?? ZERO
    const fromPool = minMoney(pool, subtractMoney(invoice.total, paidDirectly))

    pool = subtractMoney(pool, fromPool)

    const paid = addMoney(paidDirectly, fromPool)
    const outstanding = clampToZero(subtractMoney(invoice.total, paid))

    return {
      invoiceId: invoice.id,
      dueAt,
      total: invoice.total,
      paid,
      outstanding,
      isOverdue: outstanding > ZERO && dueAt < now,
    }
  })
}

/** Only issued invoices are ever settled; the fallback keeps the sort total for the type. */
function dueAtOf(invoice: Invoice): IsoDateTime {
  return invoice.state.status === 'issued' ? invoice.state.dueAt : invoice.createdAt
}

function minMoney(a: Money, b: Money): Money {
  return toMoney(Math.min(a, b))
}

export interface BalanceInput {
  enrolmentId: EnrolmentId
  /** The school's invoices; anything belonging to another enrolment is ignored. */
  invoices: readonly Invoice[]
  payments: readonly Payment[]
  /** What `billableItemFor` produced for work that is on no invoice yet. */
  uninvoiced?: readonly BillableItem[]
  now: IsoDateTime
}

/**
 * What one enrolment owes.
 *
 * Every number here is read from invoices and payments at the moment it is asked for; nothing is
 * kept. A stored balance is a cache of two collections that both change, and keeping it right is
 * a bug farm this project has no reason to plant.
 */
export function deriveEnrolmentBalance(input: BalanceInput): EnrolmentBalance {
  const invoices = input.invoices.filter(it => it.enrolmentId === input.enrolmentId)
  const payments = input.payments.filter(it => it.enrolmentId === input.enrolmentId)

  const invoiced = sumMoney(
    invoices.filter(it => it.state.status === 'issued').map(it => it.total),
  )
  const paid = sumMoney(payments.map(it => it.amount))
  const settlements = settleInvoices(invoices, payments, input.now)

  return {
    enrolmentId: input.enrolmentId,
    invoiced,
    paid,
    outstanding: subtractMoney(invoiced, paid),
    overdue: sumMoney(settlements.filter(it => it.isOverdue).map(it => it.outstanding)),
    uninvoiced: sumMoney((input.uninvoiced ?? []).map(it => it.amount)),
  }
}

/**
 * What one student owes, across every enrolment they hold.
 *
 * The per-enrolment rows travel with the total, so the account page can show one number and its
 * parts without asking twice and getting two answers.
 */
export function deriveStudentBalance(
  studentId: StudentId,
  perEnrolment: readonly EnrolmentBalance[],
): StudentBalance {
  return {
    studentId,
    invoiced: sumMoney(perEnrolment.map(it => it.invoiced)),
    paid: sumMoney(perEnrolment.map(it => it.paid)),
    outstanding: sumMoney(perEnrolment.map(it => it.outstanding)),
    overdue: sumMoney(perEnrolment.map(it => it.overdue)),
    uninvoiced: sumMoney(perEnrolment.map(it => it.uninvoiced)),
    perEnrolment,
  }
}
