<script setup lang="ts">
/**
 * Rough instructor list. Second real list in the shell — one list could be tuned to flatter the
 * chrome, two cannot. Not the specified section.
 */
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'

const t = useT()
const api = useApi()

const { data, isPending } = useAsyncData(() => api.instructors.list())

/** Decorative only — the full name is right beside it, and the avatar is `aria-hidden`. */
function initials(instructor: { firstName: string, lastName: string }): string {
  return `${instructor.firstName[0] ?? ''}${instructor.lastName[0] ?? ''}`.toUpperCase()
}
</script>

<template>
  <p v-if="isPending && !data" class="muted">
    {{ t('shared.states.loading') }}
  </p>

  <ul v-else-if="data?.length" class="grid" style="--grid-min: 18rem">
    <li v-for="instructor in data" :key="instructor.id" class="card">
      <div class="card__head">
        <span class="card__avatar" aria-hidden="true">
          {{ initials(instructor) }}
        </span>

        <div>
          <p class="card__name">
            {{ instructor.firstName }} {{ instructor.lastName }}
          </p>
          <p class="card__meta">
            <Icon :icon="instructor.email ? 'lucide:mail' : 'lucide:phone'" aria-hidden="true" />
            {{ instructor.email ?? instructor.phone ?? '—' }}
          </p>
        </div>
      </div>

      <p class="card__classes">
        <span v-for="cls in instructor.teachableClasses" :key="cls" class="chip">{{ cls }}</span>
      </p>
    </li>
  </ul>

  <p v-else class="muted">
    {{ t('shared.states.empty') }}
  </p>
</template>

<style scoped>
.grid {
  padding: 0;
  list-style: none;
}

.card {
  padding: var(--padding-card);
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
  transition:
    transform var(--transition-base) var(--easing-emphasized),
    box-shadow var(--transition-base) var(--easing-standard),
    border-color var(--transition-base) var(--easing-standard);
}

.card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border);
  box-shadow: var(--shadow-md);
}

.card__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/*
 * Initials on the brand sweep. Every instructor gets the same gradient rather than a colour
 * derived from their name: a per-person hue looks lively for six people and turns into noise at
 * thirty, and it would imply a grouping the data does not have.
 */
.card__avatar {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: var(--radius-full);
  background: var(--accent-gradient);
  color: var(--text-on-solid);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wide);
}

.card__name {
  font-weight: var(--weight-semibold);
}

.card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.card__classes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  margin-block-start: var(--space-md);
}

.chip {
  display: inline-block;
  padding: 0 var(--space-xs);
  border: var(--border-width-hairline) solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  line-height: 1.7;
}

.muted {
  color: var(--text-muted);
}
</style>
