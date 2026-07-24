import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { ApiError } from '@/shared/api'
import { useAsyncData } from './use-async-data'

/** `useAsyncData` registers a scope disposal hook, so it needs one to live in. */
function inScope<T>(run: () => T): T {
  return effectScope().run(run)!
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('useAsyncData', () => {
  it('exposes the resolved value and clears the pending flag', async () => {
    const { data, isPending, isInitialLoad } = inScope(() => useAsyncData(async () => 'ok'))

    expect(isPending.value).toBe(true)
    expect(isInitialLoad.value).toBe(true)

    await nextTick()
    await nextTick()

    expect(data.value).toBe('ok')
    expect(isPending.value).toBe(false)
    expect(isInitialLoad.value).toBe(false)
  })

  it('captures an ApiError instead of rejecting', async () => {
    const { data, error } = inScope(() =>
      useAsyncData(() => Promise.reject(ApiError.notFound('student', 'stu-99'))),
    )

    await nextTick()
    await nextTick()

    expect(error.value?.kind).toBe('notFound')
    expect(data.value).toBeNull()
  })

  it('drops a stale run so a slow first fetch cannot overwrite a fast second', async () => {
    const slow = deferred<string>()
    const fast = deferred<string>()
    const queue = [slow.promise, fast.promise]

    const { data, refresh } = inScope(() =>
      useAsyncData(() => queue.shift() ?? Promise.resolve('exhausted')),
    )

    void refresh()
    fast.resolve('second')
    await nextTick()
    slow.resolve('first')
    await nextTick()
    await nextTick()

    expect(data.value).toBe('second')
  })

  it('re-fetches when a watched filter changes', async () => {
    const filters = reactive({ search: '' })
    let calls = 0

    inScope(() => useAsyncData(
      async () => {
        calls += 1
        return filters.search
      },
      { watch: filters },
    ))

    await nextTick()
    filters.search = 'mül'
    await nextTick()
    await nextTick()

    expect(calls).toBe(2)
  })

  it('clears a previous error once a retry succeeds', async () => {
    let shouldFail = true
    const { error, refresh } = inScope(() => useAsyncData(async () => {
      if (shouldFail)
        throw ApiError.network()

      return 'ok'
    }))

    await nextTick()
    await nextTick()
    expect(error.value).not.toBeNull()

    shouldFail = false
    await refresh()

    expect(error.value).toBeNull()
  })
})
