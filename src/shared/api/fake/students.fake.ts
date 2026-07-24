import type {
  NewStudent,
  StudentListItem,
  StudentPatch,
  StudentQuery,
  StudentRepository,
  StudentSortField,
} from '../contracts/students.contract'
import type { FakeContext } from './context'
import type {
  Enrolment,
  Student,
  StudentId,
  StudentStanding,
} from '@/shared/domain'
import { deriveStudentStanding, validateStudent } from '@/shared/domain'
import { ApiError } from '../api.error'
import {
  applyPatch,
  detach,
  matchesSearch,
  mintId,
  paginate,
  sortBy,
} from './fake.utils'

/** Prospect first, then who is training, then who has finished, then who gave up. */
const STANDING_ORDER: readonly StudentStanding[] = ['prospect', 'active', 'alumnus', 'lapsed']

export function createStudentRepository(ctx: FakeContext): StudentRepository {
  const { db } = ctx

  function findStudent(id: StudentId): Student {
    const student = db.students.find(it => it.id === id)

    if (!student)
      throw ApiError.notFound('student', id)

    return student
  }

  function enrolmentsOf(id: StudentId): readonly Enrolment[] {
    return db.enrolments.filter(it => it.studentId === id)
  }

  function toListItem(student: Student): StudentListItem {
    const enrolments = enrolmentsOf(student.id)

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      registeredAt: student.registeredAt,
      standing: deriveStudentStanding(enrolments),
      openLicenceClasses: enrolments
        .filter(it => it.status !== 'passed' && it.status !== 'withdrawn')
        .map(it => it.licenceClass),
    }
  }

  return {
    async list(query: StudentQuery = {}) {
      await ctx.network.roundTrip()

      const matching = db.students
        .map(toListItem)
        .filter(item => matchesSearch(query.search, item.firstName, item.lastName, item.email))
        .filter(item => query.standing === undefined || item.standing === query.standing)
        .filter(item => query.licenceClass === undefined
          || item.openLicenceClasses.includes(query.licenceClass))

      const sorted = sortBy<StudentListItem, StudentSortField>(
        matching,
        query.sort ?? { field: 'lastName', direction: 'asc' },
        (item, field) => {
          if (field === 'registeredAt')
            return item.registeredAt

          if (field === 'standing')
            return STANDING_ORDER.indexOf(item.standing)

          return `${item.lastName} ${item.firstName}`.toLowerCase()
        },
      )

      return detach(paginate(sorted, query.page, query.pageSize))
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findStudent(id))
    },

    async create(input: NewStudent) {
      await ctx.network.roundTrip()

      const errors = validateStudent(input, new Date(ctx.now()))

      if (errors)
        throw ApiError.validation(errors)

      const student: Student = {
        ...detach(input),
        id: mintId<StudentId>(),
        registeredAt: ctx.now(),
      }

      db.students.push(student)
      ctx.commit()

      return detach(student)
    },

    async update(id, patch: StudentPatch) {
      await ctx.network.roundTrip()

      const student = findStudent(id)
      const { id: _id, registeredAt: _registeredAt, ...current } = student
      const errors = validateStudent({ ...current, ...stripUndefined(patch) }, new Date(ctx.now()))

      if (errors)
        throw ApiError.validation(errors)

      applyPatch(student, detach(patch))
      ctx.commit()

      return detach(student)
    },

    async remove(id) {
      await ctx.network.roundTrip()

      const student = findStudent(id)
      const enrolments = enrolmentsOf(student.id)

      if (enrolments.length > 0) {
        throw ApiError.conflict(
          `${student.firstName} ${student.lastName} has ${enrolments.length} enrolment(s) and is `
          + 'part of the school\'s history. Withdraw the enrolments instead of deleting the student.',
        )
      }

      db.students = db.students.filter(it => it.id !== id)
      ctx.commit()
    },
  }
}

/** A patch key set to `undefined` means "unchanged", so it must not shadow the current value. */
function stripUndefined<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}
