import type { RouteName } from './route-names'
import type { MessageKey } from '@/i18n/use-t'

declare module 'vue-router' {
  /**
   * What a route is allowed to carry. Everything here is optional and everything here is READ by
   * the shell — meta is for the chrome (title, nav highlight, breadcrumb), never for feature state.
   */
  interface RouteMeta {
    /** Typed i18n key for the page title. Drives `<h1>`, the breadcrumb and `document.title`. */
    titleKey?: MessageKey
    /** Which nav item lights up. Set on every route inside a section, detail routes included. */
    section?: SectionId
    /**
     * The route a flat detail page hangs off, for the breadcrumb. Only needed because detail routes
     * are siblings rather than children — see the note in `routes.ts`.
     */
    parent?: RouteName
  }
}

/** The six nav sections. A route either belongs to one of them or is chrome-less (404). */
export type SectionId = Extract<
  RouteName,
  'dashboard' | 'students' | 'planner' | 'instructors' | 'finances' | 'school'
>

export {}
