<script setup lang="ts">
/**
 * Cycles system → light → dark. One button rather than three: the setting is checked rarely and
 * the current state is visible from the app itself.
 */
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { useColorScheme } from '@/shared/composables/use-color-scheme'

const t = useT()
const { preference, cycle } = useColorScheme()

const ICONS = {
  system: 'lucide:monitor',
  light: 'lucide:sun',
  dark: 'lucide:moon',
} as const

const icon = computed(() => ICONS[preference.value])
const label = computed(() => `${t('shared.theme.label')}: ${t(`shared.theme.${preference.value}`)}`)
</script>

<template>
  <button type="button" class="theme-toggle" :title="label" :aria-label="label" @click="cycle">
    <Icon :icon="icon" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-lg);
  cursor: pointer;
  transition:
    background var(--transition-instant) var(--easing-standard),
    color var(--transition-instant) var(--easing-standard);
}

.theme-toggle:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
</style>
