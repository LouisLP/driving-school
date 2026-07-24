import type {
  AppointmentSummary,
  EnrolmentQuery,
  EnrolmentRepository,
  EnrolmentSummary,
  EnrolmentSummaryQuery,
  NewEnrolment,
} from '../contracts/enrolments.contract'
import type { FakeContext } from './context'
import type {
  Appointment,
  Enrolment,
  EnrolmentId,
  LicenceClassOffering,
  StudentId,
} from '@/shared/domain'
import { deriveEnrolmentProgress } from '@/shared/domain'
import { ApiError } from '../api.error'
import {
  ALLOWED_ENROLMENT_TRANSITIONS,
  CLOSED_ENROLMENT_STATUSES,
} from '../contracts/enrolments.contract'
import { detach, mintId } from './fake.utils'

/** What a card discloses under "Recent". Five is what the record page asks for. */
const RECENT_APPOINTMENT_COUNT = 5

export function createEnrolmentRepository(ctx: FakeContext): EnrolmentRepository {
  const { db } = ctx

  function findEnrolment(id: EnrolmentId): Enrolment {
    const enrolment = db.enrolments.find(it => it.id === id)

    if (!enrolment)
      throw ApiError.notFound('enrolment', id)

    return enrolment
  }

  function instructorName(appointment: Appointment): string {
    const instructor = db.instructors.find(it => it.id === appointment.instructorId)

    // A deleted instructor is not modelled — staff retire — so this is belt and braces rather
    // than a state the school can be in.
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : ''
  }

  function toAppointmentSummary(appointment: Appointment): AppointmentSummary {
    return {
      id: appointment.id,
      kind: appointment.kind,
      startsAt: appointment.startsAt,
      instructorName: instructorName(appointment),
      status: appointment.outcome.status,
    }
  }

  /** Every appointment this enrolment is on: its own, plus the theory rooms it sits in. */
  function appointmentsOf(enrolmentId: EnrolmentId): readonly Appointment[] {
    return db.appointments.filter(it =>
      it.kind === 'theory'
        ? it.attendees.some(attendee => attendee.enrolmentId === enrolmentId)
        : it.enrolmentId === enrolmentId,
    )
  }

  function offeringOf(enrolment: Enrolment): LicenceClassOffering {
    const offering = db.offerings.find(it => it.licenceClass === enrolment.licenceClass)

    if (!offering)
      throw ApiError.notFound('offering', enrolment.licenceClass)

    return offering
  }

  /**
   * One pass over this enrolment's appointments produces the progress, the next booking and the
   * recent history — the three joins a real backend would do rather than make the client fetch
   * the school's whole calendar to render one page.
   */
  function toSummary(enrolment: Enrolment): EnrolmentSummary {
    const appointments = appointmentsOf(enrolment.id)
    const now = ctx.now()

    const upcoming = appointments
      .filter(it => it.startsAt >= now && it.outcome.status === 'planned')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

    const past = appointments
      .filter(it => it.startsAt < now)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .slice(0, RECENT_APPOINTMENT_COUNT)

    return {
      enrolment: detach(enrolment),
      // Today's requirements, never a copy frozen onto the enrolment: a school may not certify a
      // student against last year's rules. See `docs/training-model.md`.
      progress: deriveEnrolmentProgress(
        enrolment.id,
        offeringOf(enrolment).requirements,
        appointments,
      ),
      nextAppointment: upcoming[0] ? toAppointmentSummary(upcoming[0]) : null,
      recentAppointments: past.map(toAppointmentSummary),
    }
  }

  /**
   * Open enrolments first — what someone opening a record wants to see — then the closed ones
   * most recently closed first, so an alumnus's page reads as a history in reverse.
   */
  function byRelevance(a: Enrolment, b: Enrolment): number {
    const aClosed = CLOSED_ENROLMENT_STATUSES.includes(a.status)
    const bClosed = CLOSED_ENROLMENT_STATUSES.includes(b.status)

    if (aClosed !== bClosed)
      return aClosed ? 1 : -1

    if (aClosed)
      return (b.closedAt ?? '').localeCompare(a.closedAt ?? '')

    return a.enquiredAt.localeCompare(b.enquiredAt)
  }

  function requireStudent(id: StudentId): void {
    if (!db.students.some(it => it.id === id))
      throw ApiError.notFound('student', id)
  }

  return {
    async list(query: EnrolmentQuery = {}) {
      await ctx.network.roundTrip()

      const matching = db.enrolments
        .filter(it => query.studentId === undefined || it.studentId === query.studentId)
        .filter(it => query.status === undefined || it.status === query.status)
        .filter(it => query.licenceClass === undefined || it.licenceClass === query.licenceClass)
        .filter(it => !query.openOnly || !CLOSED_ENROLMENT_STATUSES.includes(it.status))

      return detach(matching)
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findEnrolment(id))
    },

    async summaries(query: EnrolmentSummaryQuery) {
      await ctx.network.roundTrip()

      if ('enrolmentId' in query)
        return [toSummary(findEnrolment(query.enrolmentId))]

      requireStudent(query.studentId)

      return db.enrolments
        .filter(it => it.studentId === query.studentId)
        .sort(byRelevance)
        .map(toSummary)
    },

    async create(input: NewEnrolment) {
      await ctx.network.roundTrip()

      const student = db.students.find(it => it.id === input.studentId)

      if (!student)
        throw ApiError.notFound('student', input.studentId)

      const alreadyOpen = db.enrolments.some(it =>
        it.studentId === input.studentId
        && it.licenceClass === input.licenceClass
        && !CLOSED_ENROLMENT_STATUSES.includes(it.status),
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

      if (!ALLOWED_ENROLMENT_TRANSITIONS[enrolment.status].includes(status)) {
        throw ApiError.conflict(
          `An enrolment cannot go from ${enrolment.status} to ${status}.`,
        )
      }

      enrolment.status = status

      // The dates belong to the transition, not to the caller.
      if (status === 'active' && enrolment.startedAt === null)
        enrolment.startedAt = ctx.now()

      if (CLOSED_ENROLMENT_STATUSES.includes(status))
        enrolment.closedAt = ctx.now()

      ctx.commit()

      return detach(enrolment)
    },
  }
}
