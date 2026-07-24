<script setup lang="ts">
/**
 * A confirm, over Reka's `AlertDialog`.
 *
 * A separate component from `UiDialog` rather than a `variant` prop, because the accessibility
 * contract is genuinely different: `role="alertdialog"`, no dismiss on outside click, and focus
 * landing on Cancel rather than on the destructive action. Expressing that as a prop would make
 * every one of those a thing a caller could get wrong, and "delete" is the worst place to find out.
 *
 * Used for discarding a dirty form and for deleting a student. `tone="danger"` colours the confirm
 * button; it changes nothing else, because the a11y contract is the same for both.
 */
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'

withDefaults(defineProps<{
  title: string
  /** The body. A slot is available for anything that needs markup — a name in bold, a reason. */
  description?: string
  confirmLabel: string
  cancelLabel: string
  tone?: 'danger' | 'neutral'
  /** Disables the confirm while the request it triggers is in flight. */
  pending?: boolean
}>(), {
  tone: 'danger',
})

defineEmits<{ confirm: [] }>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="ui-dialog-overlay" />

      <AlertDialogContent class="ui-dialog-content" data-size="sm">
        <AlertDialogTitle class="ui-dialog-title">
          {{ title }}
        </AlertDialogTitle>

        <AlertDialogDescription v-if="description" class="ui-dialog-description">
          {{ description }}
        </AlertDialogDescription>

        <div v-if="$slots.default" class="ui-dialog-body">
          <slot />
        </div>

        <footer class="ui-dialog-footer">
          <!-- Cancel first in the DOM, so it is what focus and Escape land on. -->
          <AlertDialogCancel class="ui-alert-cancel">
            {{ cancelLabel }}
          </AlertDialogCancel>

          <!--
            A plain button rather than Reka's `AlertDialogAction`, which closes the dialog on
            click. Every confirm here triggers a request that can be refused — deleting a student
            with enrolments is a `conflict` — and a dialog that has already closed has nowhere to
            show the reason. So confirming emits, and the caller closes when the write succeeds.
          -->
          <button
            type="button"
            class="ui-alert-confirm"
            :data-tone="tone"
            :disabled="pending"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </footer>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
