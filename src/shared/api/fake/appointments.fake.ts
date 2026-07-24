import type {
  AppointmentQuery,
  AppointmentRepository,
  NewAppointment,
} from '../contracts/appointments.contract'
import type { FakeContext } from './context'
import type {
  Appointment,
  AppointmentId,
  Enrolment,
  EnrolmentId,
  ExamAppointment,
  Instructor,
  InstructorId,
  StudentId,
  TheoryAppointment,
  Vehicle,
  VehicleId,
} from '@/shared/domain'
import {
  appointmentEndsAt,
  appointmentsOverlap,
  isLicenceClassMatched,
} from '@/shared/domain'
import { ApiError } from '../api.error'
import { detach, mintId } from './fake.utils'

const MAX_DURATION_MINUTES = 8 * 60

export function createAppointmentRepository(ctx: FakeContext): AppointmentRepository {
  const { db } = ctx

  function findAppointment(id: AppointmentId): Appointment {
    const appointment = db.appointments.find(it => it.id === id)

    if (!appointment)
      throw ApiError.notFound('appointment', id)

    return appointment
  }

  function requireEnrolment(id: Enrolment['id']): Enrolment {
    const enrolment = db.enrolments.find(it => it.id === id)

    if (!enrolment)
      throw ApiError.notFound('enrolment', id)

    return enrolment
  }

  function requireInstructor(id: InstructorId): Instructor {
    const instructor = db.instructors.find(it => it.id === id)

    if (!instructor)
      throw ApiError.notFound('instructor', id)

    return instructor
  }

  /** A student is not on an appointment; their enrolments are. One hop, done at the seam. */
  function enrolmentIdsOf(studentId: StudentId): readonly EnrolmentId[] {
    return db.enrolments.filter(it => it.studentId === studentId).map(it => it.id)
  }

  function requireVehicle(id: VehicleId): Vehicle {
    const vehicle = db.vehicles.find(it => it.id === id)

    if (!vehicle)
      throw ApiError.notFound('vehicle', id)

    return vehicle
  }

  /**
   * Cancelled appointments free their resources — that is the point of cancelling — so they are
   * invisible to every conflict check.
   */
  function occupying(exceptId?: AppointmentId): readonly Appointment[] {
    return db.appointments.filter(
      it => it.id !== exceptId && it.outcome.status !== 'cancelled',
    )
  }

  function assertBookable(candidate: Appointment, exceptId?: AppointmentId): void {
    if (candidate.durationMinutes <= 0 || candidate.durationMinutes > MAX_DURATION_MINUTES)
      throw ApiError.validation({ durationMinutes: 'shared.validation.notPositive' })

    const instructor = requireInstructor(candidate.instructorId)
    const vehicleId = vehicleOf(candidate)
    const clashing = occupying(exceptId).filter(it => appointmentsOverlap(it, candidate))

    const instructorClash = clashing.find(it => it.instructorId === candidate.instructorId)

    if (instructorClash) {
      throw ApiError.conflict(
        `${instructor.firstName} ${instructor.lastName} is already booked from `
        + `${instructorClash.startsAt} to ${appointmentEndsAt(instructorClash)}.`,
      )
    }

    if (vehicleId !== null) {
      const vehicle = requireVehicle(vehicleId)
      const vehicleClash = clashing.find(it => vehicleOf(it) === vehicleId)

      if (vehicleClash) {
        throw ApiError.conflict(
          `${vehicle.licencePlate} is already out from ${vehicleClash.startsAt} to `
          + `${appointmentEndsAt(vehicleClash)}.`,
        )
      }

      // Licence-class match: only the kinds that put a student in a car can mismatch.
      if (candidate.kind === 'practical' || candidate.kind === 'exam') {
        const enrolment = requireEnrolment(candidate.enrolmentId)

        if (!isLicenceClassMatched(enrolment.licenceClass, instructor, vehicle)) {
          throw ApiError.conflict(
            `Neither ${instructor.lastName} nor ${vehicle.licencePlate} is cleared for `
            + `class ${enrolment.licenceClass}.`,
          )
        }
      }
    }

    if (candidate.kind === 'theory' && candidate.attendees.length > candidate.capacity)
      throw ApiError.conflict(`The room seats ${candidate.capacity}.`)
  }

  function requirePlanned(appointment: Appointment): void {
    if (appointment.outcome.status !== 'planned') {
      throw ApiError.conflict(
        `This appointment is already ${appointment.outcome.status}; its outcome is settled.`,
      )
    }
  }

  return {
    async list(query: AppointmentQuery) {
      await ctx.network.roundTrip()

      const matching = db.appointments
        .filter(it => it.startsAt < query.to && appointmentEndsAt(it) > query.from)
        .filter(it => !query.instructorIds || query.instructorIds.includes(it.instructorId))
        .filter(it => !query.vehicleIds || includesVehicle(query.vehicleIds, it))
        .filter(it => query.kind === undefined || it.kind === query.kind)
        .filter(it => query.enrolmentId === undefined || involves(it, query.enrolmentId))
        .filter(it => query.studentId === undefined
          || enrolmentIdsOf(query.studentId).some(enrolmentId => involves(it, enrolmentId)))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

      return detach(matching)
    },

    async get(id) {
      await ctx.network.roundTrip()
      return detach(findAppointment(id))
    },

    async schedule(input: NewAppointment) {
      await ctx.network.roundTrip()

      const appointment = fromDraft(input)
      assertBookable(appointment)

      db.appointments.push(appointment)
      ctx.commit()

      return detach(appointment)
    },

    async reschedule(id, move) {
      await ctx.network.roundTrip()

      const appointment = findAppointment(id)
      requirePlanned(appointment)

      const moved = { ...detach(appointment), ...move }
      assertBookable(moved, id)

      appointment.startsAt = move.startsAt
      appointment.durationMinutes = move.durationMinutes
      ctx.commit()

      return detach(appointment)
    },

    async complete(id) {
      await ctx.network.roundTrip()

      const appointment = findAppointment(id)
      requirePlanned(appointment)

      appointment.outcome = { status: 'completed', completedAt: ctx.now() }
      ctx.commit()

      return detach(appointment)
    },

    async cancel(id, cancelledBy) {
      await ctx.network.roundTrip()

      const appointment = findAppointment(id)
      requirePlanned(appointment)

      appointment.outcome = { status: 'cancelled', cancelledAt: ctx.now(), cancelledBy }
      ctx.commit()

      return detach(appointment)
    },

    async recordNoShow(id) {
      await ctx.network.roundTrip()

      const appointment = findAppointment(id)
      requirePlanned(appointment)

      appointment.outcome = { status: 'noShow', recordedAt: ctx.now() }
      ctx.commit()

      return detach(appointment)
    },

    async setAttendance(id, enrolmentId, status) {
      await ctx.network.roundTrip()

      const appointment = findAppointment(id)

      if (appointment.kind !== 'theory')
        throw ApiError.conflict('Only a theory appointment has attendees.')

      requireEnrolment(enrolmentId)

      const attendees = [...appointment.attendees]
      const index = attendees.findIndex(it => it.enrolmentId === enrolmentId)

      if (index === -1) {
        if (attendees.length >= appointment.capacity)
          throw ApiError.conflict(`The room seats ${appointment.capacity}.`)

        attendees.push({ enrolmentId, status })
      }
      else {
        attendees[index] = { enrolmentId, status }
      }

      const updated: TheoryAppointment = { ...appointment, attendees }
      replace(db.appointments, updated)
      ctx.commit()

      return detach(updated)
    },

    async recordExamResult(id, result) {
      await ctx.network.roundTrip()

      const appointment = findAppointment(id)

      if (appointment.kind !== 'exam')
        throw ApiError.conflict('Only an exam appointment has a result.')

      const updated: ExamAppointment = { ...appointment, result }
      replace(db.appointments, updated)
      ctx.commit()

      return detach(updated)
    },
  }
}

