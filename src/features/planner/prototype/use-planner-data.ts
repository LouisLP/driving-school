/**
 * PROTOTYPE — throwaway. Not production code.
 *
 * One week of the school, read through the real fake-API seam, denormalised into what a calendar
 * block needs to render, and held in memory so the variants can move things around without
 * writing anything back. All three variants share this; they share nothing else.
 */

import type { CandidateAppointment, Conflict, ConflictContext } from './conflicts'
import type {
  Appointment,
  AppointmentId,
  Enrolment,
  EnrolmentId,
  Instructor,
  InstructorId,
  IsoDateTime,
  LicenceClass,
  Student,
  Vehicle,
  VehicleId,
} from '@/shared/domain'
import { computed, reactive, ref, shallowRef, watchEffect } from 'vue'
import { useApi } from '@/shared/api'
import { toIsoDateTime } from '@/shared/domain'
import { evaluateConflicts, vehicleOf } from './conflicts'
import { prototypeAbsences, prototypeAppointments } from './fixtures'

export interface PlannerBlock {
  appointment: Appointment
  instructor: Instructor | null
  vehicle: Vehicle | null
  /** Practical/exam: the student's name. Theory: `null` — a class is not one person. */
  studentName: string | null
  licenceClass: LicenceClass | null
  /** The one line a narrow block shows. */
  title: string
  /** The second line, if there is room. */
  subtitle: string
  /** Theory only. */
  attendeeCount: number
  capacity: number
  startMinute: number
  endMinute: number
  dayIndex: number
  conflicts: Conflict[]
}

/** What a variant hands back when the user finishes a drag or fills in the booking form. */
export interface BookingDraft extends CandidateAppointment {
  /** Set when the user pushed past a warning. */
  overrideReason: string | null
}

const MS_PER_DAY = 86_400_000

