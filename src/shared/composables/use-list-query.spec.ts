import type { Router } from 'vue-router'
import type { Sort } from '@/shared/api'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { enumCodec, pageCodec, sortCodec, useListQuery } from './use-list-query'

type Standing = 'prospect' | 'active'
type SortField = 'lastName' | 'registeredAt'

interface Query {
  search: string
  standing: Standing | undefined
  sort: Sort<SortField>
  page: number
}

const DEFAULTS: Query = {
  search: '',
  standing: undefined,
  sort: { field: 'registeredAt', direction: 'desc' },
  page: 1,
}

const OPTIONS = {
  codecs: {
    standing: enumCodec<Standing>(['prospect', 'active']),
    sort: sortCodec<SortField>(['lastName', 'registeredAt']),
    page: pageCodec,
  },
  debounced: ['search'] as const,
  pageField: 'page' as const,
  sortField: 'sort' as const,
}

/**
 * A real router over a memory history: the composable's whole job is the round trip through
 * `route.query`, and a stubbed `$route` would test the stub.
 */
async function mountQuery(initialUrl = '/students') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/students', component: { template: '<div />' } }],
  })

  let api: ReturnType<typeof useListQuery<Query>> | undefined

  const Probe = defineComponent({
    setup() {
      api = useListQuery(DEFAULTS, OPTIONS)
      return () => h('div')
    },
  })

  await router.push(initialUrl)
  await router.isReady()

  const wrapper = mount(Probe, { global: { plugins: [router] } })
  await nextTick()

  return { router, wrapper, query: api! }
}

async function settle(router: Router) {
  await flushPromises()
  await router.isReady()
  await nextTick()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('reading the URL', () => {
  it('falls back to the defaults for everything the URL does not say', async () => {
    const { query } = await mountQuery()

    expect(query.query.value).toEqual(DEFAULTS)
  })

  it('parses every field back out of a pasted link', async () => {
    const { query } = await mountQuery(
      '/students?search=mul&standing=active&sort=lastName:asc&page=3',
    )

    expect(query.query.value).toEqual({
      search: 'mul',
      standing: 'active',
      sort: { field: 'lastName', direction: 'asc' },
      page: 3,
    })
  })

  it('treats a value the app does not have as no filter rather than as an error', async () => {
    // A stale bookmark from before a standing was renamed should land on a sane list.
    const { query } = await mountQuery('/students?standing=banished&page=nonsense')

    expect(query.query.value.standing).toBeUndefined()
    expect(query.query.value.page).toBe(1)
  })
})

describe('writing the URL', () => {
  it('strips defaults, so an unfiltered list is a bare path', async () => {
    const { router, query } = await mountQuery('/students?standing=active')

    query.draft.standing = undefined
    await settle(router)

    expect(router.currentRoute.value.fullPath).toBe('/students')
  })

  it('leaves query parameters it does not own alone', async () => {
    const { router, query } = await mountQuery('/students?ref=newsletter')

    query.draft.standing = 'active'
    await settle(router)

    expect(router.currentRoute.value.query).toEqual({ ref: 'newsletter', standing: 'active' })
  })

  it('round-trips a change through the URL and back into the committed query', async () => {
    const { router, query } = await mountQuery()

    query.draft.sort = { field: 'lastName', direction: 'asc' }
    await settle(router)

    expect(router.currentRoute.value.query.sort).toBe('lastName:asc')
    expect(query.query.value.sort).toEqual({ field: 'lastName', direction: 'asc' })
  })
})

describe('the page reset', () => {
  it('sends a filter change back to page 1', async () => {
    const { router, query } = await mountQuery('/students?page=4')

    query.draft.standing = 'active'
    await settle(router)

    // Filtering down to three results while on page 4 must not leave an empty table on screen.
    expect(query.query.value.page).toBe(1)
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('leaves the page alone when the page itself is what changed', async () => {
    const { router, query } = await mountQuery('/students?standing=active')

    query.draft.page = 3
    await settle(router)

    expect(query.query.value).toMatchObject({ page: 3, standing: 'active' })
  })
})

describe('debouncing the search box', () => {
  it('writes one URL entry for a burst of keystrokes', async () => {
    const { router, query } = await mountQuery()

    query.draft.search = 'm'
    query.draft.search = 'mu'
    query.draft.search = 'mul'
    await nextTick()

    expect(router.currentRoute.value.query.search).toBeUndefined()

    vi.advanceTimersByTime(250)
    await settle(router)

    expect(router.currentRoute.value.query.search).toBe('mul')
  })

  it('replaces rather than pushes, so typing does not fill the history stack', async () => {
    const { router, query } = await mountQuery()
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    query.draft.search = 'mul'
    await nextTick()
    vi.advanceTimersByTime(250)
    await settle(router)

    expect(replace).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('pushes a filter change, because that is a place you can go back to', async () => {
    const { router, query } = await mountQuery()
    const push = vi.spyOn(router, 'push')

    query.draft.standing = 'active'
    await settle(router)

    expect(push).toHaveBeenCalledTimes(1)
  })

  it('commits a pending search immediately when a filter changes with it', async () => {
    const { router, query } = await mountQuery()

    query.draft.search = 'mul'
    query.draft.standing = 'active'
    await settle(router)

    expect(query.query.value).toMatchObject({ search: 'mul', standing: 'active' })
  })
})

describe('isFiltered', () => {
  it('is false for a list nobody has touched', async () => {
    const { query } = await mountQuery()

    expect(query.isFiltered.value).toBe(false)
  })

  it('is false for a page or a sort — neither is a filter', async () => {
    const { query } = await mountQuery('/students?page=2&sort=lastName:asc')

    expect(query.isFiltered.value).toBe(false)
  })

  it('is true once any real filter is set', async () => {
    const { query } = await mountQuery('/students?search=mul')

    expect(query.isFiltered.value).toBe(true)
  })
})

describe('reset', () => {
  it('goes back to the defaults and to a bare URL', async () => {
    const { router, query } = await mountQuery('/students?search=mul&standing=active&page=4')

    query.reset()
    await settle(router)

    expect(query.query.value).toEqual(DEFAULTS)
    expect(router.currentRoute.value.fullPath).toBe('/students')
  })
})

describe('the back button', () => {
  it('pulls the controls back to whatever the URL now says', async () => {
    const { router, query } = await mountQuery()

    query.draft.standing = 'active'
    await settle(router)

    await router.back()
    await settle(router)

    expect(query.draft.standing).toBeUndefined()
  })
})
