<script setup lang="ts">
/**
 * A segmented date input — day, month and year as separate spinners, in the locale's own order.
 *
 * **The containment point for `@internationalized/date`.** `IsoDate` goes in, `IsoDate` comes out,
 * and `DateValue` never crosses this file. That is enforced by the `no-restricted-imports` rule in
 * `eslint.config.js`, and it is the whole reason the wrapper earns its weight: without it, a
 * calendar library's value type leaks into feature code, then into form state, then into the seam.
 *
 * Segment order follows the locale from `ConfigProvider`, which `App.vue` binds to the vue-i18n
 * locale — so switching to German reorders the segments and nothing else changes.
 *
 * Reka marks `DateField` alpha. The exposure is this one file, and the fallback if its API moves
 * is a native `<input type="date">` behind the same `IsoDate` interface.
 */
import type { CalendarDate } from '@internationalized/date'
import type { IsoDate } from '@/shared/domain'
import { parseDate } from '@internationalized/date'
import { DateFieldInput, DateFieldRoot } from 'reka-ui'
import { computed } from 'vue'

defineProps<{
  id?: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
}>()

/** An empty date field is `null`, never `''` — the domain models "no date" the same way. */
const model = defineModel<IsoDate | null>({ required: true })

const value = computed({
  get: () => {
    if (!model.value)
      return undefined

    try {
      return parseDate(model.value)
    }
    catch {
      // A malformed stored date is the validator's to report, not this component's to crash on.
      return undefined
    }
  },
  set: (next: CalendarDate | undefined) => {
    model.value = next ? (next.toString() as IsoDate) : null
  },
})
</script>

<template>
  <DateFieldRoot
    :id="id"
    v-slot="{ segments }"
    v-model="value"
    class="date"
    granularity="day"
    :disabled="disabled"
    :aria-describedby="describedBy"
    :aria-invalid="invalid || undefined"
  >
    <DateFieldInput
      v-for="segment in segments"
      :key="segment.part"
      class="date__segment"
      :part="segment.part"
    >
      {{ segment.value }}
    </DateFieldInput>
  </DateFieldRoot>
</template>

<style scoped>
.date {
  display: flex;
  align-items: center;
  inline-size: 100%;
  padding: var(--padding-control-block) var(--padding-control-inline);
  border: var(--border-width-hairline) solid var(--field-border);
  border-radius: var(--radius-control);
  background: var(--field-surface);
  color: var(--field-text);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.date:hover:not([data-disabled]) {
  border-color: var(--field-border-hover);
}

.date:focus-within {
  outline: var(--focus-ring);
  outline-offset: calc(var(--focus-ring-offset) * -1);
  border-color: var(--field-border-focus);
}

.date[aria-invalid="true"] {
  border-color: var(--field-border-invalid);
}

.date__segment {
  padding: 0 var(--space-3xs);
  border-radius: var(--radius-xs);
}

/* The separators between the numbers are not focusable and must not read as fields. */
.date__segment[data-reka-date-field-segment="literal"] {
  padding: 0;
  color: var(--text-muted);
}

.date__segment:focus {
  background: var(--accent-solid);
  color: var(--text-on-solid);
  outline: none;
}

.date__segment[data-placeholder] {
  color: var(--field-placeholder);
}
</style>
