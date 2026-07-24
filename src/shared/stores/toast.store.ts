import { defineStore } from 'pinia'
import { ref } from 'vue'

/** How long a toast stays before it dismisses itself. Errors are given longer to be read. */
const DEFAULT_DURATION_MS = 5000
const ERROR_DURATION_MS = 8000

export type ToastTone = 'success' | 'danger' | 'neutral'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  /** Milliseconds. `UiToaster` hands this to Reka, which owns the timer and the pause-on-hover. */
  durationMs: number
}

/**
 * The app's toasts.
 *
 * Pinia rather than a composable because a toast outlives the route that raised it: creating a
 * student navigates to the new record, and the "Student created" toast has to survive that
 * navigation. That is one of the three uses `docs/api-seam.md` reserves Pinia for — state that
 * outlives a route and is not server data.
 *
 * `UiToaster` renders this; `useToast()` raises. Nothing else touches the array.
 */
export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  let nextId = 0

  function show(message: string, tone: ToastTone = 'neutral'): number {
    const id = (nextId += 1)

    toasts.value = [...toasts.value, {
      id,
      tone,
      message,
      durationMs: tone === 'danger' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS,
    }]

    return id
  }

  /** Called when Reka's own timer runs out, or when someone hits the close button. */
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter(it => it.id !== id)
  }

  return { toasts, show, dismiss }
})

export interface Toaster {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

/**
 * How a feature raises a toast.
 *
 * Deliberately three verbs rather than the store's `show(message, tone)`: the tone of a toast is
 * decided by what happened, not by whoever is writing the call, and three named cases keep a
 * success from ever being raised in the danger role by accident.
 */
export function useToast(): Toaster {
  const store = useToastStore()

  return {
    success: message => void store.show(message, 'success'),
    error: message => void store.show(message, 'danger'),
    info: message => void store.show(message, 'neutral'),
  }
}
