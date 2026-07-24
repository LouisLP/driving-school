<script setup lang="ts">
/**
 * Dev-only controls for the fake backend: how slow it is, how often it fails, and a way to force
 * the next call to fail so an error state can be looked at on purpose.
 *
 * Deliberately untranslated and outside the design system's component set — this is scaffolding
 * for whoever is building, not a screen. It renders nothing unless the fake api provided its
 * controls, so it disappears entirely the day a real backend is wired in.
 */
import type { FaultKind, LatencySetting } from '@/shared/api/fake'
import { inject, ref } from 'vue'
import { FAKE_API_CONTROLS_KEY } from '@/shared/api/fake'

const controls = inject(FAKE_API_CONTROLS_KEY, null)

const LATENCY_PRESETS: readonly { label: string, value: LatencySetting }[] = [
  { label: 'Instant', value: 0 },
  { label: 'Realistic', value: [150, 400] },
  { label: 'Slow', value: [800, 1600] },
  { label: 'Painful', value: [2500, 4000] },
]

const FAULTS: readonly FaultKind[] = ['network', 'conflict', 'notFound']

const latencyLabel = ref(labelFor(controls?.network.latencyMs ?? 0))
const failureRate = ref(controls?.network.failureRate ?? 0)

function labelFor(latency: LatencySetting): string {
  const match = LATENCY_PRESETS.find(
    preset => JSON.stringify(preset.value) === JSON.stringify(latency),
  )
  return match?.label ?? 'Realistic'
}

function applyLatency(label: string): void {
  const preset = LATENCY_PRESETS.find(it => it.label === label)
  if (preset)
    controls?.network.setLatency(preset.value)
}

function applyFailureRate(rate: number): void {
  controls?.network.setFailureRate(rate)
}

function reseed(): void {
  controls?.resetStorage()
  location.reload()
}
</script>

<template>
  <details v-if="controls" class="dev-panel">
    <summary>Fake API</summary>

    <div class="dev-panel__body">
      <label>
        Latency
        <select v-model="latencyLabel" @change="applyLatency(latencyLabel)">
          <option v-for="preset in LATENCY_PRESETS" :key="preset.label">
            {{ preset.label }}
          </option>
        </select>
      </label>

      <label>
        Failure rate: {{ Math.round(failureRate * 100) }}%
        <input
          v-model.number="failureRate"
          type="range"
          min="0"
          max="1"
          step="0.05"
          @input="applyFailureRate(failureRate)"
        >
      </label>

      <fieldset>
        <legend>Fail next call</legend>
        <button
          v-for="fault in FAULTS"
          :key="fault"
          type="button"
          @click="controls.network.failNext(fault)"
        >
          {{ fault }}
        </button>
      </fieldset>

      <button type="button" @click="reseed">
        Reset data
      </button>
    </div>
  </details>
</template>

<style scoped>
.dev-panel {
  position: fixed;
  right: var(--space-md);
  bottom: var(--space-md);
  z-index: var(--layer-toast);
  background: var(--surface-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-lg);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

summary {
  padding: var(--space-2xs) var(--space-sm);
  cursor: pointer;
  user-select: none;
}

.dev-panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm);
  border-top: 1px solid var(--border-subtle);
  min-inline-size: 14rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}

fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3xs);
  padding: var(--space-2xs);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
}

button {
  padding: var(--space-3xs) var(--space-2xs);
  background: var(--surface-raised);
  color: inherit;
  font: inherit;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  cursor: pointer;
}

button:hover {
  background: var(--surface-hover);
}
</style>
