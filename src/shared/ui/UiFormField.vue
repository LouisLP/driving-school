<script setup lang="ts">
/**
 * A labelled control, and the accessibility wiring that goes with it.
 *
 * The most reused component in the app, and the reason it exists is the part nobody enjoys
 * writing twice: a stable id shared by the label and the control, `aria-describedby` pointing at
 * the hint AND the error when both are present, and `aria-invalid` following the error. Get that
 * wrong once per form and the app is inaccessible in a way no visual review catches.
 *
 * The control is a scoped slot rather than a prop, because a field wraps a text input, a select,
 * a date field and a fieldset of five inputs, and enumerating those as a `type` prop would be a
 * component that grows a branch per control.
 *
 * ```vue
 * <UiFormField v-slot="field" :label="t('students.fields.email')" :error="form.errors.value.email">
 *   <UiTextField v-model="form.values.email" v-bind="field" @blur="form.touch('email')" />
 * </UiFormField>
 * ```
 */
import { Label } from 'reka-ui'
import { computed, useId } from 'vue'
import { useT } from '@/i18n/use-t'

const props = defineProps<{
  label: string
  /** Standing guidance. Hidden while an error is showing — two messages at once is one too many. */
  hint?: string
  /** An i18n message key from the validator, already translated by the caller. */
  error?: string
  required?: boolean
  /**
   * Renders as a `<fieldset>` with a `<legend>`. For the address group, which the domain
   * validates as one thing and therefore reports one error against.
   */
  group?: boolean
}>()

const t = useT()

const id = useId()
const hintId = computed(() => `${id}-hint`)
const errorId = computed(() => `${id}-error`)

const describedBy = computed(() => {
  const ids = [props.hint ? hintId.value : null, props.error ? errorId.value : null]
  return ids.filter(Boolean).join(' ') || undefined
})
</script>

<template>
  <component :is="group ? 'fieldset' : 'div'" class="field">
    <component
      :is="group ? 'legend' : Label"
      v-bind="group ? {} : { for: id }"
      class="field__label"
    >
      {{ label }}
      <span v-if="required" class="field__required">
        <span aria-hidden="true">*</span>
        <span class="visually-hidden">{{ t('shared.form.required') }}</span>
      </span>
    </component>

    <slot
      :id="group ? undefined : id"
      :described-by="describedBy"
      :invalid="Boolean(error)"
    />

    <p v-if="hint && !error" :id="hintId" class="field__hint">
      {{ hint }}
    </p>

    <!-- Polite rather than assertive: an error appearing on blur should not interrupt a sentence. -->
    <p v-if="error" :id="errorId" class="field__error" role="alert">
      {{ error }}
    </p>
  </component>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-inline-size: 0;
  padding: 0;
  border: 0;
}

.field__label {
  color: var(--field-label);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.field__required {
  color: var(--danger-text);
}

.field__hint {
  color: var(--field-hint);
  font-size: var(--text-xs);
}

.field__error {
  color: var(--field-error);
  font-size: var(--text-xs);
}

/* A fieldset's own children stack; the group's controls are laid out by the caller. */
fieldset.field {
  gap: var(--space-xs);
}
</style>