export function usePlannerData() {
  const api = useApi()

  const weekStart = ref(mondayOf(new Date()))
  const isLoading = ref(true)

  const instructors = shallowRef<readonly Instructor[]>([])
  const vehicles = shallowRef<readonly Vehicle[]>([])
  const enrolments = shallowRef<readonly Enrolment[]>([])
  const students = shallowRef<readonly Student[]>([])
  const fetched = shallowRef<readonly Appointment[]>([])

  /** Everything the prototype has created or moved this session. Never persisted. */
  const local = reactive(new Map<AppointmentId, Appointment>())
  const activity = ref<{ text: string, severity: 'info' | 'warning' }[]>([])

  const absences = computed(() => prototypeAbsences(weekStart.value))

  watchEffect(async () => {
    const from = toIsoDateTime(weekStart.value)
    const to = toIsoDateTime(new Date(weekStart.value.getTime() + 7 * MS_PER_DAY))

    isLoading.value = true

    const [weekAppointments, allInstructors, allVehicles, allEnrolments, studentPage] = await Promise.all([
      api.appointments.list({ from, to }),
      api.instructors.list(),
      api.vehicles.list(),
      api.enrolments.list(),
      api.students.list({ pageSize: 100 }),
    ])

    instructors.value = allInstructors
    vehicles.value = allVehicles
    enrolments.value = allEnrolments
    // The list item is enough — the planner only ever shows a name.
    students.value = studentPage.items as unknown as readonly Student[]
    fetched.value = weekAppointments
    isLoading.value = false
  })

  const instructorById = computed(() => new Map(instructors.value.map(one => [one.id, one])))
  const vehicleById = computed(() => new Map(vehicles.value.map(one => [one.id, one])))
  const enrolmentById = computed(() => new Map(enrolments.value.map(one => [one.id, one])))
  const studentById = computed(() => new Map(students.value.map(one => [one.id, one])))

  /** Only staff who can still take new work get a column. Leavers stay resolvable, not bookable. */
  const activeInstructors = computed(() =>
    instructors.value.filter(instructor => instructor.employedUntil === null),
  )
  const activeVehicles = computed(() => vehicles.value.filter(vehicle => vehicle.retiredAt === null))

  const appointments = computed<readonly Appointment[]>(() => {
    const merged = new Map<AppointmentId, Appointment>()

    for (const appointment of [...fetched.value, ...prototypeAppointments(weekStart.value)])
      merged.set(appointment.id, appointment)

    for (const [id, appointment] of local)
      merged.set(id, appointment)

    return [...merged.values()].filter(appointment => inWeek(appointment, weekStart.value))
  })

  const context = computed<ConflictContext>(() => ({
    appointments: appointments.value,
    instructors: instructorById.value,
    vehicles: vehicleById.value,
    enrolments: enrolmentById.value,
    absences: absences.value,
  }))

  /**
   * Every appointment already on the calendar, run back through the same rule set as a new
   * booking. A grid that only checks conflicts at drop time is lying about the state it is in —
   * two lessons can collide because someone edited a vehicle, not because anyone dragged.
   */
  const blocks = computed<PlannerBlock[]>(() =>
    appointments.value
      .filter(appointment => appointment.outcome.status !== 'cancelled')
      .map(appointment => toBlock(appointment))
      .sort((a, b) => a.startMinute - b.startMinute),
  )

  function toBlock(appointment: Appointment): PlannerBlock {
    const instructor = instructorById.value.get(appointment.instructorId) ?? null
    const vehicleId = vehicleOf(appointment)
    const vehicle = vehicleId === null ? null : vehicleById.value.get(vehicleId) ?? null
    const enrolmentId = appointment.kind === 'theory' ? null : appointment.enrolmentId
    const enrolment = enrolmentId === null ? null : enrolmentById.value.get(enrolmentId) ?? null
    const student = enrolment ? studentById.value.get(enrolment.studentId) ?? null : null
    const studentName = student ? `${student.firstName} ${student.lastName}` : null

    const startMinute = minuteOfDay(appointment.startsAt)
    const attendeeCount = appointment.kind === 'theory' ? appointment.attendees.length : 0
    const capacity = appointment.kind === 'theory' ? appointment.capacity : 0

    return {
      appointment,
      instructor,
      vehicle,
      studentName,
      licenceClass: enrolment?.licenceClass ?? null,
      title: titleOf(appointment, studentName),
      subtitle: subtitleOf(appointment, vehicle, enrolment?.licenceClass ?? null),
      attendeeCount,
      capacity,
      startMinute,
      endMinute: startMinute + appointment.durationMinutes,
      dayIndex: dayIndexOf(appointment.startsAt, weekStart.value),
      conflicts: evaluateConflicts(toCandidate(appointment), context.value),
    }
  }

  function toCandidate(appointment: Appointment): CandidateAppointment {
    return {
      id: appointment.id,
      kind: appointment.kind,
      instructorId: appointment.instructorId,
      vehicleId: vehicleOf(appointment),
      enrolmentId: appointment.kind === 'theory' ? null : appointment.enrolmentId,
      attendeeCount: appointment.kind === 'theory' ? appointment.attendees.length : 0,
      capacity: appointment.kind === 'theory' ? appointment.capacity : 0,
      startsAt: appointment.startsAt,
      durationMinutes: appointment.durationMinutes,
    }
  }

  function check(candidate: CandidateAppointment): Conflict[] {
    return evaluateConflicts(candidate, context.value)
  }

  /** In-memory only — the question is what booking feels like, not whether the write lands. */
  function book(draft: BookingDraft): void {
    const id = `local-${local.size + 1}-${Date.now()}` as AppointmentId

    const base = {
      id,
      instructorId: draft.instructorId!,
      startsAt: draft.startsAt,
      durationMinutes: draft.durationMinutes,
      outcome: { status: 'planned' } as const,
      notes: draft.overrideReason ? `Override: ${draft.overrideReason}` : '',
    }

    const appointment: Appointment = draft.kind === 'theory'
      ? {
          ...base,
          kind: 'theory',
          locationId: 'loc-classroom' as never,
          topic: { scope: 'basic', number: 1 },
          capacity: draft.capacity,
          attendees: [],
        }
      : draft.kind === 'exam'
        ? {
            ...base,
            kind: 'exam',
            examKind: 'practical',
            vehicleId: draft.vehicleId!,
            locationId: 'loc-exam' as never,
            enrolmentId: draft.enrolmentId!,
            result: null,
          }
        : {
            ...base,
            kind: 'practical',
            vehicleId: draft.vehicleId!,
            enrolmentId: draft.enrolmentId!,
            driveType: 'standard',
            meetingPointId: null,
          }

    local.set(id, appointment)
    log(draft.overrideReason
      ? `Booked over a warning — ${draft.overrideReason}`
      : 'Booked', draft.overrideReason ? 'warning' : 'info')
  }

  function move(id: AppointmentId, startsAt: IsoDateTime, instructorId?: InstructorId): void {
    const existing = appointments.value.find(appointment => appointment.id === id)

    if (!existing)
      return

    local.set(id, { ...existing, startsAt, instructorId: instructorId ?? existing.instructorId })
    log('Moved', 'info')
  }

  function resize(id: AppointmentId, durationMinutes: number): void {
    const existing = appointments.value.find(appointment => appointment.id === id)

    if (!existing)
      return

    local.set(id, { ...existing, durationMinutes })
  }

  function log(text: string, severity: 'info' | 'warning'): void {
    activity.value = [{ text, severity }, ...activity.value].slice(0, 6)
  }

  function goToWeek(offsetWeeks: number): void {
    weekStart.value = new Date(weekStart.value.getTime() + offsetWeeks * 7 * MS_PER_DAY)
  }

  function studentNameFor(enrolmentId: EnrolmentId): string {
    const enrolment = enrolmentById.value.get(enrolmentId)
    const student = enrolment ? studentById.value.get(enrolment.studentId) : null

    return student ? `${student.firstName} ${student.lastName}` : String(enrolmentId)
  }

  /** Enrolments a booking may name: open ones, with a class the school still teaches. */
  const bookableEnrolments = computed(() =>
    enrolments.value
      .filter(enrolment => enrolment.status !== 'passed' && enrolment.status !== 'withdrawn')
      .map(enrolment => ({
        enrolment,
        label: `${studentNameFor(enrolment.id)} · ${enrolment.licenceClass}`,
      })),
  )

  return {
    weekStart,
    isLoading,
    goToWeek,
    instructors: activeInstructors,
    vehicles: activeVehicles,
    enrolments,
    bookableEnrolments,
    blocks,
    absences,
    activity,
    check,
    book,
    move,
    resize,
    studentNameFor,
    instructorById,
    vehicleById,
  }
}

