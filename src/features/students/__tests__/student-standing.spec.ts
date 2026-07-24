import type { StudentStanding } from '@/shared/domain'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createAppI18n } from '@/i18n'
import { STUDENT_STANDINGS } from '@/shared/domain'
import StudentStandingBadge from '../components/StudentStandingBadge.vue'

/**
 * Not a snapshot. What is asserted is the mapping — which tone a standing gets and that it is
 * translated — because that is the decision, and the markup around it is not.
 */
function render(standing: StudentStanding, locale: 'en' | 'de' = 'en') {
  const i18n = createAppI18n()
  i18n.global.locale.value = locale

  return mount(StudentStandingBadge, {
    props: { standing },
    global: {
      plugins: [i18n],
      stubs: { Icon: true },
    },
  })
}

describe('standing to tone', () => {
  const EXPECTED: Record<StudentStanding, string> = {
    // Training now.
    active: 'success',
    // Enquired, nothing under way. Neutral would read as "nothing to do here".
    prospect: 'info',
    // Finished and gone — not a warning, and not a success either.
    alumnus: 'neutral',
    // Everything withdrawn: the one standing worth noticing in a long list.
    lapsed: 'warning',
  }

  it.each(STUDENT_STANDINGS)('renders %s in its own tone', (standing) => {
    expect(render(standing).attributes('data-tone')).toBe(EXPECTED[standing])
  })

  it('gives every standing a tone, so a new one cannot render untoned', () => {
    for (const standing of STUDENT_STANDINGS)
      expect(render(standing).attributes('data-tone')).toBeDefined()
  })
})

describe('the label', () => {
  it('is translated, never the raw standing', () => {
    expect(render('lapsed').text()).toBe('Lapsed')
  })

  it('follows the locale', () => {
    expect(render('lapsed', 'de').text()).toBe('Ruhend')
  })
})
