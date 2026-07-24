import type { EnrolmentId, StudentId } from '@/shared/domain'
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
