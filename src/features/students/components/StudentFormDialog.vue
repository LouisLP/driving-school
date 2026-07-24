<script setup lang="ts">
/**
 * Create and edit, in one dialog.
 *
 * A student is nine fields. A route for it is ceremony: it needs a dirty-navigation guard this
 * does not, and it loses the list's filters and scroll position on the way out and back. The only
 * differences between creating and editing are the title, the submit label, and whether the
 * request is `create` or `update` — which is not two components' worth of difference. See
 * `docs/students-slice.md`, decision 4.
 *
 * What happens on a rejected write is `useForm`'s: a `validation` failure merges into the same
 * error map the live validator fills and lands on the same control, and anything else renders in
 * the footer. This component only decides where focus goes afterwards.
 */
import type { StudentFormValues } from '../composables/use-student-form'
import type { MessageKey } from '@/i18n/use-t'
import type { Student } from '@/shared/domain'
import { computed, ref, watch } from 'vue'
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { UiAlertDialog, UiButton, UiDateField, UiDialog, UiFormField, UiTextArea, UiTextField } from '@/shared/ui'
import {
  emptyStudentForm,
  toNewStudent,
  toStudentForm,
  useStudentForm,
} from '../composables/use-student-form'

const props = defineProps<{
  /** Absent means create. Present means edit that student. */
  student?: Student | null
}>()

const emit = defineEmits<{ saved: [student: Student, wasCreated: boolean] }>()

const open = defineModel<boolean>('open', { required: true })

const t = useT()
const api = useApi()

const form = useStudentForm(emptyStudentForm())

const isEdit = computed(() => Boolean(props.student))
const isDiscardOpen = ref(false)
const root = ref<HTMLElement | null>(null)

/** Reset on open rather than on close: the dialog is unmounted-but-alive between uses. */
watch(open, (isOpen) => {
  if (isOpen)
    form.reset(props.student ? toStudentForm(props.student) : emptyStudentForm())
})

/**
 * A rejected write names the control it was about, and the person needs to be looking at it. The
 * lookup is by `name`, which is why every control below carries one even though the form is not
 * submitted natively.
 */
watch(form.focusField, (field) => {
  if (!field)
    return

  const control = root.value?.querySelector<HTMLElement>(`[name="${field}"]`)
  control?.focus()
})

/**
 * Validators are locale-blind and produce message keys, never prose — so the translation happens
 * here, at the only edge that has a locale. The cast is the one place that asserts the domain's
 * `VALIDATION_KEYS` are real message keys, which `shared/i18n` guarantees and the parity test
 * enforces.
 */
function label(field: keyof StudentFormValues): string | undefined {
  const key = form.errors.value[field]
  return key ? t(key as MessageKey) : undefined
}

async function submit(): Promise<void> {
  const saved = await form.submit(values => (props.student
    ? api.students.update(props.student.id, toNewStudent(values))
    : api.students.create(toNewStudent(values))))

  if (!saved)
    return

  open.value = false
  emit('saved', saved, !props.student)
}

/** A clean form closes silently; a dirty one asks first. */
function onDismiss(): void {
  if (form.isDirty.value)
    isDiscardOpen.value = true
  else
    open.value = false
}

