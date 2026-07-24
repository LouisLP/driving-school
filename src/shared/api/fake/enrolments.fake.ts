import type {
  EnrolmentQuery,
  EnrolmentRepository,
  NewEnrolment,
} from '../contracts/enrolments.contract'
import type { FakeContext } from './context'
import type { Enrolment, EnrolmentId, EnrolmentStatus } from '@/shared/domain'
import { ApiError } from '../api.error'
import { detach, mintId } from './fake.utils'

/**
 * The transition table from `docs/domain-model.md`, encoded once.
 *
 * `passed` and `withdrawn` have no exits: a returning student gets a new enrolment. Keeping this
 * at the seam rather than in the UI means no screen can invent a transition the model forbids.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<EnrolmentStatus, readonly EnrolmentStatus[]>> = {
  enquiring: ['active', 'withdrawn'],
  active: ['paused', 'passed', 'withdrawn'],
  paused: ['active', 'withdrawn'],
  passed: [],
  withdrawn: [],
}

const CLOSING_STATUSES: readonly EnrolmentStatus[] = ['passed', 'withdrawn']

export function createEnrolmentRepository(ctx: FakeContext): EnrolmentRepository {
  const { db } = ctx

  function findEnrolment(id: EnrolmentId): Enrolment {
    const enrolment = db.enrolments.find(it => it.id === id)

    if (!enrolment)
      throw ApiError.notFound('enrolment', id)

    return enrolment
  }

  return {
    async list(query: EnrolmentQuery = {}) {
      await ctx.network.roundTrip()

      const matching = db.enrolments
        .filter(it => query.studentId === undefined || it.studentId === query.studentId)
        .filter(it => query.status === undefined || it.status === query.status)
        .filter(it => query.licenceClass === undefined || it.licenceClass === query.licenceClass)
        .filter(it => !query.openOnly || !CLOSING_STATUSES.includes(it.status))

      return detach(matching)
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findEnrolment(id))
    },

    async create(input: NewEnrolment) {
      await ctx.network.roundTrip()

      const student = db.students.find(it => it.id === input.studentId)

      if (!student)
        throw ApiError.notFound('student', input.studentId)

      const alreadyOpen = db.enrolments.some(it =>
        it.studentId === input.studentId
        && it.licenceClass === input.licenceClass
        && !CLOSING_STATUSES.includes(it.status),
      )

      if (alreadyOpen) {
        throw ApiError.conflict(
          `${student.firstName} ${student.lastName} already has an open ${input.licenceClass} `
          + 'enrolment. One student trains for one class once at a time.',
        )
      }

      const offering = db.offerings.find(it => it.licenceClass === input.licenceClass)

      if (!offering?.isOffered)
        throw ApiError.conflict(`The school does not currently teach ${input.licenceClass}.`)

      const enquiredAt = ctx.now()

      const enrolment: Enrolment = {
        id: mintId<EnrolmentId>(),
        studentId: input.studentId,
        licenceClass: input.licenceClass,
        status: 'enquiring',
        // Copied, not referenced: a price rise next spring must not reprice this training.
        agreedPrices: { agreedAt: enquiredAt, ...detach(offering.prices) },
        enquiredAt,
        startedAt: null,
        closedAt: null,
      }

      db.enrolments.push(enrolment)
      ctx.commit()

      return detach(enrolment)
    },

    async setStatus(id, status) {
      await ctx.network.roundTrip()

      const enrolment = findEnrolment(id)

      if (enrolment.status === status)
        return detach(enrolment)

      if (!ALLOWED_TRANSITIONS[enrolment.status].includes(status)) {
        throw ApiError.conflict(
          `An enrolment cannot go from ${enrolment.status} to ${status}.`,
        )
      }

      enrolment.status = status

      // The dates belong to the transition, not to the caller.
      if (status === 'active' && enrolment.startedAt === null)
        enrolment.startedAt = ctx.now()

      if (CLOSING_STATUSES.includes(status))
        enrolment.closedAt = ctx.now()

      ctx.commit()

      return detach(enrolment)
    },
  }
}
