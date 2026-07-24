<script setup lang="ts">
/**
 * A grey block standing in for content that has not arrived.
 *
 * Only for a FIRST load. Replacing a table someone can already read with grey boxes on every
 * refresh is a regression dressed as a loading state — the refreshing case dims the real rows
 * instead. See `docs/students-slice.md`, the five list states.
 *
 * The shimmer is driven by a motion token, so `prefers-reduced-motion` collapses it to a static
 * block without this file knowing the preference exists.
 */
withDefaults(defineProps<{
  /** Any CSS length. Defaults to filling its column. */
  width?: string
  height?: string
  /** Pill-shaped, for standing in for a badge. */
  rounded?: boolean
}>(), {
  width: '100%',
  height: '1em',
})
</script>

<template>
  <span
    class="skeleton"
    :class="{ 'skeleton--rounded': rounded }"
    :style="{ '--_width': width, '--_height': height }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton {
  display: block;
  inline-size: var(--_width);
  block-size: var(--_height);
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  background-image: linear-gradient(
    90deg,
    transparent,
    var(--surface-hover),
    transparent
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer var(--duration-xl) var(--easing-standard) infinite;
}

.skeleton--rounded {
  border-radius: var(--radius-pill);
}

@keyframes skeleton-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    background-image: none;
    animation: none;
  }
}
</style>
