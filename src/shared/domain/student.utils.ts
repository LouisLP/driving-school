import type { Enrolment } from './enrolment.types'
import type { StudentStanding } from './student.types'

/**
 * A student's standing is read from their enrolments rather than stored, so there is no second
 * state to keep in sync.
 *
 * Order matters: anything running outranks anything finished, and a student who has passed
 * something is an alumnus even if they also withdrew from something else.
 */
export function deriveStudentStanding(enrolments: readonly Enrolment[]): StudentStanding {
  if (enrolments.some(it => it.status === 'active' || it.status === 'paused'))
    return 'active'

  if (enrolments.some(it => it.status === 'passed'))
    return 'alumnus'

  if (enrolments.length > 0 && enrolments.every(it => it.status === 'withdrawn'))
    return 'lapsed'

  return 'prospect'
}
