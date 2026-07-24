import type { Appointment } from './appointment.types'
import type { EnrolmentId } from './identifier.types'
import type { IsoDateTime } from './time.types'
import type {
  ExamKind,
  ExamReadiness,
  ExamReadinessGroup,
  SpecialDriveType,
  TrainingRecord,
  TrainingRequirement,
  TrainingRequirementKind,
  TrainingRequirements,
} from './training.types'
import { chargeableUnits } from './billing.utils'

export interface TrainingRecordOptions {
  /**
   * Count `planned` appointments starting before this instant as though they will happen.
   *
   * What the planner reads when it warns about an exam booked for a date the student will not be
   * ready for: a school books an exam slot weeks ahead, so measuring it against lessons already
   * driven would warn on every booking that was made correctly. Omitted — the enrolment card's
   * case — only completed training counts.
   */
  countPlannedBefore?: IsoDateTime
}

function emptyRecord(): TrainingRecord {
  return {
    standardPracticalUnits: 0,
    specialDriveUnits: { overland: 0, autobahn: 0, night: 0 },
    basicTheoryLessons: 0,
    classSpecificTheoryLessons: 0,
    isTheoryExamPassed: false,
  }
}

/**
 * What one enrolment has behind it, counted from its appointments.
 *
 * Only `completed` appointments count. A `noShow` is billable and is not training; a cancellation
 * is neither. Theory is counted per attendance, so one student's absence from a class of twelve
 * costs that student the lesson and nobody else.
 *
 * Pure, so the same arithmetic serves the enrolment card, the planner's warning and — when the
 * seam is real — the server computing it. The fake calls this; nothing counts appointments itself.
 */
export function deriveTrainingRecord(
  enrolmentId: EnrolmentId,
  appointments: readonly Appointment[],
  options: TrainingRecordOptions = {},
): TrainingRecord {
  const { countPlannedBefore } = options
  const record = emptyRecord()

  /** Whether an appointment happened, or is booked to happen inside the projection window. */
  function counts(appointment: Appointment): boolean {
    if (appointment.outcome.status === 'completed')
      return true

    return appointment.outcome.status === 'planned'
      && countPlannedBefore !== undefined
      && appointment.startsAt < countPlannedBefore
  }

  for (const appointment of appointments) {
    if (!counts(appointment))
      continue

    if (appointment.kind === 'practical') {
      if (appointment.enrolmentId !== enrolmentId)
        continue

      const units = chargeableUnits(appointment.durationMinutes)

      if (appointment.driveType === 'standard')
        record.standardPracticalUnits += units
      else
        record.specialDriveUnits[appointment.driveType] += units

      continue
    }

    if (appointment.kind === 'theory') {
      const attendance = appointment.attendees.find(it => it.enrolmentId === enrolmentId)

      if (!attendance)
        continue

      // A planned class has nobody marked `attended` yet, so a projection reads `registered`.
      const wasThere = attendance.status === 'attended'
        || (attendance.status === 'registered' && appointment.outcome.status === 'planned')

      if (!wasThere)
        continue

      if (appointment.topic.scope === 'basic')
        record.basicTheoryLessons += 1
      else
        record.classSpecificTheoryLessons += 1

      continue
    }

    if (appointment.enrolmentId !== enrolmentId || appointment.examKind !== 'theory')
      continue

    // A booked theory exam counts toward a projection: it is the sitting the practical waits on.
    if (appointment.result === 'passed' || appointment.outcome.status === 'planned')
      record.isTheoryExamPassed = true
  }

  return record
}

function requirement(
  kind: TrainingRequirementKind,
  completed: number,
  required: number,
): TrainingRequirement {
  return {
    kind,
    completed,
    required,
    isMet: completed >= required,
    outstanding: Math.max(0, required - completed),
  }
}

const SPECIAL_DRIVE_KINDS: Record<SpecialDriveType, TrainingRequirementKind> = {
  overland: 'overlandDrive',
  autobahn: 'autobahnDrive',
  night: 'nightDrive',
}

function group(examKind: ExamKind, requirements: readonly TrainingRequirement[]): ExamReadinessGroup {
  return {
    examKind,
    isMet: requirements.every(it => it.isMet),
    requirements,
  }
}

/**
 * Whether an enrolment may sit each of its exams, and what is short where it may not.
 *
 * Two groups because the two exams gate independently and in order: theory needs the theory
 * course, practical needs the drives *and* a passed theory exam, which is why that milestone is a
 * line of the practical group rather than a field beside it.
 *
 * Requirements are read from today's offering, never from a copy frozen onto the enrolment — the
 * reverse of `agreedPrices`, and for the reverse reason. See `docs/training-model.md`.
 */
export function deriveExamReadiness(
  requirements: TrainingRequirements,
  record: TrainingRecord,
): ExamReadiness {
  const theory = group('theory', [
    requirement('basicTheory', record.basicTheoryLessons, requirements.basicTheoryLessons),
    requirement(
      'classSpecificTheory',
      record.classSpecificTheoryLessons,
      requirements.classSpecificTheoryLessons,
    ),
  ])

  const specialDrives = (Object.keys(SPECIAL_DRIVE_KINDS) as SpecialDriveType[]).map(type =>
    requirement(
      SPECIAL_DRIVE_KINDS[type],
      record.specialDriveUnits[type],
      requirements.specialDriveUnits[type],
    ),
  )

  const practical = group('practical', [
    requirement(
      'standardPractical',
      record.standardPracticalUnits,
      requirements.standardPracticalUnits,
    ),
    ...specialDrives,
    requirement('theoryExamPassed', record.isTheoryExamPassed ? 1 : 0, 1),
  ])

  return { theory, practical }
}

/** Whether one exam may be sat. The boolean, for the callers that genuinely only want it. */
export function isReadyForExam(readiness: ExamReadiness, examKind: ExamKind): boolean {
  return readiness[examKind].isMet
}

/** The unmet lines of one group, in render order. What a warning quotes and a card lists. */
export function unmetRequirements(group: ExamReadinessGroup): readonly TrainingRequirement[] {
  return group.requirements.filter(it => !it.isMet)
}

/**
 * Practical units an enrolment still owes against its requirements, standard and special together.
 *
 * The number the planner's instructor rail wants to order by — #11 sorts on "least booked this
 * week" only because this was not computable yet. The `theoryExamPassed` line is not a unit and is
 * excluded; a student waiting only on a theory exam owes no driving.
 */
export function outstandingPracticalUnits(readiness: ExamReadiness): number {
  return readiness.practical.requirements
    .filter(it => it.kind !== 'theoryExamPassed')
    .reduce((total, it) => total + it.outstanding, 0)
}
