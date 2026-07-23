import type { DefineLocaleMessage } from 'vue-i18n'
import type { Locale } from '../locales'
import type { MessageKey } from '../use-t'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { createAppI18n } from '..'
import { SOURCE_LOCALE, SUPPORTED_LOCALES } from '../locales'
import { buildMessages, collectKeys, diffMessageKeys, parseMessagePath } from '../messages'
import { useT } from '../use-t'

describe('message file convention', () => {
  it('derives the namespace from the folder that owns the i18n directory', () => {
    expect(parseMessagePath('../features/students/i18n/de.json')).toEqual({
      namespace: 'students',
      locale: 'de',
    })
    expect(parseMessagePath('../shared/i18n/en.json')).toEqual({
      namespace: 'shared',
      locale: 'en',
    })
  })

  it('refuses a locale that is not registered, instead of dropping the file', () => {
    expect(() => parseMessagePath('../features/students/i18n/fr.json'))
      .toThrow(/Unknown locale "fr"/)
  })

  it('refuses a file outside the <owner>/i18n/<locale>.json convention', () => {
    expect(() => parseMessagePath('../features/students/messages.json'))
      .toThrow(/convention/)
  })
})

describe('merged messages', () => {
  const messages = buildMessages()

  it('namespaces every feature under its folder name, in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(messages[locale]).sort())
        .toEqual(['dashboard', 'shared', 'students'])
    }
  })

  it('keeps feature keys apart', () => {
    expect(collectKeys(messages.en)).toContain('students.list.title')
    expect(collectKeys(messages.en)).toContain('dashboard.widgets.openInvoices')
  })
})

describe('translation parity', () => {
  it(`has no key drift against ${SOURCE_LOCALE}`, () => {
    // Fails the build when a DE translation is missing or a key was renamed
    // in en.json only. This is the loud half of the fallback story.
    expect(diffMessageKeys()).toEqual([])
  })

  it('reports drift in both directions', () => {
    const drift = diffMessageKeys({
      en: { students: { title: 'Students', extra: 'Extra' } },
      de: { students: { title: 'Fahrschüler', gone: 'Weg' } },
    })

    expect(drift).toEqual([
      { locale: 'de', missing: ['students.extra'], stale: ['students.gone'] },
    ])
  })
})

describe('t() across two features', () => {
  it('rejects a key that does not exist, at build time', () => {
    // @ts-expect-error the whole point: a typo is a compile error, not a
    // runtime surprise. If this line ever stops erroring, typed keys are broken.
    const typo: MessageKey = 'students.titel'

    expect(typo).toBe('students.titel')
  })

  const Probe = defineComponent({
    setup() {
      const t = useT()
      return () => h('p', [
        t('students.title'),
        ' / ',
        t('dashboard.title'),
        ' / ',
        t('shared.actions.save'),
        ' / ',
        t('students.list.count', 2),
      ].join(''))
    },
  })

  it('resolves keys from every namespace', () => {
    const i18n = createAppI18n()
    const wrapper = mount(Probe, { global: { plugins: [i18n] } })

    expect(wrapper.text()).toBe('Students / Dashboard / Save / 2 students')
  })

  it('switches the whole app to German', async () => {
    const i18n = createAppI18n()
    const wrapper = mount(Probe, { global: { plugins: [i18n] } })

    i18n.global.locale.value = 'de'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toBe('Fahrschüler / Übersicht / Speichern / 2 Fahrschüler')
  })

  it('falls back to English for an untranslated key rather than showing the key', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'de',
      fallbackLocale: SOURCE_LOCALE,
      missingWarn: false,
      fallbackWarn: false,
      // Deliberately partial: the point is what happens when DE lacks a key.
      messages: {
        en: { students: { title: 'Students' } },
        de: { students: {} },
      } as unknown as Record<Locale, DefineLocaleMessage>,
    })

    expect(i18n.global.t('students.title')).toBe('Students')
  })
})
