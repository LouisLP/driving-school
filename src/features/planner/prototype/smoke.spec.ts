import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { API_KEY } from '@/shared/api'
import { createFakeApi, seedDatabase } from '@/shared/api/fake'
import PlannerPrototypeView from './PlannerPrototypeView.vue'

async function mountVariant(variant: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/prototype/planner', component: PlannerPrototypeView }],
  })

  await router.push(`/prototype/planner?variant=${variant}`)
  await router.isReady()

  const wrapper = mount(PlannerPrototypeView, {
    global: {
      plugins: [router],
      provide: { [API_KEY as symbol]: createFakeApi(seedDatabase(), { latencyMs: 0 }) },
    },
  })

  await flushPromises()
  await flushPromises()

  return wrapper
}

describe('planner prototype', () => {
  it.each(['A', 'B', 'C'])('renders variant %s with the week in it', async (variant) => {
    const wrapper = await mountVariant(variant)

    expect(wrapper.text()).not.toContain('Loading the week')
    expect(wrapper.text()).toMatch(/Vogel|Lehmann/)
  })

  it('surfaces the seeded conflicts and free slots', async () => {
    const a = await mountVariant('A')
    expect(a.text()).toMatch(/already out|already booked|marked away|paused/)

    const b = await mountVariant('B')
    expect(b.text()).toContain('free')

    const c = await mountVariant('C')
    expect(c.text()).toContain('Needs booking')
  })
})
