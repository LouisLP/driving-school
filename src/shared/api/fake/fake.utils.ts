import type { Page, Sort } from '../query.contract'
import type { IsoDateTime } from '@/shared/domain'
import { toIsoDateTime } from '@/shared/domain'
import { DEFAULT_PAGE_SIZE } from '../query.contract'

/**
 * Mints an id. Branded ids are strings at runtime, so the cast is the whole implementation — but
 * it lives here alone, which is what lets `identifier.types.ts` claim ids come from the seam.
 */
export function mintId<TId extends string>(): TId {
  return crypto.randomUUID() as TId
}

export function nowIso(): IsoDateTime {
  return toIsoDateTime(new Date())
}

/**
 * Case- and diacritic-folded, so a receptionist typing `muller` finds `Müller` and `strasse`
 * finds `Straße`. A real backend would do this in the database collation; the fake does it in
 * one place so search behaves the same on both sides of the swap.
 */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .trim()
}

export function matchesSearch(search: string | undefined, ...fields: (string | null)[]): boolean {
  if (!search?.trim())
    return true

  const needle = fold(search)
  return fields.some(field => field != null && fold(field).includes(needle))
}

/** Sorts a copy, never the caller's array. Ties keep their existing order. */
export function sortBy<T, TField extends string>(
  items: readonly T[],
  sort: Sort<TField> | undefined,
  key: (item: T, field: TField) => string | number,
): readonly T[] {
  if (!sort)
    return items

  const direction = sort.direction === 'desc' ? -1 : 1

  return [...items].sort((a, b) => {
    const left = key(a, sort.field)
    const right = key(b, sort.field)

    if (left === right)
      return 0

    return left < right ? -direction : direction
  })
}

export function paginate<T>(items: readonly T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  const safePage = Math.max(1, Math.trunc(page))
  const safePageSize = Math.max(1, Math.trunc(pageSize))
  const start = (safePage - 1) * safePageSize

  return {
    items: items.slice(start, start + safePageSize),
    total: items.length,
    page: safePage,
    pageSize: safePageSize,
  }
}

/**
 * Applies a patch, ignoring keys explicitly set to `undefined`.
 *
 * `{ phone: undefined }` means "I am not changing the phone", not "erase it" — erasing is
 * `{ phone: null }`, which the domain's nullable fields already express.
 */
export function applyPatch<T extends object>(target: T, patch: Partial<T>): T {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined)
      Reflect.set(target, key, value)
  }

  return target
}

/**
 * Everything crossing the seam is cloned on the way out.
 *
 * Without this, a component holding a rendered entity would be holding the fake's own record —
 * mutate it and the "database" changes with no write, which is a bug class a real backend cannot
 * have. Cloning keeps the fake honest about being remote.
 */
export function detach<T>(value: T): T {
  return structuredClone(value)
}
