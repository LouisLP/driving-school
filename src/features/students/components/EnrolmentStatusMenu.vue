<script setup lang="ts">
import type { Enrolment, EnrolmentStatus } from '@/shared/domain'
/**
 * The status transitions this enrolment may actually make.
 *
 * The table comes from the seam (`ALLOWED_ENROLMENT_TRANSITIONS`), not from this component: a
 * menu that offered `enquiring → paused` would be a control whose only possible outcome is an
 * `ApiError`, and the seam is the one place that knows what the model allows.
 *
 * This is where the slice's most interesting rule becomes visible. Move a prospect's enrolment to
 * `active` and their standing in the list becomes `active` — with nothing written to a status
 * field anywhere, because there is no status field. Withdraw their only enrolment and they are
 * `lapsed`.
 */
import type { UiMenuItem } from '@/shared/ui'
import { computed, ref } from 'vue'
import { useT } from '@/i18n/use-t'
import { ALLOWED_ENROLMENT_TRANSITIONS, useApi } from '@/shared/api'
import { useToast } from '@/shared/stores/toast.store'
import { UiDropdownMenu } from '@/shared/ui'

const props = defineProps<{ enrolment: Enrolment }>()

const emit = defineEmits<{ changed: [] }>()

const t = useT()
const api = useApi()
const toast = useToast()

const isPending = ref(false)

const transitions = computed<readonly UiMenuItem[]>(() =>
  ALLOWED_ENROLMENT_TRANSITIONS[props.enrolment.status].map(status => ({
    id: status,
    label: t(`students.enrolment.status.${status}`),
    // Withdrawing is terminal — a returning student gets a new enrolment, not this one back.
    destructive: status === 'withdrawn',
  })),
)

async function select(id: string): Promise<void> {
  if (isPending.value)
    return

  isPending.value = true

  try {
    await api.enrolments.setStatus(props.enrolment.id, id as EnrolmentStatus)
    emit('changed')
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : t('shared.errors.conflict'))
  }
  finally {
    isPending.value = false
  }
}
</script>

<template>
  <!--
    A terminal enrolment has no exits at all, so there is nothing to open. Rendering an empty menu
    would be a button that does nothing when pressed.
  -->
  <UiDropdownMenu
    v-if="transitions.length"
    :items="transitions"
    :trigger-label="t('students.enrolment.status.change')"
    @select="select"
  >
    <template #trigger>
      {{ t('students.enrolment.status.label') }}
      <Icon icon="lucide:chevron-down" aria-hidden="true" />
    </template>
  </UiDropdownMenu>
</template>
