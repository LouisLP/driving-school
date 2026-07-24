import type {
  Appointment,
  Enrolment,
  Instructor,
  LicenceClassOffering,
  Location,
  Student,
  Vehicle,
} from '@/shared/domain'
import { seedDatabase } from './seed'

/**
 * Everything the school knows, as plain arrays.
 *
 * The fake holds one of these in memory and mutates it; repositories read and write it
 * synchronously, which is why every query is an ordinary array operation and testable without a
 * single `await`. Persistence is a snapshot of this object and nothing more.
 */
export interface Database {
  students: Student[]
  enrolments: Enrolment[]
  appointments: Appointment[]
  instructors: Instructor[]
  vehicles: Vehicle[]
  locations: Location[]
  offerings: LicenceClassOffering[]
}

export const SNAPSHOT_KEY = 'driving-school/db'

/**
 * Bump whenever the shape of a persisted entity changes. A stored snapshot from an older version
 * is discarded and reseeded rather than migrated — this is seeded demo data, and a migration path
 * would be ceremony protecting nothing.
 */
export const SNAPSHOT_VERSION = 1

interface Snapshot extends Database {
  version: number
}

/**
 * The stored snapshot, or a fresh seed when there is nothing usable — missing key, wrong version,
 * or JSON that no longer parses. Never throws: a corrupt snapshot must not brick the app.
 */
export function loadDatabase(storage: Storage | null = defaultStorage()): Database {
  const stored = readSnapshot(storage)
  return stored ?? seedDatabase()
}

function readSnapshot(storage: Storage | null): Database | null {
  if (!storage)
    return null

  try {
    const raw = storage.getItem(SNAPSHOT_KEY)

    if (raw === null)
      return null

    const snapshot = JSON.parse(raw) as Snapshot

    if (snapshot.version !== SNAPSHOT_VERSION)
      return null

    const { version, ...database } = snapshot
    return database
  }
  catch {
    // Unparseable, or storage is blocked (private mode, disabled cookies). Seed instead.
    return null
  }
}

export function saveDatabase(db: Database, storage: Storage | null = defaultStorage()): void {
  if (!storage)
    return

  try {
    storage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: SNAPSHOT_VERSION, ...db }))
  }
  catch {
    // Quota exceeded or storage blocked. The in-memory database is still the source of truth
    // for this session; losing the snapshot is not worth breaking a write over.
  }
}

/** Drops the snapshot so the next load reseeds. Used by the dev panel's reset. */
export function clearDatabase(storage: Storage | null = defaultStorage()): void {
  storage?.removeItem(SNAPSHOT_KEY)
}

/**
 * A debounced save, so a burst of writes costs one serialisation rather than one each.
 *
 * The fake calls this after every successful write; it knows nothing about `localStorage` beyond
 * the callback it is handed.
 */
export function createSnapshotWriter(
  storage: Storage | null = defaultStorage(),
  delayMs = 250,
): (db: Database) => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  return (db) => {
    clearTimeout(timer)
    timer = setTimeout(saveDatabase, delayMs, db, storage)
  }
}

/**
 * `window.localStorage` rather than the bare global: Node ≥22 defines an unusable `localStorage`
 * global of its own, which shadows jsdom's in tests. Null when storage is missing or blocked —
 * the app then runs entirely in memory rather than failing to boot.
 */
function defaultStorage(): Storage | null {
  try {
    return globalThis.window?.localStorage ?? null
  }
  catch {
    return null
  }
}
