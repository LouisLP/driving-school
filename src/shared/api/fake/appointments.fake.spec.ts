import type { NewPracticalAppointment } from '../contracts/appointments.contract'
import type {
  AppointmentId,
  EnrolmentId,
  InstructorId,
  IsoDateTime,
  StudentId,
  VehicleId,
} from '@/shared/domain'
import { describe, expect, it } from 'vitest'
import { isApiError } from '../api.error'
import { createFakeApi } from './create-fake-api'
import { seedDatabase } from './seed'

const VOGEL = 'ins-01' as InstructorId
const YILDIZ = 'ins-03' as InstructorId
const GOLF = 'veh-01' as VehicleId
const CORSA = 'veh-02' as VehicleId
const MOTORCYCLE = 'veh-03' as VehicleId
const LENA_B = 'enr-01' as EnrolmentId

/** A Monday far from the seeded week, so these tests never collide with the seed's calendar. */
const SLOT = '2030-01-07T09:00:00.000Z' as IsoDateTime

function createApi() {
  return createFakeApi(seedDatabase(), { latencyMs: 0 })
}

function practical(overrides: Partial<NewPracticalAppointment> = {}): NewPracticalAppointment {
  return {
    kind: 'practical',
    instructorId: VOGEL,
    vehicleId: GOLF,
    enrolmentId: LENA_B,
    driveType: 'standard',
    meetingPointId: null,
    startsAt: SLOT,
    durationMinutes: 45,
    ...overrides,
  }
}

async function failureOf(promise: Promise<unknown>) {
  const result = await promise.catch((error: unknown) => error)
  return isApiError(result) ? result : null
}

describe('appointment repository', () => {
  it('returns appointments overlapping the window, not only those inside it', async () => {
    const api = createApi()
    await api.appointments.schedule(practical({ durationMinutes: 90 }))

    const straddling = await api.appointments.list({
      from: '2030-01-07T09:30:00.000Z' as IsoDateTime,
      to: '2030-01-07T09:45:00.000Z' as IsoDateTime,
    })

    expect(straddling).toHaveLength(1)
  })

  it('rejects a double-booked instructor', async () => {
    const api = createApi()
    await api.appointments.schedule(practical())

    const failure = await failureOf(
      api.appointments.schedule(practical({ vehicleId: CORSA, enrolmentId: 'enr-07' as EnrolmentId })),
    )

    expect(failure?.kind).toBe('conflict')
    expect(failure?.message).toContain('Vogel')
  })

  it('rejects a vehicle that is already out', async () => {
    const api = createApi()
    await api.appointments.schedule(practical())

    const failure = await failureOf(
      api.appointments.schedule(practical({
        instructorId: 'ins-02' as InstructorId,
        enrolmentId: 'enr-07' as EnrolmentId,
      })),
    )

    expect(failure?.kind).toBe('conflict')
    expect(failure?.message).toContain('F-FS 101')
  })

  it('allows back-to-back lessons', async () => {
    const api = createApi()
    await api.appointments.schedule(practical())

    const next = await api.appointments.schedule(practical({
      startsAt: '2030-01-07T09:45:00.000Z' as IsoDateTime,
    }))

    expect(next.outcome.status).toBe('planned')
  })

  it('rejects a licence-class mismatch', async () => {
    const api = createApi()

    // Yıldız may teach B, but a motorcycle is not suitable for it.
    const failure = await failureOf(
      api.appointments.schedule(practical({ instructorId: YILDIZ, vehicleId: MOTORCYCLE })),
    )

    expect(failure?.kind).toBe('conflict')
    expect(failure?.message).toContain('class B')
  })

  it('frees the resources of a cancelled appointment', async () => {
    const api = createApi()
    const first = await api.appointments.schedule(practical())

    await api.appointments.cancel(first.id, 'student')
    const replacement = await api.appointments.schedule(practical())

    expect(replacement.id).not.toBe(first.id)
  })

  it('refuses to settle an outcome twice', async () => {
    const api = createApi()
    const appointment = await api.appointments.schedule(practical())

    await api.appointments.complete(appointment.id)
    const failure = await failureOf(api.appointments.recordNoShow(appointment.id))

    expect(failure?.kind).toBe('conflict')
  })

  it('records attendance per person on a theory appointment', async () => {
    const api = createApi()

    const updated = await api.appointments.setAttendance(
      'apt-t01' as AppointmentId,
      LENA_B,
      'attended',
    )

    expect(updated.attendees).toContainEqual({ enrolmentId: LENA_B, status: 'attended' })
    // Nobody else's status moved.
    expect(updated.attendees).toContainEqual({
      enrolmentId: 'enr-02' as EnrolmentId,
      status: 'excused',
    })
  })

  it('refuses attendance on an appointment that has no attendees', async () => {
    const api = createApi()
    const appointment = await api.appointments.schedule(practical())

    const failure = await failureOf(
      api.appointments.setAttendance(appointment.id, LENA_B, 'attended'),
    )

    expect(failure?.kind).toBe('conflict')
  })

  it('re-checks conflicts when an appointment moves', async () => {
    const api = createApi()
    const first = await api.appointments.schedule(practical())
    const second = await api.appointments.schedule(practical({
      startsAt: '2030-01-07T11:00:00.000Z' as IsoDateTime,
    }))

    const failure = await failureOf(
      api.appointments.reschedule(second.id, { startsAt: SLOT, durationMinutes: 45 }),
    )

    expect(failure?.kind).toBe('conflict')
    expect(first.startsAt).toBe(SLOT)
  })
})

describe('the studentId filter', () => {
  /** A window wide enough to cover the whole seeded calendar, past and future. */
  const WHOLE_SEED = {
    from: '2020-01-01T00:00:00.000Z' as IsoDateTime,
    to: '2040-01-01T00:00:00.000Z' as IsoDateTime,
  }

  it('gathers every appointment across every enrolment the student holds', async () => {
    const api = createApi()

    // stu-07 trains for B and has enquired about BE; the B enrolment is the one with a calendar.
    const forStudent = await api.appointments.list({ ...WHOLE_SEED, studentId: 'stu-07' as StudentId })
    const forEnrolment = await api.appointments.list({
      ...WHOLE_SEED,
      enrolmentId: 'enr-07' as EnrolmentId,
    })

    expect(forStudent.length).toBeGreaterThan(0)
    expect(forStudent.map(it => it.id)).toEqual(forEnrolment.map(it => it.id))
  })

  it('includes the theory rooms the student sits in, not only their own lessons', async () => {
    const api = createApi()

    const found = await api.appointments.list({ ...WHOLE_SEED, studentId: 'stu-01' as StudentId })

    expect(found.some(it => it.kind === 'theory')).toBe(true)
  })

  it('answers a student with no enrolments with nothing at all', async () => {
    const api = createApi()

    expect(await api.appointments.list({ ...WHOLE_SEED, studentId: 'stu-09' as StudentId })).toEqual([])
  })
})
