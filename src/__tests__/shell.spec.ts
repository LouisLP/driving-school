import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import { createAppI18n } from '../i18n'
import { routes } from '../router/routes'
import { API_KEY } from '../shared/api'
import { createFakeApi, seedDatabase } from '../shared/api/fake'

/**
 * The shell's contracts, end to end: every section reachable from the nav, the page named from
 * route meta, and a detail page able to rename itself. Not a snapshot — these are the three things
 * a variant swap could quietly break.
 */
async function mountApp(path = '/students') {
  const router = createRouter({ history: createMemoryHistory(), routes: [...routes] })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(App, {
    global: {
      plugins: [router, createAppI18n(), createPinia()],
      provide: { [API_KEY as symbol]: createFakeApi(seedDatabase(), { latencyMs: 0 }) },
      stubs: { Icon: true },
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('app shell', () => {
  it('offers every section in the navigation', async () => {
    const { wrapper } = await mountApp()
    const links = wrapper.findAll('nav a').map(link => link.attributes('href'))

    expect(links).toEqual(expect.arrayContaining([
      '/dashboard',
      '/planner',
      '/students',
      '/instructors',
      '/finances/invoices',
      '/school/vehicles',
    ]))
  })

  it('titles the page from the route', async () => {
    const { wrapper } = await mountApp('/school/locations')
    expect(wrapper.get('h1').text()).toBe('Locations')
  })

  it('renders the page inside the shell', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.text()).toContain('Müller')
  })

  it('lets a detail page rename the header', async () => {
    const { wrapper, router } = await mountApp()

    const link = wrapper.get('tbody a')
    await router.push(link.attributes('href') ?? '/')
    await flushPromises()

    expect(wrapper.get('h1').text()).not.toBe('Students')
    expect(wrapper.get('h1').text()).toContain(' ')
  })

  it('keeps the navigation visible on an unknown URL', async () => {
    const { wrapper } = await mountApp('/does-not-exist')

    expect(wrapper.get('h1').text()).toBe('Page not found')
    expect(wrapper.findAll('nav a').length).toBeGreaterThan(0)
  })
})
