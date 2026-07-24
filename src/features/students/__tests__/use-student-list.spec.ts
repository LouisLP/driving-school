import type { Api } from '@/shared/api'
import type { StudentId } from '@/shared/domain'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { API_KEY } from '@/shared/api'
import { createFakeApi, seedDatabase } from '@/shared/api/fake'
import {
  STUDENT_LIST_DEFAULTS,
  toStudentQuery,
  useStudentList,
} from '../composables/use-student-list'

/** A real fake API and a real router: what this composable does is translate between the two. */
async function mountList(url = '/students') {
  const api = createFakeApi(seedDatabase(), { latencyMs: 0 })

  const listSpy = vi.spyOn(api.students, 'list')

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/students', component: { template: '<div />' } }],
  })

  let list: ReturnType<typeof useStudentList> | undefined

  const Probe = defineComponent({
    setup() {
      list = useStudentList()
      return () => h('div')
    },
  })

  await router.push(url)
  await router.isReady()

  mount(Probe, {
    global: {
      plugins: [router],
      provide: { [API_KEY as symbol]: api as Api },
    },
  })

  await flushPromises()

  return { api, list: list!, listSpy, router }
}

async function settle() {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('toStudentQuery', () => {
  it('drops an empty search rather than filtering on an empty string', () => {
    expect(toStudentQuery({ ...STUDENT_LIST_DEFAULTS, search: '   ' }).search).toBeUndefined()
  })

  it('turns "no filter" into an absent key, not a null the seam has to interpret', () => {
    const query = toStudentQuery(STUDENT_LIST_DEFAULTS)

    expect(query.standing).toBeUndefined()
    expect(query.licenceClass).toBeUndefined()
  })

  it('passes the sort and the page straight through — the seam owns both', () => {
    const query = toStudentQuery({ ...STUDENT_LIST_DEFAULTS, page: 3 })

    expect(query.sort).toEqual({ field: 'registeredAt', direction: 'desc' })
    expect(query.page).toBe(3)
    expect(query.pageSize).toBe(25)
  })
})

describe('the filters, as the seam sees them', () => {
  it('sends the defaults on a bare URL', async () => {
    const { listSpy } = await mountList()

    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({
      search: undefined,
      standing: undefined,
      licenceClass: undefined,
      sort: { field: 'registeredAt', direction: 'desc' },
      page: 1,
    }))
  })

  it('maps a pasted URL onto a StudentQuery', async () => {
    const { listSpy } = await mountList('/students?search=mul&standing=active&page=2')

    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'mul',
      standing: 'active',
      page: 2,
    }))
  })

  it('re-reads when a filter changes, and only then', async () => {
    const { list, listSpy } = await mountList()
    const initialCalls = listSpy.mock.calls.length

    list.draft.standing = 'lapsed'
    await settle()

    expect(listSpy.mock.calls.length).toBe(initialCalls + 1)
    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ standing: 'lapsed' }))
  })

  it('goes back to page 1 when a filter changes', async () => {
    const { list, listSpy } = await mountList('/students?page=3')

    list.draft.search = 'mul'
    await nextTick()
    vi.advanceTimersByTime(250)
    await settle()

    expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'mul', page: 1 }))
  })

  it('actually selects rows — the query reaches the data, not just the call', async () => {
    const { list } = await mountList('/students?standing=lapsed')

    // The seed has exactly one student whose every enrolment was withdrawn.
    expect(list.students.value?.items.map(it => it.standing)).toEqual(['lapsed'])
  })

  it('folds the search, so an umlaut is findable without one', async () => {
    const { list } = await mountList('/students?search=mul')

    expect(list.students.value?.items.some(it => it.lastName === 'Müller')).toBe(true)
  })
})

describe('the licence-class filter', () => {
  it('offers only the classes the school actually teaches', async () => {
    const { list } = await mountList()
    const offerings = await createFakeApi(seedDatabase(), { latencyMs: 0 }).offerings.list()

    const taught = offerings.filter(it => it.isOffered).map(it => it.licenceClass)

    expect([...list.offeredClasses.value]).toEqual(taught)
    // Filtering by a class nobody is taught is a filter that always returns nothing.
    expect(list.offeredClasses.value).not.toContain('D')
  })
})

describe('derived standing, end to end', () => {
  /**
   * The claim the whole slice exists to make observable: enrol a prospect and their standing in
   * the list changes, with nothing anywhere writing a status.
   */
  it('flips a prospect to active on enrolment, with no status field involved', async () => {
    const { api, list } = await mountList()
    const clara = 'stu-09' as StudentId

    function rowFor(id: StudentId) {
      return list.students.value?.items.find(it => it.id === id)
    }

    // stu-09 holds no enrolments at all, so the seam derives `prospect`.
    expect(rowFor(clara)?.standing).toBe('prospect')
    expect(rowFor(clara)).not.toHaveProperty('status')

    const enrolment = await api.enrolments.create({ studentId: clara, licenceClass: 'B' })
    await api.enrolments.setStatus(enrolment.id, 'active')

    await list.refresh()
    await settle()

    expect(rowFor(clara)?.standing).toBe('active')
    expect(rowFor(clara)?.openLicenceClasses).toEqual(['B'])

    // And back again: withdraw the only enrolment and she is lapsed, still with no stored status.
    await api.enrolments.setStatus(enrolment.id, 'withdrawn')
    await list.refresh()
    await settle()

    expect(rowFor(clara)?.standing).toBe('lapsed')
    expect(rowFor(clara)).not.toHaveProperty('status')
  })
})

describe('isFiltered', () => {
  it('ignores the page and the sort — neither is a filter', async () => {
    const { list } = await mountList('/students?page=2&sort=lastName:asc')

    expect(list.isFiltered.value).toBe(false)
  })

  it('is true once a real filter is set', async () => {
    const { list } = await mountList('/students?standing=active')

    expect(list.isFiltered.value).toBe(true)
  })
})
