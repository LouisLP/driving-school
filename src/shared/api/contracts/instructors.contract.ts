import type {
  Instructor,
  InstructorId,
  IsoDate,
  LicenceClass,
} from '@/shared/domain'

export interface InstructorQuery {
  /** Matches name or email, case- and diacritic-folded. */
  search?: string
  teachesClass?: LicenceClass
  /** Leavers are hidden unless asked for — their past appointments still reference them. */
  includeFormer?: boolean
}

export type NewInstructor = Omit<Instructor, 'id' | 'employedUntil'>

export type InstructorPatch = Partial<NewInstructor>

export interface InstructorRepository {
  list: (query?: InstructorQuery) => Promise<readonly Instructor[]>
  get: (id: InstructorId) => Promise<Instructor>
  create: (input: NewInstructor) => Promise<Instructor>
  update: (id: InstructorId, patch: InstructorPatch) => Promise<Instructor>
  /**
   * There is no `remove`. An instructor who has ever held an appointment must stay resolvable,
   * so leaving is a date, not a deletion. Rejects with `conflict` if they hold planned
   * appointments after that date.
   */
  retire: (id: InstructorId, on: IsoDate) => Promise<Instructor>
}
