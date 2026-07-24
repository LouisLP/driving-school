<script setup lang="ts">
/**
 * The row-and-header actions menu, over Reka's `DropdownMenu`.
 *
 * Items come as data rather than as slotted markup, because every menu in this app is a short
 * list of labelled commands and one of them is sometimes disabled with a reason. Data keeps that
 * rule in one place — a disabled item carries its `disabledReason` as its `title`, so the answer
 * to "why can I not press this?" is where someone will look for it, and the seam's own conflict
 * message can be passed straight through.
 *
 * Portalled; its parts are styled in `portal.css`.
 */
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

export interface UiMenuItem {
  /** Returned by `select`. The caller switches on it. */
  id: string
  label: string
  /** Iconify name. */
  icon?: string
  disabled?: boolean
  /** Shown as the item's `title` when disabled. A disabled control owes an explanation. */
  disabledReason?: string
  /** Renders in the danger role, and sits below a separator. */
  destructive?: boolean
}

defineProps<{
  items: readonly UiMenuItem[]
  /** For the icon-only trigger the table rows use. */
  triggerLabel: string
  align?: 'start' | 'end'
}>()

defineEmits<{ select: [id: string] }>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger class="trigger" :aria-label="triggerLabel">
      <slot name="trigger">
        <Icon icon="lucide:ellipsis" />
      </slot>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent class="ui-menu-content" :align="align ?? 'end'" :side-offset="4">
        <template v-for="item in items" :key="item.id">
          <DropdownMenuSeparator v-if="item.destructive" class="ui-menu-separator" />

          <DropdownMenuItem
            class="ui-menu-item"
            :data-destructive="item.destructive ? '' : undefined"
            :disabled="item.disabled"
            :title="item.disabled ? item.disabledReason : undefined"
            @select="$emit('select', item.id)"
          >
            <Icon v-if="item.icon" :icon="item.icon" aria-hidden="true" />
            {{ item.label }}
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.trigger {
  display: inline-grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.trigger:hover,
.trigger[data-state="open"] {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.trigger:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
</style>
