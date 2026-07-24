import type { Money } from './money.types'
import { CURRENCY } from './money.types'

/** The additive identity, and what an empty sum comes back as. */
export const ZERO: Money = 0 as Money

/**
 * The only sanctioned way to mint a `Money` from cents.
 *
 * Rounds, because every operation that can produce a fraction of a cent (a share of a package, a
 * percentage) has to land somewhere, and rounding half-up in one place beats each caller choosing
 * its own truncation.
 */
export function toMoney(minorUnits: number): Money {
  return Math.round(minorUnits) as Money
}

/** For price lists and seed data, where €62.90 is what a human would write. */
export function fromEuros(euros: number): Money {
  return toMoney(euros * 100)
}

/** For the formatting edge and for chart axes. Nothing should do arithmetic on the result. */
export function toEuros(money: Money): number {
  return money / 100
}

export function addMoney(a: Money, b: Money): Money {
  return (a + b) as Money
}

export function subtractMoney(a: Money, b: Money): Money {
  return (a - b) as Money
}

export function sumMoney(amounts: readonly Money[]): Money {
  return amounts.reduce(addMoney, ZERO)
}

/**
 * An amount times a count — a unit price times the 45-minute units a lesson ran for. Rounds, so
 * the result is still whole cents when the factor is not an integer.
 */
export function multiplyMoney(money: Money, factor: number): Money {
  return toMoney(money * factor)
}

/** Clamps a negative amount to zero. What "how much is still owed" means when overpaid. */
export function clampToZero(money: Money): Money {
  return money < ZERO ? ZERO : money
}

export function isZero(money: Money): boolean {
  return money === ZERO
}

/** `Money` is a number at runtime, so `a < b` compares correctly; this names the common case. */
export function isPositive(money: Money): boolean {
  return money > ZERO
}

/**
 * The formatting edge, and the only place that knows the currency exists.
 *
 * Takes the locale rather than reading it from anywhere: the domain is locale-blind exactly as
 * the validators are, and the caller already has one from `useI18n()`.
 */
export function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY })
    .format(toEuros(money))
}
