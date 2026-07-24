<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Variant A — "Resource grid".
 *
 * The familiar one, taken seriously: time down the left, one column per resource, drag anywhere
 * to book. The resource axis toggles between instructors and vehicles, and the week view keeps
 * the grid by swapping the columns for weekdays and pinning one resource.
 *
 * Its bet: the planner is a *dispatch board*. The primary job is seeing who is free right now,
 * so the grid is the whole screen and everything else is a popover over it.
 *
 * Conflict stance: optimistic. A move that only warns lands immediately, with an undo. A move
 * that blocks is refused mid-drag — the ghost turns red and the drop is a no-op.
 */

import type { CandidateAppointment, Conflict } from './conflicts'
import type { GridDragState } from './use-grid-drag'
import type { PlannerBlock, PlannerData } from './use-planner-data'
import type { AppointmentId, InstructorId, VehicleId } from '@/shared/domain'
import { computed, ref } from 'vue'
import { isBlocked, SCHOOL_CLOSES_MINUTE, SCHOOL_OPENS_MINUTE } from './conflicts'
import { evaluateConflictsLabel, KIND_LABEL } from './presentation'
import { MINUTE_PX, useGridDrag } from './use-grid-drag'
import { instantAt } from './use-planner-data'

const props = defineProps<{ planner: PlannerData }>()
// A plain object of refs, so holding onto it directly is stable and keeps `.value` explicit.
const planner = props.planner

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const view = ref<'day' | 'week'>('day')
const axis = ref<'instructor' | 'vehicle'>('instructor')
const dayIndex = ref(todayIndex())
const pinnedResource = ref<string | null>(null)

const hours = computed(() =>
  Array.from(
    { length: (SCHOOL_CLOSES_MINUTE - SCHOOL_OPENS_MINUTE) / 60 + 1 },
    (_, index) => SCHOOL_OPENS_MINUTE / 60 + index,
  ),
)

const gridHeight = computed(() => (SCHOOL_CLOSES_MINUTE - SCHOOL_OPENS_MINUTE) * MINUTE_PX)

interface Column {
  key: string
  label: string
  sublabel: string
  dayIndex: number
}

const resources = computed(() =>
  axis.value === 'instructor'
    ? planner.instructors.value.map(instructor => ({
        key: String(instructor.id),
        label: `${instructor.firstName} ${instructor.lastName}`,
        sublabel: instructor.teachableClasses.join(' '),
      }))
    : [
        ...planner.vehicles.value.map(vehicle => ({
          key: String(vehicle.id),
          label: vehicle.licencePlate,
          sublabel: `${vehicle.make} ${vehicle.model}`,
        })),
        { key: 'none', label: 'No vehicle', sublabel: 'Theory & theory exams' },
      ],
)

const columns = computed<Column[]>(() => {
  if (view.value === 'week') {
    return DAY_NAMES.map((name, index) => ({
      key: pinnedResource.value ?? resources.value[0]?.key ?? '',
      label: name,
      sublabel: dateLabel(index),
      dayIndex: index,
    }))
  }

  return resources.value.map(resource => ({ ...resource, dayIndex: dayIndex.value }))
})

function resourceKeyOf(block: PlannerBlock): string {
  return axis.value === 'instructor'
    ? String(block.appointment.instructorId)
    : String(block.vehicle?.id ?? 'none')
}

function blocksIn(column: Column): PlannerBlock[] {
  return planner.blocks.value.filter(
    block => block.dayIndex === column.dayIndex && resourceKeyOf(block) === column.key,
  )
}

/** Overlapping blocks share the column width rather than hiding each other. */
function laneOf(block: PlannerBlock, siblings: PlannerBlock[]): { left: string, width: string } {
  const overlapping = siblings.filter(
    other => other.startMinute < block.endMinute && block.startMinute < other.endMinute,
  )
  const index = overlapping.findIndex(other => other.appointment.id === block.appointment.id)
  const count = Math.max(1, overlapping.length)

  return { left: `${(index / count) * 100}%`, width: `${(1 / count) * 100}%` }
}

// --- dragging ----------------------------------------------------------------------------------

const ghost = ref<GridDragState | null>(null)
const ghostConflicts = ref<Conflict[]>([])
const draft = ref<(GridDragState & { conflicts: Conflict[] }) | null>(null)
const overrideReason = ref('')
const toast = ref<{ text: string, severity: 'info' | 'warning' | 'danger', undo?: () => void } | null>(null)

