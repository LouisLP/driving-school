<script setup lang="ts">
import { ProgressIndicator, ProgressRoot } from 'reka-ui'
/**
 * A bar toward a target.
 *
 * Wraps Reka's `Progress` purely for `role="progressbar"` and its ARIA value attributes, which is
 * exactly the sort of thing worth not hand-rolling twice.
 *
 * The bar is capped at 100 % while the label keeps the true count: `14 / 12` is information a
 * receptionist wants, and a bar drawn at 117 % is not — it is a rendering bug that happens to be
 * true. Over-target bars take the success role, so "past the minimum" reads at a glance.
 */
import { computed } from 'vue'

const props = defineProps<{
  value: number
  max: number
  /** Read out instead of the bare percentage — "7 of 14 theory lessons". */
  valueLabel: string
}>()

/** A target of zero means "not measured against anything"; drawing an empty bar would imply it is. */
const isMeasurable = computed(() => props.max > 0)

const percentage = computed(() =>
  isMeasurable.value ? Math.min(100, (props.value / props.max) * 100) : 0,
)

const isComplete = computed(() => isMeasurable.value && props.value >= props.max)
</script>

<template>
  <ProgressRoot
    class="progress"
    :model-value="value"
    :max="Math.max(max, value, 1)"
    :get-value-text="() => valueLabel"
    :data-complete="isComplete ? '' : undefined"
  >
    <ProgressIndicator class="progress__bar" :style="{ inlineSize: `${percentage}%` }" />
  </ProgressRoot>
</template>

<style scoped>
.progress {
  display: block;
  overflow: hidden;

  inline-size: 100%;
  block-size: var(--space-xs);
  border-radius: var(--radius-pill);
  background: var(--surface-sunken);
}

/*
 * Flat accent, not `--accent-gradient`. Tried and rejected: sized to the fill, a 20 % bar
 * compresses the whole sweep into 40px of noise; sized to the track, a 20 % bar shows only the
 * blue end and reads as a different colour from a full one. Progress is the wrong place for a
 * gradient — the length is the information, and the colour has to stay constant for that to read.
 */
.progress__bar {
  display: block;
  block-size: 100%;
  border-radius: var(--radius-pill);
  background: var(--accent-solid);
  transition: inline-size var(--transition-base) var(--easing-standard);
}

.progress[data-complete] .progress__bar {
  background: var(--success-solid);
}
</style>
