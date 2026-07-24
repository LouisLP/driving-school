import type { NewStudent } from '../contracts/students.contract'
import type { PostalAddress, StudentId } from '@/shared/domain'
import { describe, expect, it } from 'vitest'
import { isApiError } from '../api.error'
import { createFakeApi } from './create-fake-api'
import { seedDatabase } from './seed'

function createApi() {
  return createFakeApi(seedDatabase(), { latencyMs: 0 })
}

const ADDRESS: PostalAddress = {
  street: 'Zeil',
  houseNumber: '10',
  postalCode: '60313',
  city: 'Frankfurt am Main',
  countryCode: 'DE',
}

const VALID: NewStudent = {
  firstName: 'Anna',
  lastName: 'Neumann',
  dateOfBirth: '2007-04-04' as NewStudent['dateOfBirth'],
  email: 'anna@example.de',
  phone: '+49 170 5550000',
  address: ADDRESS,
  notes: '',
}

describe('student repository', () => {
  it('derives standing rather than storing it', async () => {
    const api = createApi()
    const { items } = await api.students.list()

    const byId = new Map(items.map(item => [item.id, item]))

    expect(byId.get('stu-01' as StudentId)?.standing).toBe('active')
    expect(byId.get('stu-03' as StudentId)?.standing).toBe('prospect')
    expect(byId.get('stu-04' as StudentId)?.standing).toBe('alumnus')
    expect(byId.get('stu-05' as StudentId)?.standing).toBe('lapsed')
    // No enrolments at all is still a prospect, not an absence.
    expect(byId.get('stu-09' as StudentId)?.standing).toBe('prospect')
  })

  it('folds case and diacritics when searching', async () => {
    const api = createApi()

    const found = await api.students.list({ search: 'muller' })

    expect(found.items.map(it => it.lastName)).toEqual(['Müller'])
  })

  it('reports the total across every page, not the page length', async () => {
    const api = createApi()

    const page = await api.students.list({ page: 2, pageSize: 4 })

    expect(page.items).toHaveLength(4)
    expect(page.total).toBe(10)
    expect(page.page).toBe(2)
  })

  it('filters by an open licence class', async () => {
    const api = createApi()

    const found = await api.students.list({ licenceClass: 'A2' })

    expect(found.items.map(it => it.lastName)).toEqual(['Becker'])
  })

  it('rejects an invalid create with per-field messages', async () => {
    const api = createApi()

    const failure = await api.students
      .create({ ...VALID, firstName: '  ', email: 'not-an-email' })
      .catch((error: unknown) => error)

    expect(isApiError(failure) && failure.kind).toBe('validation')
    expect(isApiError(failure) && failure.fieldErrors).toEqual({
      firstName: 'shared.validation.required',
      email: 'shared.validation.invalidEmail',
    })
  })

  it('mints the id and the registration timestamp itself', async () => {
    const api = createApi()

    const created = await api.students.create(VALID)

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(await api.students.get(created.id)).toEqual(created)
  })

  it('treats an undefined patch key as unchanged and null as erased', async () => {
    const api = createApi()

    const patched = await api.students.update('stu-01' as StudentId, { phone: undefined })
    expect(patched.phone).not.toBeNull()

    const erased = await api.students.update('stu-01' as StudentId, { phone: null })
    expect(erased.phone).toBeNull()
  })

  it('does not hand out a live reference to its own record', async () => {
    const api = createApi()

    const student = await api.students.get('stu-01' as StudentId)
    student.firstName = 'Mutated'

    expect((await api.students.get('stu-01' as StudentId)).firstName).toBe('Lena')
  })

  it('refuses to delete a student who has trained here', async () => {
    const api = createApi()

    const failure = await api.students
      .remove('stu-01' as StudentId)
      .catch((error: unknown) => error)

    expect(isApiError(failure) && failure.kind).toBe('conflict')
  })

  it('deletes a student with no enrolments', async () => {
    const api = createApi()

    await api.students.remove('stu-09' as StudentId)

    const failure = await api.students
      .get('stu-09' as StudentId)
      .catch((error: unknown) => error)

    expect(isApiError(failure) && failure.kind).toBe('notFound')
  })
})
