import type {
  Appointment,
  AppointmentOutcome,
  Attendance,
  ExamResult,
  PracticalDriveType,
  TheoryTopic,
} from './appointment.types'
import type {
  AppointmentId,
  EnrolmentId,
  InstructorId,
  LocationId,
  VehicleId,
} from './identifier.types'
import type { IsoDateTime } from './time.types'
import type { TrainingRecord, TrainingRequirementKind, TrainingRequirements } from './training.types'
import { describe, expect, it } from 'vitest'
import { LEGAL_TRAINING_MINIMUMS } from './training.constants'
import {
  deriveExamReadiness,
  deriveTrainingRecord,
  isReadyForExam,
  outstandingPracticalUnits,
  unmetRequirements,
} from './training.utils'

const ENROLMENT = 'enr-1' as EnrolmentId
const OTHER_ENROLMENT = 'enr-2' as EnrolmentId
const PAST = '2026-03-10T09:00:00.000Z' as IsoDateTime
const FUTURE = '2026-04-20T09:00:00.000Z' as IsoDateTime
const LATER_STILL = '2026-05-30T09:00:00.000Z' as IsoDateTime

let nextId = 0

function id(): AppointmentId {
  nextId += 1
  return `apt-${nextId}` as AppointmentId
}

const base = {
  instructorId: 'ins-1' as InstructorId,
  durationMinutes: 45,
  notes: '',
}

const completed: AppointmentOutcome = { status: 'completed', completedAt: PAST }
const planned: AppointmentOutcome = { status: 'planned' }

function practical(
  driveType: PracticalDriveType,
  outcome: AppointmentOutcome = completed,
  overrides: { durationMinutes?: number, startsAt?: IsoDateTime, enrolmentId?: EnrolmentId } = {},
): Appointment {
  return {
    ...base,
    id: id(),
    kind: 'practical',
    enrolmentId: overrides.enrolmentId ?? ENROLMENT,
    vehicleId: 'veh-1' as VehicleId,
    driveType,
    meetingPointId: null,
    startsAt: overrides.startsAt ?? PAST,
    durationMinutes: overrides.durationMinutes ?? 45,
    outcome,
  }
}

function theory(
  scope: TheoryTopic['scope'],
  attendees: readonly Attendance[],
  outcome: AppointmentOutcome = completed,
  startsAt: IsoDateTime = PAST,
): Appointment {
  return {
    ...base,
    id: id(),
    kind: 'theory',
    locationId: 'loc-1' as LocationId,
    topic: { scope, number: 1 },
    capacity: 12,
    attendees,
    startsAt,
    outcome,
  }
}

function theoryExam(
  result: ExamResult | null,
  outcome: AppointmentOutcome = completed,
  startsAt: IsoDateTime = PAST,
): Appointment {
  return {
    ...base,
    id: id(),
    kind: 'exam',
    examKind: 'theory',
    enrolmentId: ENROLMENT,
    locationId: 'loc-exam' as LocationId,
    result,
    startsAt,
    outcome,
  }
}

function requirements(overrides: Partial<TrainingRequirements> = {}): TrainingRequirements {
  return {
    standardPracticalUnits: 12,
    specialDriveUnits: { overland: 5, autobahn: 4, night: 3 },
    basicTheoryLessons: 12,
    classSpecificTheoryLessons: 2,
    ...overrides,
  }
}

function record(overrides: Partial<TrainingRecord> = {}): TrainingRecord {
  return {
    standardPracticalUnits: 0,
    specialDriveUnits: { overland: 0, autobahn: 0, night: 0 },
    basicTheoryLessons: 0,
    classSpecificTheoryLessons: 0,
    isTheoryExamPassed: false,
    ...overrides,
  }
}

function kindsOf(requirementList: readonly { kind: TrainingRequirementKind }[]): string[] {
  return requirementList.map(it => it.kind)
}

