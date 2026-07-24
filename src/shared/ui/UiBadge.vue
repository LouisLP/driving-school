<script setup lang="ts">
/**
 * A status pill: standings, enrolment statuses, licence-class chips.
 *
 * Five tones, and they are the four status roles from the token layer plus neutral — so a badge
 * can change meaning with one attribute and never picks a colour of its own. Three variants,
 * because the same tone has to work as a filled emphasis, as an inline label, and as the outlined
 * chip a licence class is written in.
 */
withDefaults(defineProps<{
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  variant?: 'solid' | 'subtle' | 'outline'
  /** A filled dot before the label. What makes a standing scannable down a column. */
  dot?: boolean
}>(), {
  tone: 'neutral',
  variant: 'subtle',
})
</script>

<template>
  <span class="badge" :data-tone="tone" :data-variant="variant">
    <span v-if="dot" class="badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.badge {
  --_subtle: var(--surface-sunken);
  --_solid: var(--border-strong);
  --_text: var(--text-secondary);
  --_border: var(--border-default);

  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  padding: 0 var(--space-xs);
  border: var(--border-width-hairline) solid transparent;
  border-radius: var(--radius-pill);
  background: var(--_subtle);
  color: var(--_text);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  line-height: 1.7;
  white-space: nowrap;
}

.badge[data-tone="info"] {
  --_subtle: var(--info-subtle);
  --_solid: var(--info-solid);
  --_text: var(--info-text);
  --_border: var(--info-border);
}

.badge[data-tone="success"] {
  --_subtle: var(--success-subtle);
  --_solid: var(--success-solid);
  --_text: var(--success-text);
  --_border: var(--success-border);
}

.badge[data-tone="warning"] {
  --_subtle: var(--warning-subtle);
  --_solid: var(--warning-solid);
  --_text: var(--warning-text);
  --_border: var(--warning-border);
}

.badge[data-tone="danger"] {
  --_subtle: var(--danger-subtle);
  --_solid: var(--danger-solid);
  --_text: var(--danger-text);
  --_border: var(--danger-border);
}

.badge[data-variant="solid"] {
  background: var(--_solid);
  color: var(--text-on-solid);
}

.badge[data-variant="outline"] {
  background: transparent;
  border-color: var(--_border);
  border-radius: var(--radius-sm);
}

.badge__dot {
  inline-size: 0.4em;
  block-size: 0.4em;
  border-radius: var(--radius-full);
  background: var(--_solid);
}

.badge[data-variant="solid"] .badge__dot {
  background: var(--text-on-solid);
}
</style>
