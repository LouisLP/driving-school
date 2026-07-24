import type {
  InstructorQuery,
  InstructorRepository,
  NewInstructor,
} from '../contracts/instructors.contract'
import type { FakeContext } from './context'
import type { Instructor, InstructorId } from '@/shared/domain'
import { ApiError } from '../api.error'
import { applyPatch, detach, matchesSearch, mintId } from './fake.utils'

export function createInstructorRepository(ctx: FakeContext): InstructorRepository {
  const { db } = ctx

  function findInstructor(id: InstructorId): Instructor {
    const instructor = db.instructors.find(it => it.id === id)

    if (!instructor)
      throw ApiError.notFound('instructor', id)

    return instructor
  }

  return {
    async list(query: InstructorQuery = {}) {
      await ctx.network.roundTrip()

      const matching = db.instructors
        .filter(it => query.includeFormer === true || it.employedUntil === null)
        .filter(it => matchesSearch(query.search, it.firstName, it.lastName, it.email))
        .filter(it => query.teachesClass === undefined
          || it.teachableClasses.includes(query.teachesClass))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'))

      return detach(matching)
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findInstructor(id))
    },

    async create(input: NewInstructor) {
      await ctx.network.roundTrip()

      const instructor: Instructor = {
        ...detach(input),
        id: mintId<InstructorId>(),
        employedUntil: null,
      }

      db.instructors.push(instructor)
      ctx.commit()

      return detach(instructor)
    },

    async update(id, patch) {
      await ctx.network.roundTrip()

      const instructor = findInstructor(id)
      applyPatch(instructor, detach(patch))
      ctx.commit()

      return detach(instructor)
    },

    async retire(id, on) {
      await ctx.network.roundTrip()

      const instructor = findInstructor(id)
      const lastDay = `${on}T23:59:59.999Z`
      const stranded = db.appointments.filter(it =>
        it.instructorId === id
        && it.outcome.status === 'planned'
        && it.startsAt > lastDay,
      )

      if (stranded.length > 0) {
        throw ApiError.conflict(
          `${instructor.firstName} ${instructor.lastName} still holds ${stranded.length} planned `
          + 'appointment(s) after that date. Move or cancel them first.',
        )
      }

      instructor.employedUntil = on
      ctx.commit()

      return detach(instructor)
    },
  }
}
