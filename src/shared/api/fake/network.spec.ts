import { describe, expect, it } from 'vitest'
import { isApiError } from '../api.error'
import { createFakeNetwork } from './network'

async function failureOf(promise: Promise<unknown>) {
  const result = await promise.catch((error: unknown) => error)
  return isApiError(result) ? result : null
}

describe('fake network', () => {
  it('fails every call at a failure rate of 1', async () => {
    const network = createFakeNetwork({ failureRate: 1 })

    expect((await failureOf(network.roundTrip()))?.kind).toBe('network')
  })

  it('fails no call at a failure rate of 0', async () => {
    const network = createFakeNetwork({ failureRate: 0, random: () => 0 })

    await expect(network.roundTrip()).resolves.toBeUndefined()
  })

  it('fails only the next call after failNext, then recovers', async () => {
    const network = createFakeNetwork()
    network.failNext('conflict')

    expect((await failureOf(network.roundTrip()))?.kind).toBe('conflict')
    await expect(network.roundTrip()).resolves.toBeUndefined()
  })

  it('clamps the failure rate to 0…1', () => {
    const network = createFakeNetwork()

    network.setFailureRate(4)
    expect(network.failureRate).toBe(1)

    network.setFailureRate(-1)
    expect(network.failureRate).toBe(0)
  })
})
