<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. The floating variant switcher.
 *
 * Deliberately loud and obviously not part of the design being judged. Hidden in production
 * builds so a stray merge cannot ship it.
 */

import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{ variants: readonly { key: string, name: string }[] }>()

const route = useRoute()
const router = useRouter()

const isDev = import.meta.env.DEV

const current = computed(() => {
  const key = String(route.query.variant ?? props.variants[0]?.key ?? 'A')

  return props.variants.some(variant => variant.key === key) ? key : props.variants[0]!.key
})

const currentName = computed(
  () => props.variants.find(variant => variant.key === current.value)?.name ?? '',
)

function cycle(step: number): void {
  const index = props.variants.findIndex(variant => variant.key === current.value)
  const next = props.variants[(index + step + props.variants.length) % props.variants.length]!

  void router.replace({ query: { ...route.query, variant: next.key } })
}

function onKey(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null

  if (target?.matches('input, textarea, select, [contenteditable]'))
    return

  if (event.key === 'ArrowLeft')
    cycle(-1)
  else if (event.key === 'ArrowRight')
    cycle(1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

defineExpose({ current })
</script>

<template>
  <div v-if="isDev" class="switcher">
    <button type="button" aria-label="Previous variant" @click="cycle(-1)">
      ←
    </button>
    <span><b>{{ current }}</b> — {{ currentName }}</span>
    <button type="button" aria-label="Next variant" @click="cycle(1)">
      →
    </button>
  </div>
</template>

<style scoped>
.switcher {
  position: fixed;
  inset-block-end: var(--space-md);
  inset-inline-start: 50%;
  translate: -50% 0;
  z-index: var(--layer-tooltip);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-pill);
  background: light-dark(var(--neutral-900), var(--neutral-0));
  color: light-dark(var(--neutral-0), var(--neutral-900));
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-mono, monospace);
}

.switcher button {
  border: 0;
  border-radius: var(--radius-full);
  inline-size: 1.75rem;
  block-size: 1.75rem;
  background: transparent;
  color: inherit;
  font-size: var(--font-size-md);
  cursor: pointer;
}

.switcher button:hover {
  background: color-mix(in oklab, currentcolor 20%, transparent);
}
</style>
