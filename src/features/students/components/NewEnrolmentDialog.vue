<script setup lang="ts">
import type { LicenceClass, LicenceClassOffering, PriceList, StudentId } from '@/shared/domain'
/**
 * One select, and the prices that are about to be frozen onto the enrolment.
 *
 * Deliberately one field: `enrolments.create` takes a student and a licence class and nothing
 * else, because everything else — the status, the dates, the copy of the price list — is the
 * seam's to mint. A dialog that offered more would be offering to set things a caller is not
 * allowed to set.
 *
 * The prices are read-only and are shown anyway, with the line saying they are about to be
 * frozen. A student agreeing to a price should be able to see the price, and this is the moment
 * `agreedPrices` is taken.
 */
import type { UiSelectOption } from '@/shared/ui'
import { computed, ref, watch } from 'vue'
import { useT } from '@/i18n/use-t'
import { useApi } from '@/shared/api'
import { useAsyncData } from '@/shared/composables/use-async-data'
import { useFormat } from '@/shared/composables/use-format'
import { UiButton, UiDialog, UiFormField, UiSelect } from '@/shared/ui'

const props = defineProps<{
  studentId: StudentId
  /** Classes the student already holds an open enrolment in. Offering one is a guaranteed conflict. */
  openLicenceClasses: readonly LicenceClass[]
}>()

const emit = defineEmits<{ created: [licenceClass: LicenceClass] }>()

const open = defineModel<boolean>('open', { required: true })

const t = useT()
const api = useApi()
const format = useFormat()

const offerings = useAsyncData(() => api.offerings.list())

const selected = ref<LicenceClass | null>(null)
const isPending = ref(false)
const failure = ref<string | null>(null)

const available = computed<readonly LicenceClassOffering[]>(() =>
  (offerings.data.value ?? []).filter(offering =>
    offering.isOffered && !props.openLicenceClasses.includes(offering.licenceClass),
  ),
)

const options = computed<UiSelectOption<LicenceClass>[]>(() =>
  available.value.map(offering => ({ value: offering.licenceClass, label: offering.licenceClass })),
)

const prices = computed<PriceList | null>(() =>
  available.value.find(it => it.licenceClass === selected.value)?.prices ?? null,
)

/** The five things a price list carries, in the order an enrolment incurs them. */
const PRICE_ROWS = [
  'basicFee',
  'practicalLessonUnit',
  'specialDriveUnit',
  'theoryExamFee',
  'practicalExamFee',
] as const

watch(open, (isOpen) => {
  if (!isOpen)
    return

  failure.value = null
  selected.value = available.value[0]?.licenceClass ?? null
})

// The list arrives after the dialog opens on a cold cache; preselect once it does.
watch(available, (offerings) => {
  if (open.value && selected.value === null)
    selected.value = offerings[0]?.licenceClass ?? null
})

async function submit(): Promise<void> {
  if (!selected.value || isPending.value)
    return

  isPending.value = true
  failure.value = null

  try {
    const created = await api.enrolments.create({
      studentId: props.studentId,
      licenceClass: selected.value,
    })

    open.value = false
    emit('created', created.licenceClass)
  }
  catch (error) {
    failure.value = error instanceof Error ? error.message : t('shared.errors.conflict')
  }
  finally {
    isPending.value = false
  }
}
</script>

<template>
  <UiDialog v-model:open="open" size="sm" :title="t('students.newEnrolment.title')">
    <p v-if="options.length === 0" class="none">
      {{ t('students.newEnrolment.noneAvailable') }}
    </p>

    <template v-else>
      <UiFormField v-slot="field" :label="t('students.newEnrolment.licenceClass')" required>
        <UiSelect v-bind="field" v-model="selected" :options="options" />
      </UiFormField>

      <section v-if="prices" class="prices">
        <h3 class="prices__title">
          {{ t('students.newEnrolment.pricesTitle') }}
        </h3>

        <dl class="prices__list">
          <div v-for="row in PRICE_ROWS" :key="row" class="prices__row">
            <dt>{{ t(`students.prices.${row}`) }}</dt>
            <dd>{{ format.money(prices[row]) }}</dd>
          </div>
        </dl>

        <p class="prices__note">
          {{ t('students.newEnrolment.pricesNote') }}
        </p>
      </section>
    </template>

    <template #footer>
      <p v-if="failure" class="failure" role="alert">
        {{ failure }}
      </p>

      <UiButton variant="ghost" @click="open = false">
        {{ t('shared.actions.cancel') }}
      </UiButton>

      <UiButton
        variant="primary"
        :loading="isPending"
        :disabled="!selected"
        @click="submit"
      >
        {{ t('students.newEnrolment.submit') }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.none {
  color: var(--text-muted);
}

.prices {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-card);
  background: var(--surface-sunken);
}

.prices__title {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

.prices__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  font-size: var(--text-sm);
}

.prices__row dt {
  color: var(--text-secondary);
}

.prices__row dd {
  font-variant-numeric: tabular-nums;
}

.prices__note {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.failure {
  margin-inline-end: auto;
  color: var(--danger-text);
  font-size: var(--text-sm);
}
</style>
