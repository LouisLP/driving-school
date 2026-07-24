<script setup lang="ts">
/**
 * The pager, over Reka's `Pagination`.
 *
 * Reka owns the arithmetic that is annoying to get right — which page numbers to show around the
 * current one, where the ellipses fall, when the edges collapse — and the roving focus. What is
 * ours is the labelling: every control is named in words, because "‹" and "3" are not names.
 *
 * Hidden entirely when everything fits on one page. A pager showing "1" is chrome that tells
 * nobody anything.
 */
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'

const props = defineProps<{
  total: number
  pageSize: number
}>()

const page = defineModel<number>('page', { required: true })

const t = useT()

const isNeeded = computed(() => props.total > props.pageSize)
</script>

<template>
  <PaginationRoot
    v-if="isNeeded"
    v-model:page="page"
    class="pagination"
    :total="total"
    :items-per-page="pageSize"
    :sibling-count="1"
    show-edges
    :aria-label="t('shared.pagination.label')"
  >
    <PaginationList v-slot="{ items }" class="pagination__list">
      <PaginationPrev class="pagination__step" :aria-label="t('shared.pagination.previous')">
        <Icon icon="lucide:chevron-left" />
      </PaginationPrev>

      <template v-for="(item, index) in items">
        <PaginationListItem
          v-if="item.type === 'page'"
          :key="`page-${item.value}`"
          class="pagination__page"
          :value="item.value"
          :aria-label="t('shared.pagination.page', { page: item.value })"
        >
          {{ item.value }}
        </PaginationListItem>

        <PaginationEllipsis
          v-else
          :key="`gap-${index}`"
          class="pagination__gap"
          :aria-label="t('shared.pagination.morePages')"
        >
          &hellip;
        </PaginationEllipsis>
      </template>

      <PaginationNext class="pagination__step" :aria-label="t('shared.pagination.next')">
        <Icon icon="lucide:chevron-right" />
      </PaginationNext>
    </PaginationList>
  </PaginationRoot>
</template>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
}

.pagination__list {
  display: flex;
  align-items: center;
  gap: var(--space-3xs);
}

.pagination__page,
.pagination__step {
  display: inline-grid;
  place-items: center;
  min-inline-size: 2rem;
  block-size: 2rem;
  padding-inline: var(--space-2xs);
  border: var(--border-width-hairline) solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.pagination__page:hover:not(:disabled),
.pagination__step:hover:not(:disabled) {
  background: var(--surface-hover);
}

.pagination__page:focus-visible,
.pagination__step:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.pagination__page[data-selected] {
  background: var(--accent-solid);
  color: var(--text-on-solid);
}

.pagination__step:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.pagination__gap {
  display: inline-grid;
  place-items: center;
  min-inline-size: 2rem;
  color: var(--text-muted);
}
</style>
