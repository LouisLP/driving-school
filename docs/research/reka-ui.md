# Reka UI — research notes

Researched 2026-07-23 against primary sources only: [reka-ui.com](https://reka-ui.com), the
[unovue/reka-ui](https://github.com/unovue/reka-ui) source tree (shallow clone of `main`), the
[npm registry entry](https://registry.npmjs.org/reka-ui), and the
[GitHub releases API](https://api.github.com/repos/unovue/reka-ui/releases). Where a claim was
verified by running code, the experiment is described inline.

---

## 1. Current version & status

- Latest published version is **2.10.1**, and `dist-tags.latest` points at it — [registry.npmjs.org/reka-ui/latest](https://registry.npmjs.org/reka-ui/latest), [packages/core/package.json](https://github.com/unovue/reka-ui/blob/main/packages/core/package.json).
- Published **2026-06-26**. Prior release 2.10.0 on 2026-06-20; the 2.x line opened with **2.0.0 on 2025-02-20**; the package was first created 2024-07-25 — from `npm view reka-ui time` (npm registry `time` object, [registry.npmjs.org/reka-ui](https://registry.npmjs.org/reka-ui)).
- **Vue peer requirement: `vue >= 3.4.0`** (single peer dependency; no `engines` field) — [packages/core/package.json](https://github.com/unovue/reka-ui/blob/main/packages/core/package.json).
- So: stable **2.x**, not 1.x. There is no 1.x on npm — the package was renamed from `radix-vue` and started at 1.0.0 under the old name; version history under `reka-ui` starts in the 1.x/2.x era with 2.0.0 as the first major of the renamed package ([npm time object](https://registry.npmjs.org/reka-ui)).
- **Recent breaking changes: essentially none.** 2.10.1 is fixes only (Enter/Space modifier handling, FocusScope nesting, Menu submenu focus, NumberField step snapping, ScrollArea/Presence unmount cleanup). 2.10.0 is additive (new **Drawer** primitive, `ConfigProvider.teleportTo`, `Dialog.unmountOnHide`, `Select.nullableValue`, Rating documented, Popper RTL/LTR, HoverCard `enableTouch`). 2.9.10 changed behaviour so `ConfigProvider`'s `useId` takes precedence over Vue's native `useId` to avoid SSR hydration mismatches — [releases API](https://api.github.com/repos/unovue/reka-ui/releases), [github.com/unovue/reka-ui/releases](https://github.com/unovue/reka-ui/releases).
- The only large documented breaking-change surface is the **Radix Vue → Reka UI migration** (v1 `radix-vue` → `reka-ui`): import rename, `--radix-*` CSS vars → `--reka-*`, `[data-radix-collection-item]` → `[data-reka-collection-item]`, and Combobox API rework (`filter-function` removed, `searchTerm`/`displayValue` moved from Root to Input) — [docs/guides/migration.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/migration.md), [reka-ui.com/docs/guides/migration](https://reka-ui.com/docs/guides/migration).

---

## 2. Full primitive inventory

Two authoritative lists agree: the source directory `packages/core/src/` and the docs sidebar
definition in `docs/.vitepress/config.ts`. Sidebar entries carrying an **Alpha** badge are flagged
below — this is the only stability marker Reka uses; there is no "unstable"/"beta" label anywhere in
the repo (grep for `unstable`/`Unstable` across `docs/content/docs/components/` and
`packages/core/src/` returns nothing).

Sources: [packages/core/src](https://github.com/unovue/reka-ui/tree/main/packages/core/src), [packages/core/src/index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts), [docs/.vitepress/config.ts](https://github.com/unovue/reka-ui/blob/main/docs/.vitepress/config.ts), [reka-ui.com/llms.txt](https://reka-ui.com/llms.txt).

### Form (16)

Autocomplete **(Alpha)**, Checkbox, Combobox, Editable, Listbox, Number Field, Label, Pin Input,
Radio Group, Rating **(Alpha)**, Select, Slider, Switch, Tags Input, Toggle, Toggle Group.

### Color (5) — all Alpha

Color Area, Color Field, Color Slider, Color Swatch, Color Swatch Picker.

### Dates (12) — all Alpha

Calendar, Date Field, Date Picker, Date Range Field, Date Range Picker, Range Calendar, Time Field,
Time Range Field, Month Picker, Month Range Picker, Year Picker, Year Range Picker.

### General (24)

Accordion, Alert Dialog, Aspect Ratio, Avatar, Collapsible, Context Menu, Dialog,
Drawer **(Alpha)**, Dropdown Menu, Hover Card, Menubar, Navigation Menu, Pagination, Popover,
Progress, Scroll Area, Separator, Splitter, Stepper, Tabs, **Toast**, Toolbar, Tooltip,
Tree **(Alpha)**.

### Utility components (7)

Config Provider, Focus Scope, Presence, Primitive, Roving Focus, Slot, Visually Hidden.

### Composables (9)

`useId`, `useDateFormatter`, `useDirection`, `useLocale`, `useEmitAsProps`, `useFilter`,
`useForwardExpose`, `useForwardProps`, `useForwardPropsEmits` (plus `useBodyScrollLock`,
`useStateMachine`, `createContext`, `withDefault` exported from `index.ts` but not in the sidebar).

### Internal-only directories (present in `src/`, not public components)

`Collection`, `DismissableLayer` (only its event types are exported), `FocusGuards`, `Menu`,
`Popper`, `Teleport`, `Viewport`, `ColorPicker` (shared color logic — **no `ColorPicker` component is
exported from `index.ts`**), `date`, `shared`, `test`.

Also exported: a `reka-ui/date` subpath of date helpers (`createMonth`, `createYear`, `createDecade`,
`createDateRange`, `isBefore`, `getWeekNumber`, …) and a set of color utilities (`parseColor`,
`colorToHex`, …) — [docs/guides/dates.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/dates.md), [index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts).

---

## 3. Styling model

### Truly unstyled — zero CSS shipped

- "Reka UI are unstyled and compatible with any styling solution giving you complete control over styling." You are also responsible for *functional* styles: "by default, a Dialog Overlay won't cover the entire viewport. You're responsible for adding those styles" — [docs/guides/styling.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/styling.md), [reka-ui.com/docs/guides/styling](https://reka-ui.com/docs/guides/styling).
- **Verified**: `find node_modules/reka-ui/dist -name "*.css"` on the installed 2.10.1 tarball returns **nothing**. No CSS file exists in the package, so **no CSS import is required or possible**. Getting Started and Installation never mention one — [reka-ui.com/docs/overview/installation](https://reka-ui.com/docs/overview/installation).

### `data-*` attributes for state styling

Stateful parts expose `data-state`; docs pages carry explicit `<DataAttributesTable>` blocks per part.
Real examples, quoted from source:

| Component part | Attributes | Source |
| --- | --- | --- |
| `DialogTrigger`, `DialogOverlay`, `DialogContent` | `[data-state]` = `open \| closed` | [dialog.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/dialog.md) |
| `SelectTrigger` | `[data-state]` = `open \| closed`; `[data-disabled]` present when disabled; `[data-placeholder]` present when has placeholder | [select.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/select.md) |
| `SelectContent` | `[data-state]`; `[data-side]` = `left \| right \| bottom \| top`; `[data-align]` = `start \| end \| center` | [select.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/select.md) |
| `SelectItem` | `[data-state]` = `checked \| unchecked`; `[data-highlighted]`; `[data-disabled]` | [select.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/select.md) |
| `CalendarCellTrigger` | `[data-selected]`, `[data-value]` (ISO string), `[data-disabled]`, `[data-unavailable]`, `[data-today]`, `[data-outside-view]`, `[data-outside-visible-view]`, `[data-focused]` | [calendar.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/calendar.md) |
| `CalendarRoot` / `DateField` roots | `[data-readonly]`, `[data-disabled]`, `[data-invalid]` | [calendar.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/calendar.md) |
| `TooltipContent` | `[data-side]`, `[data-align]` (reflect collision changes at runtime) | [reka-ui.com/docs/components/tooltip](https://reka-ui.com/docs/components/tooltip) |

`data-orientation` is used broadly (33 source files) for the axis-aware primitives (Accordion,
Tabs, Toolbar, Slider, Splitter, Menubar, RovingFocus, …); `data-disabled` appears in 129 source
files, `data-state` in 92 — counted by grepping `packages/core/src`
([source tree](https://github.com/unovue/reka-ui/tree/main/packages/core/src)).

CSS-variable escape hatches also exist for positioned content, e.g.
`--reka-tooltip-trigger-width`, `--reka-tooltip-content-available-height`,
`--reka-tooltip-content-transform-origin` — [reka-ui.com/docs/components/tooltip](https://reka-ui.com/docs/components/tooltip). These were the `--radix-*` vars before the rename — [migration.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/migration.md).

Styling idioms shown in the docs: `.AccordionItem[data-state="open"] { … }` for plain CSS, and
`data-[state=open]:border-gray-800` for Tailwind — [docs/guides/styling.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/styling.md).

### `as` / `asChild` render delegation (current API)

Both props live on `PrimitiveProps`, which every DOM-rendering part extends:

```ts
export interface PrimitiveProps {
  /** Change the default rendered element for the one passed as a child, merging their props and behavior. */
  asChild?: boolean
  /** The element or component this component should render as. Can be overwritten by `asChild`.
   *  @defaultValue "div" */
  as?: AsTag | Component
}
```

— [packages/core/src/Primitive/Primitive.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/Primitive/Primitive.ts).

Mechanism, straight from the implementation: `const asTag = props.asChild ? 'template' : props.as`.
If the resolved tag is a self-closing tag (`area`, `img`, `input`) it renders `h(asTag, attrs)` with
no slot (hydration safety); if it is not `template` it renders `h(props.as, attrs, { default: slots.default })`;
otherwise it renders the internal `Slot` component, which merges props/behaviour onto the first child
— [Primitive.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/Primitive/Primitive.ts).

Docs semantics: "All Reka UI parts that render a DOM element accept an `asChild` prop. When `asChild`
is set to `true`, Reka UI will not render a default DOM element, instead passing the props and
behavior required to make it functional to the first child of the slots." `asChild` nests arbitrarily
deep, which is the supported way to compose e.g. `TooltipTrigger` + `DialogTrigger` onto one custom
button. If you change the element type, accessibility becomes your responsibility —
[docs/guides/composition.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/composition.md), [reka-ui.com/docs/guides/composition](https://reka-ui.com/docs/guides/composition).

### Renderless / slot-props escape hatch

Yes — parts expose state through scoped slots, e.g. `<DialogRoot v-slot="{ close }">` for
programmatic close ([dialog.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/components/dialog.md)),
and `CalendarCellTrigger` exposes `dayValue`, `disabled`, `selected`, `today`, `outsideView`,
`outsideVisibleView`, `unavailable` ([reka-ui.com/docs/components/calendar](https://reka-ui.com/docs/components/calendar)).
`ComboboxVirtualizer` / `ListboxVirtualizer` / `TreeVirtualizer` are pure renderless wrappers driven by
`v-slot="{ option }"` ([docs/guides/virtualization.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/virtualization.md)).
There is no separate "renderless build" — the escape hatch is `asChild` + slot props.

### Portalled content vs. Vue `<style scoped>` — **verified empirically**

**The short version: it partially breaks, and Reka's own documented workaround (`:deep()`) does not
actually work for content teleported to `body`.**

Mechanism, from Vue's own docs ([vuejs.org/api/sfc-css-features.html](https://vuejs.org/api/sfc-css-features.html)):

- `<style scoped>` rewrites `.A { }` to `.A[data-v-xxx] { }`, and the compiler stamps `data-v-xxx`
  onto elements created in that SFC's template.
- "A child component's root node will be affected by both the parent's scoped CSS and the child's
  scoped CSS" — i.e. the scope id propagates one level into a child component's *root* element.
- `:deep(.B)` compiles to `[data-v-xxx] .B` — an **ancestor-descendant** selector.
- Vue's scoped-CSS docs say nothing about Teleport.

I verified the compiled output with `vue/compiler-sfc`'s `compileStyle` (scoped, id `data-v-abc`):

```
.A                 ->  .A[data-v-abc]
:deep(.B)          ->  [data-v-abc] .B
.C :deep(.D)       ->  .C[data-v-abc] .D
:global(.E)        ->  .E
```

I then mounted real Reka 2.10.1 components inside an SFC with `<style scoped>` (Vue 3.5, jsdom,
`@vue/test-utils`, `@vitejs/plugin-vue`) and inspected which rendered elements actually carry the
`data-v-*` attribute:

| Element (class applied in *my* SFC template) | carries `data-v-*`? | lands in |
| --- | --- | --- |
| `DialogTrigger` | ✅ yes | in-place |
| `DialogOverlay` | ✅ yes | `body` |
| `DialogContent` | ✅ yes | `body` |
| plain `<p>` inside `DialogContent` | ✅ yes | `body` |
| `PopoverTrigger` | ✅ yes | in-place |
| **`PopoverContent`** | ❌ **no** | `body` |
| plain `<span>` inside `PopoverContent` | ✅ yes | `body` |
| **`DropdownMenuContent`** | ❌ **no** | `body` |
| **`SelectContent`**, **`SelectViewport`** | ❌ **no** | `body` |
| **`TooltipContent`** | ❌ **no** | `body` |

Interpretation:

1. **Teleport itself does not strip the scope id.** Vnodes created in your SFC's render function keep
   `vnode.scopeId` wherever they end up in the DOM, so `<p class="Inner">` inside a portal still gets
   `data-v-xxx`, and `.Inner { }` in `<style scoped>` matches fine. Reka's `Teleport.vue` is a thin
   wrapper over Vue's built-in `<Teleport>` and does nothing to the scope id —
   [packages/core/src/Teleport/Teleport.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/Teleport/Teleport.vue).
2. **What breaks is scope-id inheritance onto a *component's* root element**, and only for the
   Popper-based parts. `PopoverContent` / `DropdownMenuContent` / `SelectContent` / `TooltipContent`
   render an outer floating-position wrapper `div` and put your `class` on an inner element, so the
   "parent styles the child's root node" rule no longer applies and no `data-v-*` is stamped. Dialog
   has no Popper wrapper, so `DialogOverlay`/`DialogContent` *do* keep the scope id.
3. **`:deep()` is the wrong fix for `body`-teleported nodes.** `:deep(.PopoverContent)` compiles to
   `[data-v-xxx] .PopoverContent`, which needs an ancestor carrying `data-v-xxx`. Teleported content
   sits directly under `<body>`, outside your component's subtree, so no such ancestor exists and the
   rule cannot match. Reka's styling guide nevertheless recommends exactly this
   ("you will need to use deep selectors to target them",
   [docs/guides/styling.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/styling.md)) —
   treat that recommendation as **unreliable**; per Vue's own definition of `:deep()`
   ([vuejs.org](https://vuejs.org/api/sfc-css-features.html)) it only works when the portal target is
   *inside* the styling component (e.g. `<DialogPortal disabled>` or `:to` an in-subtree element).

**Recommended workarounds** (in order of robustness for an app that portals Dialog/Popover/Select/Tooltip/DatePicker):

- **Don't scope the styles for portalled content.** Put those rules in a plain (unscoped) `<style>`
  block, a global stylesheet, or wrap them in `:global(...)` inside the scoped block —
  `:global(.E)` compiles to bare `.E` (verified above; [vuejs.org](https://vuejs.org/api/sfc-css-features.html)).
  This is the approach that always works and is what a design-system layer should do anyway.
- **Or keep the portal inside the component's subtree**: `<DialogPortal :disabled="true">` renders
  inline, or pass `:to` an element inside your subtree; then normal scoped rules and `:deep()` work.
  `DialogPortal`/`*Portal` props are `to`, `disabled`, `defer` (Vue ≥ 3.5), `forceMount` —
  [Teleport.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/Teleport/Teleport.vue), [reka-ui.com/docs/components/dialog](https://reka-ui.com/docs/components/dialog).
- **Or use `ConfigProvider :teleport-to`** to send every portal to a known app-level container and
  style from a global stylesheet rooted at that container —
  [ConfigProvider.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/ConfigProvider/ConfigProvider.vue).
- **Or style by `data-*`/utility classes** (Tailwind, CSS modules with `:global`, or plain BEM-ish
  global classes) rather than scoped SFC CSS for the portalled parts.

---

## 4. Bundle & tree-shaking

- **ESM-first and explicitly side-effect free**: `"type": "module"`, `"sideEffects": false`, dual
  `import`/`require` exports, `module: ./dist/index.js` — [packages/core/package.json](https://github.com/unovue/reka-ui/blob/main/packages/core/package.json).
- Subpath exports: `.`, `./internal`, `./constant`, `./date`, `./namespaced`, `./nuxt`, `./resolver` — same file.
- **Auto-import tooling** (not needed for tree-shaking, only for ergonomics):
  - Nuxt module: `modules: ['reka-ui/nuxt']`.
  - Vite/plain Vue: `unplugin-vue-components` resolver, `import RekaResolver from 'reka-ui/resolver'`, with an optional `prefix` option.
  — [docs/overview/installation.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/overview/installation.md), [reka-ui.com/docs/overview/installation](https://reka-ui.com/docs/overview/installation).
  - `reka-ui/namespaced` gives `import { Dialog } from 'reka-ui/namespaced'` → `<Dialog.Root>` / `<Dialog.Content>` — [docs/guides/namespaced-components.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/namespaced-components.md).
- The repo enforces per-component size budgets with `size-limit`, which is direct evidence that
  per-component tree-shaking is a maintained property — from
  [packages/core/.size-limit.json](https://github.com/unovue/reka-ui/blob/main/packages/core/.size-limit.json):
  AspectRatio 5 KB, Dialog 25 KB, Select 27 KB, Combobox 33 KB, Calendar 17 KB, DateField 19 KB,
  Tree 13 KB, Popover 21 KB, Tooltip 19 KB, **full library 160 KB**.

**Measured myself** (Vite 8 lib build, `vue` external, esbuild minify, reka-ui 2.10.1):

| Entry | minified | min+gzip |
| --- | --- | --- |
| `import * as R from 'reka-ui'` (everything) | 1092.2 KB | **214.0 KB** |
| Dialog (Root/Trigger/Portal/Overlay/Content) | 45.8 KB | **12.2 KB** |
| Calendar (Root/Header/Grid/Cell/CellTrigger) | 70.2 KB | **18.7 KB** |
| `import * as D from '@internationalized/date'` alone | 46.6 KB | **12.7 KB** |

Tree-shaking works: importing Dialog pulls ~12 KB gz, not the 214 KB whole library.

### Transitive dependencies (all from [packages/core/package.json](https://github.com/unovue/reka-ui/blob/main/packages/core/package.json))

`@floating-ui/dom ^1.6.13`, `@floating-ui/vue ^1.1.6`, `@internationalized/date ^3.5.0`,
`@internationalized/number ^3.5.0`, `@tanstack/vue-virtual ^3.12.0`, `@vueuse/core ^14.1.0`,
`@vueuse/shared ^14.1.0`, `aria-hidden ^1.2.4`, `defu ^6.1.5`, `ohash ^2.0.11`.

- **`@internationalized/date` IS a hard dependency** of `reka-ui` (not a peer, not optional) — same file. Installed version resolved to 3.12.2 in my test install.
- **It is only pulled in by the date/calendar primitives.** Verified by grepping the built bundles for calendar-system identifiers that only that package contains: the *full* bundle and the *Calendar* bundle both contain `gregory`/`islamic`/`buddhist`/`japanese`; the **Dialog-only bundle contains none of them**. So a Dialog/Popover/Select-only app does not pay for it.
- **Size ≈ 12.7 KB gzip / 46.6 KB minified** for the whole package (measured above). Reka's own budget for `CalendarRoot`+parts is 17 KB raw ([.size-limit.json](https://github.com/unovue/reka-ui/blob/main/packages/core/.size-limit.json)); my measured Calendar bundle is 18.7 KB gz, i.e. the date library dominates that number.
- **`@floating-ui/vue` is present** and used by all Popper-positioned parts (Popover, Tooltip, Select, DropdownMenu, ContextMenu, HoverCard, Menubar, DatePicker content). The library re-exports `type ReferenceElement` from `@floating-ui/vue` in its public `index.ts` — [index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts). It is also cited in the i18n guide as the reason `dir` must be provided — [docs/guides/i18n.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/i18n.md).
- **`aria-hidden` is present** and lands in the Dialog bundle (verified: the string `aria-hidden` appears in my Dialog-only build) — used to hide the rest of the page from AT for modal layers.
- **`@tanstack/vue-virtual` is present** and only used by the `Virtualizer` parts of Combobox, Listbox and Tree — [docs/guides/virtualization.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/virtualization.md).
- `@vueuse/core` + `@vueuse/shared` are also hard dependencies (v14). Small ones: `defu` (merge), `ohash` (hashing, used for ids), `@internationalized/number` (~0.6 KB gz).

---

## 5. Date / Calendar primitives

All twelve date components are **Alpha**-badged in the sidebar — [docs/.vitepress/config.ts](https://github.com/unovue/reka-ui/blob/main/docs/.vitepress/config.ts).

| Primitive | What it provides |
| --- | --- |
| **Calendar** | A single/multi-month month grid: `CalendarRoot`, `CalendarHeader`, `CalendarHeading`, `CalendarPrev`/`CalendarNext`, `CalendarGrid`, `CalendarGridHead`/`Body`/`Row`, `CalendarHeadCell`, `CalendarCell`, `CalendarCellTrigger`. Root props include `locale`, `weekStartsOn` (0–6), `fixedWeeks` ("always display 6 weeks"), `numberOfMonths`, `multiple`, `modelValue`, `placeholder`. — [reka-ui.com/docs/components/calendar](https://reka-ui.com/docs/components/calendar) |
| **RangeCalendar** | Same grid, range selection (`{ start, end }` `DateRange`). — [reka-ui.com/docs/components/range-calendar](https://reka-ui.com/docs/components/range-calendar) |
| **DateField** | Segmented text input (year/month/day/hour/… segments) via `DateFieldRoot` + `DateFieldInput`. Props: `modelValue?: DateValue \| null`, `placeholder?: DateValue`, `min/maxValue?: DateValue`, `granularity`, `hourCycle`, `locale`, `isDateUnavailable`, `disabled`, `readonly`. — [DateFieldRoot.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/DateField/DateFieldRoot.vue) |
| **DateRangePicker** / **DateRangeField** | Range equivalents of the above (`start`/`end` `DateValue`s). — [reka-ui.com/docs/components/date-range-picker](https://reka-ui.com/docs/components/date-range-picker) |
| **DatePicker** | DateField + Calendar inside a Popover: `DatePickerRoot`, `DatePickerField`, `DatePickerInput`, `DatePickerTrigger`, `DatePickerAnchor`, `DatePickerContent`, `DatePickerArrow`, `DatePickerClose`, `DatePickerCalendar`, `DatePickerHeader`/`Heading`/`Prev`/`Next`/`Grid`/`Cell`/`CellTrigger`. Root props: `modelValue: DateValue \| null`, `placeholder: DateValue`, `locale`, `granularity` (`day \| hour \| minute \| second`), `min/maxValue`, `isDateDisabled`/`isDateUnavailable` (`Matcher` fns). Emits `update:modelValue`, `update:open`, `update:placeholder`. — [reka-ui.com/docs/components/date-picker](https://reka-ui.com/docs/components/date-picker) |
| **TimeField** (+ TimeRangeField) | Segmented time input. Props use `TimeValue` (`defaultValue`, `placeholder`, `modelValue?: TimeValue \| null`, `min/maxValue`, `granularity`, `hourCycle`, `locale`). — [TimeFieldRoot.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/TimeField/TimeFieldRoot.vue) |
| Month/Year (Range) Pickers | Coarser-grained equivalents of DatePicker. — [llms.txt](https://reka-ui.com/llms.txt) |

### `@internationalized/date` types are in the public API — yes, unavoidably

- The docs are explicit: "The component depends on the `@internationalized/date` package … you'll need
  to install it in your project to use the date-related components", and "We use the `DateValue`
  objects provided by `@internationalized/date` to represent dates in the various components" —
  [docs/guides/dates.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/dates.md), [reka-ui.com/docs/guides/dates](https://reka-ui.com/docs/guides/dates).
- The three concrete types are `CalendarDate` (no time), `CalendarDateTime` (time, no zone),
  `ZonedDateTime` (time + zone). They are **immutable** — you must reassign
  (`date = date.add({ days: 1 })`) — and **months are 1-indexed**, unlike JS `Date` — same guide.
- Source confirms: `DateFieldRoot.vue` and `TimeFieldRoot.vue` both `import type { DateValue } from '@internationalized/date'` and type `modelValue` / `placeholder` with it — [DateFieldRoot.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/DateField/DateFieldRoot.vue).
- `DateValue`, `DateRange`, `TimeValue`, `SegmentPart`, `Formatter` are re-exported from `reka-ui` itself — [index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts). So you *can* type your app against `reka-ui` exports, but you still need `@internationalized/date` to *construct* values (`new CalendarDate(…)`, `parseDate('2024-07-10')`, `today(getLocalTimeZone())`).
- Bridging to/from JS `Date`/ISO strings is done with `reka-ui/date` helpers: `parseStringToDateValue`, `toDate`, `isCalendarDateTime`, `hasTime`, `getDaysInMonth`, `getWeekNumber`, `isBefore`/`isAfter`/`isBetween`, `createMonth`/`createYear`/`createDecade`/`createDateRange` — [docs/guides/dates.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/dates.md).

### Locale handling (relevant for EN/DE)

- Every date primitive takes an optional **`locale: string` prop** ("The locale to use for formatting dates") — [DateFieldRoot.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/DateField/DateFieldRoot.vue), [reka-ui.com/docs/components/calendar](https://reka-ui.com/docs/components/calendar).
- There is **also a provider**: `ConfigProvider` has a `locale` prop (default `'en'`), and the resolution order is implemented by `useLocale`:

  ```ts
  export function useLocale(locale?: Ref<string | undefined>) {
    const context = injectConfigProviderContext({ locale: ref('en') })
    return computed(() => locale?.value || context.locale?.value || 'en')
  }
  ```

  i.e. **per-component prop → ConfigProvider locale → `'en'`** — [packages/core/src/shared/useLocale.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/shared/useLocale.ts), [ConfigProvider.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/ConfigProvider/ConfigProvider.vue).
- Formatting is `Intl`-based via `useDateFormatter(locale, { hourCycle, … })` — [DateFieldRoot.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/DateField/DateFieldRoot.vue), [reka-ui.com/docs/utilities/use-date-formatter](https://reka-ui.com/docs/utilities/use-date-formatter). For an EN/DE app: bind `ConfigProvider :locale` to your vue-i18n locale and everything (weekday names, month names, segment order, hour cycle) follows. Note `weekStartsOn` is a separate explicit prop on Calendar — it is not derived from the locale ([reka-ui.com/docs/components/calendar](https://reka-ui.com/docs/components/calendar)).
- The i18n guide shows the exact wiring pattern of vue-i18n's `locale` + `ConfigProvider` (there it's demonstrated for `dir`, but the same provider carries `locale`) — [docs/guides/i18n.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/i18n.md).

---

## 6. What Reka does NOT ship

Determined by exhaustively reading the public export barrel
([packages/core/src/index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts)),
the source directory listing, and the docs sidebar
([docs/.vitepress/config.ts](https://github.com/unovue/reka-ui/blob/main/docs/.vitepress/config.ts)).

| Capability | Present? | Notes |
| --- | --- | --- |
| **Toast / notification** | ✅ **YES — it ships and is NOT alpha** | Parts: `ToastProvider`, `ToastRoot`, `ToastViewport`, `ToastTitle`, `ToastDescription`, `ToastAction` (`altText` required), `ToastClose`, plus `ToastPortal`. `ToastProvider` props: `duration` (5000 default), `swipeDirection`, `disableSwipe`, `label`; `ToastViewport.hotkey` defaults to `['F8']`. Listed under **General** with **no Alpha badge**, and `export * from './Toast'` is in `index.ts`. No deprecation or instability callout anywhere. — [reka-ui.com/docs/components/toast](https://reka-ui.com/docs/components/toast), [docs/.vitepress/config.ts](https://github.com/unovue/reka-ui/blob/main/docs/.vitepress/config.ts), [index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts) |
| **Data table / grid** | ❌ absent | No `Table*`/`DataTable*`/`Grid*` export. `CalendarGrid` is the only "Grid" and it is the month grid. Nothing for sorting/paging/column resizing (only a standalone `Pagination` primitive). |
| **Form validation** | ❌ absent | No `Form`/`Field`/`FormMessage` component (Radix UI React's `Form` has no Reka counterpart). There is a `FormFieldProps` *type* (`name`, `required`, …) that individual inputs use to render hidden native inputs, and `data-invalid` attributes — but no validation engine, resolver, or error-message primitive. — [index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts) |
| **Resource / scheduler calendar (day-week column view)** | ❌ absent | The date family is month-grid + segmented-field only (Calendar, RangeCalendar, Month/Year pickers). No time-axis, no day/week columns, no events layer. — [docs/.vitepress/config.ts](https://github.com/unovue/reka-ui/blob/main/docs/.vitepress/config.ts) |
| **Charts** | ❌ absent | Nothing chart/graph/plot related in `src/` or the sidebar. |
| **Command palette** | ❌ absent | No `Command*` export. The closest building blocks are `Combobox` (+ `useFilter`, `ComboboxVirtualizer`), `Listbox` and `Autocomplete` (Alpha) — you would assemble a palette yourself, as shadcn-vue does. — [index.ts](https://github.com/unovue/reka-ui/blob/main/packages/core/src/index.ts) |

Other things you might expect and *do* get: `Drawer` (Alpha, swipe-to-dismiss, snap points, nested),
`Splitter` (resizable panes), `Stepper`, `Tree` (Alpha, virtualizable), `ScrollArea`, `Editable`,
`Rating` (Alpha), the whole Color family (all Alpha) — [docs/.vitepress/config.ts](https://github.com/unovue/reka-ui/blob/main/docs/.vitepress/config.ts).

---

## 7. Vite + Vue 3 setup (non-Nuxt)

### Minimal install

```sh
npm add reka-ui
# only if you use any date/calendar primitive:
npm add @internationalized/date
```

— [reka-ui.com/docs/overview/installation](https://reka-ui.com/docs/overview/installation), [docs/guides/dates.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/dates.md).

No CSS import, no Vue plugin, no `app.use(...)`. You import parts directly and compose them:

```vue
<script setup lang="ts">
import { PopoverArrow, PopoverClose, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger>More info</PopoverTrigger>
    <PopoverPortal>
      <PopoverContent>
        Some more info...
        <PopoverClose />
        <PopoverArrow />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
```

— [docs/overview/getting-started.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/overview/getting-started.md), [reka-ui.com/docs/overview/getting-started](https://reka-ui.com/docs/overview/getting-started).

### Optional auto-import (Vite)

```ts
import RekaResolver from 'reka-ui/resolver'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  plugins: [
    vue(),
    Components({ dts: true, resolvers: [RekaResolver()] }), // RekaResolver({ prefix: '' }) to change the prefix
  ],
})
```

— [docs/overview/installation.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/overview/installation.md).

### Root provider: `ConfigProvider` (optional, but you want it here)

Not required for the library to work — every primitive falls back to defaults via
`injectConfigProviderContext({...defaults})`. But for an EN/DE app you should mount it once at the
app root to set `locale` (and `dir` if you ever add an RTL language). Full prop list, verbatim from
[packages/core/src/ConfigProvider/ConfigProvider.vue](https://github.com/unovue/reka-ui/blob/main/packages/core/src/ConfigProvider/ConfigProvider.vue)
(mirrored at [reka-ui.com/docs/utilities/config-provider](https://reka-ui.com/docs/utilities/config-provider)):

| Prop | Type | Default | Meaning (from the source JSDoc) |
| --- | --- | --- | --- |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | "The global reading direction of your application. This will be inherited by all primitives." No `auto` value. |
| `locale` | `string` | `'en'` | "The global locale of your application. This will be inherited by all primitives." |
| `scrollBody` | `boolean \| ScrollBodyOption` | `true` | Global body-scroll-lock behaviour for modal primitives. |
| `nonce` | `string` | `undefined` | Global CSP `nonce` for injected styles. |
| `teleportTo` | `string \| HTMLElement` | `undefined` | "The global default teleport target for all portalled primitives (e.g. `Dialog`, `Popover`, `Tooltip`). Individual `*Portal` components can still override this via their own `to` prop. Useful when rendering inside a custom element / shadow DOM." Added in 2.10.0. |
| `useId` | `() => string` | `undefined` | "The global `useId` injection as a workaround for preventing hydration issue." Since 2.9.10 it takes precedence over Vue's native `useId`. |

`ConfigProvider` sets `inheritAttrs: false` and renders nothing but `<slot />`.

Suggested root wiring for this repo (EN/DE, vue-i18n already installed):

```vue
<script setup lang="ts">
import { ConfigProvider } from 'reka-ui'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
</script>

<template>
  <ConfigProvider :locale="locale">
    <RouterView />
  </ConfigProvider>
</template>
```

(Pattern derived from [docs/guides/i18n.md](https://github.com/unovue/reka-ui/blob/main/docs/content/docs/guides/i18n.md), which shows the identical wiring for `dir` with `vue-i18n` + `useTextDirection`.)

Compatibility with this repo: it has `vue ^3.5.40` and `vite ^8.1.5`
(`package.json`), comfortably above the `vue >= 3.4.0` peer requirement, and Vue ≥ 3.5 unlocks the
`defer` prop on Reka's Portal components.

---

## Confidence & gaps

**High confidence** (read directly from source / package metadata / measured locally):
version and publish dates, peer range, dependency list, `sideEffects: false`, subpath exports,
absence of any CSS file, `PrimitiveProps` (`as`/`asChild`) semantics, `ConfigProvider` props and
defaults, `useLocale` resolution order, `DateValue`/`TimeValue` in the public date API, the full
component inventory and which entries carry the Alpha badge, Toast's existence and non-alpha status,
the absence of table/form/chart/command/scheduler primitives, and the bundle measurements.

**Verified experimentally by me, not stated by any doc** (so: reproducible, but not "official"):

- The scope-id table in §3 — measured with reka-ui 2.10.1 + Vue 3.5 under jsdom via
  `@vue/test-utils`. Real-browser behaviour should be identical (the scope id is applied at vnode
  patch time, not by any DOM API jsdom stubs), but I did not run it in a real browser.
- The `:deep()`-doesn't-reach-`body` conclusion follows from Vue's documented compilation of
  `:deep()` (which I confirmed with `compileStyle`) plus plain CSS descendant-combinator semantics.
  I did not inject a stylesheet and read `getComputedStyle` to demonstrate the non-match end to end.
  **This directly contradicts Reka's own styling guide**, which recommends `:deep()` for teleported
  elements. If this matters for a design decision, spend 20 minutes reproducing it in a browser.
- Which packages land in which bundle (§4) — inferred from grepping minified output for
  calendar-system identifiers and the `aria-hidden` string, not from a module-level bundle analyzer.
  The direction of the result is unambiguous, the exact byte attribution is not.

**Not verified / gaps:**

- No 1.x ever existed under the name `reka-ui`; I did not chase the full `radix-vue` version history
  to state precisely which radix-vue version corresponds to reka-ui 1.0.
- I did not enumerate the per-part props of every one of the ~57 documented components — only those
  named in the questions (Dialog, Select, Tooltip, Calendar, DatePicker, DateField, TimeField, Toast,
  ConfigProvider, Primitive).
- The exact meaning of the **Alpha** badge (API-unstable? feature-incomplete?) is nowhere defined in
  the repo; I found no policy document. Treat all 12 date primitives, all 5 color primitives,
  Autocomplete, Rating, Drawer and Tree as "API may change" on that basis alone.
- Docs pages fetched as `.md` from reka-ui.com are rendered summaries in some cases; where precision
  mattered I re-read the file from the git clone instead, but a few table quotes (Tooltip CSS vars,
  Toast prop defaults) come from the site rendering only.
- `@internationalized/date` size is measured for the *whole* package; the subset Reka actually pulls
  in for a Calendar-only app is smaller than 12.7 KB gz but I did not isolate it.
