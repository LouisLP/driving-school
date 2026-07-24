import { flushPromises, mount } from '@vue/test-utils'

import { describe, expect, it } from 'vitest'
import App from '../App.vue'
import { createAppI18n } from '../i18n'
import { API_KEY } from '../shared/api'
import { createFakeApi, seedDatabase } from '../shared/api/fake'

/** An isolated school with no artificial latency — the shape every component test uses. */
function mountApp() {
  return mount(App, {
    global: {
      plugins: [createAppI18n()],
      provide: { [API_KEY as symbol]: createFakeApi(seedDatabase(), { latencyMs: 0 }) },
    },
  })
}

describe('app', () => {
  it('mounts renders properly', () => {
    const wrapper = mountApp()
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('All students')
  })

  it('renders students fetched through the seam', async () => {
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.text()).toContain('Müller')
  })
})
