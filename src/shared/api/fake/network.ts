import { ApiError } from '../api.error'

/** A fixed delay, or a `[min, max]` range jittered per call so lists do not resolve in lockstep. */
export type LatencySetting = number | readonly [min: number, max: number]

/** The failures worth simulating. `validation` is never injected — real input decides that. */
export type FaultKind = 'network' | 'conflict' | 'notFound'

export interface FakeNetworkOptions {
  latencyMs?: LatencySetting
  /** 0…1. The share of calls that fail with `network` before touching the database. */
  failureRate?: number
  /** Injectable so a test can make failure deterministic. */
  random?: () => number
}

/**
 * The fake's stand-in for the wire.
 *
 * Every repository method awaits `roundTrip()` before doing anything, which is what makes the
 * app's loading and error states real rather than theoretical — and what keeps them from being
 * discovered the day a real backend appears.
 */
export interface FakeNetwork {
  roundTrip: () => Promise<void>
  setLatency: (latencyMs: LatencySetting) => void
  setFailureRate: (rate: number) => void
  /** Fails the very next call, whatever it is. How an error state gets demoed on purpose. */
  failNext: (kind?: FaultKind) => void
  readonly latencyMs: LatencySetting
  readonly failureRate: number
}

export function createFakeNetwork(options: FakeNetworkOptions = {}): FakeNetwork {
  let latencyMs: LatencySetting = options.latencyMs ?? 0
  let failureRate = options.failureRate ?? 0
  let nextFault: FaultKind | null = null
  const random = options.random ?? Math.random

  async function roundTrip(): Promise<void> {
    await delay(resolveLatency(latencyMs, random))

    if (nextFault !== null) {
      const kind = nextFault
      nextFault = null
      throw toError(kind)
    }

    if (failureRate > 0 && random() < failureRate)
      throw ApiError.network()
  }

  return {
    roundTrip,
    setLatency: (next) => { latencyMs = next },
    setFailureRate: (rate) => { failureRate = clamp(rate) },
    failNext: (kind = 'network') => { nextFault = kind },
    get latencyMs() { return latencyMs },
    get failureRate() { return failureRate },
  }
}

function resolveLatency(latency: LatencySetting, random: () => number): number {
  if (typeof latency === 'number')
    return latency

  const [min, max] = latency
  return min + random() * (max - min)
}

function delay(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms))
}

function toError(kind: FaultKind): ApiError {
  if (kind === 'conflict')
    return ApiError.conflict('Injected conflict')

  if (kind === 'notFound')
    return ApiError.notFound('record', 'injected')

  return ApiError.network()
}

function clamp(rate: number): number {
  return Math.min(1, Math.max(0, rate))
}
