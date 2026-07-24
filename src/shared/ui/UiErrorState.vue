<script setup lang="ts">
/**
 * The same shape as `UiEmptyState`, in the danger role, with a retry.
 *
 * A separate component rather than a `tone` prop because the two are never interchangeable: an
 * empty state is a place someone has arrived at, an error state is something that went wrong and
 * always offers a way to try again. Sharing one component would make the retry optional, and an
 * error a caller forgot to make retryable is a dead end.
 */
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
  /** The retry label. Rendered as a button that emits `retry`. */
  retryLabel?: string
}>(), {
  icon: 'lucide:circle-alert',
})

defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error" role="alert">
    <Icon :icon="icon" class="error__icon" aria-hidden="true" />

    <p class="error__title">
      {{ title }}
    </p>

    <p v-if="description" class="error__description">
      {{ description }}
    </p>

    <button v-if="retryLabel" type="button" class="error__retry" @click="$emit('retry')">
      <Icon icon="lucide:rotate-cw" aria-hidden="true" />
      {{ retryLabel }}
    </button>
  </div>
</template>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-3xl) var(--space-lg);
  text-align: center;
}

.error__icon {
  font-size: var(--text-3xl);
  color: var(--danger-text);
}

.error__title {
  font-weight: var(--weight-medium);
}

.error__description {
  max-inline-size: var(--measure-narrow);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.error__retry {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  margin-block-start: var(--space-xs);
  padding: var(--padding-control-block) var(--space-sm);
  border: var(--border-width-hairline) solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-raised);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

.error__retry:hover {
  background: var(--surface-hover);
}

.error__retry:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
</style>
