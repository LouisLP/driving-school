import type { EnrolmentId, StudentId } from '@/shared/domain'
import { describe, expect, it } from 'vitest'
import { fromEuros, ZERO } from '@/shared/domain'
import { isApiError } from '../api.error'
import { createFakeApi } from './create-fake-api'
import { seedDatabase } from './seed'

const LENA = 'stu-01' as StudentId
const LENA_B = 'enr-01' as EnrolmentId
const MIA_B = 'enr-03' as EnrolmentId

function createApi() {
  return createFakeApi(seedDatabase(), { latencyMs: 0 })
}

async function failureOf(promise: Promise<unknown>) {
  const result = await promise.catch((error: unknown) => error)
  return isApiError(result) ? result : null
}

describe('billing repository', () => {
  it('prices unbilled work from the enrolment, oldest first', async () => {
    const api = createApi()
    const items = await api.billing.billableItems(MIA_B)

    // A pure enquiry has driven nothing, so only the fee for enrolling is owed.
    expect(items.map(it => it.reason)).toEqual(['basicFee'])

    const enrolment = await api.enrolments.get(MIA_B)
    expect(items[0]?.amount).toBe(enrolment.agreedPrices.basicFee)
  })

  it('never offers the same work twice', async () => {
    const api = createApi()
    const before = await api.billing.billableItems(LENA_B)
    const draft = await api.billing.createDraft({ enrolmentId: LENA_B })
    const after = await api.billing.billableItems(LENA_B)

    expect(draft.lines).toHaveLength(before.length)
    expect(after).toHaveLength(0)
  })

  it('refuses a draft when there is nothing left to bill', async () => {
    const api = createApi()
    await api.billing.createDraft({ enrolmentId: LENA_B })

    expect((await failureOf(api.billing.createDraft({ enrolmentId: LENA_B })))?.kind)
      .toBe('conflict')
  })

  it('bills only up to the cut-off it was given', async () => {
    const api = createApi()
    const all = await api.billing.billableItems(LENA_B)
    const cut = all[1]?.occurredAt

    const draft = await api.billing.createDraft({ enrolmentId: LENA_B, upTo: cut })

    expect(draft.lines).toHaveLength(1)
    expect(draft.lines.every(line => line.occurredAt < cut!)).toBe(true)
  })

  it('keeps a draft out of the balance until it is issued', async () => {
    const api = createApi()
    const draft = await api.billing.createDraft({ enrolmentId: MIA_B })

    const before = await api.billing.enrolmentBalance(MIA_B)
    expect(before.invoiced).toBe(ZERO)
    expect(before.uninvoiced).toBe(ZERO)

    await api.billing.issueInvoice(draft.id)
    const after = await api.billing.enrolmentBalance(MIA_B)

    expect(after.invoiced).toBe(draft.total)
    expect(after.outstanding).toBe(draft.total)
  })

  it('refuses to issue the same invoice twice', async () => {
    const api = createApi()
    const draft = await api.billing.createDraft({ enrolmentId: MIA_B })
    await api.billing.issueInvoice(draft.id)

    expect((await failureOf(api.billing.issueInvoice(draft.id)))?.kind).toBe('conflict')
  })

  it('settles an issued invoice with a payment against it', async () => {
    const api = createApi()
    const draft = await api.billing.createDraft({ enrolmentId: MIA_B })
    const invoice = await api.billing.issueInvoice(draft.id)

    await api.billing.recordPayment({
      invoiceId: invoice.id,
      amount: invoice.total,
      method: 'cash',
    })

    const balance = await api.billing.enrolmentBalance(MIA_B)

    expect(balance.paid).toBe(invoice.total)
    expect(balance.outstanding).toBe(ZERO)
  })

  it('refuses to take money against a draft', async () => {
    const api = createApi()
    const draft = await api.billing.createDraft({ enrolmentId: MIA_B })

    const failure = await failureOf(api.billing.recordPayment({
      invoiceId: draft.id,
      amount: fromEuros(50),
      method: 'cash',
    }))

    expect(failure?.kind).toBe('conflict')
  })

  it('rejects a payment of nothing', async () => {
    const api = createApi()

    const failure = await failureOf(api.billing.recordPayment({
      enrolmentId: MIA_B,
      amount: ZERO,
      method: 'cash',
    }))

    expect(failure?.kind).toBe('validation')
    expect(failure?.fieldErrors?.amount).toBe('shared.validation.notPositive')
  })

  it('takes money on account before anything is invoiced', async () => {
    const api = createApi()

    await api.billing.recordPayment({
      enrolmentId: MIA_B,
      amount: fromEuros(200),
      method: 'cash',
      reference: 'Anzahlung',
    })

    const balance = await api.billing.enrolmentBalance(MIA_B)

    expect(balance.paid).toBe(fromEuros(200))
    expect(balance.outstanding).toBe(fromEuros(-200))
  })

  it('makes voided lines billable again and leaves the money on account', async () => {
    const api = createApi()
    const invoice = await api.billing.issueInvoice(
      (await api.billing.createDraft({ enrolmentId: MIA_B })).id,
    )

    await api.billing.recordPayment({
      invoiceId: invoice.id,
      amount: invoice.total,
      method: 'cash',
    })

    const voided = await api.billing.voidInvoice(invoice.id, 'billed the wrong class')

    expect(voided.state.status).toBe('void')
    expect((await api.billing.billableItems(MIA_B)).map(it => it.reason)).toEqual(['basicFee'])

    const balance = await api.billing.enrolmentBalance(MIA_B)

    expect(balance.invoiced).toBe(ZERO)
    expect(balance.paid).toBe(invoice.total)
  })

  it('deletes a draft but never an issued invoice', async () => {
    const api = createApi()
    const draft = await api.billing.createDraft({ enrolmentId: MIA_B })

    await api.billing.removeDraft(draft.id)
    expect((await failureOf(api.billing.getInvoice(draft.id)))?.kind).toBe('notFound')

    const issued = await api.billing.issueInvoice(
      (await api.billing.createDraft({ enrolmentId: MIA_B })).id,
    )

    expect((await failureOf(api.billing.removeDraft(issued.id)))?.kind).toBe('conflict')
  })

  it('adds up a student\'s enrolments into one balance', async () => {
    const api = createApi()
    const balance = await api.billing.studentBalance(LENA)
    const perEnrolment = await api.billing.enrolmentBalance(LENA_B)

    expect(balance.perEnrolment).toHaveLength(1)
    expect(balance.outstanding).toBe(perEnrolment.outstanding)
  })

  it('lists debtors worst first, and only those who owe', async () => {
    const api = createApi()
    const debtors = await api.billing.debtors()

    expect(debtors.length).toBeGreaterThan(0)
    expect(debtors.every(it => it.outstanding > ZERO)).toBe(true)

    const overdue = debtors.map(it => it.overdue)
    expect([...overdue].sort((a, b) => b - a)).toEqual(overdue)

    // Jonas paused his training owing the school's oldest debt.
    expect(debtors[0]?.firstName).toBe('Jonas')
    expect(debtors[0]?.oldestDueAt).not.toBeNull()
  })

  it('leaves a student who paid a deposit off the debtors list', async () => {
    const api = createApi()
    const debtors = await api.billing.debtors()

    // Hannah's counter deposit is on account with nothing billed against it yet.
    expect(debtors.some(it => it.firstName === 'Hannah')).toBe(false)
  })

  it('filters debtors down to the overdue ones', async () => {
    const api = createApi()
    const overdue = await api.billing.debtors({ overdueOnly: true })

    expect(overdue.every(it => it.overdue > ZERO)).toBe(true)
  })

  it('finds every invoice a student holds, across enrolments', async () => {
    const api = createApi()
    const invoices = await api.billing.listInvoices({ studentId: LENA })

    expect(invoices.length).toBeGreaterThan(0)
    expect(invoices.every(it => it.enrolmentId === LENA_B)).toBe(true)
  })

  it('hands out copies, not the database\'s own records', async () => {
    const api = createApi()
    const invoice = (await api.billing.listInvoices())[0]!

    invoice.reference = 'tampered'

    expect((await api.billing.getInvoice(invoice.id)).reference).not.toBe('tampered')
  })
})
