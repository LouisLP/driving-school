<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Variant C — "Overview + focus + demand rail".
 *
 * Three panes. A week heatmap across the top (instructors × days, load and conflicts at a
 * glance), one focused day underneath, and — the actual idea — a rail on the right holding the
 * *demand*: students with open enrolments who are not yet booked this week. You drag a student
 * onto the day, not an empty box.
 *
 * Its bet: the week, not the day, is the unit the school plans in, and the planner's real job is
 * emptying a queue of students who need hours. Booking starts from a person.
 *
 * Conflict stance: staged. A drop never commits — it stages the booking in the rail with the
 * rule set shown as a checklist, and the human presses the button. Blocking rules are unarmed
 * buttons; warnings arm after a reason is typed.
 *
 * ── Density (the picked variant, second pass) ──────────────────────────────
 *
 * Three panes can only carry three panes' worth of information if each one says the least it can.
 * The rule applied throughout: **one fact per element by default, the rest one interaction away.**
 *
 * - Heatmap cells are a load bar and, when something is wrong, a dot. The count is in the
 *   tooltip; twenty-one numbers across a grid is a table nobody reads.
 * - A block shows the time and the person. The vehicle, class and seat count appear only when the
 *   block is at least an hour tall; the full picture is in the tooltip and in the staging panel.
 * - Warnings are a corner mark. Only *blocking* conflicts get a ring — outline every warned block
 *   and an ordinary week looks like an emergency.
 * - The queue is one line per student: name, class, and how often they are already in the week.
 * - The staging panel states what is wrong; *why the rule exists* is behind a fold, which is where
 *   it belongs by the second week of use.
 */

import type { CandidateAppointment, Conflict } from './conflicts'
import type { PlannerBlock, PlannerData } from './use-planner-data'
import type { AppointmentId, EnrolmentId, InstructorId, VehicleId } from '@/shared/domain'
import { computed, ref } from 'vue'
import {
  CONFLICT_RULES,
  isBlocked,
  SCHOOL_CLOSES_MINUTE,
  SCHOOL_OPENS_MINUTE,
} from './conflicts'
import { MINUTE_PX, SNAP_MINUTES } from './use-grid-drag'
import { instantAt } from './use-planner-data'

const props = defineProps<{ planner: PlannerData }>()
// A plain object of refs, so holding onto it directly is stable and keeps `.value` explicit.
const planner = props.planner

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_MINUTES = SCHOOL_CLOSES_MINUTE - SCHOOL_OPENS_MINUTE

const focusedDay = ref(todayIndex())

const hours = computed(() =>
  Array.from({ length: DAY_MINUTES / 60 + 1 }, (_, index) => SCHOOL_OPENS_MINUTE / 60 + index),
)

/** Load per instructor per day: booked minutes over the school day, plus worst conflict. */
const heatmap = computed(() =>
  planner.instructors.value.map(instructor => ({
    instructor,
    cells: DAY_NAMES.map((_, dayIndex) => {
      const blocks = planner.blocks.value.filter(
        block => block.dayIndex === dayIndex && block.appointment.instructorId === instructor.id,
      )
      const minutes = blocks.reduce((sum, block) => sum + block.appointment.durationMinutes, 0)
      const conflicts = blocks.flatMap(block => block.conflicts)

      return {
        dayIndex,
        count: blocks.length,
        load: Math.min(1, minutes / DAY_MINUTES),
        severity: conflicts.length ? (isBlocked(conflicts) ? 'blocking' : 'warning') : null,
      }
    }),
  })),
)

const dayBlocks = computed(() =>
  planner.blocks.value.filter(block => block.dayIndex === focusedDay.value),
)

function blocksFor(instructorId: InstructorId) {
  return dayBlocks.value.filter(block => block.appointment.instructorId === instructorId)
}

/**
 * The queue. Open enrolments ordered by how long since their last appointment — the rail is a
 * worklist, so it has to have an opinion about who is most overdue.
 */
