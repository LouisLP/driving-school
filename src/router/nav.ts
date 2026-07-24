import type { SectionId } from './route-meta'
import type { RouteName } from './route-names'
import type { MessageKey } from '@/i18n/use-t'
import { ROUTE } from './route-names'

/**
 * The navigation model — the single source of truth for what the shell shows.
 *
 * Deliberately a hand-written list rather than something derived from the route tree: the route
 * tree knows about 404s, redirects and detail pages that must never appear in a sidebar, and the
 * nav order is an editorial decision, not an artefact of file order. What IS enforced is that every
 * entry points at a real route name, so a renamed route breaks the build here rather than shipping
 * a dead link.
 *
 * Every shell variant renders this same model. That is the point: swapping sidebar for top nav is a
 * rendering decision, not a re-authoring of the information architecture.
 */

export interface NavItem {
  /** The section this item represents. Matches `route.meta.section`, which drives the active state. */
  section: SectionId
  /** Where clicking it goes. */
  to: RouteName
  labelKey: MessageKey
  /** Iconify name. */
  icon: string
  /** Subsections, where a section has a persistent tab strip of its own. */
  children?: readonly NavChild[]
}

export interface NavChild {
  to: RouteName
  labelKey: MessageKey
}

export interface NavGroup {
  /** `null` for the ungrouped lead item — a heading above a single "Dashboard" is noise. */
  labelKey: MessageKey | null
  items: readonly NavItem[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    labelKey: null,
    items: [
      {
        section: ROUTE.dashboard,
        to: ROUTE.dashboard,
        labelKey: 'dashboard.title',
        icon: 'lucide:layout-dashboard',
      },
    ],
  },
  {
    // The screens someone at the front desk touches every day.
    labelKey: 'shared.nav.groups.daily',
    items: [
      {
        section: ROUTE.planner,
        to: ROUTE.planner,
        labelKey: 'planner.title',
        icon: 'lucide:calendar-days',
      },
      {
        section: ROUTE.students,
        to: ROUTE.students,
        labelKey: 'students.title',
        icon: 'lucide:users',
      },
      {
        section: ROUTE.instructors,
        to: ROUTE.instructors,
        labelKey: 'instructors.title',
        icon: 'lucide:contact-round',
      },
    ],
  },
  {
    // Configuration and money — visited weekly, not hourly.
    labelKey: 'shared.nav.groups.administration',
    items: [
      {
        section: ROUTE.finances,
        to: ROUTE.financesInvoices,
        labelKey: 'finances.title',
        icon: 'lucide:receipt-euro',
        children: [
          { to: ROUTE.financesInvoices, labelKey: 'finances.sections.invoices' },
          { to: ROUTE.financesPayments, labelKey: 'finances.sections.payments' },
          { to: ROUTE.financesPriceLists, labelKey: 'finances.sections.priceLists' },
          { to: ROUTE.financesDebtors, labelKey: 'finances.sections.debtors' },
        ],
      },
      {
        section: ROUTE.school,
        to: ROUTE.schoolVehicles,
        labelKey: 'school.title',
        icon: 'lucide:building-2',
        children: [
          { to: ROUTE.schoolVehicles, labelKey: 'school.sections.vehicles' },
          { to: ROUTE.schoolLocations, labelKey: 'school.sections.locations' },
          { to: ROUTE.schoolLicenceClasses, labelKey: 'school.sections.licenceClasses' },
          { to: ROUTE.schoolProfile, labelKey: 'school.sections.profile' },
        ],
      },
    ],
  },
]

/** Flat list, for the variants that do not group (top nav, icon rail). */
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap(group => group.items)

export function findNavItem(section: SectionId | undefined): NavItem | undefined {
  return NAV_ITEMS.find(item => item.section === section)
}