describe('deriveTrainingRecord', () => {
  it('counts completed practical drives per type, in 45-minute units', () => {
    const result = deriveTrainingRecord(ENROLMENT, [
      practical('standard'),
      practical('standard', completed, { durationMinutes: 90 }),
      practical('overland', completed, { durationMinutes: 90 }),
      practical('night'),
    ])

    expect(result.standardPracticalUnits).toBe(3)
    expect(result.specialDriveUnits).toEqual({ overland: 2, autobahn: 0, night: 1 })
  })

  it('ignores appointments that did not happen', () => {
    const result = deriveTrainingRecord(ENROLMENT, [
      practical('standard', planned, { startsAt: FUTURE }),
      practical('standard', { status: 'noShow', recordedAt: PAST }),
      practical('overland', { status: 'cancelled', cancelledAt: PAST, cancelledBy: 'student' }),
    ])

    expect(result.standardPracticalUnits).toBe(0)
    expect(result.specialDriveUnits.overland).toBe(0)
  })

  it('ignores another enrolment’s drives', () => {
    const result = deriveTrainingRecord(ENROLMENT, [
      practical('standard', completed, { enrolmentId: OTHER_ENROLMENT }),
    ])

    expect(result.standardPracticalUnits).toBe(0)
  })

  it('counts theory per attendance and per scope', () => {
    const result = deriveTrainingRecord(ENROLMENT, [
      theory('basic', [{ enrolmentId: ENROLMENT, status: 'attended' }]),
      theory('basic', [{ enrolmentId: ENROLMENT, status: 'absent' }]),
      theory('basic', [{ enrolmentId: ENROLMENT, status: 'excused' }]),
      theory('basic', [{ enrolmentId: OTHER_ENROLMENT, status: 'attended' }]),
      theory('classSpecific', [
        { enrolmentId: OTHER_ENROLMENT, status: 'attended' },
        { enrolmentId: ENROLMENT, status: 'attended' },
      ]),
    ])

    expect(result.basicTheoryLessons).toBe(1)
    expect(result.classSpecificTheoryLessons).toBe(1)
  })

  it('reads the theory exam from a passed sitting only', () => {
    expect(deriveTrainingRecord(ENROLMENT, [theoryExam('passed')]).isTheoryExamPassed).toBe(true)
    expect(deriveTrainingRecord(ENROLMENT, [theoryExam('failed')]).isTheoryExamPassed).toBe(false)
    expect(deriveTrainingRecord(ENROLMENT, [theoryExam(null)]).isTheoryExamPassed).toBe(false)
  })

  describe('projected onto a date', () => {
    it('counts planned appointments that start before the cutoff', () => {
      const appointments = [
        practical('standard', planned, { startsAt: FUTURE }),
        practical('overland', planned, { startsAt: FUTURE }),
        theory('basic', [{ enrolmentId: ENROLMENT, status: 'registered' }], planned, FUTURE),
        theoryExam(null, planned, FUTURE),
      ]

      const result = deriveTrainingRecord(ENROLMENT, appointments, {
        countPlannedBefore: LATER_STILL,
      })

      expect(result.standardPracticalUnits).toBe(1)
      expect(result.specialDriveUnits.overland).toBe(1)
      expect(result.basicTheoryLessons).toBe(1)
      expect(result.isTheoryExamPassed).toBe(true)
    })

    it('does not count planned appointments after the cutoff', () => {
      const result = deriveTrainingRecord(
        ENROLMENT,
        [practical('standard', planned, { startsAt: LATER_STILL })],
        { countPlannedBefore: FUTURE },
      )

      expect(result.standardPracticalUnits).toBe(0)
    })

    it('still ignores no-shows and cancellations', () => {
      const result = deriveTrainingRecord(
        ENROLMENT,
        [practical('standard', { status: 'noShow', recordedAt: FUTURE }, { startsAt: FUTURE })],
        { countPlannedBefore: LATER_STILL },
      )

      expect(result.standardPracticalUnits).toBe(0)
    })
  })
})

