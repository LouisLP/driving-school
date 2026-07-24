<script setup lang="ts" generic="TField extends string">
/**
 * A sortable column header: a `<th>` with `aria-sort`, a button, and the next `Sort` on click.
 *
 * `aria-sort` is the reason this is a component. It has to be `none` on every other column and set
 * on exactly one, which is a rule a hand-written `<th>` gets right the day it is written and wrong
 * the day a column is added. Emitting the whole next `Sort<TField>` rather than a field name keeps
 * the toggle rule — same column flips direction, new column starts ascending — in one place too.
 *
 * The direction is also announced in text, because a caret is not available to a screen reader
 * and `aria-sort` is not announced by all of them.
 */
import type { Sort } from '@/shared/api'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'

const props = defineProps<{
  field: TField
  label: string
  /** The list's current sort, whatever column it is on. */
  sort: Sort<TField>
  /** The direction this column starts in. Dates read newest-first; names read A–Z. */
  initialDirection?: 'asc' | 'desc'
}>()

const emit = defineEmits<{ sort: [next: Sort<TField>] }>()

const t = useT()

const isActive = computed(() => props.sort.field === props.field)

const ariaSort = computed(() => {
  if (!isActive.value)
    return 'none'

  return props.sort.direction === 'asc' ? 'ascending' : 'descending'
})

const announcement = computed(() => {
  if (!isActive.value)
    return ''

  return props.sort.direction === 'asc'
    ? t('shared.table.sortedAscending')
    : t('shared.table.sortedDescending')
})

function toggle(): void {
  const direction = isActive.value
    ? (props.sort.direction === 'asc' ? 'desc' : 'asc')
    : (props.initialDirection ?? 'asc')

  emit('sort', { field: props.field, direction })
}
</script>

<template>
  <th scope="col" :aria-sort="ariaSort">
    <button type="button" class="sort" :data-active="isActive ? '' : undefined" @click="toggle">
      {{ label }}

      <Icon
        class="sort__icon"
        :icon="isActive
          ? (sort.direction === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down')
          : 'lucide:chevrons-up-down'"
        aria-hidden="true"
      />

      <span class="visually-hidden">{{ announcement }}</span>
    </button>
  </th>
</template>

<style scoped>
.sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

.sort:hover {
  color: var(--text-primary);
}

.sort:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.sort__icon {
  color: var(--text-placeholder);
}

.sort[data-active] {
  color: var(--text-primary);
}

.sort[data-active] .sort__icon {
  color: var(--text-accent);
}
</style>
