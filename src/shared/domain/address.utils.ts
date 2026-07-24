import type { PostalAddress } from './address.types'

/**
 * A postal address as the lines it would be written on an envelope, German convention: street and
 * house number on one line, postal code and city on the next, country last.
 *
 * Lines rather than one string, because the caller decides the separator — a `<dl>` row wants
 * `<br>`, an invoice wants newlines, and a tooltip wants commas. Returning a joined string would
 * make two of those three do surgery on it.
 *
 * Here rather than in the Students feature so an address looks the same on a student record, on
 * an instructor's page and on an invoice — the same reason `formatMoney` is not in Finances.
 * Locale-blind: it is the domain's job to know how a German address is ordered, and nobody's job
 * to translate a street name.
 */
export function formatPostalAddress(address: PostalAddress): readonly string[] {
  const street = [address.street, address.houseNumber].filter(part => part.trim()).join(' ')
  const town = [address.postalCode, address.city].filter(part => part.trim()).join(' ')

  return [street, town, address.countryCode].filter(line => line.trim().length > 0)
}

/** True when there is nothing to print — the shape exists but every part of it is blank. */
export function isBlankAddress(address: PostalAddress | null): boolean {
  return address === null || formatPostalAddress(address).length === 0
}
