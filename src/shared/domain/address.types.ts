export interface PostalAddress {
  street: string
  /** House number, kept separate from the street as German addresses are written and sorted. */
  houseNumber: string
  postalCode: string
  city: string
  /** ISO 3166-1 alpha-2. */
  countryCode: string
}
