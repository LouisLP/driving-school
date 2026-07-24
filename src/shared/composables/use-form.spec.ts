import type { FieldErrors } from '@/shared/domain'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ApiError } from '@/shared/api'
import { toFieldErrors } from '@/shared/domain'
import { useForm } from './use-form'

interface Contact {
  firstName: string
  email: string | null
}

const INITIAL: Contact = { firstName: '', email: null }

function validate(input: Contact): FieldErrors<Contact> | null {
  return toFieldErrors<Contact>({
    firstName: input.firstName.trim() ? null : 'shared.validation.required',
    email: input.email !== null && !input.email.includes('@')
      ? 'shared.validation.invalidEmail'
      : null,
  })
}

function createForm(initial: Contact = INITIAL) {
  return useForm(initial, validate)
}

describe('when an error becomes visible', () => {
  it('shows nothing while a field has never been blurred', async () => {
    const form = createForm()

    form.values.email = 'not-an-email'
    await nextTick()

    expect(form.errors.value).toEqual({})
  })

  it('shows a field\'s error once it has been blurred', () => {
    const form = createForm()

    form.values.email = 'not-an-email'
    form.touch('email')

    expect(form.errors.value.email).toBe('shared.validation.invalidEmail')
  })

  it('keeps a blurred field live, so a fix clears the message as it is typed', () => {
    const form = createForm()

    form.values.email = 'not-an-email'
    form.touch('email')
    form.values.email = 'lena@example.de'

    expect(form.errors.value.email).toBeUndefined()
  })

  it('shows every error on submit, blurred or not', async () => {
    const form = createForm()
    const request = vi.fn()

    form.values.email = 'not-an-email'
    await form.submit(request)

    expect(form.errors.value).toEqual({
      firstName: 'shared.validation.required',
      email: 'shared.validation.invalidEmail',
    })
    expect(request).not.toHaveBeenCalled()
  })

  it('names the first offending control so focus can be moved to it', async () => {
    const form = createForm()

    await form.submit(vi.fn())

    expect(form.focusField.value).toBe('firstName')
  })
})

describe('dirty tracking', () => {
  it('starts clean, so dismissing an untouched form asks nothing', () => {
    expect(createForm().isDirty.value).toBe(false)
  })

  it('is dirty once a value differs from where it started', () => {
    const form = createForm()

    form.values.firstName = 'Lena'

    expect(form.isDirty.value).toBe(true)
  })

  it('is clean again when the value is typed back to what it was', () => {
    const form = createForm({ firstName: 'Lena', email: null })

    form.values.firstName = 'Len'
    form.values.firstName = 'Lena'

    expect(form.isDirty.value).toBe(false)
  })

  it('takes the new values as the baseline on reset', () => {
    const form = createForm()

    form.values.firstName = 'Lena'
    form.touch('email')
    form.reset({ firstName: 'Jonas', email: 'jonas@example.de' })

    expect(form.values).toEqual({ firstName: 'Jonas', email: 'jonas@example.de' })
    expect(form.isDirty.value).toBe(false)
    expect(form.errors.value).toEqual({})
  })
})

describe('submitting', () => {
  it('hands the request a plain detached copy, not the reactive object', async () => {
    const form = createForm({ firstName: 'Lena', email: null })
    const request = vi.fn().mockResolvedValue('ok')

    const result = await form.submit(request)

    expect(result).toBe('ok')

    const sent = request.mock.calls[0]?.[0] as Contact
    form.values.firstName = 'Changed'

    expect(sent.firstName).toBe('Lena')
  })

  it('locks out a second submit while the first is in flight', async () => {
    const form = createForm({ firstName: 'Lena', email: null })
    let release = (): void => {}
    const request = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
    })

    const first = form.submit(request)
    await nextTick()

    expect(form.isPending.value).toBe(true)
    expect(await form.submit(request)).toBeNull()

    release()
    await first

    expect(request).toHaveBeenCalledTimes(1)
    expect(form.isPending.value).toBe(false)
  })
})

describe('a rejected write', () => {
  it('merges the seam\'s field errors into the same map the validator fills', async () => {
    const form = createForm({ firstName: 'Lena', email: 'taken@example.de' })

    await form.submit(async () => {
      throw ApiError.validation({ email: 'shared.validation.invalidEmail' })
    })

    // The client cannot know this email is taken; the error still lands on the email control.
    expect(form.errors.value.email).toBe('shared.validation.invalidEmail')
    expect(form.focusField.value).toBe('email')
    expect(form.submitError.value).toBeNull()
  })

  it('retires a merged error as soon as that field is edited', async () => {
    const form = createForm({ firstName: 'Lena', email: 'taken@example.de' })

    await form.submit(async () => {
      throw ApiError.validation({ email: 'shared.validation.invalidEmail' })
    })
    form.values.email = 'free@example.de'

    expect(form.errors.value.email).toBeUndefined()
  })

  it('keeps a merged error while a different field is edited', async () => {
    const form = createForm({ firstName: 'Lena', email: 'taken@example.de' })

    await form.submit(async () => {
      throw ApiError.validation({ email: 'shared.validation.invalidEmail' })
    })
    form.values.firstName = 'Lena B.'

    expect(form.errors.value.email).toBe('shared.validation.invalidEmail')
  })

  it('surfaces a non-field failure separately, for the dialog footer', async () => {
    const form = createForm({ firstName: 'Lena', email: null })

    await form.submit(async () => {
      throw ApiError.conflict('Already enrolled')
    })

    expect(form.submitError.value?.kind).toBe('conflict')
    expect(form.errors.value).toEqual({})
  })

  it('clears the previous failure when the form is submitted again', async () => {
    const form = createForm({ firstName: 'Lena', email: null })

    await form.submit(async () => {
      throw ApiError.conflict('Already enrolled')
    })
    await form.submit(async () => 'ok')

    expect(form.submitError.value).toBeNull()
  })
})
