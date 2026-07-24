/**
 * Every route name in the app, in one place.
 *
 * Naming convention: `<section>` for a section's landing page, `<section>.<thing>` for anything
 * below it. Dots read as "inside", they do NOT imply nesting in the route tree — `students.detail`
 * is a flat sibling of `students` (see `routes.ts` for why).
 *
 * Nothing navigates by path string. `router.push({ name: ROUTE.studentDetail, params })` survives a
 * URL change; `router.push('/students/' + id)` does not.
 */
export const ROUTE = {
  dashboard: 'dashboard',

  students: 'students',
  studentDetail: 'students.detail',

  planner: 'planner',

  instructors: 'instructors',
  instructorDetail: 'instructors.detail',

  finances: 'finances',
  financesInvoices: 'finances.invoices',
  financesPayments: 'finances.payments',
  financesPriceLists: 'finances.price-lists',
  financesDebtors: 'finances.debtors',

  school: 'school',
  schoolVehicles: 'school.vehicles',
  schoolLocations: 'school.locations',
  schoolLicenceClasses: 'school.licence-classes',
  schoolProfile: 'school.profile',

  notFound: 'not-found',
} as const

export type RouteName = typeof ROUTE[keyof typeof ROUTE]