const draftEnrolment = ref<string>('')
const draftVehicle = ref<string>('')
const draftKind = ref<'practical' | 'theory' | 'exam'>('practical')

const { startCreate, startMove } = useGridDrag({
  dayStartMinute: SCHOOL_OPENS_MINUTE,
  dayEndMinute: SCHOOL_CLOSES_MINUTE,
  onUpdate: (state) => {
    ghost.value = state
    ghostConflicts.value = planner.check(candidateFrom(state))
  },
  onCommit: (state) => {
    ghost.value = null

    if (state.mode === 'create') {
      draftKind.value = 'practical'
      draftEnrolment.value = String(planner.bookableEnrolments.value[0]?.enrolment.id ?? '')
      draftVehicle.value = String(planner.vehicles.value[0]?.id ?? '')
      draft.value = { ...state, conflicts: [] }
      refreshDraftConflicts()
      return
    }

    const conflicts = planner.check(candidateFrom(state))

    if (isBlocked(conflicts)) {
      toast.value = { text: `Not moved — ${conflicts[0]?.message}`, severity: 'danger' }
      return
    }

    const id = state.subjectId as AppointmentId
    const previous = planner.blocks.value.find(block => block.appointment.id === id)?.appointment

    planner.move(
      id,
      instantAt(planner.weekStart.value, state.dayIndex, state.startMinute),
      axis.value === 'instructor' ? (state.columnKey as InstructorId) : undefined,
    )

    toast.value = {
      text: conflicts.length ? `Moved — ${conflicts[0]?.message}` : 'Moved',
      severity: conflicts.length ? 'warning' : 'info',
      undo: previous
        ? () => {
            planner.move(id, previous.startsAt, previous.instructorId)
            toast.value = null
          }
        : undefined,
    }
  },
  onCancel: () => {
    ghost.value = null
  },
})

function candidateFrom(state: GridDragState): CandidateAppointment {
  const existing = planner.blocks.value.find(block => block.appointment.id === state.subjectId)
  const kind = existing?.appointment.kind ?? draftKind.value

  return {
    id: (state.subjectId as AppointmentId) ?? null,
    kind,
    instructorId: axis.value === 'instructor'
      ? (state.columnKey as InstructorId)
      : existing?.appointment.instructorId ?? (planner.instructors.value[0]?.id ?? null),
    vehicleId: axis.value === 'vehicle'
      ? (state.columnKey === 'none' ? null : (state.columnKey as VehicleId))
      : (existing ? existing.vehicle?.id ?? null : (draftVehicle.value as VehicleId) || null),
    enrolmentId: existing
      ? (existing.appointment.kind === 'theory' ? null : existing.appointment.enrolmentId)
      : (draftEnrolment.value as never) || null,
    attendeeCount: existing?.attendeeCount ?? 0,
    capacity: existing?.capacity ?? 12,
    startsAt: instantAt(planner.weekStart.value, state.dayIndex, state.startMinute),
    durationMinutes: state.durationMinutes,
  }
}

function refreshDraftConflicts(): void {
  if (draft.value)
    draft.value = { ...draft.value, conflicts: planner.check(candidateFrom(draft.value)) }
}

function commitDraft(): void {
  if (!draft.value)
    return

  planner.book({
    ...candidateFrom(draft.value),
    overrideReason: draft.value.conflicts.length ? overrideReason.value || 'no reason given' : null,
  })

  draft.value = null
  overrideReason.value = ''
}

function todayIndex(): number {
  const weekday = new Date().getUTCDay()

  return weekday === 0 ? 6 : weekday - 1
}

function dateLabel(index: number): string {
  const date = new Date(planner.weekStart.value.getTime() + index * 86_400_000)

  return `${date.getUTCDate()}.${date.getUTCMonth() + 1}.`
}

function topOf(startMinute: number): string {
  return `${(startMinute - SCHOOL_OPENS_MINUTE) * MINUTE_PX}px`
}

function heightOf(minutes: number): string {
  return `${Math.max(18, minutes * MINUTE_PX)}px`
}

