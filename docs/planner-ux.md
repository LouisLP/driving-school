# Planner calendar UX — prototype findings

Prototype for [Planner calendar UX (#11)](https://github.com/LouisLP/driving-school/issues/11).
Run it with `npm run dev` and open `/prototype/planner`; `←` / `→` or the floating bar switch
variants (`?variant=A|B|C`).

Everything here is a **proposal to react to**, not a decision already taken. The conflict rule set
is the part that is meant to survive; the layout is meant to be argued with.

## The three variants

All three read one week of the seeded school through the real fake-API seam, densified with
prototype-only appointments so the week looks like a working school. Bookings are in memory —
nothing is written back. Times are UTC throughout, matching the seed.

| | A — Resource grid | B — Agenda | C — Overview + demand rail |
|---|---|---|---|
| Layout | Time down, one column per resource | Chronological list, day by day | Week heatmap + one focused day + right rail |
| Resource axis | Instructors ⇄ vehicles toggle | Instructor filter only | Instructors only |
| Week vs day | Day by default; week = weekday columns for one pinned resource | Week is the only view | Week overview always visible, day underneath |
| Booking starts from | Empty time — drag on the grid | A free-slot row — then a form | A **student** in the queue — drag onto the day |
| Drag to move | Yes, anywhere | No | Yes, into the staging rail |
| Conflict stance | Optimistic: warnings land immediately with an undo, blocks refuse mid-drag | Preventive: pickers only offer valid instructors/vehicles, then confirm | Staged: a drop never commits; the rail shows the checklist and arms the button |

Each variant's header comment states its bet in one paragraph. The interesting outcome is probably
a mix — the week heatmap from C over the grid from A, with B's "free slots as rows" available as a
side panel when someone rings up asking when Lena can next drive.

### What the variants agree on, and why

- **One appointment kind per block, coloured by kind** — lesson (blue), theory (indigo), exam
  (amber). A theory class with twenty attendees renders as one block with `n/capacity` on it, not
  twenty rows: the class occupies one instructor for ninety minutes, which is exactly what the grid
  is showing. Who attends is a detail of the block, reachable when you open it.
- **Overlapping blocks share the column width** rather than stacking or hiding — a double-booking
  must be visible as a double-booking.
- **45 minutes is the default duration** — the unit the school sells. Drag defines the rest, snapped
  to 15.
- **Cancelled and no-show appointments stay on the grid**, dimmed and struck through. They are what
  finance bills from.

## The conflict rule set

The line, and the test for any new rule:

> **Blocking** — the appointment could not physically happen, or would be legally invalid if it did.
> No override, ever, because the override would produce a record the school cannot honour.
>
> **Warning** — the school's own policy, a soft resource limit, or a paperwork state. The person at
> the desk knows things the database does not, so the booking goes through with a **reason recorded
> on the appointment**.
>
> *If I override this, is the resulting appointment a lie?* Yes → blocking. No → warning.

| Rule | Verdict | Why |
|---|---|---|
| Instructor double-booked | **Blocking** | One instructor, one place. |
| Vehicle double-booked ("already out") | **Blocking** | Same physical impossibility. |
| Student double-booked | **Blocking** | Cannot drive and sit in the classroom at once. |
| Instructor not qualified for the class | **Blocking** | Voids the training hours. |
| Vehicle not suitable for the class | **Blocking** | Hours in the wrong category do not count. |
| Instructor has left the school | **Blocking** | The record would name someone gone. |
| Vehicle retired from the fleet | **Blocking** | Nothing to drive. |
| Instructor marked absent | Warning | Absence records go stale; the desk knows better. |
| Outside school hours | Warning | Night drives and early exams are real. |
| Theory class over room capacity | Warning | Capacity is a hint; chairs get carried in. |
| Enrolment not `active` | Warning | Trial lessons and same-day paperwork are normal. |
| Automatic vehicle (code 78 restriction) | Warning | May be deliberate — must never be accidental. |
| No gap before/after (tight turnaround) | Warning, off by default | Buffer is `0` until a school asks for one. |

Live in `src/features/planner/prototype/conflicts.ts` as `CONFLICT_RULES`, with the reasoning next
to each entry, and implemented by one pure function, `evaluateConflicts(candidate, context)`.

### How the rules behave

- **Evaluated continuously, not at drop.** `evaluateConflicts` is pure and synchronous so it can run
  on every pointer move: the drag ghost is green / amber / red before you let go. A planner that
  only tells you after the drop makes you undo to find out.
- **Existing appointments are re-checked too.** Every block on the grid is run back through the same
  rule set, so a collision caused by editing a vehicle shows up without anyone dragging anything.
  That is where the seeded Wednesday-14:00 vehicle clash comes from.
- **Blocking is a client-side courtesy, not the enforcement.** The seam re-runs the blocking half on
  write (`schedule` already rejects with `conflict`). The client copy exists for feedback.
- **Warnings demand a reason, not a checkbox.** B uses an acknowledgement plus a free-text reason,
  C requires the reason before the button arms, A puts it in the popover. Whichever wins, the reason
  lands on the appointment's `notes` — an override nobody can see afterwards is a silent one.
- **Prevention beats warning where possible.** B's pickers only offer instructors qualified for the
  student's class and vehicles suitable for it, so two of the blocking rules can never fire from
  that screen. The rules still exist — the API enforces them — but the UI stops asking the user to
  read an error it could have avoided.

## What the prototype found that the domain model does not cover

- **Instructor absence has no home.** `instructorAbsent` needs a record the model does not have; the
  prototype invents `InstructorAbsence { instructorId, from, to, reason }` in `conflicts.ts`. Either
  it becomes an entity, or the rule goes.
- **Overrides have nowhere to live.** Right now the reason is squeezed into `notes`. If overrides
  matter (and a warning that is never audited does not), the appointment needs an explicit
  `override: { reason, by, at } | null`.
- **School hours are hardcoded** (07:00–21:00) and per-instructor working hours do not exist. Both
  belong to a school-settings entity that no issue owns yet.
- **Vehicle location is not modelled.** "Vehicle already out" is only detected as an overlap; a car
  finishing at the exam centre at 10:00 and starting a lesson at HQ at 10:15 raises nothing.

## Open questions for whoever picks a variant

1. Is the day-with-resource-columns the default, or the week? A says day, B and C say week.
2. Does the vehicle axis earn its toggle, or is a vehicle column set a separate "fleet" view?
3. Is drag-to-book worth building at all, given B books everything from a form in fewer clicks?
4. Should a move that only warns land immediately with an undo (A), or stage and wait (C)?