const demand = computed(() =>
  planner.bookableEnrolments.value
    .map((option) => {
      const booked = planner.blocks.value.filter(
        block =>
          block.appointment.kind !== 'theory'
          && block.appointment.enrolmentId === option.enrolment.id,
      )

      return {
        ...option,
        bookedThisWeek: booked.length,
        licenceClass: option.enrolment.licenceClass,
        status: option.enrolment.status,
      }
    })
    .sort((a, b) => a.bookedThisWeek - b.bookedThisWeek),
)

// --- drag from the rail onto the day -------------------------------------------------------------

interface Ghost {
  instructorId: InstructorId
  startMinute: number
  durationMinutes: number
  enrolmentId: EnrolmentId | null
  subjectId: AppointmentId | null
}

const ghost = ref<Ghost | null>(null)
const ghostConflicts = ref<Conflict[]>([])
const staged = ref<{ candidate: CandidateAppointment, conflicts: Conflict[], label: string } | null>(null)
const reason = ref('')
const vehicleChoice = ref<string>('')

function beginDrag(event: PointerEvent, seed: Partial<Ghost> & { label: string }): void {
  event.preventDefault()

  const label = seed.label

  const onMove = (moveEvent: PointerEvent): void => {
    const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
    const column = element?.closest<HTMLElement>('[data-col-key]')

    if (!column) {
      ghost.value = null
      return
    }

    const rect = column.getBoundingClientRect()
    const raw = SCHOOL_OPENS_MINUTE + (moveEvent.clientY - rect.top) / MINUTE_PX
    const startMinute = Math.max(
      SCHOOL_OPENS_MINUTE,
      Math.min(SCHOOL_CLOSES_MINUTE - 45, Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES),
    )

    ghost.value = {
      instructorId: column.dataset.colKey as InstructorId,
      startMinute,
      durationMinutes: seed.durationMinutes ?? 45,
      enrolmentId: seed.enrolmentId ?? null,
      subjectId: seed.subjectId ?? null,
    }

    ghostConflicts.value = planner.check(candidateOf(ghost.value))
  }

  const onUp = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)

    if (!ghost.value) {
      ghostConflicts.value = []
      return
    }

    const candidate = candidateOf(ghost.value)

    staged.value = { candidate, conflicts: planner.check(candidate), label }
    reason.value = ''
    ghost.value = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function candidateOf(current: Ghost): CandidateAppointment {
  const existing = planner.blocks.value.find(block => block.appointment.id === current.subjectId)

  return {
    id: current.subjectId,
    kind: existing?.appointment.kind ?? 'practical',
    instructorId: current.instructorId,
    vehicleId: existing
      ? existing.vehicle?.id ?? null
      : (vehicleChoice.value as VehicleId) || planner.vehicles.value[0]?.id || null,
    enrolmentId: existing
      ? (existing.appointment.kind === 'theory' ? null : existing.appointment.enrolmentId)
      : current.enrolmentId,
    attendeeCount: existing?.attendeeCount ?? 0,
    capacity: existing?.capacity ?? 12,
    startsAt: instantAt(planner.weekStart.value, focusedDay.value, current.startMinute),
    durationMinutes: current.durationMinutes,
  }
}

const canCommit = computed(() => {
  if (!staged.value)
    return false

  if (isBlocked(staged.value.conflicts))
    return false

  return staged.value.conflicts.length === 0 || reason.value.trim().length > 0
})

function commit(): void {
  if (!staged.value || !canCommit.value)
    return

  const { candidate, conflicts } = staged.value

  if (candidate.id)
    planner.move(candidate.id, candidate.startsAt, candidate.instructorId ?? undefined)
  else
    planner.book({ ...candidate, overrideReason: conflicts.length ? reason.value : null })

  staged.value = null
  reason.value = ''
}

function todayIndex(): number {
  const weekday = new Date().getUTCDay()

  return weekday === 0 ? 6 : weekday - 1
}

function topOf(minute: number): string {
  return `${(minute - SCHOOL_OPENS_MINUTE) * MINUTE_PX}px`
}

function heightOf(minutes: number): string {
  return `${Math.max(18, minutes * MINUTE_PX)}px`
}

