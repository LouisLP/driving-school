<script setup lang="ts">
/**
 * PROTOTYPE — the floating bar that flips between shell variants. Dev builds only; see
 * `use-shell-variant.ts` for the whole story and the deletion plan.
 */
import { onMounted, onUnmounted } from 'vue'
import { useShellVariant } from './use-shell-variant'

const { current, step, names } = useShellVariant()

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

function onKeydown(event: KeyboardEvent): void {
  if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target))
    return

  if (event.key === 'ArrowLeft')
    step(-1)
  else if (event.key === 'ArrowRight')
    step(1)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="switcher">
    <button type="button" class="switcher__arrow" aria-label="Previous shell variant" @click="step(-1)">
      ←
    </button>

    <span class="switcher__label">
      <strong>{{ current }}</strong> — {{ names[current] }}
    </span>

    <button type="button" class="switcher__arrow" aria-label="Next shell variant" @click="step(1)">
      →
    </button>
  </div>
</template>

<style scoped>
/*
 * Deliberately ignores the design system: this bar must never be mistaken for part of the shell
 * being evaluated. Hard-coded colours, on purpose, in a file that gets deleted.
 */
.switcher {
  position: fixed;
  inset-block-end: 1rem;
  inset-inline: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  inline-size: fit-content;
  margin-inline: auto;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: #18181b;
  color: #fafafa;
  font-size: 0.8125rem;
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
}

.switcher__label {
  padding-inline: 0.5rem;
  white-space: nowrap;
}

.switcher__arrow {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border: 0;
  border-radius: 9999px;
  background: #27272a;
  color: inherit;
  cursor: pointer;
}

.switcher__arrow:hover {
  background: #3f3f46;
}
</style>
