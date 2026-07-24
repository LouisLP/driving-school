import type { InjectionKey, Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { MessageKey } from '@/i18n/use-t'
import type { NavChild, NavItem } from '@/router/nav'
import { computed, inject, onScopeDispose, provide, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useT } from '@/i18n/use-t'
import { findNavItem } from '@/router/nav'

/**
 * Everything the chrome knows about the current route, derived once by the shell and shared with
 * whatever renders below it.
 *
 * The sidebar, the breadcrumb and the header must not disagree about which section is active or
 * what the page is called, so none of them works it out for itself: `AppShell` calls
 * `provideShell()`, everyone else calls `useShell()`.
 */

export interface Crumb {
  /** A translated string wins over the key — that is how a detail page shows a person's name. */
  label?: string
  labelKey?: MessageKey
  /** Absent on the last crumb: you do not link to where you already are. */
  to?: RouteLocationRaw
}

export interface ShellContext {
  /** The nav item to highlight. Detail routes carry their section, so they highlight it too. */
  activeItem: Readonly<Ref<NavItem | undefined>>
  /** The subsection links for the current section, empty for sections that have none. */
  activeChildren: Readonly<Ref<readonly NavChild[]>>
  /** What a page called itself via {@link usePageTitle}, if anything. */
  pageTitle: Ref<string | null>
  /** What goes in the `<h1>`: the page's own name if it has one, the route's title otherwise. */
  heading: Readonly<Ref<string>>
  crumbs: Readonly<Ref<readonly Crumb[]>>
}

const SHELL_KEY: InjectionKey<ShellContext> = Symbol('shell')

/** Called once, by the shell. Returns the same context `useShell()` hands to everyone below. */
export function provideShell(): ShellContext {
  const route = useRoute()
  const t = useT()

  const pageTitle = ref<string | null>(null)

  const activeItem = computed(() => findNavItem(route.meta.section))
  const activeChildren = computed<readonly NavChild[]>(() => activeItem.value?.children ?? [])
  const titleKey = computed<MessageKey | undefined>(() => route.meta.titleKey)

  const heading = computed(() => pageTitle.value ?? (titleKey.value ? t(titleKey.value) : ''))

  const crumbs = computed<readonly Crumb[]>(() => {
    const item = activeItem.value
    if (!item)
      return []

    const section: Crumb = { labelKey: item.labelKey, to: { name: item.to } }

    // A subsection page: "Finances / Invoices". The section crumb links to the section's default.
    const child = activeChildren.value.find(it => it.to === route.name)
    if (child)
      return [section, { labelKey: child.labelKey }]

    // A flat detail page: "Students / Anna Müller". `meta.parent` exists precisely because the
    // detail route is not nested under its list — see `routes.ts`.
    if (route.meta.parent)
      return [section, { label: pageTitle.value ?? undefined, labelKey: titleKey.value }]

    // A section landing page is its own crumb, unlinked.
    return [{ labelKey: item.labelKey }]
  })

  const context: ShellContext = { activeItem, activeChildren, pageTitle, heading, crumbs }
  provide(SHELL_KEY, context)
  return context
}

/**
 * For anything rendered inside the shell. Throws outside it rather than returning a hollow context
 * that would silently render an empty breadcrumb.
 */
export function useShell(): ShellContext {
  const context = inject(SHELL_KEY, null)
  if (!context)
    throw new Error('[shell] useShell() outside the app shell')

  return context
}

/**
 * Lets a page rename itself once it knows what it is looking at.
 * `usePageTitle(() => student.name)` on a detail page replaces "Student" with "Anna Müller" in the
 * header, the breadcrumb and the tab title. A no-op outside the shell, so a component that uses it
 * stays mountable in isolation.
 */
export function usePageTitle(source: () => string | null | undefined): void {
  const context = inject(SHELL_KEY, null)
  if (!context)
    return

  watchEffect(() => {
    context.pageTitle.value = source() ?? null
  })

  onScopeDispose(() => {
    context.pageTitle.value = null
  })
}
