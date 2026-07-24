<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Variant B — "Agenda".
 *
 * No grid at all. The week is a chronological list, day by day, and the *gaps* are first-class
 * rows: every stretch where an instructor is free is a row you can book into. Booking is a form,
 * not a gesture — you pick the student first, and the form then only offers instructors who can
 * teach that class and vehicles suitable for it.
 *
 * Its bet: a driving school's planner is mostly answering "when can Lena next drive?", which a
 * grid answers badly and a list of free slots answers directly. It also asks whether drag is
 * worth building at all: here, most conflicts are impossible to create because the pickers never
 * offer the invalid option. Only the ones that depend on *time* survive to be warned about.
 *
 * Conflict stance: prevent by construction, then confirm. Nothing lands until Book is pressed.
 */

import type { CandidateAppointment } from './conflicts'
import type { PlannerBlock, PlannerData } from './use-planner-data'
import type { EnrolmentId, InstructorId, VehicleId } from '@/shared/domain'
import { computed, ref } from 'vue'
import { isBlocked, SCHOOL_CLOSES_MINUTE, SCHOOL_OPENS_MINUTE } from './conflicts'
import { instantAt } from './use-planner-data'

const props = defineProps<{ planner: PlannerData }>()
// A plain object of refs, so holding onto it directly is stable and keeps `.value` explicit.
const planner = props.planner

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOT_MINUTES = 45

const focusInstructor = ref<string>('all')
const showGaps = ref(true)

const days = computed(() =>
  DAY_NAMES.map((name, index) => {
    const blocks = planner.blocks.value
      .filter(block => block.dayIndex === index)
      .filter(block => focusInstructor.value === 'all' || String(block.appointment.instructorId) === focusInstructor.value)

    return {
      name,
      index,
      date: new Date(planner.weekStart.value.getTime() + index * 86_400_000),
      blocks,
      gaps: showGaps.value ? gapsFor(index) : [],
      conflictCount: blocks.filter(block => block.conflicts.length > 0).length,
    }
  }),
)

/**
 * Free stretches, per instructor, long enough to sell. This is the row the receptionist actually
 * wants: "Thursday 11:00–13:00, Vogel free, Golf free".
 */
function gapsFor(dayIndex: number) {
  const gaps: { instructorId: InstructorId, name: string, from: number, to: number }[] = []

  for (const instructor of planner.instructors.value) {
    if (focusInstructor.value !== 'all' && String(instructor.id) !== focusInstructor.value)
      continue

    const busy = planner.blocks.value
      .filter(block => block.dayIndex === dayIndex && block.appointment.instructorId === instructor.id)
      .sort((a, b) => a.startMinute - b.startMinute)

    let cursor = SCHOOL_OPENS_MINUTE

    for (const block of [...busy, null]) {
      const nextStart = block ? block.startMinute : SCHOOL_CLOSES_MINUTE

      if (nextStart - cursor >= SLOT_MINUTES) {
        gaps.push({
          instructorId: instructor.id,
          name: `${instructor.firstName} ${instructor.lastName}`,
          from: cursor,
          to: nextStart,
        })
      }

      if (block)
        cursor = Math.max(cursor, block.endMinute)
    }
  }

  return gaps.sort((a, b) => a.from - b.from)
}

// --- the booking form ---------------------------------------------------------------------------

const form = ref<{
  dayIndex: number
  startMinute: number
  duration: number
  kind: 'practical' | 'theory' | 'exam'
  enrolmentId: string
  instructorId: string
  vehicleId: string
  acknowledged: boolean
  reason: string
} | null>(null)

function openForm(dayIndex: number, startMinute: number, instructorId?: InstructorId): void {
  form.value = {
    dayIndex,
    startMinute,
    duration: SLOT_MINUTES,
    kind: 'practical',
    enrolmentId: String(planner.bookableEnrolments.value[0]?.enrolment.id ?? ''),
    instructorId: String(instructorId ?? planner.instructors.value[0]?.id ?? ''),
    vehicleId: '',
    acknowledged: false,
    reason: '',
  }

  pickFirstValidVehicle()
}

const chosenClass = computed(() =>
  planner.bookableEnrolments.value.find(
    option => String(option.enrolment.id) === form.value?.enrolmentId,
  )?.enrolment.licenceClass ?? null,
)

/**
 * The pickers narrow instead of validating. An instructor who cannot teach the class is not
 * offered — so `instructorNotQualified` is a rule that exists for the API to enforce and for this
 * screen to never need to show.
 */
const instructorOptions = computed(() =>
  planner.instructors.value.map(instructor => ({
    instructor,
    qualified: chosenClass.value === null || instructor.teachableClasses.includes(chosenClass.value),
  })).filter(option => option.qualified),
)

const vehicleOptions = computed(() =>
  planner.vehicles.value.map(vehicle => ({
    vehicle,
    suitable: chosenClass.value === null || vehicle.suitableFor.includes(chosenClass.value),
  })).filter(option => option.suitable),
)

