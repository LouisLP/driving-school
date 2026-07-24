import type {
  BillableItem,
  EnrolmentBalance,
  EnrolmentId,
  Invoice,
  InvoiceId,
  InvoiceStatus,
  IsoDateTime,
  LicenceClass,
  Money,
  Payment,
  PaymentId,
  PaymentMethod,
  StudentBalance,
  StudentId,
} from '@/shared/domain'

export interface InvoiceQuery {
  enrolmentId?: EnrolmentId
  /** Every invoice of every enrolment this student holds. */
  studentId?: StudentId
  status?: InvoiceStatus
  /** Issued, past due, and not settled. What the reminders run reads. */
  overdueOnly?: boolean
}

export interface PaymentQuery {
  enrolmentId?: EnrolmentId
  studentId?: StudentId
  invoiceId?: InvoiceId
  /** Inclusive; for the "what came in this month" figure. */
  from?: IsoDateTime
  /** Exclusive. */
  to?: IsoDateTime
}

/**
 * A draft is built from the enrolment's unbilled work, not from lines a caller supplies — the
 * price of a lesson is the domain's answer, not a form field. All the office chooses is where to
 * stop.
 */
export interface NewInvoice {
  enrolmentId: EnrolmentId
  /** Bills everything that happened before this instant. Omitted means everything so far. */
  upTo?: IsoDateTime
}

/** Issuing is what makes an invoice money owed, so the due date is decided here. */
export interface InvoiceTerms {
  /** Defaults to `DEFAULT_PAYMENT_TERM_DAYS` after the issue instant. */
  dueAt?: IsoDateTime
}

/**
 * A payment names either the invoice it settles or the enrolment it sits on account against —
 * never neither. Spelled as a union so "money received against nothing" cannot be expressed.
 */
export type NewPayment
  = | { invoiceId: InvoiceId, amount: Money, method: PaymentMethod, receivedAt?: IsoDateTime, reference?: string }
    | { enrolmentId: EnrolmentId, amount: Money, method: PaymentMethod, receivedAt?: IsoDateTime, reference?: string }

export interface DebtorQuery {
  /** Hides the rounding-error debts nobody chases. Defaults to one cent. */
  minOutstanding?: Money
  /** Only students with money on an invoice that is past its due date. */
  overdueOnly?: boolean
  /** Matches name or email, folded like every other search. */
  search?: string
}

/**
 * One row of the debtors list, joined at the seam.
 *
 * Assembling it above the seam would mean fetching every invoice and every payment in the school
 * to render one screen — the query a real backend would refuse to make the client do. So the rule
 * from `docs/api-seam.md` applies and the join happens here.
 */
export interface DebtorListItem {
  studentId: StudentId
  firstName: string
  lastName: string
  /** Across every enrolment the student holds. */
  outstanding: Money
  overdue: Money
  /** Due date of the oldest invoice with money still on it, or null when nothing is due yet. */
  oldestDueAt: IsoDateTime | null
  /** Issued invoices not yet settled. */
  openInvoiceCount: number
  /** The classes the debt was run up on — what the list shows as chips. */
  licenceClasses: readonly LicenceClass[]
}

/**
 * Invoices, the payments that settle them, and the balances read off both.
 *
 * One repository rather than three because they are one aggregate: a payment is meaningless
 * without the invoice or the enrolment it applies to, and a balance is not a stored thing at all
 * but a reading over the pair. Splitting them would put `enrolmentBalance` on a coin-flip.
 *
 * Nothing here recomputes an issued invoice. Lines are frozen when the draft is created, so
 * correcting a bill means `voidInvoice` and a fresh draft — which is also the only way a real
 * school is allowed to do it.
 */
export interface BillingRepository {
  listInvoices: (query?: InvoiceQuery) => Promise<readonly Invoice[]>
  getInvoice: (id: InvoiceId) => Promise<Invoice>
  /**
   * Delivered training that is on no invoice yet, priced at the enrolment's agreed prices and
   * ordered oldest first. What the "bill this student" screen previews before anything is created.
   */
  billableItems: (enrolmentId: EnrolmentId) => Promise<readonly BillableItem[]>
  /** Rejects with `conflict` when there is nothing left to bill. */
  createDraft: (input: NewInvoice) => Promise<Invoice>
  /** Stamps `issuedAt` and `dueAt`. Only a draft can be issued; anything else is a `conflict`. */
  issueInvoice: (id: InvoiceId, terms?: InvoiceTerms) => Promise<Invoice>
  /** The only way to undo an issued invoice — its lines become billable again. */
  voidInvoice: (id: InvoiceId, reason: string) => Promise<Invoice>
  /** Drafts are the one thing here that can be deleted: nothing has seen them. */
  removeDraft: (id: InvoiceId) => Promise<void>

  listPayments: (query?: PaymentQuery) => Promise<readonly Payment[]>
  recordPayment: (input: NewPayment) => Promise<Payment>
  /**
   * Undoes a payment recorded in error — the counter took the same cash twice. The one deletion
   * finance allows, because a payment that never happened is not history worth keeping.
   */
  removePayment: (id: PaymentId) => Promise<void>

  enrolmentBalance: (id: EnrolmentId) => Promise<EnrolmentBalance>
  studentBalance: (id: StudentId) => Promise<StudentBalance>
  debtors: (query?: DebtorQuery) => Promise<readonly DebtorListItem[]>
}
