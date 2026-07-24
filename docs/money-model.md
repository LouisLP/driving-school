# Money model

Prices, invoices, payments and balances. Vocabulary is defined once in [CONTEXT.md](../CONTEXT.md);
the entities it hangs off are in [docs/domain-model.md](./domain-model.md). The types that encode
it live in `src/shared/domain/` (`money.*`, `pricing.types.ts`, `billing.*`), and the seam that
serves it in `src/shared/api/contracts/billing.contract.ts`.

Settled by [Money modelling: prices, invoices, payments (#12)](https://github.com/LouisLP/driving-school/issues/12).

**Scope:** realistic-looking, not compliant. No VAT breakdown, no gapless sequential numbering, no
GoBD-style immutable journal. Those are the parts of German invoicing that are pure ceremony to
imitate, and none of them changes the shape of anything below.

## Shape

```
LicenceClassOffering ── prices ──► PriceList
                                      │ copied when the enrolment is created
                                      ▼
                    Enrolment ── agreedPrices ──► AgreedPrices
                        │ 1
          ┌─────────────┼──────────────┐
          │ *           │ *            │ derived, never stored
       Invoice       Payment      BillableItem ◄── Appointment.outcome
          │ *
     InvoiceLine  (a BillableItem, frozen)
```

Everything money attaches to the **enrolment**, never to the student. That is the same structural
decision the rest of the domain follows: a student training for `B` and later `BE` has two agreed
price lists, two sets of invoices and two balances, and the student page is where they are added
back up.

## Money

`Money` is a **whole number of euro cents**, branded.

```ts
type Money = Brand<number, 'Money'>
const CURRENCY = 'EUR'
```

Integer minor units because floats cannot hold `62.90` and a school hits that on its first
invoice. Branded because a bare `number` is also a duration, a quantity and a lesson count — and
because the brand forces arithmetic through `money.utils.ts` instead of letting `total / 100` and
`amount * 1.19` appear in a component. It costs nothing at runtime and survives `localStorage`
unchanged.

The currency is a **constant, not a field**. One German school billing German students in euros
would gain nothing from a `{ amount, currency }` pair except a mismatch branch in every addition
guarding a case that cannot happen. `formatMoney(money, locale)` is the only function that knows
the currency exists; if a second one ever appears, the brand is the single seam to change because
every call site already funnels through the utilities.

Comparison is left to the ordinary operators — `a < b` on two `Money` values is correct and
readable, so there is no `compareMoney`.

## Prices

A `PriceList` is five numbers, and it lives **on the `LicenceClassOffering`**:

| Field | What it prices |
| ----- | -------------- |
| `basicFee` | Enrolling: paperwork and the theory course. Charged once. |
| `practicalLessonUnit` | One 45-minute unit of an ordinary lesson. |
| `specialDriveUnit` | One 45-minute unit of an overland, autobahn or night drive. |
| `theoryExamFee` | Presenting the student for the official theory test. |
| `practicalExamFee` | Presenting the student for the official practical test. |

Drives are priced **per 45-minute unit** rather than per appointment, because 45 minutes is the
unit the school actually sells: a 90-minute overland drive is two units at one price, not a second
product that can drift out of step with the first. `chargeableUnits` rounds up and never returns
less than one — a lesson cut short is still a lesson the instructor turned up for.

Prices sit on the offering rather than in a separate entity because what a class costs is school
configuration in exactly the way its minimum lesson counts are. One row per licence class, one
screen, one repository — a parallel `PriceListRepository` keyed by the same value would have been
a second config collection to keep aligned with the first.

### Prices are captured at enrolment, not read at invoicing

`Enrolment.agreedPrices` is a **copy** of the offering's price list, taken when the enrolment is
created and stamped with `agreedAt`.

```ts
interface AgreedPrices extends PriceList {
  agreedAt: IsoDateTime
}
```

A price rise in March must not reprice a lesson driven in January, and it must not do so *quietly*
— which is what a lookup at invoicing time would do. Copying also makes the billing rule
replayable: run it again next year over the same calendar and it produces the same numbers, so an
invoice can always be reconstructed from the record rather than having to be believed.

The alternative was a price list versioned by date, with invoices resolving "the price as of
`completedAt`". It buys one thing — a single place to correct a typo in a price — and costs a
temporal join on every line, in a model whose enrolments are the unit of billing anyway. Copying
five numbers per enrolment is not a storage problem.

The seed demonstrates the property rather than describing it: the school raised its prices on
1 January 2025, and Tim's 2024 enrolment still bills at 2024 prices.

## From a completed appointment to money

The domain model settled that `completed` is billable, `noShow` is billable, and `cancelled` is
billable only if late. This is what those words are worth in euros:

```
completed                      → billed at the price of what was taught
noShow                         → same amount, reason `noShow`
cancelled, by student, < 48h   → same amount, reason `lateCancellation`
cancelled, otherwise           → nothing
planned                        → nothing, yet
theory, any outcome            → nothing: the basic fee bought it
```

`billableItemFor(appointment, prices)` is that table, and returns `null` for everything the school
does not charge for.

**Late cancellations and no-shows are reasons, not fees.** They are charged at the price of the
appointment that did not happen, so they need no entry in the price list and cannot fall out of
step with the lesson price. `ChargeReason` carries *why* onto the invoice line, which is what the
student needs to see — a €62 line saying "Nicht erschienen" is a different conversation from a €62
line saying "Fahrstunde".

Only the **student's** cancellations can be late. When the school cancels — a sick instructor, a
car off the road — nothing is charged however short the notice, which is the entire reason
`cancelledBy` exists on the outcome. The window is `LATE_CANCELLATION_NOTICE_HOURS = 48`, a domain
constant rather than a field on the price list: it is the school's terms of business, identical
across licence classes, and a student who cancels late is not owed a discount for having enrolled
before the terms were written.

A failed exam is still charged. The school presented the student either way.

### Billable items are derived, never stored

A `BillableItem` is a function of an appointment's outcome and the enrolment's agreed prices, both
of which are already recorded. Writing a charge row when a lesson is completed would create a
second copy of the calendar that has to be kept in step with the first — the same reason
`StudentStanding` is computed rather than kept. Correcting an outcome corrects the bill, with no
reconciliation step.

An item becomes durable at exactly one moment: when it is **copied onto an invoice**. From then on
it is an `InvoiceLine` — the same shape, frozen — and nothing that happens to the appointment or
the price list can change it.

What has already been billed is read off the invoices themselves: an item is unbilled if no
non-void invoice for that enrolment carries its `appointmentId` (or, for the basic fee, its
reason). There is no `isInvoiced` flag on anything, so there is nothing to get out of step.

## Invoices

**Not per lesson, and not on a monthly cron.** Per-lesson invoices would mean thirty invoices for
one `B` licence and thirty payments to chase; a monthly batch job is a scheduler this app does not
have and a real back office overrides anyway. Instead the office **draws a line when it wants to**:
`createDraft({ enrolmentId, upTo? })` sweeps up everything unbilled — optionally only what happened
before a cut-off — into one invoice. Running it monthly is a habit, not a rule the model enforces.

```ts
interface Invoice {
  id: InvoiceId
  enrolmentId: EnrolmentId
  reference: string // '2026-0007' — quotable, unique, not a legal sequence
  createdAt: IsoDateTime
  state: InvoiceState
  lines: readonly InvoiceLine[]
  total: Money // the sum of the lines, frozen with them
}

type InvoiceState
  = | { status: 'draft' }
    | { status: 'issued', issuedAt: IsoDateTime, dueAt: IsoDateTime }
    | { status: 'void', issuedAt: IsoDateTime | null, voidedAt: IsoDateTime, reason: string }
```

The state is a discriminated union for the same reason `AppointmentOutcome` is: a draft has no
issue date and only a void invoice has a reason, so those fields should not exist on the variants
where they would be `null`.

**There is no `paid` status.** Whether an invoice is settled is read from its payments, and whether
it is overdue from its due date and the clock. A stored flag would be a third copy of a fact the
money already states, and the first thing to go stale when a payment is corrected.

**Issued invoices are never edited.** Correcting a bill is `voidInvoice(id, reason)` followed by a
fresh draft — which is also the only way a real school is allowed to do it. Voiding puts the lines
back in the unbilled pool and drops any payment against it back to being on account, so the money
received is never lost. Drafts are the one thing here that can be deleted: nobody has seen them.

## Payments

```ts
interface Payment {
  id: PaymentId
  enrolmentId: EnrolmentId
  invoiceId: InvoiceId | null // null = taken on account
  receivedAt: IsoDateTime
  amount: Money // always positive
  method: 'cash' | 'bankTransfer' | 'card' | 'directDebit'
  reference: string
}
```

A payment names either the invoice it settles or the enrolment it sits against — the `NewPayment`
input is a union so that "money received against nothing" cannot be expressed. The nullable
`invoiceId` is what makes the counter deposit representable: a student hands over €300 on day one,
before anything has been billed, and that money has to count immediately.

A full allocation table (one payment split across several invoices) was the alternative. It is
what a real ledger does and it is what this school does not need: the office takes one payment per
invoice plus the occasional deposit, and an allocation table would add a join and a UI for a case
that does not arise.

Instead, allocation is a **derivation**. `settleInvoices` applies direct payments to the invoice
they name, then spreads whatever is left — deposits, overpayments, money whose invoice was later
voided — across the unsettled invoices **oldest due date first**. That is what a bookkeeper does by
hand, and it is what stops a student with a deposit on file appearing on the debtors list.

An overpayment does not settle the invoice that received it beyond its total: the excess becomes
credit on the enrolment and flows to the next bill.

Refunds are not modelled. Amounts are positive, and a refund would be the first thing to add.

## Balances and debtors

```ts
interface EnrolmentBalance {
  enrolmentId: EnrolmentId
  invoiced: Money // issued invoices only — drafts and voids are not money owed
  paid: Money // every payment on the enrolment
  outstanding: Money // invoiced − paid; negative means the student is in credit
  overdue: Money // the part of outstanding sitting on invoices past their due date
  uninvoiced: Money // work delivered and not yet billed
}
```

Every number is read at the moment it is asked for. A stored balance is a cache of two collections
that both change, and keeping it right is a bug farm with no upside in an app whose whole database
fits in memory.

`uninvoiced` is deliberately **not** part of `outstanding`: nobody owes money they have not been
billed for. It is what the office is about to bill, and it is the number that makes "this student
has had eleven lessons and seen no invoice" visible before it becomes a debt.

`StudentBalance` sums the enrolments and keeps the rows it summed, so the account page shows one
number and its parts without asking twice and getting two answers.

**The debtors list is a read model at the seam.** Assembling it above the seam would mean fetching
every invoice and every payment in the school to render one screen, which is exactly the N+1 the
API-seam rule exists to prevent. `DebtorListItem` carries the student, what they owe, what is
overdue, the oldest due date, how many invoices are open and which licence classes the debt was run
up on. It is sorted worst-first: furthest past due, then largest debt.

## The seam

One repository, `api.billing`, rather than separate `invoices` and `payments` ones. They are a
single aggregate — a payment is meaningless without the invoice or enrolment it applies to, and a
balance is not a stored thing at all but a reading over the pair — so splitting them would put
`enrolmentBalance` on a coin flip. Its full shape is in
`src/shared/api/contracts/billing.contract.ts`.

The write vocabulary is the domain's: `createDraft`, `issueInvoice`, `voidInvoice`,
`recordPayment`. There is no `updateInvoice`, because there is no honest thing it could mean.

## Deliberately not settled here

- **VAT.** German driving-school training is largely VAT-exempt, and the parts that are not would
  need a rate per line and a gross/net split. Out of scope by the project map.
- **Refunds and credit notes.** Payments are positive; a withdrawal mid-training that owes money
  back has no shape yet.
- **Dunning.** The debtors list is the data a reminder run would read; when a reminder was sent,
  and at what level, is not recorded.
- **Packages and discounts.** Every price is a unit price; there is no "ten lessons for the price
  of nine", and no per-student discount.
- **Instructor pay.** Money out of the school is a different model entirely.
