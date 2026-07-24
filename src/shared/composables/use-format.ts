import type { IsoDate, IsoDateTime, Money } from '@/shared/domain'
import { useI18n } from 'vue-i18n'
import { formatMoney } from '@/shared/domain'

export interface Formatters {
  /** `03.02.2026` in German, `03/02/2026` in English. For a birthday or a registration date. */
  date: (value: IsoDate | IsoDateTime) => string
  /** `Thu 30 Jul, 14:00`. For an appointment, where the weekday is what someone reads first. */
  dateTime: (value: IsoDateTime) => string
  /** Integer cents in, `€ 340,00` out. The only way money reaches a template. */
  money: (value: Money) => string
}

/**
 * The formatting edge, bound to the current locale.
 *
 * The whole app's dates and amounts go through here, so switching the language switcher reformats
 * every screen with no component knowing it happened — and so no template ever calls
 * `toLocaleDateString` with a locale it guessed at.
 *
 * Money is delegated to the domain's `formatMoney` rather than re-implemented: the currency is
 * read in exactly one place in this codebase, and `docs/money-model.md` means it to stay that way.
 *
 * `Intl` formatters are built per call. They are cheap, and caching them would mean holding one
 * per locale in module state that a locale switch has to invalidate — a bug for a saving nobody
 * would measure.
 */
export function useFormat(): Formatters {
  const { locale } = useI18n()

  return {
    date: value => new Date(toInstant(value)).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),

    dateTime: value => new Date(value).toLocaleString(locale.value, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),

    money: value => formatMoney(value, locale.value),
  }
}

/**
 * An `IsoDate` has no time or zone, so parsing it bare would land on the previous day for anyone
 * west of UTC. Pinning it to midday UTC keeps a birthday on its own date everywhere the school
 * would plausibly be read from.
 */
function toInstant(value: IsoDate | IsoDateTime): string {
  return value.length === 10 ? `${value}T12:00:00.000Z` : value
}
