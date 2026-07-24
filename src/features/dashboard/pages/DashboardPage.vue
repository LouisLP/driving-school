<script setup lang="ts">
/**
 * Rough dashboard — enough real data to judge the shell against, not the specified dashboard.
 * Issue #1 puts this section last on purpose: it is composition of what the other sections build.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'
import { toIsoDateTime } from '@/shared/domain'

const t = useT()
const { locale } = useI18n()
const api = useApi()

// vue-i18n's `d()` needs `datetimeFormats`, which is part of the unsettled locale-detail work.
// `toLocaleDateString` is the honest stand-in until then.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value)
}

const startOfToday = new Date()
startOfToday.setHours(0, 0, 0, 0)
const startOfTomorrow = new Date(startOfToday)
startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

const { data: activeStudents } = useAsyncData(
  () => api.students.list({ standing: 'active', pageSize: 1 }),
)
const { data: recent } = useAsyncData(
  () => api.students.list({ sort: { field: 'registeredAt', direction: 'desc' }, pageSize: 5 }),
)
const { data: today } = useAsyncData(
  () => api.appointments.list({
    from: toIsoDateTime(startOfToday),
    to: toIsoDateTime(startOfTomorrow),
  }),
)
const { data: fleet } = useAsyncData(() => api.vehicles.list())

/**
 * The four tiles as data rather than four near-identical blocks of template.
 *
 * The tone is not decoration picked per tile: each one borrows the status role that section's own
 * screens already use, so the colour a number is written in on the dashboard is the colour it is
 * written in everywhere else. Open invoices is the odd one out and takes `warning` — it is the only
 * number here that is a thing to do rather than a thing that is true.
 */
const tiles = computed(() => [
  {
    labelKey: 'dashboard.stats.activeStudents',
    icon: 'lucide:users',
    tone: 'accent',
    value: activeStudents.value?.total,
  },
  {
    labelKey: 'dashboard.stats.lessonsToday',
    icon: 'lucide:calendar-clock',
    tone: 'info',
    value: today.value?.length,
  },
  {
    labelKey: 'dashboard.stats.fleet',
    icon: 'lucide:car-front',
    tone: 'success',
    value: fleet.value?.length,
  },
  {
    labelKey: 'dashboard.stats.openInvoices',
    icon: 'lucide:receipt-euro',
    tone: 'warning',
    value: undefined,
  },
] as const)

/** Decorative only — the full name is right beside it, and the avatar is `aria-hidden`. */
function initials(student: { firstName: string, lastName: string }): string {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--gap-section)">
    <div class="grid" style="--grid-min: 13rem">
      <article v-for="tile in tiles" :key="tile.labelKey" class="tile" :data-tone="tile.tone">
        <span class="tile__icon">
          <Icon :icon="tile.icon" aria-hidden="true" />
        </span>
        <p class="tile__label">
          {{ t(tile.labelKey) }}
        </p>
        <p class="tile__value">
          {{ tile.value ?? '—' }}
        </p>
      </article>
    </div>

    <section class="stack">
      <h2 class="section__heading">
        <Icon icon="lucide:user-round-plus" class="section__icon" aria-hidden="true" />
        {{ t('dashboard.recentStudents') }}
      </h2>

      <ul v-if="recent?.items.length" class="recent">
        <li v-for="student in recent.items" :key="student.id" class="recent__row">
          <RouterLink
            class="recent__link"
            :to="{ name: ROUTE.studentDetail, params: { studentId: student.id } }"
          >
            <span class="recent__avatar" aria-hidden="true">{{ initials(student) }}</span>
            {{ student.lastName }}, {{ student.firstName }}
          </RouterLink>
          <span class="recent__meta">{{ formatDate(student.registeredAt) }}</span>
        </li>
      </ul>

      <p v-else class="muted">
        {{ t('shared.states.loading') }}
      </p>
    </section>
  </div>
</template>

<style scoped>
/*
 * One tile, four tones. The tone sets two local knobs and nothing else touches colour, which is
 * what keeps "add a fifth tile" from being a design decision.
 */
.tile {
  --_subtle: var(--accent-subtle);
  --_text: var(--accent-text);

  position: relative;
  overflow: hidden;

  /* The wash below is an opaque fill at its centre, so the tile's own children have to be lifted
     above it. `isolation` keeps that competition inside this card. */
  isolation: isolate;
  padding: var(--padding-card);
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
  transition:
    transform var(--transition-base) var(--easing-emphasized),
    box-shadow var(--transition-base) var(--easing-standard);
}

.tile[data-tone="info"] { --_subtle: var(--info-subtle); --_text: var(--info-text); }
.tile[data-tone="success"] { --_subtle: var(--success-subtle); --_text: var(--success-text); }
.tile[data-tone="warning"] { --_subtle: var(--warning-subtle); --_text: var(--warning-text); }

/*
 * A wash of the tile's own tone, bled out of the top-right corner. `radial-gradient` to
 * `transparent` rather than a flat fill, so four tiles side by side read as one surface with four
 * temperatures instead of four coloured cards competing with each other.
 */
.tile::after {
  content: "";
  position: absolute;
  inset-block-start: -40%;
  inset-inline-end: -20%;
  inline-size: 10rem;
  block-size: 10rem;
  z-index: -1;
  background: radial-gradient(circle, var(--_subtle) 0%, transparent 70%);
  pointer-events: none;
}

.tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.tile__icon {
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  margin-block-end: var(--space-sm);
  border-radius: var(--radius-control);
  background: var(--_subtle);
  color: var(--_text);
  font-size: var(--text-lg);
}

.tile__label {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.tile__value {
  margin-block-start: var(--space-2xs);
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-none);
  letter-spacing: var(--tracking-tight);

  /* The display face's proportional figures are the point of setting numbers in it. */
  font-variant-numeric: normal;
}

/* A heading with its icon, the pattern every section heading on the dashboard uses. */
.section__heading {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.section__icon {
  color: var(--accent-text);
  font-size: var(--text-lg);
}

.recent {
  padding: 0;
  list-style: none;
  border: var(--border-width-hairline) solid var(--border-subtle);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
}

.recent__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--padding-cell) var(--space-md);
  transition: background var(--transition-instant) var(--easing-standard);
}

.recent__row:hover {
  background: var(--surface-hover);
}

.recent__row + .recent__row {
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.recent__link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.recent__link:hover {
  color: var(--text-link);
}

.recent__avatar {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: var(--radius-full);
  background: var(--accent-subtle);
  color: var(--accent-text);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wide);
}

.recent__meta {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
}
</style>
