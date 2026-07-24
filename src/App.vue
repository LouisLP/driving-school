<script setup lang="ts">
/**
 * The root component: two app-wide providers around the router view, and nothing else.
 *
 * The chrome is still a route component (see `router/routes.ts`) — a nav bar or a dev panel would
 * belong to the shell, not here. What lives here is the two things that must sit OUTSIDE the
 * routed tree:
 *
 * - **`UiLocaleProvider`**, which binds Reka's `ConfigProvider` to the vue-i18n locale so every
 *   primitive follows the language switcher — what makes `UiDateField` reorder its segments for
 *   German. `main.ts` cannot host it: it is a component, and it needs the i18n plugin installed.
 * - **`UiToaster`**, because a toast outlives the route that raised it: creating a student
 *   navigates to the new record, and "Student created" has to survive the navigation. Mounted
 *   inside the shell it would unmount with it.
 *
 * `docs/students-slice.md` puts both in `main.ts`; they are here for the reason above, and the
 * doc has been amended to say so.
 */
import { UiLocaleProvider, UiToaster } from '@/shared/ui'
</script>

<template>
  <UiLocaleProvider>
    <RouterView />
    <UiToaster />
  </UiLocaleProvider>
</template>
