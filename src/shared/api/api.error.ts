/**
 * The single failure type crossing the seam.
 *
 * Repositories reject; they never return a failure value. The `kind` is what callers branch on,
 * and it is chosen to map cleanly onto the HTTP statuses a real backend would send:
 *
 * | kind         | HTTP | meaning                                                |
 * | ------------ | ---- | ------------------------------------------------------ |
 * | `notFound`   | 404  | no such record                                          |
 * | `validation` | 422  | the input is malformed — `fieldErrors` says where       |
 * | `conflict`   | 409  | the input is well-formed but the state forbids it       |
 * | `network`    | —    | the request never got an answer                         |
 */
export type ApiErrorKind = 'notFound' | 'validation' | 'conflict' | 'network'

export class ApiError extends Error {
  readonly kind: ApiErrorKind

  /**
   * Message keys per field, present on `validation` and nowhere else. Untyped here because the
   * error crosses every entity's boundary; the caller narrows it against its own input type.
   */
  readonly fieldErrors: Readonly<Record<string, string>> | undefined

  private constructor(
    kind: ApiErrorKind,
    message: string,
    fieldErrors?: Readonly<Record<string, string>>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.fieldErrors = fieldErrors
  }

  static notFound(entity: string, id: string): ApiError {
    return new ApiError('notFound', `No ${entity} with id ${id}`)
  }

  static validation(fieldErrors: Readonly<Record<string, string>>): ApiError {
    return new ApiError(
      'validation',
      `Invalid input: ${Object.keys(fieldErrors).join(', ')}`,
      fieldErrors,
    )
  }

  /** The request was well-formed; the current state of the school forbids it. */
  static conflict(message: string): ApiError {
    return new ApiError('conflict', message)
  }

  static network(message = 'The request could not be completed'): ApiError {
    return new ApiError('network', message)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
