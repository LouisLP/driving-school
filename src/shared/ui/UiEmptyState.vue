<script setup lang="ts">
/**
 * The designed state for "there is nothing here".
 *
 * Deliberately takes an action slot rather than making it optional decoration: an empty state
 * whose only content is a sentence tells someone what happened and not what to do about it. Both
 * of the list's empty states and the record's no-enrolments state are this component with
 * different words and a different button — which is the point, because "no students yet" and
 * "nothing matched your filters" are different problems that need different buttons.
 */
withDefaults(defineProps<{
  /** Iconify name. */
  icon?: string
  title: string
  description?: string
}>(), {
  icon: 'lucide:inbox',
})
</script>

<template>
  <div class="empty">
    <span class="empty__icon" aria-hidden="true">
      <Icon :icon="icon" />
    </span>

    <p class="empty__title">
      {{ title }}
    </p>

    <p v-if="description" class="empty__description">
      {{ description }}
    </p>

    <div v-if="$slots.default" class="empty__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-3xl) var(--space-lg);
  text-align: center;
}

/*
 * The icon sits in a tinted disc rather than floating grey on the page. An empty state is the one
 * screen with nothing else on it, so it is the one place worth spending colour on: a bare grey
 * glyph reads as "this failed to load", a coloured mark reads as "this is a state".
 */
.empty__icon {
  display: grid;
  place-items: center;
  inline-size: 3.5rem;
  block-size: 3.5rem;
  margin-block-end: var(--space-2xs);
  border-radius: var(--radius-full);
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: var(--text-2xl);
}

.empty__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
}

.empty__description {
  max-inline-size: var(--measure-narrow);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.empty__action {
  margin-block-start: var(--space-xs);
}
</style>
