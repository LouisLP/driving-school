import type { Appointment, AppointmentOutcome, Attendance } from './appointment.types'
import type {
  AppointmentId,
  EnrolmentId,
  InstructorId,
  LocationId,
  VehicleId,
} from './identifier.types'
import type { IsoDateTime } from './time.types'
import type { TrainingRequirements } from './training.types'
import { describe, expect, it } from 'vitest'
import { deriveEnrolmentProgress } from './enrolment.utils'

/**
 * The counting and the readiness comparison belong to `training.utils.ts` and are covered by its
 * own spec (#21). What is left to test here is the part this file adds: the exam history and the
 * booked count. Re-testing the arithmetic would be testing the same function twice.
 */

const ENROLMENT = 'enr-01' as EnrolmentId
const OTHER_ENROLMENT = 'enr-02' as EnrolmentId

const REQUIREMENTS: TrainingRequirements = {
  standardPracticalUnits: 12,
  specialDriveUnits: { overland: 5, autobahn: 4, night: 3 },
  basicTheoryLessons: 12,
  classSpecificTheoryLessons: 2,
}

const COMPLETED: AppointmentOutcome = {
  status: 'completed',
  completedAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
}

const PLANNED: AppointmentOutcome = { status: 'planned' }

let nextId = 0

function at(day: number): IsoDateTime {
  return `2026-01-${String(day).padStart(2, '0')}T09:00:00.000Z` as IsoDateTime
}

function practical(outcome: AppointmentOutcome, enrolmentId = ENROLMENT): Appointment {
  return {
    id: `apt-${nextId += 1}` as AppointmentId,
    kind: 'practical',
    enrolmentId,
    instructorId: 'ins' as InstructorId,
    vehicleId: 'veh' as VehicleId,
    driveType: 'standard',
    meetingPointId: null,
    startsAt: at(1),
    durationMinutes: 45,
    outcome,
    notes: '',
  }
}

function theory(attendees: readonly Attendance[], outcome: AppointmentOutcome): Appointment {
  return {
    id: `apt-${nextId += 1}` as AppointmentId,
    kind: 'theory',
    instructorId: 'ins' as InstructorId,
    locationId: 'loc' as LocationId,
    topic: { scope: 'basic', number: 1 },
    capacity: 12,
    attendees: [...attendees],
    startsAt: at(1),
    durationMinutes: 90,
    outcome,
    notes: '',
  }
}

function exam(
  examKind: 'theory' | 'practical',
  result: 'passed' | 'failed' | null,
  outcome: AppointmentOutcome,
  startsAt: IsoDateTime = at(1),
): Appointment {
  const base = {
    id: `apt-${nextId += 1}` as AppointmentId,
    kind: 'exam' as const,
    enrolmentId: ENROLMENT,
    instructorId: 'ins' as InstructorId,
    locationId: 'loc' as LocationId,
    result,
    startsAt,
    durationMinutes: 60,
    outcome,
    notes: '',
  }

  return examKind === 'theory'
    ? { ...base, examKind: 'theory' }
    : { ...base, examKind: 'practical', vehicleId: 'veh' as VehicleId }
}

function derive(appointments: readonly Appointment[]) {
  return deriveEnrolmentProgress(ENROLMENT, REQUIREMENTS, appointments)
}

describe('deriveEnrolmentProgress', () => {
  it('carries the record and the readiness the training rules produce', () => {
    const progress = derive([practical(COMPLETED)])

    expect(progress.record.standardPracticalUnits).toBe(1)
    // The requirement counts ride along, so the card draws its bars without a second lookup.
    expect(progress.readiness.practical.requirements.find(it => it.kind === 'overlandDrive'))
      .toMatchObject({ required: 5, completed: 0, isMet: false, outstanding: 5 })
    expect(progress.readiness.theory.isMet).toBe(false)
  })

  it('lists the exams that were sat, with and without a result, oldest first', () => {
    const progress = derive([
      exam('practical', null, COMPLETED, at(9)),
      exam('theory', 'passed', COMPLETED, at(3)),
      exam('theory', 'failed', COMPLETED, at(1)),
    ])

    expect(progress.exams).toEqual([
      { examKind: 'theory', satAt: at(1), result: 'failed' },
      { examKind: 'theory', satAt: at(3), result: 'passed' },
      { examKind: 'practical', satAt: at(9), result: null },
    ])
  })

  it('leaves a booked exam out of the list — "not sat" is not the same as "no result"', () => {
    const progress = derive([exam('practical', null, PLANNED)])

    expect(progress.exams).toEqual([])
    expect(progress.plannedAppointments).toBe(1)
  })

  it('leaves another enrolment\'s exam out of the list', () => {
    const other = { ...exam('theory', 'passed', COMPLETED), enrolmentId: OTHER_ENROLMENT }

    expect(derive([other]).exams).toEqual([])
  })

  it('counts everything still booked, across kinds and including a theory register', () => {
    const progress = derive([
      practical(PLANNED),
      theory([{ enrolmentId: ENROLMENT, status: 'registered' }], PLANNED),
      theory([{ enrolmentId: OTHER_ENROLMENT, status: 'registered' }], PLANNED),
      practical(PLANNED, OTHER_ENROLMENT),
      practical(COMPLETED),
    ])

    expect(progress.plannedAppointments).toBe(2)
  })
})
