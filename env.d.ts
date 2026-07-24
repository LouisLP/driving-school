/// <reference types="vite/client" />

import type { Icon } from '@iconify/vue'

declare module 'vue' {
  /**
   * `Icon` is registered globally in `main.ts` — it appears in nearly every template, and an import
   * line per file for one leaf component is noise. Declaring it here is what makes `vue-tsc` (and
   * editor completion) see it.
   */
  interface GlobalComponents {
    Icon: typeof Icon
  }
}

export {}