function time(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="variant">
    <header class="toolbar">
      <div class="cluster">
        <button type="button" @click="planner.goToWeek(-1)">
          ‹
        </button>
        <strong>{{ view === 'day' ? `${DAY_NAMES[dayIndex]} ${dateLabel(dayIndex)}` : `Week of ${dateLabel(0)}` }}</strong>
        <button type="button" @click="planner.goToWeek(1)">
          ›
        </button>
      </div>

      <div class="segmented">
        <button type="button" :aria-pressed="view === 'day'" @click="view = 'day'">
          Day
        </button>
        <button type="button" :aria-pressed="view === 'week'" @click="view = 'week'">
          Week
        </button>
      </div>

      <div v-if="view === 'day'" class="segmented">
        <button type="button" :aria-pressed="axis === 'instructor'" @click="axis = 'instructor'">
          Instructors
        </button>
        <button type="button" :aria-pressed="axis === 'vehicle'" @click="axis = 'vehicle'">
          Vehicles
        </button>
      </div>

      <select v-if="view === 'week'" v-model="pinnedResource">
        <option v-for="resource in resources" :key="resource.key" :value="resource.key">
          {{ resource.label }}
        </option>
      </select>

      <nav v-if="view === 'day'" class="days">
        <button
          v-for="(name, index) in DAY_NAMES"
          :key="name"
          type="button"
          :aria-pressed="index === dayIndex"
          @click="dayIndex = index"
        >
          {{ name }}
        </button>
      </nav>

      <ul class="legend">
        <li><i data-kind="practical" />Lesson</li>
        <li><i data-kind="theory" />Theory</li>
        <li><i data-kind="exam" />Exam</li>
      </ul>
    </header>

    <div class="grid" :style="{ '--grid-height': `${gridHeight}px` }">
      <div class="gutter">
        <span
          v-for="hour in hours"
          :key="hour"
          class="hour-label"
          :style="{ top: `calc(3.25rem + ${topOf(hour * 60)})` }"
        >{{ time(hour * 60) }}</span>
      </div>

      <div class="columns">
        <section
          v-for="column in columns"
          :key="`${column.key}-${column.dayIndex}`"
          class="column"
        >
          <header class="column-head">
            <strong>{{ column.label }}</strong>
            <small>{{ column.sublabel }}</small>
          </header>

          <div
            class="lane"
            :data-col-key="column.key"
            :data-col-day="column.dayIndex"
            @pointerdown.self="startCreate"
          >
            <span v-for="hour in hours" :key="hour" class="rule" :style="{ top: topOf(hour * 60) }" />

            <article
              v-for="block in blocksIn(column)"
              :key="block.appointment.id"
              class="block"
              :data-kind="block.appointment.kind"
              :data-severity="block.conflicts.length ? (isBlocked(block.conflicts) ? 'blocking' : 'warning') : null"
              :data-status="block.appointment.outcome.status"
              :data-block-start="block.startMinute"
              :style="{
                top: topOf(block.startMinute),
                height: heightOf(block.appointment.durationMinutes),
                ...laneOf(block, blocksIn(column)),
              }"
              :title="evaluateConflictsLabel(block.conflicts)"
              @pointerdown.stop="startMove($event, String(block.appointment.id), block.appointment.durationMinutes)"
            >
              <b>{{ time(block.startMinute) }} {{ block.title }}</b>
              <span>{{ block.subtitle }}</span>
              <span v-if="block.appointment.kind === 'theory'" class="seats">
                {{ block.attendeeCount }}/{{ block.capacity }} seats
              </span>
              <span v-if="block.conflicts.length" class="flag">
                {{ isBlocked(block.conflicts) ? '⛔' : '⚠' }} {{ block.conflicts[0]?.message }}
              </span>
            </article>

            <div
              v-if="ghost && ghost.columnKey === column.key && ghost.dayIndex === column.dayIndex"
              class="ghost"
              :data-severity="ghostConflicts.length ? (isBlocked(ghostConflicts) ? 'blocking' : 'warning') : 'clear'"
              :style="{ top: topOf(ghost.startMinute), height: heightOf(ghost.durationMinutes) }"
            >
              <b>{{ time(ghost.startMinute) }}–{{ time(ghost.startMinute + ghost.durationMinutes) }}</b>
              <ul v-if="ghostConflicts.length">
                <li v-for="conflict in ghostConflicts" :key="conflict.code">
                  {{ conflict.severity === 'blocking' ? '⛔' : '⚠' }} {{ conflict.message }}
                </li>
              </ul>
              <span v-else>No conflicts</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- The booking popover: everything a new appointment needs, over the grid, never a page away. -->
    <dialog v-if="draft" open class="draft">
      <h3>
        New {{ KIND_LABEL[draftKind] }} · {{ time(draft.startMinute) }}–{{ time(draft.startMinute + draft.durationMinutes) }}
      </h3>

      <div class="fields">
        <label>
          Kind
          <select v-model="draftKind" @change="refreshDraftConflicts">
            <option value="practical">Lesson</option>
            <option value="theory">Theory class</option>
            <option value="exam">Exam</option>
          </select>
        </label>

        <label v-if="draftKind !== 'theory'">
          Student
          <select v-model="draftEnrolment" @change="refreshDraftConflicts">
            <option v-for="option in planner.bookableEnrolments.value" :key="option.enrolment.id" :value="option.enrolment.id">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="draftKind !== 'theory'">
          Vehicle
          <select v-model="draftVehicle" @change="refreshDraftConflicts">
            <option v-for="vehicle in planner.vehicles.value" :key="vehicle.id" :value="vehicle.id">
              {{ vehicle.licencePlate }} — {{ vehicle.make }}
            </option>
          </select>
        </label>
      </div>

      <ul v-if="draft.conflicts.length" class="conflicts">
        <li v-for="conflict in draft.conflicts" :key="conflict.code" :data-severity="conflict.severity">
          <b>{{ conflict.severity === 'blocking' ? 'Blocked' : 'Warning' }}</b>
          {{ conflict.message }}
          <small v-if="conflict.detail">{{ conflict.detail }}</small>
        </li>
      </ul>
      <p v-else class="clear">
        No conflicts.
      </p>

      <label v-if="draft.conflicts.length && !isBlocked(draft.conflicts)" class="reason">
        Reason for booking anyway
        <input v-model="overrideReason" placeholder="Petra agreed to come in early">
      </label>

      <footer>
        <button type="button" @click="draft = null; overrideReason = ''">
          Cancel
        </button>
        <button
          type="button"
          class="primary"
          :disabled="isBlocked(draft.conflicts)"
          @click="commitDraft"
        >
          {{ draft.conflicts.length ? 'Book anyway' : 'Book' }}
        </button>
      </footer>
    </dialog>

    <div v-if="toast" class="toast" :data-severity="toast.severity">
      {{ toast.text }}
      <button v-if="toast.undo" type="button" @click="toast.undo()">
        Undo
      </button>
      <button type="button" @click="toast = null">
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.variant {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: var(--space-sm);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border-subtle);
}

