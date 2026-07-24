import type { EnrolmentSummary } from '../contracts/enrolments.contract'
import type {
  EnrolmentId,
  StudentId,
  TrainingRequirement,
  TrainingRequirementKind,
} from '@/shared/domain'
import { describe, expect, it } from 'vitest'
import { isApiError } from '../api.error'
import { createFakeApi } from './create-fake-api'
import { seedDatabase } from './seed'

function createApi() {
  return createFakeApi(seedDatabase(), { latencyMs: 0 })
}

async function failureOf(promise: Promise<unknown>) {
  const result = await promise.catch((error: unknown) => error)
  return isApiError(result) ? result : null
}

describe('enrolment repository', () => {
  it('starts every enrolment as an enquiry, whatever the caller wants', async () => {
    const api = createApi()

    const created = await api.enrolments.create({
      studentId: 'stu-09' as StudentId,
      licenceClass: 'B',
    })

    expect(created.status).toBe('enquiring')
    expect(created.startedAt).toBeNull()
    expect(created.closedAt).toBeNull()
  })

  it('refuses a second open enrolment for the same class', async () => {
    const api = createApi()

    const failure = await failureOf(api.enrolments.create({
      studentId: 'stu-01' as StudentId,
      licenceClass: 'B',
    }))

    expect(failure?.kind).toBe('conflict')
  })

  it('allows a new enrolment once the previous one closed', async () => {
    const api = createApi()

    // stu-04 passed B and has nothing open.
    const created = await api.enrolments.create({
      studentId: 'stu-04' as StudentId,
      licenceClass: 'B',
    })

    expect(created.status).toBe('enquiring')
  })

  it('stamps startedAt on the way into active, and only once', async () => {
    const api = createApi()
    const enrolment = await api.enrolments.create({
      studentId: 'stu-09' as StudentId,
      licenceClass: 'B',
    })

    const active = await api.enrolments.setStatus(enrolment.id, 'active')
    await api.enrolments.setStatus(enrolment.id, 'paused')
    const resumed = await api.enrolments.setStatus(enrolment.id, 'active')

    expect(active.startedAt).not.toBeNull()
    expect(resumed.startedAt).toBe(active.startedAt)
  })

  it('closes a terminal enrolment for good', async () => {
    const api = createApi()

    const passed = await api.enrolments.setStatus('enr-01' as EnrolmentId, 'passed')
    expect(passed.closedAt).not.toBeNull()

    const failure = await failureOf(api.enrolments.setStatus('enr-01' as EnrolmentId, 'active'))
    expect(failure?.kind).toBe('conflict')
  })

  it('rejects a transition the model does not have', async () => {
    const api = createApi()

    // enquiring → paused is not a thing: you cannot pause what never started.
    const failure = await failureOf(api.enrolments.setStatus('enr-03' as EnrolmentId, 'paused'))

    expect(failure?.kind).toBe('conflict')
  })
})

/** One line of the practical readiness group, which is where every practical bar is read from. */
function requirementOf(
  summary: EnrolmentSummary | undefined,
  kind: TrainingRequirementKind,
): TrainingRequirement | undefined {
  return summary?.progress.readiness.practical.requirements.find(it => it.kind === kind)
}

describe('enrolment summaries', () => {
  it('returns one row per enrolment the student holds, and nobody else\'s', async () => {
    const api = createApi()

    // stu-07 holds two: an active B and an enquiring BE.
    const summaries = await api.enrolments.summaries({ studentId: 'stu-07' as StudentId })

    expect(summaries.map(it => it.enrolment.id)).toEqual(['enr-07', 'enr-08'])
    expect(summaries.every(it => it.enrolment.studentId === 'stu-07')).toBe(true)
  })

  it('answers a student with no enrolments with an empty list, not a failure', async () => {
    const api = createApi()

    expect(await api.enrolments.summaries({ studentId: 'stu-09' as StudentId })).toEqual([])
  })

  it('rejects an unknown student with notFound, so empty means empty', async () => {
    const api = createApi()

    const failure = await failureOf(api.enrolments.summaries({ studentId: 'nobody' as StudentId }))

    expect(failure?.kind).toBe('notFound')
  })

  it('orders open enrolments first, then closed by closedAt descending', async () => {
    const api = createApi()

    // stu-10 passed B in 2024 and is now taking BE.
    const summaries = await api.enrolments.summaries({ studentId: 'stu-10' as StudentId })

    expect(summaries.map(it => it.enrolment.status)).toEqual(['active', 'passed'])
  })

  it('measures against today\'s offering, not a copy frozen onto the enrolment', async () => {
    const api = createApi()

    const [before] = await api.enrolments.summaries({ enrolmentId: 'enr-01' as EnrolmentId })
    const standardBefore = requirementOf(before, 'standardPractical')

    await api.offerings.update('B', {
      requirements: {
        ...(await api.offerings.get('B')).requirements,
        standardPracticalUnits: 40,
      },
    })

    const [after] = await api.enrolments.summaries({ enrolmentId: 'enr-01' as EnrolmentId })

    expect(standardBefore?.required).toBe(12)
    expect(requirementOf(after, 'standardPractical')?.required).toBe(40)
  })

  it('joins the progress the domain rules compute, requirement counts and all', async () => {
    const api = createApi()

    const [lena] = await api.enrolments.summaries({ enrolmentId: 'enr-01' as EnrolmentId })
    const standard = requirementOf(lena, 'standardPractical')

    // The seed puts Lena past class B's house policy on purpose — the card has to render a bar
    // that is over 100 % and a label that still reads the true count.
    expect(standard?.completed).toBeGreaterThan(standard?.required ?? 0)
    expect(lena?.progress.record.isTheoryExamPassed).toBe(true)
    expect(lena?.progress.exams.some(it => it.examKind === 'theory' && it.result === 'passed'))
      .toBe(true)
  })

  it('joins the instructor\'s name so the card needs no second call', async () => {
    const api = createApi()

    const [lena] = await api.enrolments.summaries({ enrolmentId: 'enr-01' as EnrolmentId })

    expect(lena?.recentAppointments[0]?.instructorName).toMatch(/\S/)
  })

  it('gives the soonest booking as next, and the five most recent past ones newest first', async () => {
    const api = createApi()

    const [lena] = await api.enrolments.summaries({ enrolmentId: 'enr-01' as EnrolmentId })
    const recent = lena?.recentAppointments ?? []
    const startTimes = recent.map(it => it.startsAt)

    expect(recent.length).toBe(5)
    expect([...startTimes].sort().reverse()).toEqual(startTimes)

    if (lena?.nextAppointment)
      expect(lena.nextAppointment.startsAt > (startTimes[0] ?? '')).toBe(true)
  })

  it('reports nothing booked as null rather than as an absent field', async () => {
    const api = createApi()

    // enr-04 passed in 2025 and has no future appointments.
    const [tim] = await api.enrolments.summaries({ enrolmentId: 'enr-04' as EnrolmentId })

    expect(tim?.nextAppointment).toBeNull()
  })

  it('rejects an unknown enrolment', async () => {
    const api = createApi()

    const failure = await failureOf(
      api.enrolments.summaries({ enrolmentId: 'nope' as EnrolmentId }),
    )

    expect(failure?.kind).toBe('notFound')
  })
})
