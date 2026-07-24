<script setup lang="ts">
/**
 * The destructive confirm.
 *
 * `UiAlertDialog`, so it does not dismiss on an outside click and focus lands on Cancel. The
 * student is named in the body, because "are you sure?" over a list of three hundred people is a
 * question nobody can answer.
 *
 * On `conflict` it shows the seam's own reason rather than the generic message: "this student has
 * enrolments" is actionable and "that is not possible right now" is not. The record page also
 * disables the menu item for exactly this case — this is the second line of defence, and it is
 * needed because the list has no enrolment counts to disable on.
 */
import type { StudentId } from '@/shared/domain'
import { ref, watch } from 'vue'
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { UiAlertDialog } from '@/shared/ui'

const props = defineProps<{
  studentId: StudentId | null
  name: string
}>()

const emit = defineEmits<{ deleted: [name: string] }>()

const open = defineModel<boolean>('open', { required: true })

const t = useT()
const api = useApi()

const isPending = ref(false)
const failure = ref<string | null>(null)

watch(open, (isOpen) => {
  if (isOpen)
    failure.value = null
})

async function confirm(): Promise<void> {
  if (!props.studentId || isPending.value)
    return

  isPending.value = true

  try {
    await api.students.remove(props.studentId)
    open.value = false
    emit('deleted', props.name)
  }
  catch (error) {
    // The seam's message, not ours: it knows how many enrolments there are and we do not.
    failure.value = error instanceof Error ? error.message : t('shared.errors.conflict')
  }
  finally {
    isPending.value = false
  }
}
</script>

<template>
  <UiAlertDialog
    v-model:open="open"
    :title="t('students.delete.title')"
    :description="t('students.delete.body', { name })"
    :confirm-label="t('shared.actions.delete')"
    :cancel-label="t('shared.actions.cancel')"
    :pending="isPending"
    @confirm="confirm"
  >
    <p v-if="failure" class="failure" role="alert">
      {{ failure }}
    </p>
  </UiAlertDialog>
</template>

<style scoped>
.failure {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-control);
  background: var(--danger-subtle);
  color: var(--danger-text);
  font-size: var(--text-sm);
}
</style>
