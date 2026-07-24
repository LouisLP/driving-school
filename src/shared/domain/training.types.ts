import type { PracticalDriveType } from './appointment.types'

/** A legally mandated drive type — every practical drive that is not an ordinary lesson. */
export type SpecialDriveType = Exclude<PracticalDriveType, 'standard'>

/** One count per mandated drive type. A total would hide that the three are not interchangeable. */
export type SpecialDriveUnits = Record<SpecialDriveType, number>

/**
 * How much training one licence class demands before its exams may be sat.
 *
 * Practical training is counted in **45-minute units** — the unit the school sells and the unit
 * the law counts special drives in — so a 90-minute overland drive is two units. Theory is
 * counted in **lessons**, because a theory appointment is one topic whatever its length.
 *
 * Split basic/class-specific because `TheoryTopic` already is: a student who has sat fourteen
 * basic lessons and no class-specific one has not finished a fourteen-lesson theory course, and a
 * single total cannot say so.
 *
 * Lives on the `LicenceClassOffering` beside `prices` — school configuration, seeded from
 * `LEGAL_TRAINING_MINIMUMS`. Unlike prices it is never frozen onto an enrolment; see
 * `docs/training-model.md`.
 */
export interface TrainingRequirements {
  /**
   * Ordinary practical lesson units. **School policy, not law** — no EU class mandates a number
   * of standard drives, so the legal minimum is zero for every class and this is the school's
   * own house figure for when a student is worth presenting.
   */
  standardPracticalUnits: number
  /** Mandated drive units per type. These are the law's, and the reason this type exists. */
  specialDriveUnits: SpecialDriveUnits
  /** Lessons of the general course every class shares. Grundstoff. */
  basicTheoryLessons: number
  /** Lessons of this class's own supplement. Zusatzstoff. */
  classSpecificTheoryLessons: number
}

/**
 * What one enrolment has actually done, in the same units its requirements are stated in.
 *
 * Deliberately the same shape as `TrainingRequirements` plus the one milestone that is not a
 * count, so readiness is a field-by-field comparison rather than a rule per requirement.
 */
export interface TrainingRecord {
  standardPracticalUnits: number
  specialDriveUnits: SpecialDriveUnits
  basicTheoryLessons: number
  classSpecificTheoryLessons: number
  /** The practical exam cannot legally be sat before the theory exam has been passed. */
  isTheoryExamPassed: boolean
}

/**
 * Which requirement a line of the breakdown is about. One kind per line the enrolment card
 * renders, so the card never has to unpack a nested shape to draw a row.
 */
export type TrainingRequirementKind
  = | 'standardPractical'
    | 'overlandDrive'
    | 'autobahnDrive'
    | 'nightDrive'
    | 'basicTheory'
    | 'classSpecificTheory'
    | 'theoryExamPassed'

/**
 * One requirement, measured.
 *
 * `theoryExamPassed` is counted too — `required: 1`, `completed: 0` or `1` — so that every line
 * of a group has one shape. The card renders that one as a tick rather than a bar; that is a
 * presentation choice, not a second data shape.
 */
export interface TrainingRequirement {
  kind: TrainingRequirementKind
  /** In units for practical kinds, lessons for theory kinds, `0`/`1` for the milestone. */
  completed: number
  required: number
  isMet: boolean
  /** `required - completed`, floored at zero. What "still owed" reads, never negative. */
  outstanding: number
}

/** Which official test a group of requirements gates. */
export type ExamKind = 'theory' | 'practical'

/** Everything one exam demands, met or not, in the order the card renders it. */
export interface ExamReadinessGroup {
  examKind: ExamKind
  /** True when every requirement in the group is met. */
  isMet: boolean
  requirements: readonly TrainingRequirement[]
}

/**
 * Whether an enrolment may sit each of its exams, and what is missing where it may not.
 *
 * A breakdown rather than a boolean: the card draws it directly, "what is left" is a filter over
 * it, and the planner's warning quotes the unmet lines. A boolean would throw away everything
 * every caller needs and force each of them to recompute it.
 *
 * Advisory. Nothing in the seam refuses a booking because a group is unmet — see
 * `docs/training-model.md`.
 */
export interface ExamReadiness {
  theory: ExamReadinessGroup
  practical: ExamReadinessGroup
}
