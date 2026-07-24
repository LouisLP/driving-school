# Component inventory — what we build, what Reka builds

Companion to [reka-ui.md](./reka-ui.md), which establishes what Reka UI actually
ships (v2.10.1, verified against source and measured locally). This file is the
verdict: every UI surface the six nav sections need, marked `reka` / `ours` /
`hybrid` / `gap`, plus the gaps that will cost real time.

Scope per issue #1: driving-school back-office, no backend, vanilla scoped CSS,
own token layer, Reka only for a11y-hard primitives.

## Headline

Reka UI is a **yes**. Version 2.10.1 is stable, ships zero CSS, is
`sideEffects: false` and tree-shakes properly (Dialog alone is 12.2 KB gz against
214 KB for the whole library). It covers more than issue #1 assumed — notably
**Toast ships and is not alpha**, so we don't hand-roll one.

Three findings change the plan:

1. **Toast is in.** Issue #1 listed toast as a Reka target and it's real:
   `ToastProvider` / `Root` / `Viewport` / `Title` / `Description` / `Action` /
   `Close`, no alpha badge. One fewer gap.
2. **Every date primitive is Alpha.** All twelve — Calendar, DateField,
   DatePicker, TimeField, the lot. They are also the primitives we most want
   (locale-aware segmented input for EN/DE). This is the main adoption risk and
   it needs a containment strategy — see [Date primitives](#date-primitives--the-one-real-risk).
3. **Scoped styles partially break on portalled content**, and Reka's own
   documented workaround (`:deep()`) does not work for it. This collides directly
   with the repo's "vanilla CSS, `<style scoped>` per SFC" decision — see
   [Styling](#styling--the-portal-caveat).

## Legend

| Mark | Meaning |
| --- | --- |
| `reka` | Reka primitive, styled by us. We write no behaviour. |
| `ours` | Entirely ours — markup + CSS + any behaviour. |
| `hybrid` | Reka primitive as the behavioural core, wrapped in a component of ours that adds structure, or composed from two Reka parts. |
| `gap` | Nobody ships this. We hand-roll it or take a dependency. |
| ⚠︎ | Reka marks this primitive **Alpha** — API may change. |

The unit of adoption is **never a raw Reka primitive in a feature file**. Every
`reka` row below means "a `src/shared/ui/` component of ours wraps it". Features
import ours. That keeps the swap cost bounded, gives the alpha date primitives a
single containment point, and makes the token layer the only styling surface.

## Cross-cutting shell

| Surface | Verdict | Notes |
| --- | --- | --- |
| App shell (sidebar + topbar + content) | `ours` | Plain grid layout, no primitive needed. |
| Nav sections + active state | `ours` | `RouterLink` + `aria-current`. Reka's `NavigationMenu` is for dropdown menubars, not sidebar nav — wrong tool. |
| Breadcrumb | `ours` | `<nav><ol>`. Reka ships no breadcrumb; trivial anyway. |
| `ConfigProvider` at app root | `reka` | Bind `:locale` to vue-i18n's `locale`. Every date primitive inherits it. Also carries `dir`, `scrollBody`, `teleportTo`. Set this up once in #7 (app shell) — cheap now, annoying to retrofit. |
| Locale switcher (EN/DE) | `reka` | Select. Two options, but it's in the topbar and must be keyboard-sane. |
| Theme toggle | `ours` | Button + token flip. |
| Confirm-destructive dialog | `reka` | AlertDialog — the one dialog variant where the a11y contract differs (no dismiss-on-outside-click, focus lands on cancel). |
| Toast / notifications | `reka` | **Ships, stable.** `duration` 5000 default, swipe-to-dismiss, `ToastViewport` F8 hotkey. Used by save confirmations and planner conflict warnings. |
| Skeleton / loading placeholder | `ours` | Matters here — the fake API adds artificial latency on purpose, so loading states are visible on every screen, not an edge case. |
| Empty state | `ours` | One component, slot for illustration/action. Used by every list in the app. |
| Error state | `ours` | Same shape as empty state, different tokens. |
| Command palette | `gap` | Explicitly deferred. Reka ships no `Command`; you assemble it from Combobox + `useFilter` (that's what shadcn-vue does). Not needed for the walking skeleton. |

## Form layer

Forms are the bulk of this app — Students, Professional Drivers, Driving School
config and Finances are all CRUD over forms. This layer is the highest-leverage
thing to get right once.

| Surface | Verdict | Notes |
| --- | --- | --- |
| Field wrapper (label + control + hint + error + `aria-describedby`) | `hybrid` | The single most-reused component in the codebase. Reka has `Label` (handles the click-to-focus and text-selection quirks) but **no form primitive** — the id/aria wiring and error slot are ours. |
| Text / email / textarea | `ours` | Native elements. No primitive earns its keep. |
| Number | `reka` | `NumberField` — increment/decrement, min/max clamping, scrub, `Intl` format options. Better than a bare `input[type=number]`. |
| Currency (EUR) | `hybrid` | `NumberField` with `formatOptions: { style: 'currency', currency: 'EUR' }`. Money still **stored as integer cents** (see #2/#3); the field converts at the edge. |
| Checkbox | `reka` | Indeterminate state + styleable box without `appearance:none` hacks. |
| Radio group | `reka` | Roving tabindex is the reason. |
| Switch | `reka` | Cheap win, correct `role="switch"`. |
| Select (single, short list) | `reka` | Licence class, status, vehicle type. |
| Combobox (typeahead over many) | `reka` | Pick a student / instructor / vehicle. Stable (not alpha), and `useFilter` ships with it. **The primitive that most justifies adopting Reka at all.** |
| Multi-select + chips | `reka` | `TagsInput` for free-form, or Combobox in `multiple` mode for a fixed set — "licence classes this instructor may teach" is the latter. |
| Date field | `reka` ⚠︎ | Segmented input. **Locale-aware segment order (DD.MM.YYYY vs MM/DD/YYYY) for free** is a large hand-roll avoided given EN+DE. |
| Date picker (field + calendar popover) | `reka` ⚠︎ | Birth date, licence issue date, invoice date. |
| Date range | `reka` ⚠︎ | Finance reporting period, instructor absence. |
| Time field | `reka` ⚠︎ | Lesson start/end. |
| File upload (student docs, avatar) | `ours` | Fake API means this is a local object URL. Keep it dumb. |
| Form validation + submit state | `gap` | No Reka equivalent — deliberately out of its scope. See [Gaps](#gaps--where-the-money-goes). |

## Data display

| Surface | Verdict | Notes |
| --- | --- | --- |
| Data table | `gap` | The big one. See [Gaps](#gaps--where-the-money-goes). |
| Pagination | `reka` | Reka ships a standalone `Pagination` primitive (page list, ellipsis, prev/next). Free — take it. |
| Badge / status pill | `ours` | Pure token exercise. Student status, invoice status, vehicle availability. |
| Avatar | `reka` | Image-load fallback state is fiddly enough to take for free. |
| Tabs | `reka` | Student detail sections; Driving School config sections. |
| Accordion / Collapsible | `reka` | Grouped filters, long config forms. |
| Tooltip | `reka` | Floating positioning + the focus/hover/touch matrix. |
| Popover | `reka` | Filter panels, quick-edit. |
| Dropdown menu (row `…` actions) | `reka` | Every table row. Typeahead + roving focus. |
| Context menu | `reka` | Right-click a planner slot. Same primitive family, near-zero marginal cost. |
| Dialog / modal | `reka` | Create & edit forms. Focus trap + scroll lock + `aria-hidden` on the background is exactly the "a11y-hard" line from #1. |
| Side sheet / drawer | `hybrid` | Student quick-look. **Use Dialog + our CSS transform, not Reka's `Drawer`** — Drawer is Alpha and its swipe/snap-point machinery is aimed at mobile sheets we don't need. Dialog gives the same a11y contract with no alpha exposure. |
| Separator | `ours` | An `<hr>` with tokens. Reka has one; not worth the import. |
| Progress bar | `reka` | Lessons completed toward exam readiness. |
| Card / panel | `ours` | Token surface. |
| Definition list (detail rows) | `ours` | `<dl>`. Student/vehicle/instructor detail views. |
| Stat tile / KPI | `ours` | Dashboard and Finances. |
| Chart (revenue over time) | `gap` | See [Gaps](#gaps--where-the-money-goes). |
| Month calendar grid | `reka` ⚠︎ | Reka `Calendar`. Fine for **availability display and date picking**. Not the planner. |
| Resource scheduler (day/week, columns, drag) | `gap` | The largest single build in the app. See [Gaps](#gaps--where-the-money-goes). |

## Per-section walk

**Dashboard.** Stat tiles, a revenue sparkline/chart, "today's lessons" list,
recent-activity list, empty states. Almost entirely `ours` — it's composition of
things the other sections already built. Nothing new from Reka. Deliberately the
last section to spec (per #1) because it's downstream of everything else.

**Driving School.** Fleet, locations, licence classes, course catalogue, opening
hours, school profile. Reads as: tabbed config area (`reka` Tabs) over several
small tables (`gap`) and forms (`ours` field layer + `reka` controls). Opening
hours is a bespoke weekly time-range editor — `ours`, composed of `reka`
TimeFields. Small but genuinely custom.

**Finances.** Price lists per licence class (editable table), invoices generated
from delivered lessons (table + detail + line items), payments, per-student
balance/debtors (table with sorting on money), revenue overview (chart + stat
tiles + date-range filter). Heaviest consumer of the **data table** and the only
consumer of **charts**. Every money cell goes through one `Money` display
component of ours — currency formatting is a locale concern, not a component
concern.

**Students.** The CRM core and the reference slice (#8). List (table, filter,
search, pagination) → detail (tabs: profile / lessons / documents / finance) →
create & edit (dialog or route-level form). Uses essentially the whole form
layer plus Tabs, Avatar, Badge, DropdownMenu, Dialog, DatePicker. **This is why
Students is the right reference slice: it exercises every shared component
except the scheduler and the chart.** If the shared UI layer is wrong, Students
finds out.

**Appointment Planner.** Resource calendar, week/day, columns = instructors or
vehicles, drag-to-book, conflict detection. The scheduler surface is `gap`
(ours, from scratch). Around it: `reka` Popover/ContextMenu for slot actions,
`reka` Dialog for the booking form, `reka` Select/Combobox inside it, `reka`
DateField for jumping to a date, and conflict feedback via `reka` Toast plus
inline warnings. The intelligence is validation logic (Vitest-covered per #1),
not UI — but the *surface* is the most custom thing here.

**Professional Drivers.** Instructors/staff. Structurally a twin of Students:
list → detail (profile / qualifications / availability / schedule) → forms. New
surfaces: licence-class multi-select (`reka` Combobox multiple) and an
availability editor (`ours`, month grid from `reka` Calendar + our selection
layer). Should reuse the Students slice almost wholesale — if it doesn't, the
Students abstraction was too tight.

## Date primitives — the one real risk

All twelve date components carry Reka's **Alpha** badge, and the badge is
undefined in their repo — no stability policy document exists. Meanwhile they're
the primitives with the highest hand-roll cost for this app.

Two hard consequences:

**`@internationalized/date` is in the public API, not an implementation detail.**
`DateValue` / `CalendarDate` / `CalendarDateTime` / `ZonedDateTime` are the
`modelValue` types. The values are immutable (reassign, don't mutate) and months
are **1-indexed**, unlike JS `Date`. It's a hard dependency of `reka-ui` but only
pulled into the bundle by date components (~12.7 KB gz, and a Dialog-only bundle
provably doesn't include it).

**This must not leak into the domain model.** Issue #2 defines the domain types;
they should speak ISO date strings or a domain type of ours, **not** `DateValue`.
The conversion happens inside `src/shared/ui/DateField.vue` and friends, using
the `reka-ui/date` helpers (`parseStringToDateValue`, `toDate`). If `CalendarDate`
appears in `features/students/types.ts`, the containment has failed and an alpha
API has reached the core of the app.

With that boundary held, the alpha risk is bounded to a handful of wrapper files
and the downside is a version pin. Worth taking — the EN/DE segmented-input
behaviour is genuinely expensive to reproduce.

One gotcha: `weekStartsOn` is an explicit prop, **not** derived from locale. DE
starts Monday, EN-US Sunday. Set it deliberately or German users get a wrong-
looking calendar.

## Styling — the portal caveat

This is where Reka rubs against issue #1's "vanilla CSS, `<style scoped>` per
SFC" decision, so it needs stating precisely. Verified empirically in
[reka-ui.md §3](./reka-ui.md), not taken from docs:

- Teleport does **not** strip Vue's scope id. Plain elements you write inside a
  portal keep their `data-v-*` and scoped rules match fine.
- But **Popper-positioned content loses it**: `PopoverContent`,
  `DropdownMenuContent`, `SelectContent`, `SelectViewport`, `TooltipContent` (and
  therefore `DatePickerContent`) render a floating wrapper div, so your class
  lands on a non-root element and gets no scope id. **Dialog is unaffected** —
  `DialogOverlay` and `DialogContent` keep it.
- **Reka's documented fix is wrong.** Their styling guide says to use `:deep()`.
  `:deep(.X)` compiles to `[data-v-x] .X`, which needs an ancestor carrying the
  scope id — teleported content sits under `<body>`, so it cannot match.

**Decision: portalled content is styled from a global stylesheet, not from
scoped blocks.** Concretely: `src/shared/ui/` components that portal keep their
trigger styling scoped, and put content styling in `src/styles/` (or a
`:global()` block) against the `data-*` state attributes Reka exposes
(`data-state`, `data-side`, `data-align`, `data-highlighted`, `data-disabled`).

This is not a real cost. There are ~6 portalling components, they all live in
`shared/ui/`, and a design-system layer wants those rules global anyway. It does
mean the "scoped by default" rule has one documented exception — worth writing
into the styling conventions when #4 lands the token layer.

## Gaps — where the money goes

Ranked by cost.

> **Two of these were declined when the first real screen was specified.** The
> Students slice ([#8](https://github.com/LouisLP/driving-school/issues/8),
> [docs/students-slice.md](../students-slice.md)) turned down **Valibot** — the
> domain validators shipped by #3 are already called by the seam on every write,
> so a schema library would be a second definition of "valid" — and **TanStack
> Table**, because the seam sorts, filters and pages server-side, leaving the
> client no row model to own. Decisions 5 and 7 of that document carry the
> reasoning. This section is preserved as written; where it disagrees with the
> slice, the slice is current.

**1. Resource scheduler (Appointment Planner).** Nothing headless in the Vue
ecosystem gives you resource-column day/week scheduling without also giving you
its styling and its data model, and Reka's date family is month-grid +
segmented-field only — no time axis, no columns, no events layer.
Recommendation: build it. It's a CSS grid (time rows × resource columns) plus
absolutely-positioned lesson blocks derived from start/duration, plus pointer-
event drag. Keep the conflict rules in pure functions under `features/planner/`
so they're unit-testable without the DOM — that's where the actual value is, and
it's the part that stays correct while the UI gets rewritten. Budget this as its
own multi-issue effort; do not let it block the walking skeleton.

**2. Data table.** Reka ships no table primitive (its only "Grid" is the calendar
month grid), and this app has at least six tables. Sorting, filtering,
pagination, column visibility, row selection, row actions. Two options:
- *Own composable* (`useDataTable`) returning sorted/filtered/paginated rows from
  a ref of data + a state object, rendering a plain semantic `<table>`. Full
  control, no dependency, and our datasets are seeded fake data — hundreds of
  rows, not millions.
- *TanStack Table v8* (`@tanstack/vue-table`). Real column model, more API than
  we need. Note `@tanstack/vue-virtual` already arrives transitively via Reka, so
  the TanStack family isn't foreign to the tree.

Recommendation: **own composable**, paired with Reka's `Pagination` for the
control strip. The scale doesn't justify the API surface, and "well-architected
codebase" is the stated goal (#1) — a table state composable is a good thing to
have written. Revisit only if column virtualisation or grouping shows up.

**3. Form validation.** No Reka primitive; deliberately outside its scope (it has
a `FormFieldProps` *type* for hidden native inputs and `data-invalid` attributes,
but no validation engine or error-message part). Needs a schema (Valibot —
smaller than Zod, tree-shakes better, same ergonomics) plus a thin `useForm`
composable of ours binding schema errors to the field wrapper's
`aria-describedby`. Domain rules (licence-class eligibility, booking conflicts)
live in `features/` as pure functions and are *called by* the schema, not defined
in it. Vitest covers those directly, per #1's "tests only where logic lives".

**4. Charts.** Revenue overview only, and only on two screens. Do not take a
charting dependency for a bar chart and a line. Hand-roll SVG against the token
layer — it's ~100 lines, it themes correctly for free, and it dodges the
"library that ships its own colours" fight with the design system.

**5. Drag and drop.** Planner-only. Native pointer events, no library. If it
spreads beyond the planner, reconsider.

## What adopting Reka actually buys

Worth stating explicitly so the dependency is justified rather than assumed. In
descending order of what it would cost us to hand-roll correctly:

1. **Focus trap + scroll lock + background `aria-hidden`** (Dialog, AlertDialog).
   Endless edge cases; genuinely hard to get right.
2. **Locale-aware segmented date/time input** (DateField, TimeField). EN+DE means
   segment order, separators and placeholders all vary. Large win — and the
   reason the alpha risk above is worth accepting.
3. **Typeahead + roving tabindex + collision-aware floating positioning**
   (Select, Combobox, DropdownMenu, ContextMenu, Popover, Tooltip).
4. **Toast** — region semantics, swipe dismissal, timer pause on hover/focus.
5. **Correct ARIA wiring across compound components** — the `aria-controls` /
   `aria-activedescendant` / `role` mesh that is easy to write and easy to write
   wrong.

Everything else on the `reka` list is opportunistic: we're already paying for the
dependency, so taking Avatar, Progress and Pagination from it is free.

Note the asymmetry with issue #1's stated line ("Reka only for a11y-hard
primitives"): this inventory takes a handful of easy primitives too, purely
because the dependency is already installed. That's a deliberate, cheap
relaxation — not a reopening of the decision.

## Cost of the dependency

- **Install:** `npm add reka-ui`, plus `@internationalized/date` once date
  components land. No Vue plugin, no CSS import, no build plugin required.
- **Bundle:** tree-shakes per component (`sideEffects: false`, ESM). Measured:
  Dialog 12.2 KB gz, Calendar 18.7 KB gz, whole library 214 KB gz. We'll import
  maybe 20 primitives, nowhere near the whole library.
- **Peer:** `vue >= 3.4`. Repo is on 3.5.40 ✓ (3.5 also unlocks `defer` on
  portals).
- **Transitives worth knowing about:** `@floating-ui/vue`, `@vueuse/core` v14,
  `aria-hidden`, `@tanstack/vue-virtual`, `@internationalized/date`.
- **Optional:** `reka-ui/resolver` with `unplugin-vue-components` for auto-import.
  **Skip it** — we wrap everything in `shared/ui/` anyway, so auto-importing raw
  primitives would work against the boundary this document depends on.

## Adoption plan

1. `src/shared/ui/` wraps every Reka primitive we use. Features never import
   `reka-ui` directly. Enforce with `no-restricted-imports` (allow only
   `src/shared/ui/**`). This one rule is what makes the alpha date primitives and
   the portal styling exception both containable.
2. Mount `ConfigProvider` at the app root with `:locale` bound to vue-i18n during
   #7 (app shell). Cheap now, annoying to retrofit once date components exist.
3. Build the **field wrapper + text input + button** first — foundation of every
   form, depends on nothing.
4. Then the Students slice (#8) pulls the rest through on demand. Do not build a
   component library up front; let the reference slice discover what's actually
   needed.
5. Pin `reka-ui` to an exact version while the date primitives stay Alpha. Review
   on upgrade rather than taking minors blind.

## Open questions for later issues

- **#2 (domain model):** confirm the domain speaks ISO strings, not `DateValue`.
- **#4 (token layer):** the portalled-content styling exception needs to be
  written into the styling conventions.
- **#7 (app shell):** `ConfigProvider` placement and locale binding.
- **#8 (Students slice):** first real test of the `shared/ui/` boundary.
