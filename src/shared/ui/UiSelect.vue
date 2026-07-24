<script setup lang="ts" generic="T extends string">
/**
 * A single-choice select, over Reka's `Select`.
 *
 * A wrapper and not a `<select>`: a native select cannot be styled consistently across platforms,
 * and every one of this app's selects sits in a toolbar beside inputs that are. What Reka brings
 * is the typeahead, the keyboard model and the popper — all of which a hand-rolled listbox gets
 * subtly wrong.
 *
 * Its content is portalled to the body, so the parts below the trigger are styled in `portal.css`
 * rather than here: `<style scoped>` cannot reach a teleported node. See that file for why.
 *
 * `null` is a real choice — the "Any" row of a filter — and travels as a sentinel value, because
 * Reka reserves the empty string for "nothing selected".
 */
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'

export interface UiSelectOption<TValue extends string> {
  value: TValue | null
  label: string
  disabled?: boolean
}

const props = defineProps<{
  options: readonly UiSelectOption<T>[]
  id?: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  /** For a select with no visible label — a filter in a toolbar. */
  ariaLabel?: string
}>()

const model = defineModel<T | null>({ required: true })

const t = useT()

/** Reka reads `''` as "no value", so "no filter" needs a token of its own. Never displayed. */
const NONE = '__none__'

const selected = computed<string>({
  get: () => model.value ?? NONE,
  set: (next) => {
    model.value = next === NONE ? null : (next as T)
  },
})

const label = computed(() =>
  props.options.find(it => (it.value ?? NONE) === selected.value)?.label,
)
</script>

<template>
  <SelectRoot v-model="selected" :disabled="disabled">
    <SelectTrigger
      :id="id"
      class="trigger"
      :aria-label="ariaLabel"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || undefined"
    >
      <SelectValue :placeholder="placeholder ?? t('shared.select.placeholder')">
        {{ label }}
      </SelectValue>

      <SelectIcon class="trigger__icon">
        <Icon icon="lucide:chevron-down" />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent class="ui-select-content" position="popper" :side-offset="4">
        <SelectViewport class="ui-select-viewport">
          <SelectItem
            v-for="option in options"
            :key="option.value ?? NONE"
            class="ui-select-item"
            :value="option.value ?? NONE"
            :disabled="option.disabled"
          >
            <SelectItemIndicator class="ui-select-item__indicator">
              <Icon icon="lucide:check" />
            </SelectItemIndicator>
            <SelectItemText>{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  inline-size: 100%;
  min-inline-size: 0;
  padding: var(--padding-control-block) var(--padding-control-inline);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-control);
  background: var(--field-surface);
  color: var(--field-text);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  text-align: start;
  cursor: pointer;
}

.trigger:hover:not(:disabled) {
  border-color: var(--field-border-hover);
}

.trigger:focus-visible {
  outline: var(--focus-ring);
  outline-offset: calc(var(--focus-ring-offset) * -1);
  border-color: var(--field-border-focus);
}

.trigger[aria-invalid="true"] {
  border-color: var(--field-border-invalid);
}

.trigger:disabled {
  background: var(--field-surface-disabled);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.trigger__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}
</style>