function time(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

/** Everything the block itself no longer says out loud. */
function blockTooltip(block: PlannerBlock): string {
  const lines = [
    `${time(block.startMinute)}–${time(block.endMinute)} ${block.title}`,
    block.subtitle,
    ...block.conflicts.map(conflict => `${conflict.severity === 'blocking' ? '⛔' : '⚠'} ${conflict.message}`),
  ]

  return lines.filter(Boolean).join('\n')
}
</script>

<template>
  <div class="variant">
    <section class="overview">
      <header>
        <button type="button" @click="planner.goToWeek(-1)">
          ‹
        </button>
        <h3>Week of {{ planner.weekStart.value.toISOString().slice(0, 10) }}</h3>
        <button type="button" @click="planner.goToWeek(1)">
          ›
        </button>
      </header>

      <table class="heat">
        <thead>
          <tr>
            <th />
            <th v-for="(name, index) in DAY_NAMES" :key="name" :aria-current="index === focusedDay">
              {{ name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in heatmap" :key="row.instructor.id">
            <th scope="row">
              {{ row.instructor.lastName }}
            </th>
            <td v-for="cell in row.cells" :key="cell.dayIndex">
              <!--
                Load as a filled bar, nothing else. The count is a number nobody reads across 21
                cells; it is in the tooltip, and the focused day says it in words underneath.
              -->
              <button
                type="button"
                class="cell"
                :data-focused="cell.dayIndex === focusedDay"
                :data-severity="cell.severity"
                :style="{ '--_load': cell.load }"
                :title="`${row.instructor.lastName}, ${DAY_NAMES[cell.dayIndex]}: ${cell.count} appointments`"
                @click="focusedDay = cell.dayIndex"
              >
                <span class="bar" />
                <i v-if="cell.severity" class="dot" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="focus">
      <header>
        <h3>{{ DAY_NAMES[focusedDay] }} · {{ dayBlocks.length }} appointments</h3>
        <small v-if="!staged">Drag a student onto a column to book.</small>
      </header>

      <div class="grid">
        <div class="gutter">
          <span v-for="hour in hours" :key="hour" :style="{ top: topOf(hour * 60) }">
            {{ time(hour * 60) }}
          </span>
        </div>

        <div
          v-for="instructor in planner.instructors.value"
          :key="instructor.id"
          class="column"
        >
          <header>{{ instructor.firstName }} {{ instructor.lastName }}</header>

          <div
            class="lane"
            :data-col-key="String(instructor.id)"
            :style="{ blockSize: `${DAY_MINUTES * MINUTE_PX}px` }"
          >
            <span v-for="hour in hours" :key="hour" class="rule" :style="{ top: topOf(hour * 60) }" />

            <article
              v-for="block in blocksFor(instructor.id)"
              :key="block.appointment.id"
              class="block"
              :data-kind="block.appointment.kind"
              :data-severity="block.conflicts.length ? (isBlocked(block.conflicts) ? 'blocking' : 'warning') : null"
              :style="{ top: topOf(block.startMinute), height: heightOf(block.appointment.durationMinutes) }"
              :title="blockTooltip(block)"
              @pointerdown="beginDrag($event, {
                subjectId: block.appointment.id,
                durationMinutes: block.appointment.durationMinutes,
                label: `Move ${block.title}`,
              })"
            >
              <!--
                One line by default: who and when. The vehicle, the class and the seat count only
                appear when the block is tall enough to hold them without shouting; everything
                else is in the tooltip and in the panel you get when you pick the block up.
              -->
              <b>{{ time(block.startMinute) }} {{ block.title }}</b>
              <span v-if="block.appointment.durationMinutes >= 60">
                {{ block.appointment.kind === 'theory'
                  ? `${block.attendeeCount}/${block.capacity} seats`
                  : block.subtitle }}
              </span>
              <i v-if="block.conflicts.length" class="mark" aria-hidden="true" />
            </article>

            <div
              v-if="ghost && ghost.instructorId === instructor.id"
              class="ghost"
              :data-severity="ghostConflicts.length ? (isBlocked(ghostConflicts) ? 'blocking' : 'warning') : 'clear'"
              :style="{ top: topOf(ghost.startMinute), height: heightOf(ghost.durationMinutes) }"
            >
              {{ time(ghost.startMinute) }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="rail">
      <template v-if="!staged">
        <h3>Needs booking</h3>

        <ul class="demand">
          <li
            v-for="item in demand"
            :key="item.enrolment.id"
            :title="`${item.bookedThisWeek} booked this week · enrolment ${item.status}`"
            @pointerdown="beginDrag($event, {
              enrolmentId: item.enrolment.id,
              label: `Book ${item.label}`,
            })"
          >
            <span class="who">{{ item.label }}</span>
            <i v-if="item.status !== 'active'" class="mark" aria-hidden="true" />
            <span class="count">{{ item.bookedThisWeek }}</span>
          </li>
        </ul>

        <!-- Secondary, so it sits under the queue rather than in front of it. -->
        <label class="vehicle">
          Vehicle
          <select v-model="vehicleChoice">
            <option v-for="vehicle in planner.vehicles.value" :key="vehicle.id" :value="String(vehicle.id)">
              {{ vehicle.licencePlate }} ({{ vehicle.transmission }})
            </option>
          </select>
        </label>
      </template>

      <template v-else>
        <h3>{{ staged.label }}</h3>
        <p class="when">
          {{ DAY_NAMES[focusedDay] }}
          {{ time(new Date(staged.candidate.startsAt).getUTCHours() * 60 + new Date(staged.candidate.startsAt).getUTCMinutes()) }}
          · {{ staged.candidate.durationMinutes }} min
        </p>

        <!--
          The verdict, then the reasons — never the reasoning. Each rule states what is wrong in
          one line; *why the rule exists* is one fold away, and stays folded for the reader who
          books forty lessons a week and knows already.
        -->
        <p v-if="!staged.conflicts.length" class="ok">
          All checks pass.
        </p>

        <template v-else>
          <ol class="checklist">
            <li
              v-for="conflict in staged.conflicts"
              :key="conflict.code"
              :data-severity="conflict.severity"
            >
              {{ conflict.message }}
            </li>
          </ol>

          <details class="why">
            <summary>Why these rules?</summary>
            <dl>
              <template v-for="conflict in staged.conflicts" :key="conflict.code">
                <dt>{{ conflict.detail ?? conflict.message }}</dt>
                <dd>{{ CONFLICT_RULES[conflict.code].why }}</dd>
              </template>
            </dl>
          </details>
        </template>

        <label v-if="staged.conflicts.length && !isBlocked(staged.conflicts)">
          Reason for overriding
          <input v-model="reason" placeholder="Stored on the appointment">
        </label>

        <p v-if="isBlocked(staged.conflicts)" class="blocked">
          Cannot be booked. Move it, or change the vehicle.
        </p>

        <footer>
          <button type="button" @click="staged = null">
            Discard
          </button>
          <button type="button" class="primary" :disabled="!canCommit" @click="commit">
            {{ staged.candidate.id ? 'Move' : 'Book' }}
          </button>
        </footer>
      </template>

      <p v-if="planner.activity.value.length" class="log">
        {{ planner.activity.value[0]?.text }}
      </p>
    </aside>
  </div>
