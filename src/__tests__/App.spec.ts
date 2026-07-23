import { mount } from '@vue/test-utils'

import { describe, expect, it } from 'vitest'
import App from '../App.vue'
import { createAppI18n } from '../i18n'

describe('app', () => {
  it('mounts renders properly', () => {
    const wrapper = mount(App, { global: { plugins: [createAppI18n()] } })
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('All students')
  })
})
