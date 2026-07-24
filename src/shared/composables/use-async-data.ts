import type { Ref, WatchSource } from 'vue'
import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import { ApiError, isApiError } from '@/shared/api'

export interface UseAsyncDataOptions {
  /** Fetch on creation. Turn off when the read depends on something not yet chosen. */
  immediate?: boolean
  /**
   * Re-fetch when any of these change. Filters, a route param, a selected week. A `reactive`
   * filter object is a valid source, which is why plain objects are allowed here.
   */
  watch?: WatchSource | WatchSource[] | object
  /** Watch reactive objects deeply. On by default, since filters are usually one object. */
  deep?: boolean
}

export interface UseAsyncData<T> {
  data: Readonly<Ref<T | null>>
  error: Readonly<Ref<ApiError | null>>
  isPending: Readonly<Ref<boolean>>
  /** True until the first fetch settles — what a skeleton keys on, as opposed to a refresh. */
  isInitialLoad: Readonly<Ref<boolean>>
  refresh: () => Promise<void>
}

/**
 * One screen's read of the seam.
 *
 * This is the only place in the app that wraps a repository call in `try`/`catch`. Components get
 * `data` / `isPending` / `error` and render three states from them; nothing above this line ever
 * sees a rejected promise, and nothing below it knows what a loading state is.
 *
 * Concurrent refreshes are safe: each run takes a token and a stale run's result is dropped, so a
 * fast second search cannot be overwritten by a slow first one.
 *
 * ```ts
 * const filters = reactive<StudentQuery>({ search: '' })
 * const { data, isPending, error, refresh } = useAsyncData(
 *   () => api.students.list(filters),
 *   { watch: filters },
 * )
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions = {},
): UseAsyncData<T> {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ApiError | null>(null)
  const isPending = ref(false)
  const isInitialLoad = ref(true)

  let latestRun = 0
  let isDisposed = false

  async function refresh(): Promise<void> {
    const run = ++latestRun

    isPending.value = true
    error.value = null

    try {
      const result = await fetcher()

      if (run === latestRun && !isDisposed) {
        data.value = result
        error.value = null
      }
    }
    catch (thrown) {
      if (run === latestRun && !isDisposed)
        error.value = toApiError(thrown)
    }
    finally {
      if (run === latestRun && !isDisposed) {
        isPending.value = false
        isInitialLoad.value = false
      }
    }
  }

  if (options.watch) {
    watch(options.watch as WatchSource, () => void refresh(), { deep: options.deep ?? true })
  }

  if (options.immediate ?? true)
    void refresh()

  onScopeDispose(() => {
    isDisposed = true
  }, true)

  return { data, error, isPending, isInitialLoad, refresh }
}

/**
 * The seam promises to reject with `ApiError` and nothing else, so anything else here is a bug in
 * this app rather than a failure of the request. It is surfaced as `network` so the UI still has
 * something to render, and logged in dev so the real stack is not swallowed.
 */
function toApiError(thrown: unknown): ApiError {
  if (isApiError(thrown))
    return thrown

  if (import.meta.env.DEV)
    console.error('[api] A non-ApiError escaped the seam:', thrown)

  return ApiError.network(thrown instanceof Error ? thrown.message : String(thrown))
}