</template>

<style scoped>
.variant {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-md);
  padding: var(--space-md);
  min-block-size: 0;
}

.overview {
  grid-column: 1;
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
}

.overview header,
.focus header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-block-end: var(--space-xs);
}

.focus header small {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.heat {
  inline-size: 100%;
  border-collapse: collapse;
}

.heat th {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: var(--font-weight-medium);
  text-align: start;
  padding-inline-end: var(--space-xs);
}

.heat th[aria-current="true"] {
  color: var(--text-accent);
}

.cell {
  position: relative;
  inline-size: 100%;
  block-size: 1.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--surface-page);
  cursor: pointer;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: var(--font-size-xs);
}

.cell .bar {
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, var(--accent-solid) calc(var(--_load) * 70%), transparent);
}

/* One dot, top-right, coloured by severity. Enough to send you to the day, not enough to read. */
.dot {
  position: absolute;
  inset-block-start: 2px;
  inset-inline-end: 2px;
  inline-size: 5px;
  block-size: 5px;
  border-radius: var(--radius-full);
  background: var(--_severity);
}

.cell[data-focused="true"] {
  outline: var(--focus-ring);
  outline-offset: -2px;
}

.cell[data-severity="warning"] { --_severity: var(--warning-solid); }
.cell[data-severity="blocking"] { --_severity: var(--danger-solid); }

