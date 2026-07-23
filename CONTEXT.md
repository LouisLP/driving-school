# Driving School Back-Office

The single implicit driving school's own administration: who it teaches, who teaches for it,
what it teaches them in, and when that happens. One context — CRM, scheduling and finance all
speak the same language and share the same entities.

The relationships, cardinalities and lifecycles behind these terms are in
[docs/domain-model.md](./docs/domain-model.md). This file is the glossary and nothing else.

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
The school's own configuration for one licence class — whether it is currently taught, and the
minimum training it requires. Belongs to the school, not to any student.
_Avoid_: Course, programme, product

**Enrolment**:
One student's training toward one licence class, from first enquiry to pass or withdrawal. The
unit of progress and the unit of billing: appointments and invoices attach to an enrolment, never
to a student directly. A student pursuing `B` and then `A` has two enrolments.
_Avoid_: Registration, signup, course, contract, training

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