// --- pure helpers ------------------------------------------------------------------------------

export function mondayOf(date: Date): Date {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const isoWeekday = monday.getUTCDay() === 0 ? 7 : monday.getUTCDay()

  monday.setUTCDate(monday.getUTCDate() - (isoWeekday - 1))

  return monday
}

export function minuteOfDay(instant: IsoDateTime): number {
  const date = new Date(instant)

  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

export function dayIndexOf(instant: IsoDateTime, weekStart: Date): number {
  return Math.floor((Date.parse(instant) - weekStart.getTime()) / MS_PER_DAY)
}

export function instantAt(weekStart: Date, dayIndex: number, minute: number): IsoDateTime {
  const instant = new Date(weekStart.getTime() + dayIndex * MS_PER_DAY)

  instant.setUTCHours(0, minute, 0, 0)

  return toIsoDateTime(instant)
}

function inWeek(appointment: Appointment, weekStart: Date): boolean {
  const day = dayIndexOf(appointment.startsAt, weekStart)

  return day >= 0 && day < 7
}

export function kindLabel(appointment: Appointment): string {
  if (appointment.kind === 'theory')
    return `Theory ${appointment.topic.scope === 'basic' ? 'G' : 'K'}${appointment.topic.number}`

  if (appointment.kind === 'exam')
    return appointment.examKind === 'practical' ? 'Practical exam' : 'Theory exam'

  return 'Lesson'
}

function titleOf(appointment: Appointment, studentName: string | null): string {
  if (appointment.kind === 'theory')
    return kindLabel(appointment)

  return studentName ?? 'Unassigned'
}

function subtitleOf(
  appointment: Appointment,
  vehicle: Vehicle | null,
  licenceClass: LicenceClass | null,
): string {
  if (appointment.kind === 'theory')
    return 'Theorieraum Ostend'

  const parts = [licenceClass, vehicle?.licencePlate].filter(Boolean)

  if (appointment.kind === 'exam')
    parts.unshift('Exam')
  else if (appointment.driveType !== 'standard')
    parts.unshift(appointment.driveType)

  return parts.join(' · ')
}

export type PlannerData = ReturnType<typeof usePlannerData>
export type { InstructorId, VehicleId }
