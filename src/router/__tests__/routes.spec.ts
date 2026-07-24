import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { NAV_GROUPS, NAV_ITEMS } from '../nav'
import { ROUTE } from '../route-names'
import { routes } from '../routes'

/**
 * The route tree and the nav model are two hand-written lists that have to agree. These are the
 * assertions that keep them agreeing — a renamed route, a section added to one list and not the
 * other, or a page that forgets its title key all fail here rather than in the browser.
 */

function testRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [...routes] })
}

describe('route tree', () => {
  it('lands on the dashboard', async () => {
    const router = testRouter()
    await router.push('/')
    expect(router.currentRoute.value.name).toBe(ROUTE.dashboard)
  })

  it('sends a section with subsections to its first subsection', async () => {
    const router = testRouter()

    await router.push('/finances')
    expect(router.currentRoute.value.name).toBe(ROUTE.financesInvoices)

    await router.push('/school')
    expect(router.currentRoute.value.name).toBe(ROUTE.schoolVehicles)
  })

  it('catches an unknown path without leaving the shell', async () => {
    const router = testRouter()
    await router.push('/nope/nope')

    expect(router.currentRoute.value.name).toBe(ROUTE.notFound)
    // The 404 renders inside the shell record, so the nav stays on screen.
    expect(router.currentRoute.value.matched).toHaveLength(2)
  })

  it('gives every page a title key', () => {
    const router = testRouter()

    const untitled = router.getRoutes()
      .filter(route => route.components !== undefined && route.meta.titleKey === undefined)
      .map(route => route.path)

    // The shell record itself has no title; every page below it must.
    expect(untitled).toEqual(['/'])
  })

  it('tells every page which nav item to highlight', () => {
    const router = testRouter()

    const sectionless = router.getRoutes()
      .filter(route => route.name !== undefined && route.name !== ROUTE.notFound)
      .filter(route => route.meta.section === undefined)
      .map(route => String(route.name))

    expect(sectionless).toEqual([])
  })

  it('gives every flat detail route a breadcrumb parent', () => {
    const router = testRouter()

    const details = router.getRoutes()
      .filter(route => route.name !== undefined && route.name !== ROUTE.notFound)
      .filter(route => route.path.includes(':'))

    expect(details.length).toBeGreaterThan(0)
    for (const route of details)
      expect(route.meta.parent, `${String(route.name)} needs meta.parent`).toBeDefined()
  })
})

describe('nav model', () => {
  it('only points at routes that exist', () => {
    const router = testRouter()
    const names = new Set(router.getRoutes().map(route => route.name))

    for (const item of NAV_ITEMS) {
      expect(names, `${item.section} target`).toContain(item.to)
      for (const child of item.children ?? [])
        expect(names, `${item.section} > ${child.to}`).toContain(child.to)
    }
  })

  it('covers every section exactly once', () => {
    const sections = NAV_ITEMS.map(item => item.section)
    expect(new Set(sections).size).toBe(sections.length)
    expect(sections).toHaveLength(6)
  })

  it('lands each section link on a page that highlights it', async () => {
    const router = testRouter()

    for (const item of NAV_ITEMS) {
      await router.push({ name: item.to })
      expect(router.currentRoute.value.meta.section, item.section).toBe(item.section)
    }
  })

  it('groups without losing anyone', () => {
    expect(NAV_GROUPS.flatMap(group => group.items)).toEqual(NAV_ITEMS)
  })
})
