import type { StudentId } from '@/shared/domain'
import { describe, expect, it, vi } from 'vitest'
import {
  createSnapshotWriter,
  loadDatabase,
  saveDatabase,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
} from './database'
import { seedDatabase } from './seed'

/**
 * An in-memory `Storage`, passed in explicitly.
 *
 * Node ≥22 defines a `localStorage` global that shadows jsdom's, so the real one is not reachable
 * under Vitest — but that is a happy accident: injecting storage is what the signatures were
 * designed for, and these tests never touch a global.
 */
function memoryStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() { return entries.size },
    key: index => [...entries.keys()][index] ?? null,
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, String(value)) },
    removeItem: (key) => { entries.delete(key) },
    clear: () => { entries.clear() },
  }
}

describe('database snapshot', () => {
  it('seeds when there is nothing stored', () => {
    expect(loadDatabase(memoryStorage()).students.length).toBeGreaterThan(0)
  })

  it('runs entirely in memory when storage is unavailable', () => {
    expect(loadDatabase(null).students.length).toBeGreaterThan(0)
    expect(() => saveDatabase(seedDatabase(), null)).not.toThrow()
  })

  it('round-trips what it saved', () => {
    const storage = memoryStorage()
    const db = seedDatabase()
    db.students = db.students.filter(it => it.id !== ('stu-01' as StudentId))

    saveDatabase(db, storage)

    expect(loadDatabase(storage).students).toHaveLength(db.students.length)
  })

  it('reseeds rather than migrating when the version moves', () => {
    const storage = memoryStorage()
    const db = seedDatabase()
    db.students = []
    storage.setItem(SNAPSHOT_KEY, JSON.stringify({ ...db, version: SNAPSHOT_VERSION + 1 }))

    expect(loadDatabase(storage).students.length).toBeGreaterThan(0)
  })

  it('reseeds rather than throwing on a corrupt snapshot', () => {
    const storage = memoryStorage()
    storage.setItem(SNAPSHOT_KEY, '{ not json')

    expect(loadDatabase(storage).students.length).toBeGreaterThan(0)
  })

  it('survives a storage that refuses to write', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    expect(() => saveDatabase(seedDatabase(), storage)).not.toThrow()
  })

  it('collapses a burst of writes into one save', () => {
    vi.useFakeTimers()
    const storage = memoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const write = createSnapshotWriter(storage, 250)
    const db = seedDatabase()

    write(db)
    write(db)
    write(db)
    vi.advanceTimersByTime(250)

    expect(setItem).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
