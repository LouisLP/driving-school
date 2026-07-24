<script setup lang="ts">
/**
 * The toast viewport, over Reka's `Toast`. Mounted once, at the app root.
 *
 * Reads the store and renders it; it raises nothing itself. Reka owns the per-toast timer, the
 * pause on hover and on focus, the swipe-to-dismiss and the F8 hotkey that moves focus into the
 * viewport — the last of which is the reason a toast is not simply a div with a `setTimeout`.
 *
 * Dismissal flows one way: Reka closes a toast, `update:open` reports it, and the store drops the
 * row. Keeping the array as the only source of truth is what stops a closed toast reappearing on
 * the next store write.
 */
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastViewport } from 'reka-ui'
import { useT } from '@/i18n/use-t'
import { useToastStore } from '@/shared/stores/toast.store'

const toasts = useToastStore()
const t = useT()
</script>

<template>
  <ToastProvider swipe-direction="right">
    <ToastRoot
      v-for="toast in toasts.toasts"
      :key="toast.id"
      class="ui-toast"
      :data-tone="toast.tone"
      :duration="toast.durationMs"
      :open="true"
      @update:open="toasts.dismiss(toast.id)"
    >
      <ToastDescription class="ui-toast__message">
        {{ toast.message }}
      </ToastDescription>

      <ToastClose class="ui-toast__close" :aria-label="t('shared.toast.close')">
        <Icon icon="lucide:x" />
      </ToastClose>
    </ToastRoot>

    <ToastViewport class="ui-toast-viewport" :label="t('shared.toast.label')" />
  </ToastProvider>
</template>
