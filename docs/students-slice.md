# The Students slice

What the Students feature contains, screen by screen and file by file.

Settled by [Students vertical slice spec (#8)](https://github.com/LouisLP/driving-school/issues/8).
Vocabulary lives in [CONTEXT.md](../CONTEXT.md); the entities in
[docs/domain-model.md](./domain-model.md), the money in [docs/money-model.md](./money-model.md),
the training requirements in [docs/training-model.md](./training-model.md), the seam in
[docs/api-seam.md](./api-seam.md).

**This is the reference implementation.** Instructors, Vehicles, Locations, Invoices and Debtors
are the same screen with different nouns, and they will be built by copying what is described
here. So the value of this document is not the Students feature — it is that every decision below
is one a later feature inherits without re-deciding.

Which is also the constraint it is written under: nothing here is allowed to be special. A choice
that only makes sense for students is a choice made wrong.

---

## What the slice proves

The map says Students is built end-to-end to prove the architecture. Concretely, this slice is the
first thing in the repo that exercises:

| Decision | Where it gets tested |
| --- | --- |
| The seam is swappable (#3) | Every read and write on both screens goes through `useApi()`; no component knows the fake exists. |
| Derived standing, never stored (#2) | Enrol a prospect, and their badge changes in the list with nothing written to a status field. |
| One validator, two callers (#3) | `validateStudent` runs in the form for live feedback and in the fake on write; a field error from either renders identically. |
| `shared/ui` is the only Reka importer (#5) | Dialog, Select, DateField, Progress, Pagination, Toast all arrive wrapped. Features import ours. |
| The token layer survives real screens (#4) | Table, badges, cards, dialog and form controls are built from roles only — no raw `--indigo-600` anywhere. |
| Typed `t()` across a real feature (#6) | Every string on both screens, EN + DE, with key parity enforced by the existing test. |
| Flat detail routes and `usePageTitle` (#7) | Already wired by the rough pages; kept. |

Anything that does not serve one of those rows is scope this slice does not need.

---

## Decisions

Eight, in the order they were settled. Three overturn or narrow an earlier ticket; those say so.

### 1. `src/shared/ui/` is born here, at minimum viable size

Reka UI gets installed in this slice, along with the ESLint `no-restricted-imports` rule from #5
that forbids `reka-ui` anywhere outside `src/shared/ui/**`.

Only the primitives Students actually uses get wrapped. The alternative — building the whole
inventory from #5 in one pass — ships a design system no screen has bent yet, and the alternative
in the other direction (hand-roll inside the feature, extract later) makes the reference
implementation teach a pattern we intend to abandon. #5 called Students *"the first real test of
the `shared/ui/` boundary"*; a boundary tested by nothing is a comment.

The rule for what gets a wrapper: **a component enters `shared/ui/` when this slice needs it, not
when we expect a later one to.** Combobox, TagsInput, Tabs, Tooltip, Popover and the date-range
and time fields are all in #5's inventory and all stay unbuilt — Students has no screen that wants
them, and guessing their API without a caller is how a design system gets its first dead component.

### 2. The record is one page of enrolment cards

`/students/:studentId` renders an identity header and then a stack of enrolment cards. There is no
`/students/:id/enrolments/:enrolmentId` route and there are no tabs.

Everything worth knowing about a student's training — appointments, progress, invoices, balance —
hangs off an `Enrolment`, not off the `Student`. That leaves three ways to show it, and the
tabbed CRM shape is the worst of them: an "Appointments" tab is per-enrolment data flattened
across enrolments, so every row has to re-answer *which enrolment?* — re-introducing exactly the
student-level aggregation the domain model rejected. A separate enrolment route is the most honest
to the model but makes the common case (one enrolment) cost two clicks to see anything.

So: the student is a person, and their enrolments are the content of their page. A card is
self-contained — its own progress, its own money, its own appointments — because that is what an
enrolment *is*. A three-enrolment alumnus gets a long page; that is the correct amount of page for
three trainings.

### 3. Progress is derived, and adds no configuration

The enrolment card shows progress against the requirements the offering carries, and derives all of
them — nothing about a student's progress is stored.

> **Amended by [#21](https://github.com/LouisLP/driving-school/issues/21).** This decision
> originally left special drives *counted but not benchmarked*, because nothing in the model said
> how many were required, and the card was allowed to say "3 overland, 2 autobahn, 0 night" but not
> "ready for the test". That is now settled in
> [docs/training-model.md](./training-model.md): the offering carries `requirements`
> (`standardPracticalUnits`, `specialDriveUnits` per type, theory split by scope) in place of the
> old `minimumPracticalAppointments` / `minimumTheoryAppointments`, and
> `deriveExamReadiness` returns a per-requirement breakdown. So the card **does** benchmark the
> special drives, and it may claim readiness — advisorily, since readiness blocks nothing. Every
> other word of this decision stands; the shape of the read model is unchanged apart from the
> fields listed under *Seam additions*.

### 4. Create and edit are one dialog

`StudentFormDialog` opens from the list's **New student** button and from the record page's
**Edit**. Same component, same fields, same validator; the only difference is whether it was
handed a student.

A student is nine fields. A route for it is ceremony, it needs a dirty-navigation guard the dialog
does not, and it loses the list's filters and scroll position on the way out and back. The dialog
also lands on the one Reka primitive that #5 confirmed keeps its scope id under portalling —
`Dialog` — so the first wrapper we build does not immediately hit the popper styling exception.

### 5. No schema library — the domain validators drive the form

`useForm(initial, validate)` where `validate: (input: T) => FieldErrors<T> | null`, which is
exactly the signature `validateStudent` already has.

This **overturns #5's recommendation of Valibot.** #5's inventory was written before #3 shipped
`src/shared/domain/*.validation.ts`, and #3 made the fake API call those validators on every write
so the seam is authoritative like a server. Adopting Valibot for forms therefore means one of two
things: the seam imports it too (a schema library in the domain layer, to express rules that are
currently eleven lines of pure TypeScript), or the same rule is written twice and the two drift.
Drifting validation is the precise failure #3 designed against.

The payoff is that a rejected write needs no second code path: `ApiError` of kind `validation`
carries `fieldErrors` in the same `FieldErrors<T>` shape, so a server-only rule — a duplicate
email, a conflict the client cannot see — merges into the form's error map and lands on the right
field.

What is given up: cross-field rules and type inference from a schema. Neither is needed by any
form in this app; if one ever is, `validate` is a plain function and can do it.

### 6. The URL is the list's state

`useListQuery(defaults)` maps a query object to and from `route.query`: search (debounced 250 ms),
standing, licence class, sort field and direction, page. Defaults are stripped, so an unfiltered
list is a clean `/students`.

Since the record is a separate route, returning from a student must restore the list anyway — and
the two cheaper options both fail that. Component-local state (what the rough page does today)
resets every filter on the way back, which on a three-hundred-row list is the most irritating bug
a CRM can have. A Pinia store fixes the round trip but not linkability, and #3 reserved Pinia for
state that outlives a route and is not server data.

The composable is generic over the query type, so Instructors, Invoices and Debtors get it free.
`replace` for search keystrokes, `push` for filter and page changes — typing should not fill the
history stack, but changing a filter is a place you can go back to.

### 7. A plain `<table>`, no headless table library

`UiDataTable` + `UiSortableHeader` + `UiPagination` over a real `<table>`, with columns written
out in the page.

This **overturns #5's ranking of the data table as a gap to be filled with TanStack Table.** The
seam sorts, filters and pages server-side — `StudentQuery` carries `sort`, `page`, `pageSize`, and
returns `Page<T>` — so the client never owns a row model. TanStack's value is client-side sorting,
filtering, grouping and virtualisation, every one of which is work already done behind the seam.
Adopting it here would mean paying a dependency to describe columns it will not act on, plus a
second source of truth for sort state that the URL already holds.

What is shared is markup and behaviour that is genuinely repeated: the scroll container, sticky
header, `aria-sort` wiring, row-hover and empty-body handling, and the pager. Column definitions
stay in the page as template, because a column is markup — a licence-class cell is three chips and
a birthday cell is a formatted date, and expressing those as data buys nothing.

If a later screen needs column visibility, reordering or virtualisation, that is the moment to
reconsider — with a caller to design against.

### 8. The record page writes enrolments; money stays read-only

**New enrolment** (pick from the offered licence classes → `enrolments.create`, prices frozen on
creation by the seam) and status transitions through `enrolments.setStatus`, with only the legal
next states offered.

That is what makes the domain's most interesting rule observable: enrol a prospect and their
standing becomes `active` with nothing stored; withdraw their only enrolment and they are `lapsed`.
A slice where enrolments are read-only can never show it fire.

Money is displayed and not touched. Balance comes from `billing.studentBalance`, per-enrolment
figures from the `perEnrolment` rows it already returns, and **Record payment** / **Create
invoice** are links into Finances, which owns them. Building the invoice-draft preview inside
Students would be building most of Finances in the wrong folder.

Appointments are read-only here too: the card shows the next scheduled appointment and the five
most recent past ones. Scheduling belongs to the planner (#11), and this slice does not open a
booking surface.

---

## The list view — `/students`

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Students                                       [ + New student ]        │  ← shell header
│ Everyone the school trains, and where they stand.                       │
├─────────────────────────────────────────────────────────────────────────┤
│ [ 🔍 Search name or email        ]  [ Standing ▾ ]  [ Class ▾ ]  Clear   │
│ 42 students                                                             │
├──────────────────┬──────────────┬──────────┬─────────┬──────────┬───────┤
│ Name          ▲  │ Contact      │ Standing │ Classes │ Reg. ▾   │       │
├──────────────────┼──────────────┼──────────┼─────────┼──────────┼───────┤
│ Bauer, Lena      │ lena@…       │ ●Active  │ [B]     │ 03.02.26 │  ⋯    │
│ …                                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                     ‹ 1 2 3 … 7 ›                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Columns

Rendered from `StudentListItem`, which the seam already joins — the list cannot be assembled from
the students collection alone, because `standing` is read from enrolments.

| # | Column | Source | Sortable | Notes |
| --- | --- | --- | --- | --- |
| 1 | **Name** | `lastName`, `firstName` | `lastName` | `Bauer, Lena`. The whole cell is the `RouterLink` to the record. |
| 2 | **Contact** | `email` ?? `phone` | no | Email as the primary, phone below it in `--text-muted` when both exist. `—` when neither. |
| 3 | **Standing** | `standing` | `standing` | `UiBadge`, tone per standing (below). |
| 4 | **Licence classes** | `openLicenceClasses` | no | One `UiBadge variant="outline"` per class. `—` when the student holds no open enrolment. |
| 5 | **Registered** | `registeredAt` | `registeredAt` | `d(value, 'short')` — locale-formatted, so DE reads `03.02.2026`. |
| 6 | **Actions** | — | no | `UiDropdownMenu`: Edit, Delete. Icon-only trigger with an accessible name. |

Sort defaults to `{ field: 'registeredAt', direction: 'desc' }` — newest first is what a CRM list
is for. Only one column sorts at a time; `StudentSortField` is a closed union, so a column that
cannot sort cannot be made to.

Standing tones, reusing the four status roles from #4:

| Standing | Tone | Reasoning |
| --- | --- | --- |
| `active` | `success` | Training now. |
| `prospect` | `info` | Enquired, nothing under way. |
| `alumnus` | `neutral` | Finished and gone. Not a warning. |
| `lapsed` | `warning` | Everything withdrawn — the one standing worth noticing. |

### Filtering and search

| Control | Maps to | Behaviour |
| --- | --- | --- |
| Search | `StudentQuery.search` | One `UiTextField type="search"`. Debounced 250 ms into the URL and the fetch. The seam folds case and diacritics, so `mul` finds `Müller`. |
| Standing | `StudentQuery.standing` | `UiSelect` over the four standings plus "Any". |
| Licence class | `StudentQuery.licenceClass` | `UiSelect` over the **offered** classes only (`offerings.list()`, filtered to `isOffered`) plus "Any". Filtering by a class the school does not teach is a filter that always returns nothing. |
| Clear | — | Visible only when some filter is set. Resets to defaults and to a bare URL. |

Changing any filter resets `page` to 1. Forgetting that is the classic version of this bug: filter
down to three results while on page 4 and stare at an empty table.

### States

Five, and they are not interchangeable — the whole point of specifying them once is that every
later list copies the same five.

| State | Condition | What renders |
| --- | --- | --- |
| **First load** | `isInitialLoad` | `UiSkeleton` rows inside the real table chrome, so the header does not jump when data lands. The fake API's artificial latency makes this visible on every navigation, by design (#3). |
| **Refreshing** | `isPending && data` | Existing rows stay, at 60 % opacity with `aria-busy`. Never a skeleton — replacing a table you can already read with grey boxes is a regression, not a loading state. |
| **Empty — no students at all** | `total === 0`, no filters set | `UiEmptyState`: "No students yet" + **New student**. The action is the point. |
| **Empty — nothing matched** | `total === 0`, some filter set | `UiEmptyState`: "No students match these filters" + **Clear filters**. A different problem needs a different button; offering "New student" to someone who mistyped a search is the wrong help. |
| **Error** | `error` | `UiErrorState` with `t('shared.errors.' + error.kind)` and **Try again** → `refresh()`. Keyed on `ApiError.kind`, so all four kinds are handled by construction. |

### Pagination

`DEFAULT_PAGE_SIZE` (25). `UiPagination` wrapping Reka's `Pagination`, hidden entirely when
`total <= pageSize`. The count line above the table reads `t('students.list.count', total)` —
pluralised, and it reports matches across all pages, not the length of the current one.

---

## The record view — `/students/:studentId`

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Students › Lena Bauer                                                   │  ← breadcrumb (meta.parent)
│ Lena Bauer  ●Active            [ Edit ]  [ + New enrolment ]  [ ⋯ ]     │  ← usePageTitle
├───────────────────────────────────┬─────────────────────────────────────┤
│ ── Identity ──────────────────    │ ── Account ─────────────────        │
│ Date of birth   14.06.2004 (22)   │ Outstanding            € 340,00     │
│ Email           lena@…            │ Overdue                € 120,00     │
│ Phone           +49 …             │ Not yet invoiced       €  90,00     │
│ Address         Hauptstr. 4 …     │           View in Finances →        │
│ Registered      03.02.2026        │                                     │
│ Notes           …                 │                                     │
├───────────────────────────────────┴─────────────────────────────────────┤
│ ── Enrolments ──────────────────────────────────────────────────────    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [B]  ●Active            started 12.02.2026            [ Status ▾ ]  │ │
│ │ Standard lessons   ████████████░░░  12 / 12                         │ │
│ │ Theory             ██████░░░░░░░░░   7 / 12 basic · 0 / 2 class     │ │
│ │ Special drives     3 / 5 overland · 2 / 4 autobahn · 0 / 3 night    │ │
│ │ Readiness          theory 5 short · practical not ready             │ │
│ │ Exams              theory passed · practical not sat                │ │
│ │ Balance            € 340,00 outstanding · € 90,00 unbilled          │ │
│ │ Next               Thu 30 Jul, 14:00 · practical · M. Keller        │ │
│ │ Recent             ⌄ five most recent                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

Two columns on wide viewports, stacked below `--size-md`, via a **container query** on the page
wrapper — #4 settled that container queries are the default and media queries are the shell's.

### Header

- Title is the student's full name, set with `usePageTitle` so the shell header, the breadcrumb
  and the document title agree (already proven by the rough page — kept).
- Standing badge beside the name, same tones as the list.
- **Edit** opens `StudentFormDialog` with the loaded student.
- **New enrolment** opens `NewEnrolmentDialog`.
- Overflow menu holds **Delete student**, which is enabled only when the student has no
  enrolments. When they do, it is disabled with the reason as its title — the seam rejects it with
  `conflict` regardless (a student who has trained here is part of the school's history), and a
  button whose only outcome is an error should not be pressable.

### Identity panel

A `<dl>`, one row per fact, from `Student`:

| Row | Rendering |
| --- | --- |
| Date of birth | `d(dateOfBirth, 'short')` plus age in years, computed at the formatting edge. |
| Email | `mailto:` link, or `—`. |
| Phone | `tel:` link, or `—`. |
| Address | Street + house number / postal code + city / country, or `—`. Formatted by one shared helper, so it looks the same here and on an invoice later. |
| Registered | `d(registeredAt, 'short')`. |
| Notes | Whitespace-preserved. Empty renders the row as `—` rather than hiding it, so the page does not change shape depending on whether someone wrote a note. |

### Account panel

From `billing.studentBalance(id)` — one call, already summing across every enrolment and returning
the per-enrolment rows the cards reuse, so the total and its parts cannot disagree.

Shows `outstanding`, `overdue` and `uninvoiced`, each formatted through the money layer (integer
cents in, `n(value, 'currency')` out). `overdue` renders in the `danger` role when non-zero and is
hidden when zero — a permanent "€ 0,00 overdue" trains people to stop reading the row. **View in
Finances** links to the debtors screen filtered to this student.

### Enrolment cards

Ordered open first (`enquiring`, `active`, `paused`), then closed by `closedAt` descending.

| Element | Source | Notes |
| --- | --- | --- |
| Licence class | `enrolment.licenceClass` | Large, it is the card's identity. |
| Status badge | `enrolment.status` | `active`/`passed` → success, `paused` → warning, `withdrawn` → neutral, `enquiring` → info. |
| Dates | `enquiredAt` / `startedAt` / `closedAt` | One line, whichever are set. |
| Standard lessons | the `standardPractical` line of `progress.readiness.practical` | `UiProgressBar`, capped visually at 100 % but labelled with the true count — `14 / 12` is information, a bar at 117 % is not. |
| Theory | the `basicTheory` and `classSpecificTheory` lines of `progress.readiness.theory` | Two bars, since the two courses complete independently (#21). |
| Special drives | the three drive lines of `progress.readiness.practical` | One small bar per type — `3 / 5 overland`. Never summed: the three are different skills (#21). |
| Readiness | `progress.readiness[…].isMet` | One line per exam: *ready* or the unmet requirements, from `unmetRequirements`. Advisory — it never disables anything. |
| Exams | `progress.exams` | Kind, date, result; `not sat` when none. |
| Balance | matching `EnrolmentBalance` from `perEnrolment` | Outstanding and uninvoiced. |
| Next appointment | `summary.nextAppointment` | Date, kind, instructor. `—` when nothing is booked. |
| Recent | `summary.recentAppointments` | A `<details>` disclosure, collapsed. Five most recent past appointments, newest first, with their outcome. |
| Status menu | `enrolments.setStatus` | Only legal transitions, from the table the seam owns. |

Density follows the rule #11 settled: one fact per element, everything else one interaction away.
The card shows what a person asks about a student — *how far along are they, do they owe us
anything, when are they next in* — and hides the history behind a disclosure.

**Empty:** a student with no enrolments gets a `UiEmptyState` in place of the card stack: "Not
enrolled in anything yet" + **New enrolment**. This is the `prospect` case and it is the common
first screen of a new record, so it is a designed state rather than a blank area.

### Data flow

Three calls, no N+1:

```ts
api.students.get(studentId)                        // the person
api.enrolments.summaries({ studentId })            // enrolments + progress + appointments (new)
api.billing.studentBalance(studentId)              // money, already per-enrolment
```

Each is its own `useAsyncData`, so a slow balance does not hold up the identity panel and a failed
balance degrades to an error inside the account panel rather than blanking the page. Composed
behind one `useStudentRecord(studentId)` so the page reads as one thing.

---

## Dialogs

### `StudentFormDialog` — create and edit

Fields, in order, mapping one-to-one onto `NewStudent`:

| Field | Control | Required | Validated by |
| --- | --- | --- | --- |
| First name | `UiTextField` | yes | `required` |
| Last name | `UiTextField` | yes | `required` |
| Date of birth | `UiDateField` | yes | valid date, not future, ≥ 14 years |
| Email | `UiTextField type="email"` | no | shape, when present |
| Phone | `UiTextField type="tel"` | no | shape, when present |
| Address | `UiTextField` × 5 in a fieldset | no | all-or-nothing; DE requires a 5-digit postal code |
| Notes | `UiTextArea` | no | — |

All of it is `validateStudent`, unchanged, called by `useForm`. The address is validated as a
group and reports one error against the fieldset, because that is how the existing validator
reports it — and it reports it that way deliberately, to keep form layout out of the domain.

Behaviour:

- **Validation timing:** on blur per field, then on every change once a field has been blurred
  once, plus a full pass on submit. Not on first keystroke — telling someone their email is
  invalid while they type the second character is noise.
- **Submit:** disabled while pending. On success, close and toast; on `ApiError` of kind
  `validation`, merge `fieldErrors` into the form's map, focus the first offending control, keep
  the dialog open. Any other kind renders as a message inside the dialog footer.
- **Dirty close:** attempting to dismiss a dirty form opens `UiAlertDialog` ("Discard changes?").
  A clean form closes silently.
- **Create vs edit:** the only differences are the title, the submit label, and whether the
  request is `create(input)` or `update(id, patch)`. Nine fields do not justify two components.
- **Empty strings become `null`** on the way out, because the domain models "no email" as `null`
  and `''` is not a second way to say it.
- **After success:** create → toast + navigate to the new record (you made it to look at it).
  Edit → toast + stay, list/record refetch.

### `NewEnrolmentDialog`

One `UiSelect` of the offered licence classes, minus the ones the student already holds an open
enrolment in — `enrolments.create` takes only `studentId` and `licenceClass`, everything else
being the seam's to mint, so this dialog is deliberately one field. Below it, read-only, the
prices that are about to be frozen onto the enrolment, with a line saying so. A student agreeing
to a price should be able to see the price.

### `DeleteStudentDialog`

`UiAlertDialog` — the destructive variant, no dismiss-on-outside-click, focus on Cancel. Names the
student in the body. On `conflict`, renders the seam's reason rather than the generic message,
because "this student has enrolments" is actionable and "that is not possible right now" is not.

---

## Seam additions

Three, all additive. No existing signature changes.

### `EnrolmentSummary` — the record page's read model

`appointments.list` requires a `{ from, to }` window (deliberately — no caller may ask for the
school's whole history), so *"every lesson this enrolment has ever had"* is currently not
expressible. Counting appointments client-side would also mean one windowed query per enrolment
per student page, which is the N+1 the seam rule from #3 exists to prevent.

```ts
// src/shared/api/contracts/enrolments.contract.ts

export interface EnrolmentProgress {
  /** What this enrolment has completed, from `deriveTrainingRecord`. */
  record: TrainingRecord
  /**
   * The record measured against today's offering, from `deriveExamReadiness` (#21). Carries the
   * requirement counts, so the card draws every bar from here and re-derives nothing.
   */
  readiness: ExamReadiness
  exams: readonly { examKind: 'theory' | 'practical', satAt: IsoDateTime, result: ExamResult | null }[]
  /** Planned appointments not yet sat. What "12 booked, 7 driven" is read from. */
  plannedAppointments: number
}

export interface AppointmentSummary {
  id: AppointmentId
  kind: AppointmentKind
  startsAt: IsoDateTime
  instructorName: string
  status: AppointmentStatus
}

export interface EnrolmentSummary {
  enrolment: Enrolment
  progress: EnrolmentProgress
  nextAppointment: AppointmentSummary | null
  /** The five most recent past appointments, newest first. */
  recentAppointments: readonly AppointmentSummary[]
}

export type EnrolmentSummaryQuery
  = | { studentId: StudentId }
    | { enrolmentId: EnrolmentId }

// added to EnrolmentRepository
summaries: (query: EnrolmentSummaryQuery) => Promise<readonly EnrolmentSummary[]>
```

A read model, not an entity: read-only, never written back, exactly like `StudentListItem` and
`DebtorListItem`. It joins appointments, the offering and the instructor's name — three joins a
real backend would do rather than make the client fetch the school's whole calendar to render one
page.

The arithmetic itself is **not** in the seam. It lives in
`src/shared/domain/enrolment.utils.ts` as `deriveEnrolmentProgress(offering, appointments)`, pure
and unit-tested, with the fake calling it — same shape as `deriveStudentStanding`, and the same
reason: an HTTP implementation would compute this server-side, and when it does, the rule it
implements should be written down here rather than reverse-engineered from a Vue component.

### `AppointmentQuery.studentId`

```ts
/** Every appointment across every enrolment this student holds. */
studentId?: StudentId
```

Not needed by this slice — the summary covers it — but the "View in planner" link from a card
wants it, and it is one line beside the existing `enrolmentId`. Included so the link is not left
dangling.

### Seed data

The seed must contain, at minimum: a student in each of the four standings; a student with two
enrolments in different classes; a student with an overdue invoice and one with credit; an
enrolment past its practical minimum and one barely started; a student with no email and no
address; and a name with an umlaut, so folded search is exercised by the data rather than only by
a test.

Not "more realistic seed data" — that is still its own open item on the map. This is the specific
set of rows without which the states above cannot be seen.

---

## `src/shared/ui/` — the set this slice builds

Components are prefixed `Ui`. Not decoration: `vue/multi-word-component-names` is on in the antfu
config, so `Button.vue` fails lint — and the prefix makes "is this ours or the feature's?" visible
at the call site.

Each wraps at most one Reka primitive, styles it entirely through the roles from #4, and forwards
`useForwardPropsEmits` so the primitive's own API stays reachable without re-declaring it.

| File | Core | Why it exists |
| --- | --- | --- |
| `UiButton.vue` | ours | Variants `primary` / `secondary` / `ghost` / `danger`, sizes, `:loading` with a busy state. Every screen. |
| `UiTextField.vue` | ours | Native `input`. Types text/email/tel/search. |
| `UiTextArea.vue` | ours | Native `textarea`, auto-grow. |
| `UiSelect.vue` | Reka `Select` | Standing, licence class, status. Portalled → styled globally (below). |
| `UiDateField.vue` | Reka `DateField` ⚠︎ Alpha | Locale-aware segment order for EN/DE, free. **The containment point** for `@internationalized/date`: `IsoDate` in, `IsoDate` out, `DateValue` never crosses this file. |
| `UiFormField.vue` | Reka `Label` + ours | Label, control slot, hint, error, and the `id`/`aria-describedby`/`aria-invalid` wiring. The most reused component in the app. |
| `UiDialog.vue` | Reka `Dialog` | Focus trap, scroll lock, background `aria-hidden`. |
| `UiAlertDialog.vue` | Reka `AlertDialog` | Destructive confirms. Different a11y contract, so a separate component rather than a prop. |
| `UiDropdownMenu.vue` | Reka `DropdownMenu` | Row and header actions. |
| `UiDataTable.vue` | ours | Scroll container, sticky header, `aria-busy`, empty-body slot. Columns are the caller's markup. |
| `UiSortableHeader.vue` | ours | `<th>` + button + `aria-sort`, emitting the next `Sort<T>`. |
| `UiPagination.vue` | Reka `Pagination` | Page list, ellipsis, prev/next. |
| `UiBadge.vue` | ours | Tones `neutral`/`info`/`success`/`warning`/`danger`, variants solid/subtle/outline. Standings, enrolment statuses, licence-class chips. |
| `UiProgressBar.vue` | Reka `Progress` | Lessons toward the minimum. Correct `role="progressbar"` for free. |
| `UiEmptyState.vue` | ours | Icon, message, one action slot. Both empty states on the list, the no-enrolments state on the record. |
| `UiErrorState.vue` | ours | Same shape, error tokens, retry action. |
| `UiSkeleton.vue` | ours | Shimmer block, `prefers-reduced-motion` respected via the motion tokens. |
| `UiToaster.vue` | Reka `Toast` | Viewport + rendering. Fed by the store below. |
| `UiCard.vue` | ours | The raised token surface with a header slot. Enrolment cards, panels. |

Plus, not components:

| File | Purpose |
| --- | --- |
| `src/shared/ui/portal.css` | Global styles for portalled content, keyed on `data-reka-*` attributes. #5 proved `<style scoped>` cannot reach body-teleported nodes and Reka's documented `:deep()` workaround cannot either — so portalled parts are styled globally, on purpose, in one named file. |
| `src/shared/ui/index.ts` | Barrel. `shared/ui` is a published-feeling boundary; features import from `@/shared/ui`, never from a file inside it. |
| `src/shared/stores/toast.store.ts` | Pinia. Toasts outlive the route that raised them — one of the three uses #3 reserved Pinia for. `UiToaster` renders it; `useToast()` raises. |

`ConfigProvider` (locale-bound, from #5) is added at the app root in `main.ts` as part of this
slice, since it is what makes `UiDateField` follow the locale switcher.

---

## File manifest

Everything this slice creates or changes. New unless marked.

### `src/features/students/`

```
pages/
  StudentListPage.vue              rewritten — the specified list
  StudentDetailPage.vue            rewritten — the specified record
components/
  StudentFilters.vue               search + standing + class + clear
  StudentTable.vue                 the six columns, over UiDataTable
  StudentStandingBadge.vue         standing → tone + label. Used by list and record.
  StudentFormDialog.vue            create + edit
  StudentIdentityPanel.vue         the <dl>
  StudentAccountPanel.vue          balance, links into Finances
  EnrolmentCard.vue                one enrolment, everything about it
  EnrolmentProgressPanel.vue       the two bars + special drives + exams
  EnrolmentStatusMenu.vue          legal transitions only
  NewEnrolmentDialog.vue           one select + frozen prices
  DeleteStudentDialog.vue          destructive confirm
composables/
  use-student-list.ts              list query + fetch + offered classes
  use-student-record.ts            the three reads, composed
  use-student-form.ts              useForm(validateStudent) + submit + error merge
i18n/
  en.json                          extended
  de.json                          extended
__tests__/
  use-student-list.spec.ts         query ↔ URL, page reset on filter change
  student-standing.spec.ts         standing → tone mapping
```

Seventeen new files, two rewritten. No `types.ts`: every type this feature needs already exists in
`shared/domain` or `shared/api`, and a feature that invents its own copy of `Student` is the first
step to two of them.

No `stores/`: nothing here outlives a route except toasts, which are shared.

### `src/shared/`

```
ui/                                the nineteen files listed above
composables/
  use-form.ts                      + use-form.spec.ts
  use-list-query.ts                + use-list-query.spec.ts
stores/
  toast.store.ts
domain/
  enrolment.utils.ts               deriveEnrolmentProgress + spec
api/
  contracts/enrolments.contract.ts     changed — EnrolmentSummary, summaries()
  contracts/appointments.contract.ts   changed — studentId filter
  fake/enrolments.fake.ts              changed — the join + spec
  fake/appointments.fake.ts            changed — the filter
  fake/seed.ts                         changed — the rows listed above
i18n/
  en.json / de.json                changed — shared form + table strings
```

### Root

```
package.json          + reka-ui
eslint.config.js      + no-restricted-imports: reka-ui outside src/shared/ui/**
src/main.ts           + ConfigProvider, + UiToaster mount point
docs/students-slice.md  this file
```

---

## i18n

New keys under `students.` (EN is the source of truth; DE lands in the same PR, and the existing
key-parity test fails the build if it does not):

```
students.list.searchPlaceholder / filters.standing / filters.licenceClass /
  filters.any / filters.clear / empty.none / empty.noMatch / columns.actions
students.detail.identity / account / enrolments / noEnrolments /
  outstanding / overdue / uninvoiced / viewInFinances
students.enrolment.progress.standard / theoryBasic / theoryClassSpecific /
  specialDrives / readiness.ready / readiness.short / exams /
  next / recent / noneBooked / notSat / status.*
students.form.createTitle / editTitle / discardTitle / discardBody /
  addressLegend / notesHint
students.actions.edit / delete / newEnrolment / recordPayment
students.delete.title / body / hasEnrolments
```

Shared keys that stop being feature-specific the moment a second list exists — pagination labels,
sort direction announcements, "Discard changes?", the required-field marker — go under `shared.`
in the same PR. #6's rule stands: duplicated wording is cheaper than a shared bucket nobody can
safely change, so a string moves to `shared.` only when a second caller actually appears. These
have one, immediately.

---

## Tests

Per the map: only where logic lives. No component snapshots.

| File | Covers |
| --- | --- |
| `use-form.spec.ts` | Validate on submit, blur-then-live per field, dirty tracking, merging `ApiError.fieldErrors`, pending lockout. |
| `use-list-query.spec.ts` | Query ↔ URL round trip, defaults stripped, page reset on filter change, debounce, `replace` vs `push`. |
| `enrolment.utils.spec.ts` | `deriveEnrolmentProgress`: the exam list and `plannedAppointments`. The counting and the readiness comparison are already covered by `training.utils.spec.ts` (#21); this file does not re-test them. |
| `enrolments.fake.spec.ts` | The `summaries` join: right enrolments, next/recent ordering, N+1-free shape, unknown student rejects `notFound`. |
| `use-student-list.spec.ts` | Filters map onto `StudentQuery`; class filter offers only offered classes. |

`validateStudent` and `deriveStudentStanding` are already covered and unchanged.

---

## Deliberately not in this slice

| Left out | Where it belongs |
| --- | --- |
| Editing an offering's requirements | The offerings screen. Settled as a model by #21; this slice reads requirements, never writes them. |
| Scheduling from the student record | Planner (#11). This slice reads appointments, never writes them. |
| Recording payments, drafting invoices | Finances. Students links, Finances owns. |
| Student documents, avatars, file upload | Nothing in the domain model has a file on it yet. |
| Bulk actions, CSV export, saved views | No caller. Add when one exists. |
| Combobox, Tabs, Tooltip, Popover, TagsInput, date range, time field | `shared/ui`, when the screen that needs them is built — decision 1. |
| Command palette / global search | Already deferred by #5. |

---

## Follow-ups this raises

1. ~~**Progress & exam readiness**~~ — settled by
   [#21](https://github.com/LouisLP/driving-school/issues/21) in
   [docs/training-model.md](./training-model.md), before this slice was built. See the amendment on
   decision 3.
2. **`shared/ui` growth policy** — the next feature will want Combobox and Tabs. Worth writing
   down once whether a wrapper may be added speculatively (this slice says no).
3. **#5's gap list is now partly wrong** — Valibot and TanStack Table were both ranked as gaps to
   fill and are both declined here, with reasons. `docs/research/component-inventory.md` should
   carry a note pointing at decisions 5 and 7 rather than quietly disagreeing with the codebase.
```
