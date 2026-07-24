/**
 * PROTOTYPE — throwaway. Not production code.
 *
 * The seeded school has seventeen lessons across three weeks, which is an honest domain fixture
 * and a dishonest *planner*: an empty grid makes every layout look good. These extras exist only
 * to give the prototype a week that looks like a working school — plus one of each interesting
 * collision, so the conflict UI has something to render without the user having to stage it.
 */

import type { InstructorAbsence } from './conflicts'
import type {
  Appointment,
  AppointmentId,
  EnrolmentId,
  InstructorId,
  IsoDateTime,
  VehicleId,
} from '@/shared/domain'
import { toIsoDateTime } from '@/shared/domain'

const VOGEL = 'ins-01' as InstructorId
const LEHMANN = 'ins-02' as InstructorId
const YILDIZ = 'ins-03' as InstructorId

const GOLF = 'veh-01' as VehicleId
const CORSA = 'veh-02' as VehicleId
const MT07 = 'veh-03' as VehicleId
const ATEGO = 'veh-04' as VehicleId

const CLASSROOM = 'loc-classroom' as const

/** `[weekday 0=Mon, hour, minute, instructor, vehicle, enrolment, duration]` */
type Row = readonly [number, number, number, InstructorId, VehicleId, string, number]

const FILLER: readonly Row[] = [
  [0, 8, 0, VOGEL, GOLF, 'enr-01', 45],
  [0, 10, 0, VOGEL, GOLF, 'enr-11', 45],
  [0, 13, 30, VOGEL, ATEGO, 'enr-09', 90],
  [0, 8, 0, LEHMANN, CORSA, 'enr-07', 45],
  [0, 9, 0, LEHMANN, CORSA, 'enr-02', 45],
  [0, 14, 0, LEHMANN, GOLF, 'enr-01', 45],
  [0, 16, 0, YILDIZ, MT07, 'enr-06', 90],
  [1, 9, 30, VOGEL, GOLF, 'enr-01', 45],
  [1, 11, 0, VOGEL, GOLF, 'enr-11', 45],
  [1, 15, 0, VOGEL, ATEGO, 'enr-09', 90],
  [1, 10, 0, LEHMANN, CORSA, 'enr-07', 45],
  [1, 16, 30, LEHMANN, CORSA, 'enr-02', 45],
  [1, 8, 0, YILDIZ, MT07, 'enr-06', 45],
  [2, 8, 30, VOGEL, GOLF, 'enr-11', 45],
  [2, 12, 0, VOGEL, ATEGO, 'enr-09', 90],
  [2, 9, 0, LEHMANN, CORSA, 'enr-07', 45],
  [2, 14, 0, LEHMANN, GOLF, 'enr-01', 45],
  [2, 11, 0, YILDIZ, MT07, 'enr-06', 45],
  [3, 8, 0, VOGEL, GOLF, 'enr-01', 45],
  [3, 9, 0, VOGEL, GOLF, 'enr-11', 45],
  [3, 14, 0, VOGEL, ATEGO, 'enr-09', 90],
  [3, 11, 0, LEHMANN, CORSA, 'enr-07', 45],
  [3, 15, 30, LEHMANN, CORSA, 'enr-02', 45],
  [4, 8, 0, VOGEL, GOLF, 'enr-11', 45],
  [4, 10, 30, VOGEL, GOLF, 'enr-01', 45],
  [4, 13, 0, LEHMANN, CORSA, 'enr-07', 45],
  [4, 15, 0, LEHMANN, GOLF, 'enr-02', 90],
  [4, 12, 0, YILDIZ, MT07, 'enr-06', 45],
]

/**
 * Deliberate collisions, so the conflict layer has something to say on load:
 *
 * - Wednesday 14:00 — Lehmann teaches enr-01 in the Golf while Vogel has the Golf out too:
 *   a **vehicle** double-booking between two otherwise valid lessons.
 * - Thursday afternoon — Yıldız is marked away but holds a lesson: an **absence** warning.
 * - Friday 15:00 — the Golf is booked for enr-02 (class B, paused enrolment): an
 *   **enrolment not active** warning on a lesson that is otherwise fine.
 */
const COLLISIONS: readonly Row[] = [
  [2, 14, 0, VOGEL, GOLF, 'enr-11', 45],
  [3, 13, 0, YILDIZ, MT07, 'enr-06', 90],
]

export function prototypeAppointments(monday: Date): Appointment[] {
  const rows = [...FILLER, ...COLLISIONS]

  const practicals: Appointment[] = rows.map(
    ([day, hour, minute, instructorId, vehicleId, enrolmentId, durationMinutes], index) => ({
      id: `proto-p${index}` as AppointmentId,
      kind: 'practical',
      instructorId,
      vehicleId,
      enrolmentId: enrolmentId as EnrolmentId,
      driveType: 'standard',
      meetingPointId: null,
      startsAt: at(monday, day, hour, minute),
      durationMinutes,
      outcome: { status: 'planned' },
      notes: '',
    }),
  )

  /**
   * Two theory classes: one comfortable, one at 14 registered against 12 seats — the case the
   * issue asks about, a twenty-head block sharing a grid with one-to-one lessons.
   */
  const theory: Appointment[] = [
    {
      id: 'proto-t1' as AppointmentId,
      kind: 'theory',
      instructorId: LEHMANN,
      locationId: CLASSROOM as never,
      topic: { scope: 'basic', number: 4 },
      capacity: 12,
      attendees: attendees(7),
      startsAt: at(monday, 0, 18, 0),
      durationMinutes: 90,
      outcome: { status: 'planned' },
      notes: '',
    },
    {
      id: 'proto-t2' as AppointmentId,
      kind: 'theory',
      instructorId: VOGEL,
      locationId: CLASSROOM as never,
      topic: { scope: 'classSpecific', number: 2 },
      capacity: 12,
      attendees: attendees(14),
      startsAt: at(monday, 3, 18, 0),
      durationMinutes: 90,
      outcome: { status: 'planned' },
      notes: '',
    },
  ]

  return [...practicals, ...theory]
}

/** Not in the domain model yet. The prototype invents the minimum shape it needs. */
export function prototypeAbsences(monday: Date): InstructorAbsence[] {
  return [
    {
      instructorId: YILDIZ,
      from: at(monday, 3, 12, 0),
      to: at(monday, 3, 18, 0),
      reason: 'Fortbildung — half day',
    },
  ]
}

const ENROLMENT_POOL = ['enr-01', 'enr-02', 'enr-06', 'enr-07', 'enr-09', 'enr-11']

function attendees(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    enrolmentId: (ENROLMENT_POOL[index % ENROLMENT_POOL.length] ?? 'enr-01') as EnrolmentId,
    status: 'registered' as const,
  }))
}

function at(monday: Date, dayOffset: number, hour: number, minute: number): IsoDateTime {
  const instant = new Date(monday)

  instant.setUTCDate(instant.getUTCDate() + dayOffset)
  instant.setUTCHours(hour, minute, 0, 0)

  return toIsoDateTime(instant)
}