.focus {
  grid-column: 1;
  min-block-size: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  padding: var(--space-sm) var(--space-md);
  overflow: hidden;
}

.grid {
  display: flex;
  gap: 2px;
  overflow: auto;
}

.gutter {
  position: relative;
  flex: 0 0 3rem;
  padding-block-start: 1.5rem;
}

.gutter span {
  position: absolute;
  transform: translateY(calc(1.5rem - 0.5em));
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.column {
  flex: 1 0 10rem;
}

.column header {
  block-size: 1.5rem;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border-bottom: 1px solid var(--border-default);
}

.lane {
  position: relative;
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
  inset-inline: 2px;
  overflow: hidden;
  padding: 2px var(--space-2xs);
  border-radius: var(--radius-sm);
  border-inline-start: 3px solid var(--_kind);
  background: var(--_kind-subtle);
  color: var(--_kind-text);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-tight);
  cursor: grab;
  user-select: none;
  display: flex;
  flex-direction: column;
}

[data-kind="practical"] {
  --_kind: var(--info-solid);
  --_kind-subtle: var(--info-subtle);
  --_kind-text: var(--info-text);
}

[data-kind="theory"] {
  --_kind: var(--accent-solid);
  --_kind-subtle: var(--accent-subtle);
  --_kind-text: var(--accent-text);
}

[data-kind="exam"] {
  --_kind: var(--warning-solid);
  --_kind-subtle: var(--warning-subtle);
  --_kind-text: var(--warning-text);
}

/*
 * A warning is a corner mark, not a highlight — outline every warned block and a normal week
 * looks like an emergency. Only the impossible ones get the ring.
 */
.mark {
  position: absolute;
  inset-block-start: 3px;
  inset-inline-end: 3px;
  inline-size: 6px;
  block-size: 6px;
  border-radius: var(--radius-full);
  background: var(--_severity, var(--warning-solid));
}

.block[data-severity="warning"] { --_severity: var(--warning-solid); }

.block[data-severity="blocking"] {
  --_severity: var(--danger-solid);

  outline: 2px solid var(--danger-solid);
  outline-offset: -2px;
}

.ghost {
  position: absolute;
  inset-inline: 2px;
  z-index: var(--layer-raised);
  border-radius: var(--radius-sm);
  border: 2px dashed var(--_ghost);
  background: color-mix(in oklab, var(--_ghost) 20%, transparent);
  font-size: var(--font-size-xs);
  pointer-events: none;
}

.ghost[data-severity="clear"] { --_ghost: var(--success-solid); }
.ghost[data-severity="warning"] { --_ghost: var(--warning-solid); }
.ghost[data-severity="blocking"] { --_ghost: var(--danger-solid); }

.rail {
  grid-column: 2;
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--padding-card);
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  overflow: auto;
}

.when {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* Under the queue and quieter than it: a setting, not a step. */
.vehicle {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  margin-block-start: var(--space-xs);
  padding-block-start: var(--space-xs);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.demand {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* One line each: a name and how many times they are already in the week. */
.demand li {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-control);
  background: var(--surface-page);
  cursor: grab;
  touch-action: none;
  font-size: var(--font-size-sm);
}

.demand li:hover {
  background: var(--surface-hover);
}

.who {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.demand .mark {
  position: static;
  flex: none;
}

.count {
  margin-inline-start: auto;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
}

.checklist {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.checklist li {
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.checklist li[data-severity="blocking"] { background: var(--danger-subtle); color: var(--danger-text); }
.checklist li[data-severity="warning"] { background: var(--warning-subtle); color: var(--warning-text); }

.ok {
  font-size: var(--font-size-sm);
  color: var(--success-text);
}

/* Folded by default: the reasoning is for the first week, not the fiftieth. */
.why {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.why summary {
  cursor: pointer;
}

.why dt {
  margin-block-start: var(--space-2xs);
  color: var(--text-secondary);
}

.rail label {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.blocked {
  font-size: var(--font-size-sm);
  color: var(--danger-text);
}

.rail footer {
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

.log {
  margin-block-start: auto;
  padding-block-start: var(--space-2xs);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
</style>