function discard(): void {
  isDiscardOpen.value = false
  open.value = false
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="isEdit ? t('students.form.editTitle') : t('students.form.createTitle')"
    :dismissible="!form.isDirty.value"
    @dismiss="onDismiss"
  >
    <form ref="root" class="form" novalidate @submit.prevent="submit">
      <div class="form__row">
        <UiFormField v-slot="field" :label="t('students.fields.firstName')" required :error="label('firstName')">
          <UiTextField
            v-bind="field"
            v-model="form.values.firstName"
            name="firstName"
            @blur="form.touch('firstName')"
          />
        </UiFormField>

        <UiFormField v-slot="field" :label="t('students.fields.lastName')" required :error="label('lastName')">
          <UiTextField
            v-bind="field"
            v-model="form.values.lastName"
            name="lastName"
            @blur="form.touch('lastName')"
          />
        </UiFormField>
      </div>

      <UiFormField v-slot="field" :label="t('students.fields.dateOfBirth')" required :error="label('dateOfBirth')">
        <UiDateField
          v-bind="field"
          v-model="form.values.dateOfBirth"
          name="dateOfBirth"
          @focusout="form.touch('dateOfBirth')"
        />
      </UiFormField>

      <div class="form__row">
        <UiFormField v-slot="field" :label="t('students.fields.email')" :error="label('email')">
          <UiTextField
            v-bind="field"
            v-model="form.values.email"
            type="email"
            name="email"
            @blur="form.touch('email')"
          />
        </UiFormField>

        <UiFormField v-slot="field" :label="t('students.fields.phone')" :error="label('phone')">
          <UiTextField
            v-bind="field"
            v-model="form.values.phone"
            type="tel"
            name="phone"
            @blur="form.touch('phone')"
          />
        </UiFormField>
      </div>

      <!--
        One error against the group, because that is how `validateStudent` reports it — and it
        reports it that way deliberately, to keep form layout out of the domain.
      -->
      <UiFormField
        :label="t('students.form.addressLegend')"
        group
        :error="label('address')"
      >
        <div class="form__address">
          <UiFormField v-slot="field" class="form__street" :label="t('students.fields.street')">
            <UiTextField
              v-bind="field"
              v-model="form.values.address.street"
              name="address"
              @blur="form.touch('address')"
            />
          </UiFormField>

          <UiFormField v-slot="field" :label="t('students.fields.houseNumber')">
            <UiTextField
              v-bind="field"
              v-model="form.values.address.houseNumber"
              @blur="form.touch('address')"
            />
          </UiFormField>

          <UiFormField v-slot="field" :label="t('students.fields.postalCode')">
            <UiTextField
              v-bind="field"
              v-model="form.values.address.postalCode"
              @blur="form.touch('address')"
            />
          </UiFormField>

          <UiFormField v-slot="field" class="form__city" :label="t('students.fields.city')">
            <UiTextField
              v-bind="field"
              v-model="form.values.address.city"
              @blur="form.touch('address')"
            />
          </UiFormField>

          <UiFormField v-slot="field" :label="t('students.fields.countryCode')">
            <UiTextField
              v-bind="field"
              v-model="form.values.address.countryCode"
              @blur="form.touch('address')"
            />
          </UiFormField>
        </div>
      </UiFormField>

      <UiFormField v-slot="field" :label="t('students.fields.notes')" :hint="t('students.form.notesHint')">
        <UiTextArea v-bind="field" v-model="form.values.notes" name="notes" />
      </UiFormField>
    </form>

    <template #footer>
      <p v-if="form.submitError.value" class="form__failure" role="alert">
        {{ t(`shared.errors.${form.submitError.value.kind}`) }}
      </p>

      <UiButton variant="ghost" @click="onDismiss">
        {{ t('shared.actions.cancel') }}
      </UiButton>

      <UiButton variant="primary" :loading="form.isPending.value" @click="submit">
        {{ isEdit ? t('students.form.submitEdit') : t('students.form.submitCreate') }}
      </UiButton>
    </template>
  </UiDialog>

  <UiAlertDialog
    v-model:open="isDiscardOpen"
    tone="neutral"
    :title="t('shared.form.discardTitle')"
    :description="t('shared.form.discardBody')"
    :confirm-label="t('shared.form.discardConfirm')"
    :cancel-label="t('shared.form.keepEditing')"
    @confirm="discard"
  />
</template>

<style scoped>
/* The address grid collapses on the container, not the viewport: a dialog is narrow wherever it
   is opened. #4 settled that container queries are the default and media queries are the shell's. */
.form {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  gap: var(--space-md);
}

.form__address {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-sm);
}

.form__street {
  grid-column: span 3;
}

.form__city {
  grid-column: span 2;
}

@container (width < 30rem) {
  .form__address {
    grid-template-columns: minmax(0, 1fr);
  }

  .form__street,
  .form__city {
    grid-column: auto;
  }
}

.form__failure {
  margin-inline-end: auto;
  color: var(--danger-text);
  font-size: var(--text-sm);
}
</style>
