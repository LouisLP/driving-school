<script setup lang="ts">
/**
 * A standing as a badge. Used by the list column and by the record header, which is the whole
 * reason it is a component: those two must never disagree about what colour `lapsed` is.
 *
 * The tones are the four status roles from the token layer, and the mapping is an argument:
 *
 * - `active` → success. Training now.
 * - `prospect` → info. Enquired, nothing under way. Neutral would read as "nothing to do here".
 * - `alumnus` → neutral. Finished and gone. Not a warning, and not a success either — passing was
 *   the enrolment's success, and this is just where the person is now.
 * - `lapsed` → warning. Everything withdrawn. The one standing worth noticing in a long list.
 */
import type { StudentStanding } from '@/shared/domain'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { UiBadge } from '@/shared/ui'

const props = defineProps<{ standing: StudentStanding }>()

const t = useT()

const TONES = {
  prospect: 'info',
  active: 'success',
  alumnus: 'neutral',
  lapsed: 'warning',
} as const satisfies Record<StudentStanding, 'neutral' | 'info' | 'success' | 'warning'>

const tone = computed(() => TONES[props.standing])
const label = computed(() => t(`students.standing.${props.standing}`))
</script>

<template>
  <UiBadge :tone="tone" dot>
    {{ label }}
  </UiBadge>
</template>