/**
 * Built kind by kind rather than by spreading the union: only an explicit branch can promise the
 * compiler that a practical appointment kept its vehicle and a theory one kept its room.
 */
function fromDraft(input: NewAppointment): Appointment {
  const id = mintId<AppointmentId>()
  const shared = {
    id,
    instructorId: input.instructorId,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    outcome: { status: 'planned' } as const,
    notes: input.notes ?? '',
  }

  if (input.kind === 'practical') {
    return {
      ...shared,
      kind: 'practical',
      enrolmentId: input.enrolmentId,
      vehicleId: input.vehicleId,
      driveType: input.driveType,
      meetingPointId: input.meetingPointId,
    }
  }

  if (input.kind === 'theory') {
    return {
      ...shared,
      kind: 'theory',
      locationId: input.locationId,
      topic: input.topic,
      capacity: input.capacity,
      attendees: [...input.attendees],
    }
  }

  const exam = {
    ...shared,
    kind: 'exam',
    enrolmentId: input.enrolmentId,
    locationId: input.locationId,
    result: input.result,
  } as const

  return input.examKind === 'practical'
    ? { ...exam, examKind: 'practical', vehicleId: input.vehicleId }
    : { ...exam, examKind: 'theory' }
}

/** The vehicle an appointment ties up, or `null` when it ties up none. */
function vehicleOf(appointment: Appointment): VehicleId | null {
  if (appointment.kind === 'practical')
    return appointment.vehicleId

  if (appointment.kind === 'exam' && appointment.examKind === 'practical')
    return appointment.vehicleId

  return null
}

function includesVehicle(vehicleIds: readonly VehicleId[], appointment: Appointment): boolean {
  const vehicleId = vehicleOf(appointment)
  return vehicleId !== null && vehicleIds.includes(vehicleId)
}

function involves(appointment: Appointment, enrolmentId: Enrolment['id']): boolean {
  return appointment.kind === 'theory'
    ? appointment.attendees.some(it => it.enrolmentId === enrolmentId)
    : appointment.enrolmentId === enrolmentId
}

function replace(appointments: Appointment[], updated: Appointment): void {
  const index = appointments.findIndex(it => it.id === updated.id)
  appointments[index] = updated
}
