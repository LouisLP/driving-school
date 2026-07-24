import type { AppointmentId, EnrolmentId, InvoiceId, PaymentId, StudentId } from './identifier.types'
import type { Money } from './money.types'
import type { IsoDateTime } from './time.types'

/**
 * Why money is owed. The closed set of things a driving school bills for, and the discriminator
 * an invoice line is grouped and translated by.
 *
 * `lateCancellation` and `noShow` are reasons rather than fees of their own: they are charged at
 * the price of the appointment that did not happen, so they need no entry in the price list and
 * cannot drift out of step with the lesson price.
 */
export type ChargeReason
  = | 'basicFee'
    | 'practicalLesson'
    | 'specialDrive'
    | 'theoryExam'
    | 'practicalExam'
    | 'lateCancellation'
    | 'noShow'

/**
 * One chargeable thing that happened, priced but not yet billed.
 *
 * Derived, never stored: it is a function of an appointment's outcome and the enrolment's agreed
 * prices, both of which are already recorded. Storing it would create a second copy of the
 * calendar that has to be kept in step with the first — the same reason `StudentStanding` is
 * computed rather than kept.
 *
 * It becomes durable at exactly one moment: when it is copied onto an invoice.
 */
export interface BillableItem {
  reason: ChargeReason
  /** The appointment that earned it, or null for the basic fee, which the enrolment itself owes. */
  appointmentId: AppointmentId | null
  /** When the work happened — completion, cancellation or no-show. What invoices are cut by. */
  occurredAt: IsoDateTime
  /** 45-minute units for drives, 1 for fees. */
  quantity: number
  unitPrice: Money
  /** `unitPrice` × `quantity`, carried so a line never has to be recomputed to be rendered. */
  amount: Money
}

/**
 * A line on an invoice: a billable item, frozen.
 *
 * Identical by design. The line is a snapshot taken at invoicing time, so editing an appointment
 * afterwards — or raising the price list — cannot change an invoice that has already gone out.
 */
export type InvoiceLine = BillableItem

/**
 * ```
 * draft ──► issued
 *   └────────┴──► void
 * ```
 *
 * A discriminated union, so the dates only exist once they mean something: a draft has no issue
 * date, and only a void invoice has a reason. There is no `paid` state — whether an invoice is
 * settled is read from its payments, and whether it is overdue from its due date and the clock,
 * so there is no stored flag that can disagree with the money.
 */
export type InvoiceState
  = | { status: 'draft' }
    | { status: 'issued', issuedAt: IsoDateTime, dueAt: IsoDateTime }
    | { status: 'void', issuedAt: IsoDateTime | null, voidedAt: IsoDateTime, reason: string }

/**
 * A bill for one enrolment.
 *
 * Attached to the enrolment and never to the student, because the enrolment is the unit of
 * billing: a student training for `B` and `BE` gets two bills at two agreed price lists, and
 * neither one is allowed to know about the other.
 *
 * Not a live view of what is owed — a frozen list of lines and their sum. Rebilling means voiding
 * this one and drafting another.
 */
export interface Invoice {
  id: InvoiceId
  enrolmentId: EnrolmentId
  /**
   * What the office quotes on the phone, e.g. `2026-0007`. Human-facing and unique, but not
   * sequential and not gapless — legally compliant numbering is out of scope for this project.
   */
  reference: string
  createdAt: IsoDateTime
  state: InvoiceState
  lines: readonly InvoiceLine[]
  /** The sum of the lines, frozen with them. */
  total: Money
}

export type InvoiceStatus = InvoiceState['status']

export type PaymentMethod = 'cash' | 'bankTransfer' | 'card' | 'directDebit'

/**
 * Money received.
 *
 * Recorded against the enrolment always, and against one invoice usually. A payment with no
 * invoice is money taken on account — the deposit a student pays at the counter on day one,
 * before anything has been billed. It counts toward the balance immediately and is allocated to
 * invoices as they are issued, oldest due date first.
 */
export interface Payment {
  id: PaymentId
  enrolmentId: EnrolmentId
  /** The invoice it settles, or null for money taken on account. */
  invoiceId: InvoiceId | null
  receivedAt: IsoDateTime
  /** Always positive. Refunds are not modelled. */
  amount: Money
  method: PaymentMethod
  /** Bank reference, receipt number, or whatever the office wrote down. */
  reference: string
}

/**
 * One issued invoice after its payments have been applied — direct payments first, then whatever
 * is left of the enrolment's on-account money, oldest due date first.
 *
 * The intermediate the balance is built from, exposed because "which invoice is the overdue one"
 * is a question the debtors screen asks directly.
 */
export interface InvoiceSettlement {
  invoiceId: InvoiceId
  dueAt: IsoDateTime
  total: Money
  paid: Money
  /** Never negative — an overpayment is credit on the enrolment, not on this invoice. */
  outstanding: Money
  /** Past its due date with money still on it. */
  isOverdue: boolean
}

/** What one enrolment owes, and what it has not been billed for yet. */
export interface EnrolmentBalance {
  enrolmentId: EnrolmentId
  /** The total of every issued invoice. Drafts and voided invoices are not money owed. */
  invoiced: Money
  paid: Money
  /** `invoiced` − `paid`. Negative means the student is in credit. */
  outstanding: Money
  /** The part of `outstanding` sitting on invoices that are past their due date. */
  overdue: Money
  /**
   * Work that has happened but is on no invoice yet. Deliberately *not* part of `outstanding` —
   * nobody owes money they have not been billed for; this is what the office is about to bill.
   */
  uninvoiced: Money
}

/**
 * What one student owes across every enrolment they hold.
 *
 * Summed rather than stored, and kept alongside the per-enrolment rows it was summed from: the
 * student's account page shows one number at the top and its parts underneath, and the two can
 * never disagree because there is only one calculation.
 */
export interface StudentBalance {
  studentId: StudentId
  invoiced: Money
  paid: Money
  outstanding: Money
  overdue: Money
  uninvoiced: Money
  perEnrolment: readonly EnrolmentBalance[]
}
