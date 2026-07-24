<script setup lang="ts">
/**
 * A native `<textarea>` that grows with its content.
 *
 * The auto-grow is CSS, not JavaScript: `field-sizing: content` where the browser has it, with
 * `rows` as the floor everywhere else. That means no resize observer, no scroll-height read, and
 * no layout thrash on every keystroke — and where the property is unsupported the control is
 * simply a normal textarea, which is a fine place to land.
 */
withDefaults(defineProps<{
  id?: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  rows?: number
}>(), {
  rows: 3,
})

const model = defineModel<string>({ required: true })
</script>

<template>
  <textarea
    :id="id"
    v-model="model"
    class="textarea"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-describedby="describedBy"
    :aria-invalid="invalid || undefined"
  />
</template>

<style scoped>
.textarea {
  inline-size: 100%;
  min-inline-size: 0;
  padding: var(--padding-control-block) var(--padding-control-inline);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-control);
  background: var(--field-surface);
  color: var(--field-text);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  field-sizing: content;
  resize: vertical;
}

.textarea::placeholder {
  color: var(--field-placeholder);
}

.textarea:hover:not(:disabled) {
  border-color: var(--field-border-hover);
}

.textarea:focus-visible {
  outline: var(--focus-ring);
  outline-offset: calc(var(--focus-ring-offset) * -1);
  border-color: var(--field-border-focus);
}

.textarea[aria-invalid="true"] {
  border-color: var(--field-border-invalid);
}
</style>
