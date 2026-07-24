<script setup lang="ts">
/**
 * What the student owes, from one call.
 *
 * `billing.studentBalance` already sums across every enrolment and returns the per-enrolment rows
 * the cards reuse, so the total at the top and its parts on the cards below cannot disagree —
 * there is only one calculation.
 *
 * `overdue` is hidden when it is zero and takes the danger role when it is not. A permanent
 * "€ 0,00 overdue" row trains people to stop reading the panel, which is precisely the row you
 * want read on the day it is not zero.
 *
 * Read-only. **Record payment** and the link into Finances are links, because Finances owns
 * money — building an invoice-draft preview here would be building most of Finances in the wrong
 * folder. See `docs/students-slice.md`, decision 8.
 */
import type { ApiError } from '@/shared/api'
import type { StudentBalance } from '@/shared/domain'
import { useT } from '@/i18n/use-t'
import { ROUTE } from '@/router/route-names'
import { useFormat } from '@/shared/composables/use-format'
import { isPositive } from '@/shared/domain'
import { UiCard, UiErrorState, UiSkeleton } from '@/shared/ui'

defineProps<{
  balance: StudentBalance | null
  isLoading: boolean
  error: ApiError | null
}>()

defineEmits<{ retry: [] }>()

const t = useT()
const format = useFormat()
</script>

<template>
  <UiCard :title="t('students.detail.account')">
    <!-- A failed balance degrades inside the panel; the rest of the record still renders. -->
    <UiErrorState
      v-if="error"
      :title="t('students.error.account')"
      :description="t(`shared.errors.${error.kind}`)"
      :retry-label="t('shared.actions.retry')"
      @retry="$emit('retry')"
    />

    <div v-else-if="isLoading || !balance" class="skeletons">
      <UiSkeleton width="60%" />
      <UiSkeleton width="45%" />
    </div>

    <template v-else>
      <dl class="amounts">
        <div class="amounts__row">
          <dt>{{ t('students.detail.outstanding') }}</dt>
          <dd class="amounts__value">
            {{ format.money(balance.outstanding) }}
          </dd>
        </div>

        <div v-if="isPositive(balance.overdue)" class="amounts__row amounts__row--overdue">
          <dt>{{ t('students.detail.overdue') }}</dt>
          <dd class="amounts__value">
            {{ format.money(balance.overdue) }}
          </dd>
        </div>

        <div class="amounts__row">
          <dt>{{ t('students.detail.uninvoiced') }}</dt>
          <dd class="amounts__value">
            {{ format.money(balance.uninvoiced) }}
          </dd>
        </div>
      </dl>

      <RouterLink class="link" :to="{ name: ROUTE.financesDebtors }">
        {{ t('students.detail.viewInFinances') }}
        <Icon icon="lucide:arrow-right" aria-hidden="true" />
      </RouterLink>
    </template>
  </UiCard>
</template>

<style scoped>
.skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.amounts {
  display: flex;
  flex-direction: column;
}

.amounts__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  padding-block: var(--space-xs);
  font-size: var(--text-sm);
}

.amounts__row + .amounts__row {
  border-block-start: var(--border-width-hairline) solid var(--border-subtle);
}

.amounts__row dt {
  color: var(--text-muted);
}

.amounts__value {
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-medium);
}

.amounts__row--overdue dt,
.amounts__row--overdue .amounts__value {
  color: var(--danger-text);
}

.link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  align-self: flex-end;
  font-size: var(--text-sm);
}
</style>
