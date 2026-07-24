import type { InjectionKey, Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { MessageKey } from '@/i18n/use-t'
import type { NavChild, NavItem } from '@/router/nav'
import { computed, inject, onScopeDispose, provide, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useT } from '@/i18n/use-t'
import { findNavItem } from '@/router/nav'

/**
 * Everything the chrome needs to know about the current route, derived once.
 *
 * Every shell variant consumes this. The variants disagree about layout; they must not disagree
 * about which section is active or what the page is called, so that lives here and not in three
 * near-identical templates.
 */

export interface Crumb {
  /** A translated string wins over the key — that is how a detail page shows a person's name. */
  label?: string
  labelKey?: MessageKey
  /** Absent on the last crumb: you do not link to where you already are. */
  to?: RouteLocationRaw
}

/**
 * A page can rename itself once it knows what it is looking at. `usePageTitle(() => student.name)`
 * on a detail page replaces "Student" with "Anna Müller" in the header, breadcrumb and tab title.
 */
const PAGE_TITLE_KEY: InjectionKey<Ref<string | null>> = Symbol('shell:page-title')

export function providePageTitle(): Ref<string | null> {
  const title = ref<string | null>(null)
  provide(PAGE_TITLE_KEY, title)
  return title
}

export function usePageTitle(source: () => string | null | undefined): void {
  const title = inject(PAGE_TITLE_KEY, null)
  if (!title)
    return

  watchEffect(() => {
    title.value = source() ?? null
  })
  onScopeDispose(() => {
    title.value = null
  })
}

export function useShell() {
  const route = useRoute()
  const t = useT()
  const pageTitle = inject(PAGE_TITLE_KEY, ref<string | null>(null))

  /** The nav item to highlight. Detail routes carry their section, so they highlight it too. */
  const activeItem = computed<NavItem | undefined>(() => findNavItem(route.meta.section))

  /** The subsection tabs for the current section, empty for sections that have none. */
  const activeChildren = computed<readonly NavChild[]>(() => activeItem.value?.children ?? [])

  const titleKey = computed<MessageKey | undefined>(() => route.meta.titleKey)

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

  /** What goes in the `<h1>`: the page's own name if it has one, the route's title otherwise. */
  const heading = computed(() => pageTitle.value ?? (titleKey.value ? t(titleKey.value) : ''))

  return { activeItem, activeChildren, titleKey, pageTitle, heading, crumbs }
}
