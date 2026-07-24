import type { Brand } from './brand.types'

/**
 * An amount of money, as a whole number of euro cents.
 *
 * Integer minor units rather than a decimal: `0.1 + 0.2` is not `0.3` in a float, and a school
 * that bills 45-minute units at €62.90 hits that on the first invoice. Cents are exact, they
 * survive `JSON.stringify` unchanged, and they compare with `<` like any other number.
 *
 * Branded so that a raw `number` — a duration, a quantity, a count of lessons — cannot be passed
 * where an amount is meant, and so that arithmetic has to go through `money.utils.ts` rather than
 * being open-coded in a component. Free at runtime.
 */
export type Money = Brand<number, 'Money'>

/**
 * The one currency the school trades in.
 *
 * Carried as a constant rather than a field on every amount: this is one German driving school
 * billing German students, so a `{ amount, currency }` pair would force a mismatch branch into
 * every addition to guard against a case that cannot arise. The currency is read once, at the
 * formatting edge, in `formatMoney`.
 *
 * If a second currency ever appears, the brand is the seam to change — every arithmetic call site
 * already funnels through the utilities.
 */
export const CURRENCY = 'EUR'
