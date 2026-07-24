# Training model

How much training a licence class demands, and how "ready to sit the test" is computed from an
enrolment's appointments. Vocabulary is defined once in [CONTEXT.md](../CONTEXT.md); the entities it
hangs off are in [docs/domain-model.md](./domain-model.md), the money beside it in
[docs/money-model.md](./money-model.md). The types live in `src/shared/domain/training.*`.

Settled by
[Progress & exam readiness (#21)](https://github.com/LouisLP/driving-school/issues/21).

**Scope:** realistic-looking, not compliant — the same line the money model draws. The shape below
is the real shape (per-class, per-drive-type counts; theory split by scope; readiness as a
breakdown). The numbers in `LEGAL_TRAINING_MINIMUMS` are the real ones for `B` and the A family and
plausible ones elsewhere, because this file is a seed table, not a legal source.

## Shape

```
LEGAL_TRAINING_MINIMUMS[licenceClass]          the law, as a default
            │ seeded once
            ▼
LicenceClassOffering ── requirements ──► TrainingRequirements
                                              │ read live, never frozen
Enrolment ── appointments ──► TrainingRecord   │
                                   └──────────┴──► deriveExamReadiness ──► ExamReadiness
```

Two symmetric shapes and one comparison. `TrainingRequirements` is what the class demands,
`TrainingRecord` is what this enrolment has done, and they carry the **same fields in the same
units** — plus, on the record, the one thing that is a milestone rather than a count. So readiness
is a field-by-field zip, not a rule per requirement, and adding a requirement means adding one
field to both and one line to the derivation.

## What a class demands

```ts
interface TrainingRequirements {
  standardPracticalUnits: number
  specialDriveUnits: Record<'overland' | 'autobahn' | 'night', number>
  basicTheoryLessons: number
  classSpecificTheoryLessons: number
}
```

Four decisions are in those four fields.

**Practical is counted in 45-minute units, theory in lessons.** The unit the school sells is the
unit the law counts special drives in, so a 90-minute overland drive is two units toward the five
that `B` demands — not one drive out of five. Theory is one lesson per appointment whatever its
length, because a theory appointment is a numbered topic and you cannot sit half of one. This
replaces the old `minimumPracticalAppointments`, which counted the wrong thing: "twelve
appointments" is satisfied by twelve 45-minute lessons and by twelve 90-minute ones, and those are
not the same training or the same invoice.

**The three special drives are three counts, never a total.** Overland, autobahn and night are
different skills with different mandated numbers, and a student with eight overland drives and no
night drive has not done "eight of twelve". A single number would make the enrolment card able to
show a full bar for a student who may not sit the test.

**Theory splits basic and class-specific**, because `TheoryTopic.scope` already does. A student who
has sat fourteen basic lessons and no class-specific one has finished neither course, and one total
of fourteen cannot say so. It also makes the extension classes expressible: `BE` demands no basic
course at all from a student who holds `B`, and that is `basicTheoryLessons: 0` rather than a
special case.

**`standardPracticalUnits` is school policy, not law.** This is the asymmetry that decided where
the whole structure lives. No EU class mandates a number of ordinary practical lessons — how many a
student needs is the instructor's judgement — so the legal minimum is zero for every class, and the
number on the offering is the school's own answer to *when will we present someone*. The mandated
counts, by contrast, are the law's and the school does not get a view.

### So requirements are configuration, seeded from a constant

Both of those are true at once, and holding one structure two ways would be worse than either. So:
`LEGAL_TRAINING_MINIMUMS` is a `Record<LicenceClass, TrainingRequirements>` with the mandated counts
and a zero standard-lesson figure; the offering holds an **editable copy**, seeded from it, with the
school's own standard figure filled in.

The alternative — read the mandated counts from the constant at derivation time and keep only the
house number on the offering — is tidier right up to the morning the regulation changes, or the
morning someone notices a wrong figure in the table. Then it is a code deploy to fix a number that
the office knows and the developer does not. Requirements are configuration for the same reason
prices are, and they are edited on the same screen; the difference is only that these start from a
table rather than from zero.

### Not frozen onto the enrolment — the deliberate opposite of `agreedPrices`

An enrolment freezes its prices (`agreedPrices`) and does **not** freeze its requirements. That
looks inconsistent and is the point:

- A price is a **promise to the student**. Freezing it is what stops a March price rise repricing a
  lesson driven in January. Only new enrolments get the new number.
- A requirement is a **floor under the school**. If the law raises the night-drive count, a student
  in training must meet the new one; certifying them against last year's rules is precisely the
  thing that must not happen. There is nobody to protect from the change.

So `deriveExamReadiness` reads today's offering, and billing reads the enrolment. Two rules, each
reading the source that is authoritative for what it is deciding. The consequence is that a bar can
go backwards — `3 / 3` becomes `3 / 4` when the school edits the number — and the enrolment card
must be able to render that without treating it as an error. It is not an error; it is the news.

## What an enrolment has done

```ts
interface TrainingRecord {
  standardPracticalUnits: number
  specialDriveUnits: Record<'overland' | 'autobahn' | 'night', number>
  basicTheoryLessons: number
  classSpecificTheoryLessons: number
  isTheoryExamPassed: boolean
}
```

`deriveTrainingRecord(enrolmentId, appointments)` counts it, and the counting rules are the
interesting part:

- **Only `completed` appointments count.** A `noShow` is billable and is not training — the money
  model and this one disagree about the same appointment on purpose. A cancellation is neither.
- **Theory counts per attendance, not per appointment.** One student's absence from a class of
  twelve costs that student the lesson and nobody else, which is the whole reason `Attendance`
  exists per person.
- **`isTheoryExamPassed` needs a `passed` result**, not a sat exam. A failed theory exam leaves the
  practical requirement unmet, which is correct and is what the student is told.

### Projection: what the planner counts

The planner needs a different question answered — *will this student be ready on the day of the exam
I am about to book?* — and a school books its exam slots weeks ahead, before the last drives have
happened. Measuring a booking against lessons already driven would warn on every booking that was
made correctly.

So the record takes one option:

```ts
deriveTrainingRecord(enrolmentId, appointments, { countPlannedBefore: exam.startsAt })
```

which counts `planned` appointments starting before that instant as though they will happen —
including a booked-but-unsat theory exam, since that is the sitting the practical waits on. Still
never no-shows and never cancellations. The enrolment card omits the option and gets the strict
count; the two callers differ by one argument rather than by one function each.

## Readiness

```ts
interface ExamReadiness {
  theory: ExamReadinessGroup
  practical: ExamReadinessGroup
}

interface ExamReadinessGroup {
  examKind: 'theory' | 'practical'
  isMet: boolean
  requirements: readonly TrainingRequirement[]
}

interface TrainingRequirement {
  kind: 'standardPractical' | 'overlandDrive' | 'autobahnDrive' | 'nightDrive'
    | 'basicTheory' | 'classSpecificTheory' | 'theoryExamPassed'
  completed: number
  required: number
  isMet: boolean
  /** `required - completed`, floored at zero. */
  outstanding: number
}
```

**A breakdown, not a boolean.** Every caller wants more than the boolean: the enrolment card draws
one row per requirement, the planner's warning quotes the unmet ones, the instructor rail wants the
outstanding units. A boolean would throw all of that away and make each caller recompute it, in a
place where the rule would then live three times. `isReadyForExam(readiness, 'practical')` is there
for the caller that genuinely only wants the boolean, and `unmetRequirements(group)` is a filter,
not a second derivation.

**Two groups, because the two exams gate independently and in order.** Theory readiness is the
theory course. Practical readiness is the drives *and* a passed theory exam — so that prerequisite
is a **line of the practical group**, `theoryExamPassed`, rather than a field beside it. That is
what lets one list render the whole answer to "why can this student not sit their practical yet",
with the missing theory exam sitting in it as just another unmet line.

**One shape per line, including the milestone.** `theoryExamPassed` is `required: 1` with `completed`
of `0` or `1`. The card renders that line as a tick rather than a bar; that is a presentation
choice, not a second data shape, and it is worth one slightly odd-looking count to keep the array
uniform.

**Overshoot is met, and keeps its true count.** `completed: 14, required: 12, outstanding: 0`. The
card labels the true numbers and caps the bar — `14 / 12` is information, a bar at 117 % is not
(already settled in the Students slice). A zero requirement is met by definition, so `BE`'s absent
night drive is not a permanently unmet line.

## Readiness is advisory

Nothing refuses a booking because a group is unmet. The seam does not reject
`appointments.create` for an exam whose requirements are short, and `enrolments.setStatus` does not
consult readiness.

A hard gate would fire in exactly the situation it is wrong: booking a practical exam for a date
six weeks out, with the last four drives still to be scheduled, is normal practice and the gate
would refuse it. And the school — not this software — is the party the regulator holds responsible
for presenting a student. Software that blocks the office from recording a real booking is software
the office works around.

Instead it lands on the tier the planner's conflict rule set already has: **warning plus a recorded
reason**. Booking an exam for an enrolment whose projected readiness is short raises a warning that
names the unmet requirements, and proceeding records why. That is the honest position — the school
was told, in the words of the specific shortfall, and decided.

## What this makes computable

`outstandingPracticalUnits(readiness)` sums the standard and special shortfalls, excluding the
`theoryExamPassed` line — a student waiting only on a theory exam owes no driving. This is the
number [#11](https://github.com/LouisLP/driving-school/issues/11) wanted for ordering the planner's
instructor rail and settled for "least booked this week" because it was not computable yet.

## The seam

`TrainingRequirements` arrives on the offering, so `offerings.get`/`list` already serve it and
`OfferingPatch` already covers editing it. The fake rejects a negative count with `validation` and
accepts zero — zero is a legal requirement, not an empty field.

The arithmetic is **not** in the seam: `deriveTrainingRecord` and `deriveExamReadiness` are pure
functions in `src/shared/domain/`, unit-tested, and the fake calls them — the same arrangement as
`deriveStudentStanding` and `deriveEnrolmentBalance`, for the same reason. A real backend would
compute this server-side, and when it does, the rule it implements is written down here rather than
reverse-engineered from a Vue component.

The Students slice's `EnrolmentProgress` read model carries the derived `ExamReadiness` alongside
its counts, so the enrolment card renders it without re-deriving anything —
see [docs/students-slice.md](./students-slice.md).

## Deliberately not settled here

- **The reduced basic course for extension enrolments.** A student who already holds a licence owes
  fewer basic theory lessons than a first-timer, and that depends on the *student's* history, not on
  the class — so it cannot be a field on the offering. When it lands it belongs in a derivation over
  the student's earlier passed enrolments, feeding the requirements at the point of comparison. The
  extension classes (`BE`, `CE`, `C1E`, `D1E`, `DE`) already carry `basicTheoryLessons: 0`, which is
  the common case of the same rule.
- **The exact legal table for the heavy classes.** `C`, `CE`, `D` and friends carry plausible
  figures. Correcting them is data entry on the offering screen, which is why they are configuration.
- **Instructor sign-off.** Some schools require the instructor to attest readiness in addition to
  the counts. That is a person's judgement, and it would be a field on the enrolment, not a
  requirement in this structure.
- **Whether a passed practical exam should close the enrolment automatically.** Readiness does not
  touch `EnrolmentStatus`; the transition table stays the seam's.
