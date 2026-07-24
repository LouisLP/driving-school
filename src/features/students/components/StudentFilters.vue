<script setup lang="ts">
/**
 * The list toolbar: search, standing, class, and a clear that only appears when there is
 * something to clear.
 *
 * Bound to the query's `draft` rather than to its committed state, so typing is immediate while
 * the URL and the fetch follow 250 ms behind — the split `useListQuery` exists to make possible.
 */
import type { LicenceClass, StudentStanding } from '@/shared/domain'
import type { UiSelectOption } from '@/shared/ui'
import { computed } from 'vue'
import { useT } from '@/i18n/use-t'
import { UiButton, UiSelect, UiTextField } from '@/shared/ui'

const props = defineProps<{
  standings: readonly StudentStanding[]
  offeredClasses: readonly LicenceClass[]
  isFiltered: boolean
}>()

defineEmits<{ clear: [] }>()
/**
 * One model per control rather than one object. The query's `draft` belongs to `useListQuery`,
 * and writing into it through a prop would make this component a co-owner of state it does not
 * own — which is what `vue/no-mutating-props` is there to catch.
 */
const search = defineModel<string>('search', { required: true })
const standing = defineModel<StudentStanding | null>('standing', { required: true })
const licenceClass = defineModel<LicenceClass | null>('licenceClass', { required: true })

const t = useT()

/** "Any" is a real choice, and `null` is how it travels — see `UiSelect`. */
const standingOptions = computed<UiSelectOption<StudentStanding>[]>(() => [
  { value: null, label: t('students.filters.any') },
  ...props.standings.map(standing => ({
    value: standing,
    label: t(`students.standing.${standing}`),
  })),
])

const classOptions = computed<UiSelectOption<LicenceClass>[]>(() => [
  { value: null, label: t('students.filters.any') },
  ...props.offeredClasses.map(licenceClass => ({ value: licenceClass, label: licenceClass })),
])
</script>

<template>
  <div class="filters">
    <UiTextField
      v-model="search"
      class="filters__search"
      type="search"
      icon="lucide:search"
      :aria-label="t('students.list.searchLabel')"
      :placeholder="t('students.list.searchPlaceholder')"
    />

    <UiSelect
      v-model="standing"
      class="filters__select"
      :options="standingOptions"
      :aria-label="t('students.filters.standing')"
      :placeholder="t('students.filters.standing')"
    />

    <UiSelect
      v-model="licenceClass"
      class="filters__select"
      :options="classOptions"
      :aria-label="t('students.filters.licenceClass')"
      :placeholder="t('students.filters.licenceClass')"
    />

    <!-- Nothing set means nothing to clear; a permanently visible button is one more thing to read. -->
    <UiButton v-if="isFiltered" variant="ghost" size="sm" @click="$emit('clear')">
      <Icon icon="lucide:x" aria-hidden="true" />
      {{ t('students.filters.clear') }}
    </UiButton>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.filters__search {
  inline-size: 20rem;
  max-inline-size: 100%;
}

.filters__select {
  inline-size: 10rem;
}
</style>
