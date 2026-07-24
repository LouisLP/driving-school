<script setup lang="ts">
/**
 * EN / DE, as a segmented control.
 *
 * Two locales is few enough that a select would hide the choice behind a click. If a third locale
 * ever lands this becomes a Reka `Select` — the component boundary is here so that swap is local.
 *
 * Persistence and locale detection are not settled yet (see the "Locale detail" item on #1); this
 * only flips `locale` for the session.
 */
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from '@/i18n'
import { useT } from '@/i18n/use-t'

const { locale } = useI18n()
const t = useT()
</script>

<template>
  <div class="locale" role="group" :aria-label="t('shared.locale.label')">
    <button
      v-for="code in SUPPORTED_LOCALES"
      :key="code"
      type="button"
      class="locale__option"
      :aria-pressed="locale === code"
      :title="t(`shared.locale.${code}`)"
      @click="locale = code"
    >
      {{ code.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.locale {
  display: inline-flex;
  padding: var(--space-3xs);
  gap: var(--space-3xs);
  background: var(--surface-sunken);
  border-radius: var(--radius-pill);
}

.locale__option {
  padding: var(--space-3xs) var(--space-xs);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  cursor: pointer;
  transition:
    background var(--transition-instant) var(--easing-standard),
    color var(--transition-instant) var(--easing-standard);
}

.locale__option:hover {
  color: var(--text-primary);
}

.locale__option[aria-pressed="true"] {
  background: var(--surface-raised);
  color: var(--text-primary);
  box-shadow: var(--shadow-xs);
}
</style>
