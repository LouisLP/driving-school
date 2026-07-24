import type {
  BillingRepository,
  DebtorListItem,
  DebtorQuery,
  InvoiceQuery,
  InvoiceTerms,
  NewInvoice,
  NewPayment,
  PaymentQuery,
} from '../contracts/billing.contract'
import type { FakeContext } from './context'
import type {
  BillableItem,
  Enrolment,
  EnrolmentBalance,
  EnrolmentId,
  Invoice,
  InvoiceId,
  IsoDateTime,
  Money,
  Payment,
  PaymentId,
  StudentId,
} from '@/shared/domain'
import {
  addMinutes,
  basicFeeItem,
  billableItemFor,
  DEFAULT_PAYMENT_TERM_DAYS,
  deriveEnrolmentBalance,
  deriveStudentBalance,
  isPositive,
  settleInvoices,
  totalOf,
  VALIDATION_KEYS,
  ZERO,
} from '@/shared/domain'
import { ApiError } from '../api.error'
import { detach, matchesSearch, mintId } from './fake.utils'

const MINUTES_PER_DAY = 24 * 60
const ONE_CENT = 1 as Money

export function createBillingRepository(ctx: FakeContext): BillingRepository {
  const { db } = ctx

  function findInvoice(id: InvoiceId): Invoice {
    const invoice = db.invoices.find(it => it.id === id)

    if (!invoice)
      throw ApiError.notFound('invoice', id)

    return invoice
  }

  function findEnrolment(id: EnrolmentId): Enrolment {
    const enrolment = db.enrolments.find(it => it.id === id)

    if (!enrolment)
      throw ApiError.notFound('enrolment', id)

    return enrolment
  }

  function enrolmentIdsOf(studentId: StudentId): readonly EnrolmentId[] {
    return db.enrolments.filter(it => it.studentId === studentId).map(it => it.id)
  }

  /**
   * What an enrolment has been billed for already. Voided invoices are not in it — voiding is
   * what makes their lines billable again.
   */
  function billedKeys(enrolmentId: EnrolmentId): Set<string> {
    return new Set(
      db.invoices
        .filter(it => it.enrolmentId === enrolmentId && it.state.status !== 'void')
        .flatMap(it => it.lines)
        .map(line => line.appointmentId ?? line.reason),
    )
  }

  /**
   * The billing rule, run over one enrolment's calendar.
   *
   * Every appointment is re-priced from the record each time rather than a charge being written
   * down when a lesson is completed. Two things fall out: correcting an outcome corrects the
   * bill, and there is no second copy of the calendar to keep in step with the first.
   */
  function unbilledItems(enrolment: Enrolment, upTo?: IsoDateTime): readonly BillableItem[] {
    const billed = billedKeys(enrolment.id)
    const items: BillableItem[] = []

    if (!billed.has('basicFee'))
      items.push(basicFeeItem(enrolment))

    for (const appointment of db.appointments) {
      if (billed.has(appointment.id))
        continue

      const belongs = appointment.kind === 'theory'
        ? false
        : appointment.enrolmentId === enrolment.id

      if (!belongs)
        continue

      const item = billableItemFor(appointment, enrolment.agreedPrices)

      if (item)
        items.push(item)
    }

    return items
      .filter(item => upTo === undefined || item.occurredAt < upTo)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }

  function balanceOf(enrolmentId: EnrolmentId): EnrolmentBalance {
    const enrolment = findEnrolment(enrolmentId)

    return deriveEnrolmentBalance({
      enrolmentId,
      invoices: db.invoices,
      payments: db.payments,
      uninvoiced: unbilledItems(enrolment),
      now: ctx.now(),
    })
  }

  function isOverdue(invoice: Invoice, now: IsoDateTime): boolean {
    return settleInvoices(
      db.invoices.filter(it => it.enrolmentId === invoice.enrolmentId),
      db.payments.filter(it => it.enrolmentId === invoice.enrolmentId),
      now,
    ).some(it => it.invoiceId === invoice.id && it.isOverdue)
  }

  /**
   * `2026-0007`: the year plus a count. Unique and quotable on the phone, and deliberately not a
   * gapless legal sequence — compliant numbering is out of this project's scope.
   */
  function mintReference(issuedAt: IsoDateTime): string {
    const year = issuedAt.slice(0, 4)
    const soFar = db.invoices.filter(it => it.reference.startsWith(`${year}-`)).length

    return `${year}-${String(soFar + 1).padStart(4, '0')}`
  }

  return {
    async listInvoices(query: InvoiceQuery = {}) {
      await ctx.network.roundTrip()

      const now = ctx.now()
      const ofStudent = query.studentId === undefined
        ? null
        : new Set(enrolmentIdsOf(query.studentId))

      const matching = db.invoices
        .filter(it => query.enrolmentId === undefined || it.enrolmentId === query.enrolmentId)
        .filter(it => ofStudent === null || ofStudent.has(it.enrolmentId))
        .filter(it => query.status === undefined || it.state.status === query.status)
        .filter(it => !query.overdueOnly || isOverdue(it, now))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

      return detach(matching)
    },

    async getInvoice(id) {
      await ctx.network.roundTrip()
      return detach(findInvoice(id))
    },

    async billableItems(enrolmentId) {
      await ctx.network.roundTrip()
      return detach(unbilledItems(findEnrolment(enrolmentId)))
    },

    async createDraft(input: NewInvoice) {
      await ctx.network.roundTrip()

      const enrolment = findEnrolment(input.enrolmentId)
      const lines = unbilledItems(enrolment, input.upTo)

      if (lines.length === 0)
        throw ApiError.conflict('There is nothing left to bill on this enrolment.')

      const invoice: Invoice = {
        id: mintId<InvoiceId>(),
        enrolmentId: enrolment.id,
        reference: mintReference(ctx.now()),
        createdAt: ctx.now(),
        state: { status: 'draft' },
        lines: detach(lines),
        total: totalOf(lines),
      }

      db.invoices.push(invoice)
      ctx.commit()

      return detach(invoice)
    },

    async issueInvoice(id, terms: InvoiceTerms = {}) {
      await ctx.network.roundTrip()

      const invoice = findInvoice(id)

      if (invoice.state.status !== 'draft')
        throw ApiError.conflict(`Invoice ${invoice.reference} has already been issued.`)

      const issuedAt = ctx.now()
      const dueAt = terms.dueAt ?? addDays(issuedAt, DEFAULT_PAYMENT_TERM_DAYS)

      if (dueAt < issuedAt)
        throw ApiError.validation({ dueAt: VALIDATION_KEYS.invalidDate })

      invoice.state = { status: 'issued', issuedAt, dueAt }
      ctx.commit()

      return detach(invoice)
    },

    async voidInvoice(id, reason) {
      await ctx.network.roundTrip()

      const invoice = findInvoice(id)

      if (invoice.state.status === 'void')
        throw ApiError.conflict(`Invoice ${invoice.reference} is already void.`)

      if (!reason.trim())
        throw ApiError.validation({ reason: VALIDATION_KEYS.required })

      const issuedAt = invoice.state.status === 'issued' ? invoice.state.issuedAt : null

      invoice.state = { status: 'void', issuedAt, voidedAt: ctx.now(), reason: reason.trim() }

      // Money taken against a void invoice stays received; it drops back to being on account.
      for (const payment of db.payments) {
        if (payment.invoiceId === invoice.id)
          payment.invoiceId = null
      }

      ctx.commit()

      return detach(invoice)
    },

    async removeDraft(id) {
      await ctx.network.roundTrip()

      const invoice = findInvoice(id)

      if (invoice.state.status !== 'draft')
        throw ApiError.conflict('Only a draft invoice can be deleted; issued invoices are voided.')

      db.invoices.splice(db.invoices.indexOf(invoice), 1)
      ctx.commit()
    },

    async listPayments(query: PaymentQuery = {}) {
      await ctx.network.roundTrip()

      const ofStudent = query.studentId === undefined
        ? null
        : new Set(enrolmentIdsOf(query.studentId))

      const matching = db.payments
        .filter(it => query.enrolmentId === undefined || it.enrolmentId === query.enrolmentId)
        .filter(it => ofStudent === null || ofStudent.has(it.enrolmentId))
        .filter(it => query.invoiceId === undefined || it.invoiceId === query.invoiceId)
        .filter(it => query.from === undefined || it.receivedAt >= query.from)
        .filter(it => query.to === undefined || it.receivedAt < query.to)
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))

      return detach(matching)
    },

    async recordPayment(input: NewPayment) {
      await ctx.network.roundTrip()

      if (!isPositive(input.amount))
        throw ApiError.validation({ amount: VALIDATION_KEYS.notPositive })

      const record = (enrolmentId: EnrolmentId, invoiceId: InvoiceId | null): Payment => {
        const payment: Payment = {
          id: mintId<PaymentId>(),
          enrolmentId,
          invoiceId,
          receivedAt: input.receivedAt ?? ctx.now(),
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? '',
        }

        db.payments.push(payment)
        ctx.commit()

        return detach(payment)
      }

      if (!('invoiceId' in input)) {
        findEnrolment(input.enrolmentId)
        return record(input.enrolmentId, null)
      }

      const invoice = findInvoice(input.invoiceId)

      if (invoice.state.status !== 'issued') {
        throw ApiError.conflict(
          `Invoice ${invoice.reference} is ${invoice.state.status}; only an issued invoice can be paid.`,
        )
      }

      return record(invoice.enrolmentId, invoice.id)
    },

    async removePayment(id) {
      await ctx.network.roundTrip()

      const index = db.payments.findIndex(it => it.id === id)

      if (index === -1)
        throw ApiError.notFound('payment', id)

      db.payments.splice(index, 1)
      ctx.commit()
    },

    async enrolmentBalance(id) {
      await ctx.network.roundTrip()
      return balanceOf(id)
    },

    async studentBalance(id) {
      await ctx.network.roundTrip()

      const student = db.students.find(it => it.id === id)

      if (!student)
        throw ApiError.notFound('student', id)

      return deriveStudentBalance(id, enrolmentIdsOf(id).map(balanceOf))
    },

    async debtors(query: DebtorQuery = {}) {
      await ctx.network.roundTrip()

      const now = ctx.now()
      const minOutstanding = query.minOutstanding ?? ONE_CENT

      const rows = db.students
        .filter(student => matchesSearch(
          query.search,
          student.firstName,
          student.lastName,
          student.email,
        ))
        .map((student): DebtorListItem => {
          const enrolments = db.enrolments.filter(it => it.studentId === student.id)
          const balance = deriveStudentBalance(student.id, enrolments.map(it => balanceOf(it.id)))

          const open = enrolments
            .flatMap(enrolment => settleInvoices(
              db.invoices.filter(it => it.enrolmentId === enrolment.id),
              db.payments.filter(it => it.enrolmentId === enrolment.id),
              now,
            ))
            .filter(settlement => settlement.outstanding > ZERO)

          return {
            studentId: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            outstanding: balance.outstanding,
            overdue: balance.overdue,
            oldestDueAt: open
              .map(it => it.dueAt)
              .sort((a, b) => a.localeCompare(b))[0] ?? null,
            openInvoiceCount: open.length,
            licenceClasses: enrolments
              .filter(it => balance.perEnrolment
                .some(row => row.enrolmentId === it.id && row.outstanding > ZERO))
              .map(it => it.licenceClass),
          }
        })
        .filter(row => row.outstanding >= minOutstanding)
        .filter(row => !query.overdueOnly || row.overdue > ZERO)

      // Worst debt first: whoever is furthest past due, then whoever owes most.
      return rows.sort((a, b) => b.overdue - a.overdue || b.outstanding - a.outstanding)
    },
  }
}

function addDays(instant: IsoDateTime, days: number): IsoDateTime {
  return addMinutes(instant, days * MINUTES_PER_DAY)
}
