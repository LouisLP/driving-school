<script setup lang="ts">
/**
 * A modal dialog, over Reka's `Dialog`.
 *
 * The focus trap, the scroll lock, `aria-hidden` on the background and the return of focus to
 * whatever opened it — four things that are each fiddly to get right and each invisible when they
 * are wrong. This is the clearest case in the whole inventory for a wrapper.
 *
 * `dismissible: false` is what a dirty form sets. It stops the overlay click and the Escape key
 * from closing outright and emits `dismiss` instead, so the page can ask "discard changes?"
 * first. The close button stays — a dialog with no visible way out is a trap — but it emits the
 * same event rather than closing.
 *
 * Portalled to the body, so everything below the root is styled in `portal.css`.
 */
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { useT } from '@/i18n/use-t'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  /** Caps the dialog's width. A nine-field form wants more room than a one-field one. */
  size?: 'sm' | 'md'
  dismissible?: boolean
}>(), {
  size: 'md',
  dismissible: true,
})

const emit = defineEmits<{
  /** A dismissal a non-dismissible dialog intercepted. The caller decides what happens next. */
  dismiss: []
}>()

const open = defineModel<boolean>('open', { required: true })

const t = useT()

function onDismissAttempt(event: Event): void {
  if (props.dismissible)
    return

  event.preventDefault()
  emit('dismiss')
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="ui-dialog-overlay" />

      <DialogContent
        class="ui-dialog-content"
        :data-size="size"
        @escape-key-down="onDismissAttempt"
        @interact-outside="onDismissAttempt"
      >
        <header class="ui-dialog-header">
          <div class="ui-dialog-heading">
            <DialogTitle class="ui-dialog-title">
              {{ title }}
            </DialogTitle>

            <DialogDescription v-if="description" class="ui-dialog-description">
              {{ description }}
            </DialogDescription>
          </div>

          <DialogClose
            v-if="dismissible"
            class="ui-dialog-close"
            :aria-label="t('shared.actions.close')"
          >
            <Icon icon="lucide:x" />
          </DialogClose>

          <!-- Same button, but it asks rather than closes. -->
          <button
            v-else
            type="button"
            class="ui-dialog-close"
            :aria-label="t('shared.actions.close')"
            @click="emit('dismiss')"
          >
            <Icon icon="lucide:x" />
          </button>
        </header>

        <div class="ui-dialog-body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="ui-dialog-footer">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
