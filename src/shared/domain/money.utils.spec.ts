import { describe, expect, it } from 'vitest'
import {
  addMoney,
  clampToZero,
  formatMoney,
  fromEuros,
  isPositive,
  isZero,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  toEuros,
  toMoney,
  ZERO,
} from './money.utils'

describe('money', () => {
  it('keeps cents exact where a float would not', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in euros, and 30 in cents.
    expect(addMoney(fromEuros(0.1), fromEuros(0.2))).toBe(30)
  })

  it('rounds a fractional cent rather than letting one through', () => {
    expect(toMoney(1.4)).toBe(1)
    expect(toMoney(1.5)).toBe(2)
    expect(fromEuros(62.905)).toBe(6291)
  })

  it('converts to euros only for display', () => {
    expect(toEuros(fromEuros(399))).toBe(399)
  })

  it('sums an empty list to zero', () => {
    expect(sumMoney([])).toBe(ZERO)
    expect(isZero(sumMoney([]))).toBe(true)
  })

  it('multiplies a unit price by the units taught', () => {
    expect(multiplyMoney(fromEuros(62), 2)).toBe(12_400)
  })

  it('subtracts into a negative, which is what a credit is', () => {
    const credit = subtractMoney(fromEuros(100), fromEuros(150))

    expect(credit).toBe(-5000)
    expect(isPositive(credit)).toBe(false)
    expect(clampToZero(credit)).toBe(ZERO)
  })

  it('compares with the ordinary operators', () => {
    expect(fromEuros(10) < fromEuros(20)).toBe(true)
  })

  it('formats in the caller\'s locale, in euros', () => {
    // Non-breaking spaces vary by ICU build, so match the parts that carry meaning.
    expect(formatMoney(fromEuros(1234.5), 'de-DE')).toContain('1.234,50')
    expect(formatMoney(fromEuros(1234.5), 'de-DE')).toContain('€')
    expect(formatMoney(fromEuros(1234.5), 'en-GB')).toContain('€1,234.50')
  })
})
