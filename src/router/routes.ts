import type { RouteRecordRaw } from 'vue-router'
import AppShell from '@/shared/shell/AppShell.vue'
import { ROUTE } from './route-names'

/**
 * The route tree.
 *
 * ── Where the layout sits ──────────────────────────────────────────────────
 *
 * One root record owns the shell, and every section is a child of it. `App.vue` is therefore a bare
 * `<RouterView />`: the chrome is a route component, not an app-level wrapper. That is what makes a
 * chrome-less screen possible later (a print view, a public booking page) — it is a sibling of the
 * shell record, not an exception inside a component.
 *
 * ── Flat detail routes ─────────────────────────────────────────────────────
 *
 * `students.detail` is a SIBLING of `students`, not a child. Nesting a detail route inside its list
 * only pays when the list stays on screen beside the detail (master-detail). It does not here: a
 * student's page is a full page with its own tabs, and keeping a table of 300 rows mounted behind
 * it buys nothing. The cost of flatness is that the breadcrumb cannot be read off `route.matched`,
 * so detail routes declare `meta.parent` instead.
 *
 * ── Subsections group without a layout component ───────────────────────────
 *
 * `finances` and `school` are the two sections with subsections. Their parent record has a path,
 * a redirect and meta — but no component. The subsection tabs are chrome, rendered by the shell
 * from `nav.ts`, so a layout component here would be an empty `<RouterView />` wrapper whose only
 * job is to exist. Nesting still earns its keep: it is what makes the URL prefix, the redirect and
 * `meta.section` a single declaration instead of four copies.
 *
 * The rule: nest for shared path and shared meta; add a component to the parent only when there is
 * something that must survive a change of child (shared fetched state, a form spanning tabs).
 *
 * ── Lazy loading ───────────────────────────────────────────────────────────
 *
 * Every page is a dynamic import, so a section is only downloaded when first visited. The shell is
 * imported statically — it is on every route, and lazily loading it just adds a blank frame to the
 * cold start.
 */

/** Scaffolding: the sections that are routed but not yet specified. Replaced section by section. */
const placeholder = () => import('@/shared/shell/SectionPlaceholder.vue')

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: { name: ROUTE.dashboard } },

      {
        path: 'dashboard',
        name: ROUTE.dashboard,
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
        meta: { titleKey: 'dashboard.title', section: ROUTE.dashboard },
      },

      {
        path: 'planner',
        name: ROUTE.planner,
        component: placeholder,
        props: { bodyKey: 'planner.placeholder' },
        meta: { titleKey: 'planner.title', section: ROUTE.planner },
      },

      {
        path: 'students',
        name: ROUTE.students,
        component: () => import('@/features/students/pages/StudentListPage.vue'),
        meta: { titleKey: 'students.title', section: ROUTE.students },
      },
      {
        path: 'students/:studentId',
        name: ROUTE.studentDetail,
        component: () => import('@/features/students/pages/StudentDetailPage.vue'),
        props: true,
        meta: { titleKey: 'students.detail.title', section: ROUTE.students, parent: ROUTE.students },
      },

      {
        path: 'instructors',
        name: ROUTE.instructors,
        component: () => import('@/features/instructors/pages/InstructorListPage.vue'),
        meta: { titleKey: 'instructors.title', section: ROUTE.instructors },
      },
      {
        path: 'instructors/:instructorId',
        name: ROUTE.instructorDetail,
        component: placeholder,
        meta: {
          titleKey: 'instructors.detail.title',
          section: ROUTE.instructors,
          parent: ROUTE.instructors,
        },
      },

      {
        path: 'finances',
        redirect: { name: ROUTE.financesInvoices },
        meta: { titleKey: 'finances.title', section: ROUTE.finances },
        children: [
          {
            path: 'invoices',
            name: ROUTE.financesInvoices,
            component: placeholder,
            props: { bodyKey: 'finances.placeholder' },
            meta: { titleKey: 'finances.sections.invoices', section: ROUTE.finances },
          },
          {
            path: 'payments',
            name: ROUTE.financesPayments,
            component: placeholder,
            props: { bodyKey: 'finances.placeholder' },
            meta: { titleKey: 'finances.sections.payments', section: ROUTE.finances },
          },
          {
            path: 'price-lists',
            name: ROUTE.financesPriceLists,
            component: placeholder,
            props: { bodyKey: 'finances.placeholder' },
            meta: { titleKey: 'finances.sections.priceLists', section: ROUTE.finances },
          },
          {
            path: 'debtors',
            name: ROUTE.financesDebtors,
            component: placeholder,
            props: { bodyKey: 'finances.placeholder' },
            meta: { titleKey: 'finances.sections.debtors', section: ROUTE.finances },
          },
        ],
      },

      {
        path: 'school',
        redirect: { name: ROUTE.schoolVehicles },
        meta: { titleKey: 'school.title', section: ROUTE.school },
        children: [
          {
            path: 'vehicles',
            name: ROUTE.schoolVehicles,
            component: () => import('@/features/school/pages/VehiclesPage.vue'),
            meta: { titleKey: 'school.sections.vehicles', section: ROUTE.school },
          },
          {
            path: 'locations',
            name: ROUTE.schoolLocations,
            component: placeholder,
            props: { bodyKey: 'school.placeholder' },
            meta: { titleKey: 'school.sections.locations', section: ROUTE.school },
          },
          {
            path: 'licence-classes',
            name: ROUTE.schoolLicenceClasses,
            component: placeholder,
            props: { bodyKey: 'school.placeholder' },
            meta: { titleKey: 'school.sections.licenceClasses', section: ROUTE.school },
          },
          {
            path: 'profile',
            name: ROUTE.schoolProfile,
            component: placeholder,
            props: { bodyKey: 'school.placeholder' },
            meta: { titleKey: 'school.sections.profile', section: ROUTE.school },
          },
        ],
      },

      {
        path: ':pathMatch(.*)*',
        name: ROUTE.notFound,
        component: () => import('@/shared/shell/NotFoundPage.vue'),
        meta: { titleKey: 'shared.notFound.title' },
      },
    ],
  },
]
