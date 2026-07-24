<script setup lang="ts">
/**
 * The whole app is routed, and the chrome is a route component (see `router/routes.ts`), so there
 * is nothing left for the root component to do. Anything tempting to add here — a nav bar, a toast
 * viewport, a dev panel — belongs to the shell, which knows which routes want it.
 */
</script>

<template>
  <RouterView />
</template>
