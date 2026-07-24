<script setup lang="ts">
/**
 * The app's button.
 *
 * Ours rather than a Reka wrapper: a button is a `<button>`, and there is nothing about focus,
 * keyboard or ARIA that the platform does not already get right. What it earns as a component is
 * the four variants agreeing on their tokens, and `loading` meaning the same thing everywhere.
 *
 * Variants are set through one local custom property per role, defaulting to a semantic token —
 * the pattern `tokens/semantic.css` describes, and the reason there is no `--button-bg` tier.
 */
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  /** Shows a spinner and blocks the press, without changing the button's width. */
  loading?: boolean
  disabled?: boolean
  /** Square, for a bare icon. The caller still owes it an `aria-label`. */
  iconOnly?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :data-variant="variant"
    :data-size="size"
    :data-icon-only="iconOnly ? '' : undefined"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="button"
  >
    <!-- The spinner replaces the icon rather than joining it, so nothing reflows mid-request. -->
    <Icon v-if="loading" icon="lucide:loader-circle" class="button__spinner" />
    <slot />
  </button>
</template>

<style scoped>
.button {
  --_surface: var(--surface-raised);
  --_surface-hover: var(--surface-hover);
  --_text: var(--text-primary);
  --_border: var(--border-default);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2xs);
  padding: var(--padding-control-block) var(--space-sm);
  border: var(--border-width-hairline) solid var(--_border);
  border-radius: var(--radius-control);
  background: var(--_surface);
  color: var(--_text);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  line-height: var(--leading-tight);
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--transition-instant) var(--easing-standard);
}

.button:hover:not(:disabled) {
  background: var(--_surface-hover);
}

.button:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.button:disabled {
  background: var(--surface-disabled);
  border-color: var(--border-subtle);
  color: var(--text-disabled);
  cursor: not-allowed;
}

/* A busy button is disabled, but it is not unavailable — it should not read as greyed out. */
.button[aria-busy="true"] {
  background: var(--_surface);
  border-color: var(--_border);
  color: var(--_text);
  cursor: progress;
}

.button[data-variant="primary"] {
  --_surface: var(--accent-solid);
  --_surface-hover: var(--accent-solid-hover);
  --_text: var(--text-on-solid);
  --_border: transparent;
}

.button[data-variant="danger"] {
  --_surface: var(--danger-solid);
  --_surface-hover: var(--danger-solid-hover);
  --_text: var(--text-on-solid);
  --_border: transparent;
}

.button[data-variant="ghost"] {
  --_surface: transparent;
  --_text: var(--text-secondary);
  --_border: transparent;
}

.button[data-size="sm"] {
  padding: var(--space-3xs) var(--space-xs);
  font-size: var(--text-xs);
}

.button[data-icon-only] {
  padding: var(--space-2xs);
  aspect-ratio: 1;
}

.button[data-icon-only][data-size="sm"] {
  padding: var(--space-3xs);
}

.button__spinner {
  animation: button-spin var(--duration-xl) linear infinite;
}

@keyframes button-spin {
  to { rotate: 1turn; }
}

@media (prefers-reduced-motion: reduce) {
  .button__spinner {
    animation: none;
  }
}
</style>
