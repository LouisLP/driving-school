import type { LicenceClass } from './licence-class.types'
import type { TrainingRequirements } from './training.types'

/**
 * The training the law demands per licence class, as the defaults an offering is seeded with.
 *
 * Two things are true at once and this constant is how both are held: the special-drive and theory
 * counts are fixed by regulation, and the school still has to be able to correct a number without
 * a deploy when the regulation moves. So the law lives here as a **default**, and the editable
 * copy lives on the `LicenceClassOffering` — the same relationship `prices` has to nothing at all,
 * except that these ones start from a table rather than from zero.
 *
 * `standardPracticalUnits` is **zero everywhere**, and that is not an omission: no class mandates
 * a number of ordinary practical lessons. How many a student needs is the instructor's judgement,
 * and the number on the offering is the school's own policy for when it will present someone.
 *
 * Realistic-looking, not compliant — the same scope line the money model draws. `B` and the A
 * family carry the real figures; the heavy classes carry plausible ones, because the point of the
 * table is that the shape holds a per-class-per-type count, not that this file is a legal source.
 * The school's office is expected to check them once and then own them.
 */
export const LEGAL_TRAINING_MINIMUMS: Record<LicenceClass, TrainingRequirements> = {
  AM: requirements(0, 0, 0, 12, 2),
  A1: requirements(5, 4, 3, 12, 4),
  A2: requirements(5, 4, 3, 12, 4),
  A: requirements(5, 4, 3, 12, 4),
  B: requirements(5, 4, 3, 12, 2),
  // Extensions of a class the student already holds take no basic course a second time.
  BE: requirements(3, 1, 0, 0, 0),
  C1: requirements(3, 1, 1, 12, 6),
  C1E: requirements(2, 1, 1, 0, 3),
  C: requirements(5, 2, 3, 12, 10),
  CE: requirements(3, 1, 1, 0, 4),
  D1: requirements(3, 1, 1, 12, 10),
  D1E: requirements(2, 1, 1, 0, 4),
  D: requirements(5, 2, 3, 12, 20),
  DE: requirements(3, 1, 1, 0, 4),
  L: requirements(0, 0, 0, 12, 2),
  T: requirements(0, 0, 0, 12, 2),
}

function requirements(
  overland: number,
  autobahn: number,
  night: number,
  basicTheoryLessons: number,
  classSpecificTheoryLessons: number,
): TrainingRequirements {
  return {
    standardPracticalUnits: 0,
    specialDriveUnits: { overland, autobahn, night },
    basicTheoryLessons,
    classSpecificTheoryLessons,
  }
}