.cluster {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.segmented,
.days {
  display: flex;
  gap: 1px;
  background: var(--border-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  overflow: hidden;
}

.segmented button,
.days button {
  background: var(--surface-raised);
  border: 0;
  padding: var(--space-2xs) var(--space-sm);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.segmented button[aria-pressed="true"],
.days button[aria-pressed="true"] {
  background: var(--accent-solid);
  color: var(--text-on-solid);
}

.legend {
  display: flex;
  gap: var(--space-sm);
  margin-inline-start: auto;
  list-style: none;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.legend li {
  display: flex;
  align-items: center;
  gap: var(--space-3xs);
}

.legend i,
.block::before {
  inline-size: 10px;
  block-size: 10px;
  border-radius: var(--radius-full);
}

.legend i {
  display: inline-block;
}

[data-kind="practical"] {
  --_kind: var(--info-solid);
  --_kind-subtle: var(--info-subtle);
  --_kind-border: var(--info-border);
  --_kind-text: var(--info-text);
}

[data-kind="theory"] {
  --_kind: var(--accent-solid);
  --_kind-subtle: var(--accent-subtle);
  --_kind-border: var(--accent-border);
  --_kind-text: var(--accent-text);
}

[data-kind="exam"] {
  --_kind: var(--warning-solid);
  --_kind-subtle: var(--warning-subtle);
  --_kind-border: var(--warning-border);
  --_kind-text: var(--warning-text);
}

.legend i {
  background: var(--_kind);
}

.grid {
  display: flex;
  gap: var(--space-xs);
  overflow: auto;
  padding: 0 var(--space-md) var(--space-2xl);
}

.gutter {
  position: relative;
  flex: 0 0 3.5rem;
  padding-block-start: 3.25rem;
  block-size: calc(var(--grid-height) + 3.25rem);
}

.hour-label {
  position: absolute;
  transform: translateY(-0.5em);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.hour-label {
  inset-inline-start: 0;
}

.columns {
  display: flex;
  flex: 1;
  gap: 2px;
  min-inline-size: max-content;
}

.column {
  flex: 1 0 11rem;
  display: flex;
  flex-direction: column;
}

.column-head {
  position: sticky;
  top: 0;
  z-index: var(--layer-sticky);
  display: flex;
  flex-direction: column;
  padding: var(--space-2xs) var(--space-xs);
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border-default);
  block-size: 3.25rem;
}

.column-head small {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.lane {
  position: relative;
  block-size: var(--grid-height);
  background: var(--surface-page);
  border-inline-end: 1px solid var(--border-subtle);
  touch-action: none;
}

.rule {
  position: absolute;
  inset-inline: 0;
  border-top: 1px solid var(--border-subtle);
}

.block {
  position: absolute;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 2px var(--space-2xs);
  border-radius: var(--radius-sm);
  border: 1px solid var(--_kind-border);
  border-inline-start: 3px solid var(--_kind);
  background: var(--_kind-subtle);
  color: var(--_kind-text);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-tight);
  cursor: grab;
  user-select: none;
}

.block b {
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block[data-severity="warning"] {
  outline: 2px solid var(--warning-solid);
  outline-offset: -2px;
}

.block[data-severity="blocking"] {
  outline: 2px solid var(--danger-solid);
  outline-offset: -2px;
}

.block[data-status="cancelled"],
.block[data-status="noShow"] {
  opacity: 0.55;
  text-decoration: line-through;
}

.block .flag {
  margin-block-start: auto;
  font-weight: var(--font-weight-semibold);
}

.ghost {
  position: absolute;
  inset-inline: 0;
  z-index: var(--layer-raised);
  padding: var(--space-2xs);
  border-radius: var(--radius-sm);
  border: 2px dashed var(--_ghost-border);
  background: color-mix(in oklab, var(--_ghost-border) 18%, transparent);
  font-size: var(--font-size-xs);
  pointer-events: none;
}

.ghost[data-severity="clear"] { --_ghost-border: var(--success-solid); }
.ghost[data-severity="warning"] { --_ghost-border: var(--warning-solid); }
.ghost[data-severity="blocking"] { --_ghost-border: var(--danger-solid); }

.ghost ul {
  list-style: none;
}

.draft {
  position: fixed;
  inset-block-end: var(--space-2xl);
  inset-inline-start: 50%;
  translate: -50% 0;
  z-index: var(--layer-modal);
  inline-size: min(30rem, 92vw);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--padding-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-overlay);
  background: var(--surface-overlay);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-sm);
}

.fields label,
.reason {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.conflicts {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.conflicts li {
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.conflicts li[data-severity="blocking"] {
  background: var(--danger-subtle);
  color: var(--danger-text);
}

.conflicts li[data-severity="warning"] {
  background: var(--warning-subtle);
  color: var(--warning-text);
}

.conflicts small {
  display: block;
  opacity: 0.8;
}

.clear {
  color: var(--success-text);
  font-size: var(--font-size-sm);
}

.draft footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xs);
}

.primary {
  background: var(--accent-solid);
  color: var(--text-on-solid);
  border: 0;
  border-radius: var(--radius-control);
  padding: var(--space-2xs) var(--space-md);
  cursor: pointer;
}

.primary:disabled {
  background: var(--surface-disabled);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.toast {
  position: fixed;
  inset-block-end: 5rem;
  inset-inline-start: var(--space-lg);
  z-index: var(--layer-toast);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-control);
  background: var(--surface-overlay);
  border-inline-start: 4px solid var(--info-solid);
  box-shadow: var(--shadow-md);
  font-size: var(--font-size-sm);
}

.toast[data-severity="warning"] { border-color: var(--warning-solid); }
.toast[data-severity="danger"] { border-color: var(--danger-solid); }

.seats {
  font-weight: var(--font-weight-semibold);
}
</style>
