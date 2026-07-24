# The API seam

How this app talks to its backend, and why there is a backend-shaped hole rather than a pile of
`localStorage` calls.

Settled by [Fake-API seam contract (#3)](https://github.com/LouisLP/driving-school/issues/3).
Vocabulary lives in [CONTEXT.md](../CONTEXT.md); the entities in
[docs/domain-model.md](./domain-model.md). Code: `src/shared/api/`.

**The test every decision here was held to:** swapping in a real HTTP backend later touches only
the implementation behind the interface — no feature, store or component.

## Shape

```
components ──► composables ──► useApi() : Api ──┬──► createFakeApi  (today)
                    │                            └──► createHttpApi  (later)
              useAsyncData
```

`Api` is eight per-entity repositories:

```ts
interface Api {
  students: StudentRepository
  enrolments: EnrolmentRepository
  appointments: AppointmentRepository
  billing: BillingRepository
  instructors: InstructorRepository
  vehicles: VehicleRepository
  locations: LocationRepository
  offerings: OfferingRepository
}
```

Per-entity rather than one flat client because eight small interfaces are eight things you can
read, implement and stub independently — a single 40-method type is none of those. `billing` is
the one that covers more than a single collection: invoices, the payments that settle them and the
balances read off both are one aggregate, and splitting them would leave `enrolmentBalance`
homeless. Its reasoning is in [docs/money-model.md](./money-model.md). Each lives in
`src/shared/api/contracts/`, and the fake that satisfies it in `src/shared/api/fake/`.

### Getting hold of it

`main.ts` builds one instance and provides it; `useApi()` injects it. That provide call is the
entire swap surface:

```ts
// main.ts — today
app.provide(API_KEY, createFakeApi(loadDatabase(), {
  latencyMs: [150, 400],
  onChange: createSnapshotWriter(),
}))

// main.ts — the day a backend exists
app.provide(API_KEY, createHttpApi('/api'))
```

A module-level singleton would have been shorter to write and would have made the swap a lie:
tests would reach for `vi.mock`, and the implementation choice would be spread across the import
graph instead of sitting in one line. Injection also means a component test provides a stub
without mocking anything:

```ts
mount(StudentList, {
  global: { provide: { [API_KEY as symbol]: createFakeApi(seedDatabase(), { latencyMs: 0 }) } },
})
```

## Reads

**Entities by default.** `get`, `create` and `update` return the types in `src/shared/domain/`.

**Read models where the seam must own a join.** The CRM list shows each student's standing, which
is derived from their *enrolments*. Assembling that above the seam would mean fetching every
enrolment in the school to render page one — a query no real backend would serve. So the list
returns `StudentListItem`, with `standing` and `openLicenceClasses` already joined. The debtors
list is the same shape of problem one collection further out: `DebtorListItem` is joined from every
invoice and payment a student holds, which no client should be fetching.

The rule: **if a real HTTP backend would have to do the join to avoid N+1, the seam does it too.**
Read models are read-only, named after what they are (not the screen that renders them), and are
never what you write back.

**Queries are per entity.** Each repository declares its own query type, so a filter an entity
does not support fails to compile rather than being silently ignored:

```ts
api.students.list({ search: 'mül', standing: 'active', page: 2 }) // → Page<StudentListItem>
api.appointments.list({ from, to, instructorIds }) // → readonly Appointment[]
api.vehicles.list({ suitableFor: 'B' }) // → readonly Vehicle[]
```

Paging is applied where lists grow (students) and nowhere else. The planner asks for a **time
window**, not a page — "page 3 of Tuesday" is not a thing anyone wants — and the window is
required, so no caller can accidentally ask for the school's entire history. Config collections
(vehicles, locations, offerings) are a handful of rows and come back whole.

Search is case- and diacritic-folded (`muller` finds `Müller`, `strasse` finds `Straße`) in one
place, so it behaves the same on both sides of the swap.

## Writes

```ts
type NewStudent = Omit<Student, 'id' | 'registeredAt'> // the seam mints both
type StudentPatch = Partial<NewStudent> // undefined = unchanged, null = erased
```

**Ids and timestamps are minted at the seam.** A client cannot invent a `StudentId`, which is what
lets `identifier.types.ts` claim ids come from the server.

**The write vocabulary is the domain's, not CRUD's.** `Appointment.outcome` is a discriminated
union whose timestamps only exist on the right variant, so there is no honest way to expose it as
a patch — the methods are `complete`, `cancel(by)`, `recordNoShow`. Likewise `enrolments.setStatus`
owns the transition table and stamps `startedAt` / `closedAt` itself.

**Nothing that history points at is deleted.** Instructors and vehicles have `employedUntil` and
`retiredAt`, so they `retire`; appointments `cancel`. A hard `remove` exists only where deletion is
truly safe — a student with no enrolments, a location no appointment references — and rejects with
`conflict` otherwise.

**No optimistic concurrency.** Single implicit user, single tab, no concurrent writers. Adding
`version` fields would guard a race that cannot happen.

## Failures

Repositories reject. They never return a failure value.

```ts
class ApiError extends Error {
  kind: 'notFound' | 'validation' | 'conflict' | 'network'
  fieldErrors?: Record<string, string> // validation only
}
```

| kind | HTTP later | means |
| ---- | ---------- | ----- |
| `notFound` | 404 | no such record |
| `validation` | 422 | malformed input — `fieldErrors` says where |
| `conflict` | 409 | well-formed, but the state forbids it |
| `network` | — | the request never got an answer |

`Result<T, E>` was the alternative: the compiler would make failure impossible to forget. It lost
on ergonomics — every call site unwrapping, in a codebase whose Vue and Pinia neighbours all speak
`async`/`await`. The discipline it would have enforced is instead concentrated in `useAsyncData`,
which is the only place in the app that catches.

`fieldErrors` values are **i18n message keys**, never prose — the seam has no business knowing
what locale the browser is in.

## Validation

Pure functions in `src/shared/domain/` (`validateStudent`), called from two places:

1. **The fake API, on every write** — so the seam is authoritative exactly as a server is. A form
   is never the only thing standing between bad data and the database.
2. **The form, for live feedback** — the same function, so the two can never disagree about what
   "valid" means.

Cross-entity invariants (double-booked instructor, vehicle already out, licence-class mismatch,
room capacity) can only be checked where the whole dataset is visible, so they live at the seam and
reject with `conflict`. The full conflict rule set is a later ticket; what is here are the rules
the domain model already settled.

A schema library (zod/valibot) was considered and rejected: the domain types are hand-written with
branded ids, and inferring them from schemas would mean rewriting what #2 just settled or
maintaining two encodings of the same thing.

## State ownership

**`useAsyncData` owns one screen's read.** It is the only place that wraps a repository call in
`try`/`catch`:

```ts
const filters = reactive<StudentQuery>({ search: '', standing: null })
const { data, isPending, error, refresh } = useAsyncData(
  () => api.students.list(filters),
  { watch: filters },
)
```

Concurrent refreshes are token-guarded, so a slow first fetch cannot overwrite a fast second.

**Pinia holds no server data.** Stores are for state that genuinely outlives a route — locale,
toasts, the planner's selected week and filters. Entity stores would drift into hand-rolled caches,
and hand-rolled invalidation is a bug farm this project does not need.

**No cache layer.** The fake is local; writes are followed by `refresh()`. TanStack Query was
considered — it is what you would reach for against a real backend — but its whole value (dedupe,
stale-while-revalidate, background refetch) targets network latency that does not exist here.

## The fake

`src/shared/api/fake/` — imported by `main.ts` and by tests, and by nothing else. A feature that
reaches past `@/shared/api` into this folder has broken the one rule the seam exists to enforce.

**In-memory arrays, one localStorage snapshot.** Repositories read and write plain arrays
synchronously, which is why every query is an ordinary array operation and testable without an
`await`. After each write, a debounced writer saves one versioned JSON snapshot. On boot: read it,
and if the key is missing, the JSON is corrupt, or `version` does not match, reseed. A stale
snapshot is discarded rather than migrated — this is demo data, and a migration path would be
ceremony protecting nothing. IndexedDB buys async ceremony for kilobytes of data.

Storage is injectable and may be absent (private mode, a blocked quota, a test): the app then runs
entirely in memory rather than failing to boot.

**Everything crossing the seam is `structuredClone`d.** Without that, a component holding a
rendered entity would hold the fake's own record — mutate it and the "database" changes with no
write, a bug class a real backend cannot have.

**Latency and faults are constructor options:**

```ts
createFakeApi(db, {
  latencyMs: [150, 400], // jittered per call, so lists do not resolve in lockstep
  failureRate: 0, // 0…1, rejects with ApiError('network')
  now: () => frozenTime, // injectable clock
  onChange: createSnapshotWriter(),
})

createFakeApi(seedDatabase(), { latencyMs: 0 }) // every test: no fake timers, no flake
```

The dev panel (bottom-right, dev builds only) dials latency and failure rate live, forces the next
call to fail with a chosen kind, and reseeds. Its controls travel under a **separate** injection
key — an HTTP implementation has no latency dial, so `Api` must not mention one.

**Seed data** is hand-written, small, and illustrative: one of every interesting case (a paused
enrolment, a pure prospect with no enrolments at all, an alumnus, a leaver, an automatic car, a
motorcycle, an overdue debt, a deposit sitting on account) rather than volume. The books are the
one part not typed in by hand: seed invoices are built by running the billing rule over the seeded
calendar, so they are data the seam itself could have produced. Ids are readable (`stu-04`) because a devtools panel is where you
will read them. Appointments are anchored to the current week so the planner always has something
to show. `seed.spec.ts` holds the seed to the same rules `schedule()` enforces, so the data that
ships could have been created through the seam.

How realistic the seed eventually gets is [its own open question](https://github.com/LouisLP/driving-school/issues/1).

## What a real backend would change

Only `src/shared/api/fake/` and the one `provide` in `main.ts`. Concretely, `createHttpApi` maps:

- `Page<T>` → whatever the API's envelope is, normalised in the client
- query objects → query strings
- status codes → `ApiError.kind` (404 → `notFound`, 422 → `validation`, 409 → `conflict`)
- rejected `fetch` → `ApiError.network`

Everything above the seam — read models, error kinds, loading states, validation feedback — already
speaks that language.
