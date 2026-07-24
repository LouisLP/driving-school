import type { Ref } from 'vue'
import type { FieldErrors } from '@/shared/domain'
import { computed, reactive, ref, shallowRef } from 'vue'
import { ApiError, isApiError } from '@/shared/api'

/** Any field name of the thing being edited. Closed, so a typo in a template is a type error. */
export type FieldOf<T> = keyof T & string

/**
 * The rule a form is checked against: the exact signature every `*.validation.ts` in
 * `shared/domain` already has.
 *
 * That is the whole reason there is no schema library here. The fake API calls these same
 * validators on every write, so the seam is authoritative like a server; adopting a schema library
 * for forms would mean either putting it in the domain layer to express rules that are eleven
 * lines of pure TypeScript, or writing each rule twice and watching the two drift. See
 * `docs/students-slice.md`, decision 5.
 */
export type Validate<T> = (input: T) => FieldErrors<T> | null

export interface UseForm<T extends object> {
  /** Bind controls to this. Mutating it is how a form is filled in. */
  values: T
  /** Only the errors that should be *shown* — see the timing rule below. */
  errors: Readonly<Ref<FieldErrors<T>>>
  /** True while `submit` is in flight. What the submit button disables on. */
  isPending: Readonly<Ref<boolean>>
  /** True when the values differ from where they started. What the discard prompt keys on. */
  isDirty: Readonly<Ref<boolean>>
  /** True when the validator is happy, whether or not anything has been touched yet. */
  isValid: Readonly<Ref<boolean>>
  /**
   * The failure from the last submit that was *not* per-field — a conflict, a network drop.
   * Field-level failures land in `errors` instead, which is the point of the merge.
   */
  submitError: Readonly<Ref<ApiError | null>>
  /**
   * The field a failed submit should move focus to, or null. Bumped on every failure so a
   * repeated failure on the same field still moves focus.
   */
  focusField: Readonly<Ref<FieldOf<T> | null>>
  /** Call on blur. Until a field has been blurred once, its error stays hidden. */
  touch: (field: FieldOf<T>) => void
  /** Runs the validator, then the request. Returns null when either says no. */
  submit: <R>(request: (values: T) => Promise<R>) => Promise<R | null>
  /** Back to the given values (or the originals), with every error and touch forgotten. */
  reset: (next?: T) => void
}

/**
 * One form's state: the values, when to show which error, and what a rejected write does.
 *
 * ── When an error becomes visible ──────────────────────────────────────────
 *
 * On blur per field, then on every change once that field has been blurred once, plus a full pass
 * on submit. Not on the first keystroke: telling someone their email is invalid while they type
 * the second character is noise, and noise is what teaches people to ignore the red text.
 *
 * ── What a rejected write does ─────────────────────────────────────────────
 *
 * `ApiError` of kind `validation` carries `fieldErrors` in the same `FieldErrors<T>` shape the
 * validator produces, so a server-only rule — a duplicate email, a conflict the client cannot
 * see — merges into the same error map and lands on the same control. No second code path, and
 * nothing in the dialog has to know which side said no.
 *
 * A merged server error survives until that field is edited: it is an answer about one specific
 * value, so it stops being true the moment the value changes and stays true while it does not.
 */
export function useForm<T extends object>(initial: T, validate: Validate<T>): UseForm<T> {
  const values = reactive(structuredClone(initial)) as T

  const touched = reactive<Record<string, boolean>>({})
  const hasSubmitted = ref(false)
  const isPending = ref(false)
  const submitError = ref<ApiError | null>(null)
  // Annotated rather than inferred: `shallowRef<FieldOf<T>>` widens to `string` under a generic.
  const focusField: Ref<FieldOf<T> | null> = shallowRef(null)

  /** Errors the seam reported, and the values they were reported about. */
  const serverErrors = ref<FieldErrors<T>>({})
  let serverValues: T | null = null

  let original = structuredClone(initial)

  /** A plain, detached copy — what crosses the seam, and what a server error is remembered at. */
  function snapshot(): T {
    return toPlain(values)
  }

  const validationErrors = computed<FieldErrors<T>>(() => validate(values) ?? {})

  const isValid = computed(() => Object.keys(validationErrors.value).length === 0)

  const isDirty = computed(() => !isSameValue(values, original))

  /** A server error is about one value; editing that value retires it. */
  const liveServerErrors = computed<FieldErrors<T>>(() => {
    const reported = serverErrors.value
    const at = serverValues

    if (!at)
      return {}

    return Object.fromEntries(
      Object.entries(reported).filter(([field]) =>
        isSameValue(values[field as FieldOf<T>], at[field as FieldOf<T>]),
      ),
    ) as FieldErrors<T>
  })

  const errors = computed<FieldErrors<T>>(() => {
    const visible = Object.fromEntries(
      Object.entries(validationErrors.value)
        .filter(([field]) => hasSubmitted.value || touched[field]),
    ) as FieldErrors<T>

    // The seam wins: it knows things the client cannot check.
    return { ...visible, ...liveServerErrors.value }
  })

  function touch(field: FieldOf<T>): void {
    touched[field] = true
  }

  function firstField(errors: FieldErrors<T>): FieldOf<T> | null {
    // Object key order is insertion order, and `toFieldErrors` builds them in field order — so
    // "the first offending control" means the first one on the form.
    return (Object.keys(errors)[0] as FieldOf<T> | undefined) ?? null
  }

  async function submit<R>(request: (values: T) => Promise<R>): Promise<R | null> {
    // A double-click must not send the write twice; the button is disabled too, but a disabled
    // button is a rendering detail and this is the rule.
    if (isPending.value)
      return null

    hasSubmitted.value = true
    submitError.value = null
    serverErrors.value = {}
    serverValues = null
    focusField.value = null

    const invalid = validate(values)

    if (invalid) {
      focusField.value = firstField(invalid)
      return null
    }

    isPending.value = true

    try {
      return await request(snapshot())
    }
    catch (thrown) {
      const error = toApiError(thrown)

      if (error.kind === 'validation' && error.fieldErrors) {
        serverErrors.value = error.fieldErrors as FieldErrors<T>
        serverValues = snapshot()
        focusField.value = firstField(serverErrors.value)
      }
      else {
        submitError.value = error
      }

      return null
    }
    finally {
      isPending.value = false
    }
  }

  function reset(next: T = original): void {
    original = toPlain(next)
    Object.assign(values, toPlain(original))

    for (const field of Object.keys(touched))
      delete touched[field]

    hasSubmitted.value = false
    submitError.value = null
    serverErrors.value = {}
    serverValues = null
    focusField.value = null
  }

  return {
    values,
    errors,
    isPending,
    isDirty,
    isValid,
    submitError,
    focusField,
    touch,
    submit,
    reset,
  }
}

/**
 * Structural equality by serialisation. The values in a form are plain JSON — strings, nulls and
 * one nested address object — so this is exact for everything this composable is handed, and one
 * line instead of a dependency.
 */
function isSameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(toPlain(a)) === JSON.stringify(toPlain(b))
}

/** Strips Vue's reactive proxy, so what goes over the seam is an ordinary object. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** The seam only ever rejects with `ApiError`; anything else is a bug in this app, not a refusal. */
function toApiError(thrown: unknown): ApiError {
  if (isApiError(thrown))
    return thrown

  if (import.meta.env.DEV)
    console.error('[form] A non-ApiError escaped the seam:', thrown)

  return ApiError.network(thrown instanceof Error ? thrown.message : String(thrown))
}
