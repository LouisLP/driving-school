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
    <Icon :icon="icon" class="empty__icon" aria-hidden="true" />

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

.empty__icon {
  font-size: var(--text-3xl);
  color: var(--text-placeholder);
}

.empty__title {
  font-weight: var(--weight-medium);
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
