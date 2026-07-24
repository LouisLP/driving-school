# Driving School Back-Office

The single implicit driving school's own administration: who it teaches, who teaches for it,
what it teaches them in, and when that happens. One context — CRM, scheduling and finance all
speak the same language and share the same entities.

The relationships, cardinalities and lifecycles behind these terms are in
[docs/domain-model.md](./docs/domain-model.md); the money ones in
[docs/money-model.md](./docs/money-model.md), the training ones in
[docs/training-model.md](./docs/training-model.md). This file is the glossary and nothing else.

## People

**Student**:
A person the school trains. A permanent person record — name, contact details, address, date of
birth — with no status of its own; a student's standing is read from their enrolments.
_Avoid_: Pupil, learner, client, customer, driver

**Instructor**:
A member of teaching staff who may hold appointments, qualified for a specific set of licence
classes. "Professional Drivers" is the display label of the nav section that lists them; it is a
UI string only and never a type, folder or key name.
_Avoid_: Professional driver, teacher, trainer, employee, staff member

**Student Standing**:
A student's current relationship with the school — prospect, active, alumnus or lapsed —
computed from their enrolments rather than stored. What the CRM list filters on.
_Avoid_: Student status, student state

## Training

**Licence Class**:
An EU driving licence category the school can teach, identified by its official code (`B`, `BE`,
`A2`, `C`, …). A fixed, closed vocabulary — the school chooses which ones it offers, not what
they are called.
_Avoid_: Licence type, category, class, permit

**Licence Class Offering**:
The school's own configuration for one licence class — whether it is currently taught, the minimum
training it requires, and what it costs. Belongs to the school, not to any student.
_Avoid_: Course, programme, product

**Enrolment**:
One student's training toward one licence class, from first enquiry to pass or withdrawal. The
unit of progress and the unit of billing: appointments and invoices attach to an enrolment, never
to a student directly. A student pursuing `B` and then `A` has two enrolments.
_Avoid_: Registration, signup, course, contract, training

**Training Requirements**:
How much training one licence class demands before its exams may be sat — standard practical units,
the mandated special drives per type, and theory lessons by scope. Configuration on the licence
class offering, seeded from the legal minimums, and read live rather than frozen onto an enrolment.
_Avoid_: Minimums, curriculum, syllabus, quota, lesson plan

**Training Record**:
What one enrolment has actually completed, counted from its appointments in the same units its
requirements are stated in. Derived, never stored.
_Avoid_: Progress (as the type), history, transcript, tally

**Exam Readiness**:
Whether an enrolment may sit each of its two exams, as a per-requirement breakdown rather than a
verdict. Advisory: it warns, it never blocks a booking.
_Avoid_: Eligibility, completion, qualified, exam clearance

## Scheduling

**Appointment**:
A block of time on the school's calendar, held by exactly one instructor. Every scheduled thing
is an appointment — a practical lesson, a theory class and an exam are all appointments,
distinguished by their kind.
_Avoid_: Booking, event, session, slot, lesson (as the general term)

**Practical Appointment**:
An appointment where one enrolled student drives, with a vehicle. The kind of appointment the
school sells in 45-minute units.
_Avoid_: Driving lesson, practical lesson, drive

**Theory Appointment**:
An appointment where many enrolled students attend a classroom session on a numbered theory
topic. Has a capacity and a room; has no vehicle.
_Avoid_: Theory lesson, class, lecture, seminar

**Exam Appointment**:
An appointment at which one enrolled student sits the official theory or practical test. Occupies
the instructor (and, for a practical exam, a vehicle) exactly as a lesson does.
_Avoid_: Test, assessment, check ride

**Attendance**:
One student's participation in a theory appointment, recorded per person so a single absence does
not cancel the class.
_Avoid_: Participant, attendee record, registration

**Special Drive**:
A practical appointment of a legally-mandated type — overland, autobahn or night — as opposed to
a standard drive. Counted separately toward an enrolment's requirements.
_Avoid_: Sonderfahrt, mandatory drive, special lesson

## Money

**Money**:
An amount, held as a whole number of euro cents. The school trades in euros only, so the currency
is a constant read at the formatting edge rather than a field on every amount.
_Avoid_: Amount, price (as the general term), cents, total

**Price List**:
What the school charges for one licence class: a basic fee, a price per 45-minute lesson unit, a
price per special-drive unit, and a fee for presenting a student at each exam. Configuration, held
on the licence class offering.
_Avoid_: Tariff, rate card, pricing, fees

**Agreed Prices**:
The copy of a price list an enrolment was signed up at, frozen for its lifetime. Later price rises
apply to new enrolments only, so an invoice never reprices training already delivered.
_Avoid_: Quote, contract price, locked price, price snapshot

**Billable Item**:
One chargeable thing that happened, priced and not yet billed — a completed lesson, a no-show, a
late cancellation, an exam, or the basic fee itself. Computed from the calendar, never stored.
_Avoid_: Charge, fee, billing entry, transaction

**Invoice**:
A bill for one enrolment: frozen lines, a total, and a state of draft, issued or void. Never
edited once issued — a wrong bill is voided and redrawn.
_Avoid_: Bill, receipt, statement, Rechnung

**Invoice Line**:
One billable item as copied onto an invoice, carrying why it was charged, how many units, and at
what unit price.
_Avoid_: Line item, entry, position, row

**Payment**:
Money received, recorded against an enrolment and usually against one invoice. A payment naming no
invoice is money taken on account, and is spread across invoices oldest due date first.
_Avoid_: Transaction, receipt, settlement, deposit (as the general term)

**Balance**:
What an enrolment or a student owes: what has been invoiced, what has been paid, what is
outstanding, what is overdue, and what has been delivered but not yet billed. Computed from
invoices and payments, never stored.
_Avoid_: Account, ledger, debt, statement

**Debtor**:
A student whose balance is outstanding across all their enrolments. The finance list, sorted by
who is furthest past due.
_Avoid_: Defaulter, late payer, arrears, outstanding customer

## Assets

**Vehicle**:
A car, motorcycle or truck the school owns and teaches in, identified by its licence plate and
carrying the set of licence classes it is suitable for.
_Avoid_: Car, auto, fleet item, asset

**Location**:
A physical place the school uses — a branch, a classroom, a meeting point or an exam centre.
_Avoid_: Site, venue, branch (as the general term), address

## Conflicts

**Conflict**:
A reason an appointment may not be scheduled as proposed — a double-booked instructor or vehicle,
an unavailable instructor, or a licence-class mismatch. Detected and shown to the planner; never
resolved automatically.
_Avoid_: Clash, collision, error, violation

**Licence-Class Match**:
The rule that a practical appointment's instructor must be qualified for, and its vehicle
suitable for, the licence class of the enrolment being taught.
_Avoid_: Compatibility, eligibility, qualification check
