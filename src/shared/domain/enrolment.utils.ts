import type { Appointment, ExamResult } from './appointment.types'
import type { EnrolmentId } from './identifier.types'
import type { IsoDateTime } from './time.types'
import type { ExamReadiness, TrainingRecord, TrainingRequirements } from './training.types'
import { deriveExamReadiness, deriveTrainingRecord } from './training.utils'

/** One exam this enrolment has actually sat. A booked-but-not-sat exam is not in here. */
export interface EnrolmentExam {
  examKind: 'theory' | 'practical'
  satAt: IsoDateTime
  /** Null when the result has not been recorded yet. */
  result: ExamResult | null
}

/**
 * Everything the enrolment card measures, in one object.
 *
 * Three parts and no fourth: what the enrolment has done (`record`), that record measured against
 * today's requirements (`readiness`), and the two things neither of those is about — the exams it
 * has sat, and what is still on the calendar.
 *
 * The counting and the comparison are `training.utils.ts`'s (#21), not this file's. What is left
 * here is the exam history and the booked count, which no other caller needed.
 */
export interface EnrolmentProgress {
  /** What this enrolment has completed, from `deriveTrainingRecord`. */
  record: TrainingRecord
  /**
   * The record measured against today's offering, from `deriveExamReadiness`. Carries the
   * requirement counts alongside the completed ones, so the card draws every bar from here and
   * re-derives nothing.
   */
  readiness: ExamReadiness
  /** Oldest first. Both exams appear once sat, whether or not a result was recorded. */
  exams: readonly EnrolmentExam[]
  /** Booked and not yet sat, across every kind. What "12 booked, 7 driven" is read from. */
  plannedAppointments: number
}

/**
 * The record page's reading of one enrolment.
 *
 * Pure and unit-tested, with the fake calling it — same arrangement as `deriveStudentStanding`
 * and `validateStudent`, and for the same reason: an HTTP backend would compute this server-side,
 * and the rule it implements should be written down here rather than reverse-engineered from a
 * Vue component later.
 *
 * `appointments` may be the whole calendar; everything not belonging to `enrolmentId` is ignored.
 * The enrolment id is a parameter rather than implied by the caller's filtering because a theory
 * appointment is shared — whether *this* student sat in it is read from its attendee list, which
 * pre-filtering cannot express.
 *
 * `requirements` come from today's offering and are never a copy frozen onto the enrolment: the
 * reverse of `agreedPrices`, and for the reverse reason. See `docs/training-model.md`.
 */
export function deriveEnrolmentProgress(
  enrolmentId: EnrolmentId,
  requirements: TrainingRequirements,
  appointments: readonly Appointment[],
): EnrolmentProgress {
  const record = deriveTrainingRecord(enrolmentId, appointments)

  // `flatMap` rather than filter-then-map: it narrows the union in one pass, so `examKind` and
  // `result` are reachable without an assertion.
  const exams: EnrolmentExam[] = appointments
    .flatMap((appointment): EnrolmentExam[] => {
      const isSatExam = appointment.kind === 'exam'
        && appointment.enrolmentId === enrolmentId
        && appointment.outcome.status === 'completed'

      if (!isSatExam)
        return []

      return [{
        examKind: appointment.examKind,
        satAt: appointment.startsAt,
        result: appointment.result,
      }]
    })
    .sort((a, b) => a.satAt.localeCompare(b.satAt))

  return {
    record,
    readiness: deriveExamReadiness(requirements, record),
    exams,
    plannedAppointments: appointments.filter(it => isPlannedFor(it, enrolmentId)).length,
  }
}

/** Booked, and this enrolment is on it — as its owner, or as one name on a theory register. */
function isPlannedFor(appointment: Appointment, enrolmentId: EnrolmentId): boolean {
  if (appointment.outcome.status !== 'planned')
    return false

  return appointment.kind === 'theory'
    ? appointment.attendees.some(it => it.enrolmentId === enrolmentId)
    : appointment.enrolmentId === enrolmentId
}
