<script setup lang="ts">
/**
 * A real `<table>` in a scroll container, with a sticky header and the three body states.
 *
 * **No headless table library.** The seam sorts, filters and pages server-side — `StudentQuery`
 * carries `sort`, `page` and `pageSize` and returns `Page<T>` — so the client never owns a row
 * model, and every one of TanStack Table's strengths is work already done behind the seam.
 * Adopting it would mean paying a dependency to describe columns it will not act on, plus a
 * second source of truth for sort state that the URL already holds. See
 * `docs/students-slice.md`, decision 7.
 *
 * So what is shared here is the markup and behaviour that genuinely repeats — the scroll
 * container, the sticky header, `aria-busy`, and the empty and skeleton bodies. Columns stay in
 * the page as template, because a column IS markup: a licence-class cell is three chips and a
 * birthday cell is a formatted date, and expressing those as data buys nothing.
 *
 * ```vue
 * <UiDataTable :busy="isPending" :is-empty="rows.length === 0">
 *   <template #head><tr><th>…</th></tr></template>
 *   <template #body><tr v-for="row in rows">…</tr></template>
 *   <template #empty><UiEmptyState … /></template>
 * </UiDataTable>
 * ```
 */
defineProps<{
  /** A refresh over rows already on screen. Dims them; never swaps them for a skeleton. */
  busy?: boolean
  /** Renders the `empty` slot in place of the body. */
  isEmpty?: boolean
  /** An accessible name for the table. */
  caption: string
}>()

defineSlots<{
  head: () => unknown
  body: () => unknown
  empty?: () => unknown
}>()
</script>

<template>
  <div class="table-scroll">
    <table class="table" :aria-busy="busy || undefined">
      <caption class="visually-hidden">
        {{ caption }}
      </caption>

      <thead class="table__head">
        <slot name="head" />
      </thead>

      <tbody v-if="isEmpty">
        <tr>
          <!--
            One cell spanning the table. `colspan` would have to be counted by the caller and kept
            in step with its own columns; a full-width cell that ignores the grid does the same job
            and cannot drift.
          -->
          <td class="table__empty">
            <slot name="empty" />
          </td>
        </tr>
      </tbody>

      <tbody v-else :class="{ 'table__body--busy': busy }">
        <slot name="body" />
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
}

.table {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table__head :deep(th) {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--layer-raised);
  padding: var(--padding-cell) var(--space-md);
  background: var(--surface-raised);
  border-block-end: var(--border-width-hairline) solid var(--border-default);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  text-align: start;
  white-space: nowrap;
}

.table :deep(td) {
  padding: var(--padding-cell) var(--space-md);
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
  vertical-align: baseline;
}

.table :deep(tbody tr:hover) {
  background: var(--surface-hover);
}

/*
 * Refreshing dims the rows that are already readable rather than replacing them. Swapping a table
 * someone is reading for grey boxes is a regression dressed as a loading state.
 */
.table__body--busy {
  opacity: 0.6;
  transition: opacity var(--transition-quick) var(--easing-standard);
}

.table__empty {
  padding: 0;
  border: 0;
}

.table__empty:hover {
  background: none;
}
</style>
