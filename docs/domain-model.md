# Domain model

The entities, their relationships and their lifecycles. Vocabulary is defined once in
[CONTEXT.md](../CONTEXT.md); this document describes how those terms relate. The types that encode
it live in `src/shared/domain/`.

Settled by [Domain model & ubiquitous language (#2)](https://github.com/LouisLP/driving-school/issues/2).

## Shape

```
Student 1 ──── * Enrolment * ──── 1 LicenceClass (value, not entity)
                   │
                   │ 1
                   │
                   * (practical, exam)      * (theory, via Attendance)
                   └──────── Appointment ────────┘
                                  │ 1
                                  ├── 1 Instructor      always
                                  ├── 0..1 Vehicle      practical always, practical exam always
                                  └── 0..1 Location     theory & exam always, practical optional
```

Everything a student does hangs off an **Enrolment**, never off the Student directly. That is the
single structural decision the rest of the model follows from: a student who takes `B` and later
`A` is one person with two independent training histories, two progress counters and two bills.

## Entities

### Student

A person record and nothing more: identity, contact details, address, date of birth, free-text
notes, and when they first appeared. Deliberately has **no status field**.

`StudentStanding` is derived from the student's enrolments:

| Standing   | When                                                     |
| ---------- | -------------------------------------------------------- |
| `prospect` | No enrolments, or every enrolment is still `enquiring`   |
| `active`   | Any enrolment is `active` or `paused`                     |
| `alumnus`  | Not active, and any enrolment has `passed`                |
| `lapsed`   | Every enrolment is `withdrawn`                            |

Deriving rather than storing means there is no second state to keep in sync — the CRM list filter
and the student's own record can never disagree. `deriveStudentStanding` is a pure function in
`student.utils.ts`, and is the natural first unit test in the codebase.

### Enrolment

One student's training toward one licence class. Owns the training's status, its dates, and (later)
whatever finance attaches to it.

```
enquiring ──► active ──► passed
    │           │  ▲
    │           │  └── paused
    └───────────┴──► withdrawn
```

- `enquiring` — enquiry taken, nothing booked yet. Contributes a `prospect` standing.
- `active` — training under way.
- `paused` — temporarily halted (money, injury, moved away) but expected back. Still counts as
  active for CRM purposes; kept distinct so the planner can grey them out.
- `passed` — practical exam passed. Terminal.
- `withdrawn` — gave up or was let go. Terminal.

`passed` and `withdrawn` set `closedAt`. A terminal enrolment can never re-open — a returning
student gets a new enrolment.

### Appointment

One entity, three kinds, discriminated on `kind`. The planner grid, conflict detection, the
calendar and the "what happened this week" queries all operate on a single collection.

Every appointment, regardless of kind, has:

- **an instructor** — exactly one, always. This is what makes the planner's instructor-column
  layout total and gives conflict detection something to key on for every kind.
- **a time range** — `startsAt` plus `durationMinutes`. Start-plus-duration rather than
  start-and-end because 45 minutes is the unit the school actually sells; the end instant is
  derived.
- **an outcome** — the lifecycle, below.

Kind-specific:

| Kind        | Students                       | Vehicle           | Location             |
| ----------- | ------------------------------ | ----------------- | -------------------- |
| `practical` | exactly one enrolment          | required          | optional meeting point |
| `theory`    | many, via `Attendance` rows    | none              | required (a room)    |
| `exam`      | exactly one enrolment          | practical exam only | required           |

Vehicle and location are **not** required on the base type. Making them optional-everywhere would
let a theory class carry a car; requiring them everywhere would force a dummy vehicle onto a theory
exam. Putting them on the variants that need them makes both mistakes unrepresentable.

#### Appointment outcome

```
planned ──► completed        → billable
        ├─► cancelled        → billable iff cancelled late
        └─► noShow           → billable
```

Modelled as a nested discriminated union so the fields only exist where they mean something:
`completed` carries `completedAt`, `cancelled` carries `cancelledAt` and `cancelledBy`, `noShow`
carries `recordedAt`. Finance needs `cancelledAt` to tell a three-weeks-out cancellation from a
same-day one; `noShow` stays distinct from `cancelled` because a school bills them under different
rules.

`completed` is what makes an appointment invoiceable. How that becomes a line item is not settled
here — money modelling is a later ticket.

#### Attendance

A theory appointment holds `attendees: Attendance[]`, each a `{ enrolmentId, status }` pair with
status `registered | attended | absent | excused`. Per-person outcome matters: one student missing
a theory night must not mark the whole class absent, and their progress counter must not advance.

Practical and exam appointments carry a bare `enrolmentId` instead — a driving lesson with two
students is not a thing, and the type should say so.

### Instructor

Name, contact, employment dates, and `teachableClasses` — the licence classes they may teach.
An instructor with `employedUntil` in the past is a leaver: still referenced by historical
appointments, never offered for new ones.

### Vehicle

Licence plate, make, model, transmission, and `suitableFor` — the licence classes it may be used
for. `retiredAt` retires it from new bookings without erasing its history.

Both sides carrying licence classes (rather than a vehicle *category* mapped through a lookup
table) keeps the mismatch rule readable as one line of domain logic:

```
isLicenceClassMatched = instructor.teachableClasses.includes(cls)
                     && vehicle.suitableFor.includes(cls)
```

### Location

A named place with an address and a kind — `branch`, `classroom`, `meetingPoint` or `examCentre`.

### Licence class

A closed union of official EU codes (`AM`, `A1`, `A2`, `A`, `B`, `BE`, `C1`, `C`, `CE`, `D1`, `D`,
`L`, `T`, …), not an entity. They are stable, externally defined, and being a union buys
exhaustiveness checking and typed i18n keys.

What the school *does* with them is configuration: `LicenceClassOffering` records whether a class
is currently taught and the minimum training it requires. Editing an offering is a school setting;
inventing a licence class is not something a driving school can do.

## Conventions these types follow

- **Branded ids.** `StudentId`, `EnrolmentId` etc. are branded strings, so `getStudent(vehicle.id)`
  does not compile. Free at runtime; UUID strings underneath.
- **Branded ISO time.** `IsoDateTime` for instants, `IsoDate` for calendar days. They survive a
  round trip through `localStorage` unchanged, stay comparable with `<`, and `Date` objects are
  constructed only at the formatting edge.
- **Unions over booleans and optionals.** Where two fields only make sense together, they live in
  the same union member.
- **Persisted shape only.** These are the entities as stored behind the fake-API seam. View models,
  form state and denormalised planner rows belong to the features that need them.

## Deliberately not settled here

- **Money** — prices, invoices, payments, balances, and the rule turning a completed appointment
  into a line item.
- **Conflict detection** — the full rule set and how conflicts are surfaced in the planner. Only
  the data the rules read is fixed here.
- **Instructor availability & opening hours** — the shape of working hours, absences and holidays.
- **Progress requirements** — how many lessons and special drives each licence class demands, and
  how "ready for the exam" is computed.
