<script setup lang="ts">
/**
 * A native `<input>`, styled from the field tokens.
 *
 * Ours and not a wrapper: there is no accessibility behaviour in a text input that the platform
 * does not already have, and a headless one would be a div pretending. What it earns is that
 * every input in the app agrees on its border, its focus ring and its invalid state — the last of
 * which is driven by `aria-invalid` rather than a class, so the styling cannot drift from what a
 * screen reader is told.
 *
 * `id`, `describedBy` and `invalid` are what `UiFormField` hands down; a standalone input (the
 * list's search box) supplies its own `aria-label` and none of them.
 */
withDefaults(defineProps<{
  id?: string
  type?: 'text' | 'email' | 'tel' | 'search'
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  /** Iconify name, rendered inside the field. The search box's magnifier. */
  icon?: string
}>(), {
  type: 'text',
})

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="wrap" :data-with-icon="icon ? '' : undefined">
    <Icon v-if="icon" :icon="icon" class="wrap__icon" aria-hidden="true" />

    <input
      :id="id"
      v-model="model"
      class="input"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || undefined"
    >
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-inline-size: 0;
}

.wrap__icon {
  position: absolute;
  inset-inline-start: var(--space-xs);
  color: var(--text-placeholder);
  pointer-events: none;
}

.input {
  inline-size: 100%;
  min-inline-size: 0;
  padding: var(--padding-control-block) var(--padding-control-inline);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-control);
  background: var(--field-surface);
  color: var(--field-text);
  font-size: var(--text-sm);
}

.wrap[data-with-icon] .input {
  padding-inline-start: var(--space-xl);
}

.input::placeholder {
  color: var(--field-placeholder);
}

.input:hover:not(:disabled) {
  border-color: var(--field-border-hover);
}

.input:focus-visible {
  outline: var(--focus-ring);
  outline-offset: calc(var(--focus-ring-offset) * -1);
  border-color: var(--field-border-focus);
}

.input[aria-invalid="true"] {
  border-color: var(--field-border-invalid);
}

.input:disabled {
  background: var(--field-surface-disabled);
  color: var(--text-disabled);
  cursor: not-allowed;
}
</style>