describe('deriveExamReadiness', () => {
  it('reports the theory course as the theory exam’s requirements', () => {
    const readiness = deriveExamReadiness(requirements(), record())

    expect(kindsOf(readiness.theory.requirements)).toEqual(['basicTheory', 'classSpecificTheory'])
    expect(readiness.theory.isMet).toBe(false)
  })

  it('is met for theory when both scopes are complete', () => {
    const readiness = deriveExamReadiness(
      requirements(),
      record({ basicTheoryLessons: 12, classSpecificTheoryLessons: 2 }),
    )

    expect(readiness.theory.isMet).toBe(true)
  })

  it('is not met for theory when only the basic course is complete', () => {
    const readiness = deriveExamReadiness(requirements(), record({ basicTheoryLessons: 14 }))

    expect(readiness.theory.isMet).toBe(false)
    expect(kindsOf(unmetRequirements(readiness.theory))).toEqual(['classSpecificTheory'])
  })

  it('puts the drives and the passed theory exam in the practical group', () => {
    const readiness = deriveExamReadiness(requirements(), record())

    expect(kindsOf(readiness.practical.requirements)).toEqual([
      'standardPractical',
      'overlandDrive',
      'autobahnDrive',
      'nightDrive',
      'theoryExamPassed',
    ])
  })

  it('withholds practical readiness until the theory exam is passed', () => {
    const met = record({
      standardPracticalUnits: 12,
      specialDriveUnits: { overland: 5, autobahn: 4, night: 3 },
    })

    expect(deriveExamReadiness(requirements(), met).practical.isMet).toBe(false)
    expect(
      deriveExamReadiness(requirements(), { ...met, isTheoryExamPassed: true }).practical.isMet,
    ).toBe(true)
  })

  it('reports overshoot as met, with the true count and nothing outstanding', () => {
    const readiness = deriveExamReadiness(requirements(), record({ standardPracticalUnits: 14 }))
    const standard = readiness.practical.requirements[0]!

    expect(standard).toMatchObject({ completed: 14, required: 12, isMet: true, outstanding: 0 })
  })

  it('treats a zero requirement as already met', () => {
    const readiness = deriveExamReadiness(
      requirements({ specialDriveUnits: { overland: 3, autobahn: 1, night: 0 } }),
      record({
        standardPracticalUnits: 12,
        specialDriveUnits: { overland: 3, autobahn: 1, night: 0 },
      }),
    )

    expect(unmetRequirements(readiness.practical).map(it => it.kind)).toEqual(['theoryExamPassed'])
  })

  it('answers the boolean question through isReadyForExam', () => {
    const readiness = deriveExamReadiness(
      requirements(),
      record({ basicTheoryLessons: 12, classSpecificTheoryLessons: 2 }),
    )

    expect(isReadyForExam(readiness, 'theory')).toBe(true)
    expect(isReadyForExam(readiness, 'practical')).toBe(false)
  })
})

describe('outstandingPracticalUnits', () => {
  it('sums the standard and special shortfalls, excluding the theory-exam milestone', () => {
    const readiness = deriveExamReadiness(
      requirements(),
      record({ standardPracticalUnits: 10, specialDriveUnits: { overland: 5, autobahn: 1, night: 0 } }),
    )

    // 2 standard + 0 overland + 3 autobahn + 3 night.
    expect(outstandingPracticalUnits(readiness)).toBe(8)
  })

  it('is zero for an enrolment that owes only its theory exam', () => {
    const readiness = deriveExamReadiness(
      requirements(),
      record({
        standardPracticalUnits: 12,
        specialDriveUnits: { overland: 5, autobahn: 4, night: 3 },
      }),
    )

    expect(outstandingPracticalUnits(readiness)).toBe(0)
    expect(readiness.practical.isMet).toBe(false)
  })
})

describe('the legal training minimums', () => {
  it('mandates no standard practical lessons for any class', () => {
    const standards = Object.values(LEGAL_TRAINING_MINIMUMS).map(it => it.standardPracticalUnits)

    expect(standards.every(units => units === 0)).toBe(true)
  })

  it('covers every licence class with non-negative counts', () => {
    for (const [licenceClass, it] of Object.entries(LEGAL_TRAINING_MINIMUMS)) {
      const counts = [
        it.basicTheoryLessons,
        it.classSpecificTheoryLessons,
        ...Object.values(it.specialDriveUnits),
      ]

      expect(counts.every(count => count >= 0), licenceClass).toBe(true)
    }
  })
})