function pickFirstValidVehicle(): void {
  if (form.value)
    form.value.vehicleId = String(vehicleOptions.value[0]?.vehicle.id ?? '')
}

const candidate = computed<CandidateAppointment | null>(() => {
  if (!form.value)
    return null

  return {
    id: null,
    kind: form.value.kind,
    instructorId: (form.value.instructorId as InstructorId) || null,
    vehicleId: form.value.kind === 'theory' ? null : (form.value.vehicleId as VehicleId) || null,
    enrolmentId: form.value.kind === 'theory' ? null : (form.value.enrolmentId as EnrolmentId) || null,
    attendeeCount: 0,
    capacity: 12,
    startsAt: instantAt(planner.weekStart.value, form.value.dayIndex, form.value.startMinute),
    durationMinutes: form.value.duration,
  }
})

const conflicts = computed(() => (candidate.value ? planner.check(candidate.value) : []))

const canBook = computed(() =>
  conflicts.value.length === 0
  || (!isBlocked(conflicts.value) && form.value?.acknowledged === true),
)

function submit(): void {
  if (!candidate.value || !canBook.value)
    return

  planner.book({
    ...candidate.value,
    overrideReason: conflicts.value.length ? form.value?.reason || 'no reason given' : null,
  })

  form.value = null
}

function time(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

function toMinutes(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':')

  return Number(hour) * 60 + Number(minute)
}

function rowsOf(day: { blocks: PlannerBlock[], gaps: { from: number, to: number, name: string, instructorId: InstructorId }[] }) {
  const booked = day.blocks.map(block => ({ sort: block.startMinute, kind: 'booked' as const, block }))
  const free = day.gaps.map(gap => ({ sort: gap.from, kind: 'free' as const, gap }))

  return [...booked, ...free].sort((a, b) => a.sort - b.sort)
}
</script>

<template>
  <div class="variant">
    <header class="toolbar">
      <button type="button" @click="planner.goToWeek(-1)">
        ‹ Previous
      </button>
      <strong>Week of {{ planner.weekStart.value.toISOString().slice(0, 10) }}</strong>
      <button type="button" @click="planner.goToWeek(1)">
        Next ›
      </button>

      <label class="filter">
        Instructor
        <select v-model="focusInstructor">
          <option value="all">Everyone</option>
          <option v-for="instructor in planner.instructors.value" :key="instructor.id" :value="String(instructor.id)">
            {{ instructor.firstName }} {{ instructor.lastName }}
          </option>
        </select>
      </label>

      <label class="filter checkbox">
        <input v-model="showGaps" type="checkbox">
        Show free slots
      </label>
    </header>

    <div class="scroller">
      <section v-for="day in days" :key="day.name" class="day">
        <header class="day-head">
          <h3>{{ day.name }} <small>{{ day.date.toISOString().slice(5, 10) }}</small></h3>
          <span>{{ day.blocks.length }} booked</span>
          <span v-if="day.conflictCount" class="chip warning">{{ day.conflictCount }} with conflicts</span>
        </header>

        <ol class="rows">
          <li
            v-for="(row, index) in rowsOf(day)"
            :key="index"
            :data-row="row.kind"
          >
            <template v-if="row.kind === 'booked'">
              <time>{{ time(row.block.startMinute) }}<small>{{ time(row.block.endMinute) }}</small></time>

              <div class="body" :data-kind="row.block.appointment.kind">
                <b>{{ row.block.title }}</b>
                <span>
                  {{ row.block.subtitle }}
                  · {{ row.block.instructor?.firstName }} {{ row.block.instructor?.lastName }}
                  <template v-if="row.block.appointment.kind === 'theory'">
                    · {{ row.block.attendeeCount }}/{{ row.block.capacity }} seats
                  </template>
                </span>

                <ul v-if="row.block.conflicts.length" class="inline-conflicts">
                  <li
                    v-for="conflict in row.block.conflicts"
                    :key="conflict.code"
                    :data-severity="conflict.severity"
                  >
                    {{ conflict.severity === 'blocking' ? 'Blocking' : 'Warning' }}: {{ conflict.message }}
                    <small v-if="conflict.detail">— {{ conflict.detail }}</small>
                  </li>
                </ul>
              </div>

              <span class="status">{{ row.block.appointment.outcome.status }}</span>
            </template>

            <template v-else>
              <time>{{ time(row.gap.from) }}<small>{{ time(row.gap.to) }}</small></time>

              <div class="body free">
                <b>{{ row.gap.name }} free</b>
                <span>{{ Math.round((row.gap.to - row.gap.from) / 45) }} × 45 min available</span>
              </div>

              <button type="button" class="primary" @click="openForm(day.index, row.gap.from, row.gap.instructorId)">
                Book
              </button>
            </template>
          </li>
        </ol>
      </section>
    </div>

    <aside v-if="form" class="form">
      <h3>New appointment</h3>

      <label>
        Student
        <select v-model="form.enrolmentId" @change="pickFirstValidVehicle">
          <option v-for="option in planner.bookableEnrolments.value" :key="option.enrolment.id" :value="String(option.enrolment.id)">
            {{ option.label }} ({{ option.enrolment.status }})
          </option>
        </select>
      </label>

      <label>
        Instructor
        <select v-model="form.instructorId">
          <option v-for="option in instructorOptions" :key="option.instructor.id" :value="String(option.instructor.id)">
            {{ option.instructor.firstName }} {{ option.instructor.lastName }}
          </option>
        </select>
        <small>Only instructors qualified for class {{ chosenClass }} are listed.</small>
      </label>

      <label>
        Vehicle
        <select v-model="form.vehicleId">
          <option v-for="option in vehicleOptions" :key="option.vehicle.id" :value="String(option.vehicle.id)">
            {{ option.vehicle.licencePlate }} — {{ option.vehicle.make }} {{ option.vehicle.model }}
            ({{ option.vehicle.transmission }})
          </option>
        </select>
        <small>Only vehicles suitable for class {{ chosenClass }} are listed.</small>
      </label>

      <div class="row">
        <label>
          Start
          <input
            :value="time(form.startMinute)"
            type="time"
            step="900"
            @change="form.startMinute = toMinutes(($event.target as HTMLInputElement).value)"
          >
        </label>
        <label>
          Minutes
          <input v-model.number="form.duration" type="number" step="15" min="15">
        </label>
      </div>

      <ul v-if="conflicts.length" class="conflicts">
        <li v-for="conflict in conflicts" :key="conflict.code" :data-severity="conflict.severity">
          <b>{{ conflict.severity === 'blocking' ? 'Cannot book' : 'Check this' }}</b>
          {{ conflict.message }}
          <small v-if="conflict.detail">{{ conflict.detail }}</small>
        </li>
      </ul>
      <p v-else class="ok">
        No conflicts — instructor, vehicle and student are all free.
      </p>

      <template v-if="conflicts.length && !isBlocked(conflicts)">
        <label class="checkbox">
          <input v-model="form.acknowledged" type="checkbox">
          Book anyway, I know about the above
        </label>
        <label>
          Reason
          <input v-model="form.reason" placeholder="Kept on the record with the appointment">
        </label>
      </template>

      <footer>
        <button type="button" @click="form = null">
          Cancel
        </button>
        <button type="button" class="primary" :disabled="!canBook" @click="submit">
          Book
        </button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.variant {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-block-size: 0;
}

.toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border-subtle);
}

.filter {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.checkbox {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2xs);
}

.scroller {
  overflow: auto;
  padding: var(--space-lg) var(--gutter-page) var(--space-3xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.day {
  max-inline-size: 62rem;
}

.day-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  padding-block-end: var(--space-2xs);
  border-bottom: 2px solid var(--border-default);
  position: sticky;
  top: 0;
  background: var(--surface-page);
  z-index: var(--layer-raised);
}

.day-head h3 {
  font-size: var(--font-size-lg);
}

.day-head small,
.day-head span {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: var(--font-weight-regular);
}

.chip.warning {
  padding: 0 var(--space-2xs);
  border-radius: var(--radius-pill);
  background: var(--warning-subtle);
  color: var(--warning-text);
}

.rows {
  list-style: none;
}

.rows li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-md);
  padding: var(--space-xs) var(--space-2xs);
  border-bottom: 1px solid var(--border-subtle);
}

.rows li[data-row="free"] {
  background: repeating-linear-gradient(
    135deg,
    transparent 0 6px,
    color-mix(in oklab, var(--success-subtle) 60%, transparent) 6px 12px
  );
}

time {
  display: flex;
  flex-direction: column;
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-semibold);
}

time small {
  color: var(--text-muted);
  font-weight: var(--font-weight-regular);
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  border-inline-start: 3px solid var(--_kind, var(--border-default));
  padding-inline-start: var(--space-sm);
}

.body[data-kind="practical"] { --_kind: var(--info-solid); }
.body[data-kind="theory"] { --_kind: var(--accent-solid); }
.body[data-kind="exam"] { --_kind: var(--warning-solid); }
.body.free { --_kind: var(--success-solid); }

.body span {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.inline-conflicts {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-block-start: var(--space-3xs);
  font-size: var(--font-size-sm);
}

.inline-conflicts li {
  padding: 2px var(--space-2xs);
  border-radius: var(--radius-sm);
}

.inline-conflicts li[data-severity="blocking"] {
  background: var(--danger-subtle);
  color: var(--danger-text);
}

.inline-conflicts li[data-severity="warning"] {
  background: var(--warning-subtle);
  color: var(--warning-text);
}

.status {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.form {
  position: sticky;
  top: 0;
  align-self: start;
  inline-size: 22rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--padding-card);
  background: var(--surface-raised);
  border-inline-start: 1px solid var(--border-default);
  block-size: 100%;
  overflow: auto;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.form label small {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
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

.ok {
  font-size: var(--font-size-sm);
  color: var(--success-text);
}

.form footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xs);
  margin-block-start: auto;
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
</style>
