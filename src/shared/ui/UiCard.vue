<script setup lang="ts">
/**
 * The raised surface everything on a record page sits on: the identity panel, the account panel,
 * an enrolment card.
 *
 * A `<section>` rather than a `<div>` whenever it is given a title, and the title renders as a
 * heading, so a record page of six cards is six landmarks in a screen reader rather than one wall
 * of text. The `title` slot wins over the `title` prop when a caller needs a badge beside it.
 */
defineProps<{
  title?: string
  /** Heading level. The record page's cards sit under its `<h1>`, so `h2` is the default. */
  level?: 2 | 3
}>()

defineSlots<{
  title?: () => unknown
  /** Buttons on the header line — a status menu, an edit action. */
  actions?: () => unknown
  default: () => unknown
}>()
</script>

<template>
  <section class="card">
    <header v-if="title || $slots.title || $slots.actions" class="card__header">
      <component :is="level === 3 ? 'h3' : 'h2'" class="card__title">
        <slot name="title">
          {{ title }}
        </slot>
      </component>

      <div v-if="$slots.actions" class="card__actions">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--padding-card);
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
}

.card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

/*
 * An uppercase eyebrow, so it stays the display face's job — Clash Display in caps at 14px is a
 * label with a voice, where the same face at a heading size here would compete with the page `h1`.
 * The `base` layer sets `--font-display` on `h2`/`h3` already; this only pins the rest.
 */
.card__title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--text-muted);
}

/* An accent tick before the label. The one bit of colour on an otherwise plain panel header, and
   what makes a column of six cards scan as six things rather than one long page. */
.card__title::before {
  content: "";
  flex: none;
  inline-size: var(--space-3xs);
  block-size: 0.85em;
  border-radius: var(--radius-pill);
  background: var(--accent-gradient);
}

.card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>
