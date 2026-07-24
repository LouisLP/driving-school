import type { ComputedRef } from 'vue'
import type { LocationQuery } from 'vue-router'
import type { Sort, SortDirection } from '@/shared/api'
import { computed, onScopeDispose, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** Long enough that a fast typist writes one URL entry, short enough to feel immediate. */
export const DEFAULT_DEBOUNCE_MS = 250

/** The fallback for every field that is already a string. An empty one is simply absent. */
const STRING_CODEC: QueryCodec<string> = {
  parse: raw => (raw.length > 0 ? raw : undefined),
  serialize: value => (value.length > 0 ? value : undefined),
}

/**
 * How one field survives the round trip through the address bar.
 *
 * `undefined` from either direction means "this field is not in the URL" — which is also how a
 * value that is simply the default is expressed, so an unfiltered list is a clean `/students`.
 */
export interface QueryCodec<V> {
  parse: (raw: string) => V | undefined
  serialize: (value: V) => string | undefined
}

export interface UseListQueryOptions<T> {
  /** Only for fields that are not plain strings. Anything absent round-trips as one. */
  codecs?: { [K in keyof T]?: QueryCodec<NonNullable<T[K]>> }
  /** Fields where a keystroke should replace the URL rather than push a history entry. */
  debounced?: readonly (keyof T & string)[]
  debounceMs?: number
  /** The page field, reset to its default whenever anything else changes. */
  pageField?: keyof T & string
  /** The sort field. Excluded from `isFiltered` — a sort order is not a filter. */
  sortField?: keyof T & string
}

export interface UseListQuery<T> {
  /**
   * What the URL currently says, merged over the defaults. This is what a fetch watches: it
   * changes once per committed change, not once per keystroke.
   */
  query: ComputedRef<T>
  /**
   * What the controls bind to. Writes here land in the URL — immediately for a filter, after the
   * debounce for a search box — so a control never has to lag behind the person using it.
   */
  draft: T
  /** True when any filter is set. What the "Clear" button's visibility keys on. */
  isFiltered: ComputedRef<boolean>
  /** Back to the defaults, and to a bare URL. */
  reset: () => void
  /** Commits a pending debounced change now. For a form submit, and for tests. */
  flush: () => void
}

/**
 * A list's state, kept in the URL.
 *
 * Because the record is a separate route, coming back from a student has to restore the list
 * anyway — and the two cheaper options both fail that. Component-local state resets every filter
 * on the way back, which on a three-hundred-row list is the most irritating bug a CRM can have;
 * a Pinia store fixes the round trip but not linkability, and `docs/api-seam.md` reserves Pinia
 * for state that outlives a route and is not server data. See `docs/students-slice.md`,
 * decision 6.
 *
 * Generic over the query type, so Instructors, Invoices and Debtors get it for free.
 *
 * Two rules worth stating out loud:
 *
 * - **Defaults are stripped.** A URL carries what someone chose, not the shape of the component.
 * - **Changing a filter resets the page.** Forgetting this is the classic version of the bug:
 *   filter down to three results while on page 4, and stare at an empty table.
 */
export function useListQuery<T extends object>(
  defaults: T,
  options: UseListQueryOptions<T> = {},
): UseListQuery<T> {
  const route = useRoute()
  const router = useRouter()

  const fields = Object.keys(defaults) as (keyof T & string)[]
  const debouncedFields = new Set<string>(options.debounced ?? [])
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS

  function codecOf<K extends keyof T & string>(field: K): QueryCodec<NonNullable<T[K]>> {
    // Anything without a codec is a plain string, which is the majority of every list's filters.
    return options.codecs?.[field] ?? (STRING_CODEC as unknown as QueryCodec<NonNullable<T[K]>>)
  }

  function read(): T {
    const result = { ...defaults }

    for (const field of fields) {
      const raw = route.query[field]
      const single = Array.isArray(raw) ? raw[0] : raw

      if (typeof single !== 'string')
        continue

      const parsed = codecOf(field).parse(single)

      // An unparseable value is treated as absent rather than as an error: a hand-edited URL
      // should land on a sane list, not on a broken screen.
      if (parsed !== undefined)
        result[field] = parsed as T[keyof T & string]
    }

    return result
  }

  function encode(field: keyof T & string, value: T[keyof T & string]): string | undefined {
    return value === undefined || value === null
      ? undefined
      : codecOf(field).serialize(value as NonNullable<T[keyof T & string]>)
  }

  /** Everything not ours is left alone — this composable owns its own fields and no others. */
  function toRouteQuery(value: T): LocationQuery {
    const next: LocationQuery = { ...route.query }

    for (const field of fields) {
      const encoded = encode(field, value[field])
      const isDefault = encoded === encode(field, defaults[field])

      if (encoded === undefined || isDefault)
        delete next[field]
      else
        next[field] = encoded
    }

    return next
  }

  const query = computed(read)
  const draft = reactive({ ...read() }) as T

  const isFiltered = computed(() => fields.some((field) => {
    if (field === options.pageField || field === options.sortField)
      return false

    return encode(field, query.value[field]) !== encode(field, defaults[field])
  }))

  function changedFields(): (keyof T & string)[] {
    return fields.filter(field => encode(field, draft[field]) !== encode(field, query.value[field]))
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: (keyof T & string)[] = []

  function commit(changed: readonly (keyof T & string)[]): void {
    const next = { ...draft } as T
    const isSearchOnly = changed.every(field => debouncedFields.has(field))

    // Filtering down while on page 4 must not leave you staring at an empty table.
    if (options.pageField && changed.some(field => field !== options.pageField))
      next[options.pageField] = defaults[options.pageField]

    Object.assign(draft, next)

    // Typing should not fill the history stack; changing a filter is a place you can go back to.
    void router[isSearchOnly ? 'replace' : 'push']({ query: toRouteQuery(next) })
  }

  function flush(): void {
    clearTimeout(timer)
    timer = undefined

    if (pending.length === 0)
      return

    const changed = pending
    pending = []
    commit(changed)
  }

  watch(draft, () => {
    const changed = changedFields()

    if (changed.length === 0)
      return

    clearTimeout(timer)
    pending = changed

    if (changed.every(field => debouncedFields.has(field))) {
      timer = setTimeout(flush, debounceMs)
      return
    }

    flush()
  }, { deep: true })

  // The back button, a pasted link, `reset()` — whatever moved the URL, the controls follow it.
  watch(query, (next) => {
    for (const field of fields) {
      if (encode(field, draft[field]) !== encode(field, next[field]))
        draft[field] = next[field]
    }
  })

  function reset(): void {
    clearTimeout(timer)
    pending = []
    Object.assign(draft, defaults)
    void router.push({ query: toRouteQuery({ ...defaults }) })
  }

  onScopeDispose(() => clearTimeout(timer))

  return { query, draft, isFiltered, reset, flush }
}

/** 1-based positive integers — page numbers. Anything else reads as absent. */
export const pageCodec: QueryCodec<number> = {
  parse: (raw) => {
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined
  },
  serialize: value => String(value),
}

/**
 * A closed set of values. A URL naming a standing the app does not have is treated as no filter
 * at all, which is the difference between a stale bookmark and an error page.
 */
export function enumCodec<V extends string>(allowed: readonly V[]): QueryCodec<V> {
  return {
    parse: raw => (allowed as readonly string[]).includes(raw) ? raw as V : undefined,
    serialize: value => value,
  }
}

/** `lastName:asc`. One field and one direction, because only one column sorts at a time. */
export function sortCodec<F extends string>(allowed: readonly F[]): QueryCodec<Sort<F>> {
  const directions: readonly SortDirection[] = ['asc', 'desc']

  return {
    parse: (raw) => {
      const [field, direction] = raw.split(':')

      return (allowed as readonly string[]).includes(field ?? '')
        && (directions as readonly string[]).includes(direction ?? '')
        ? { field: field as F, direction: direction as SortDirection }
        : undefined
    },
    serialize: value => `${value.field}:${value.direction}`,
  }
}
