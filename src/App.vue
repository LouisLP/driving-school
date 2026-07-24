<script setup lang="ts">
// Temporary: proves the i18n wiring and the fake-API seam end-to-end in the browser.
// Replaced by the real app shell (issue #7) and the Students slice (issue #8).
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from './i18n'
import { useT } from './i18n/use-t'
import { useApi } from './shared/api'
import { useAsyncData } from './shared/composables/use-async-data'
import ApiDevPanel from './shared/dev/ApiDevPanel.vue'

const { locale } = useI18n()
const t = useT()

const api = useApi()
const { data, isPending, error, refresh } = useAsyncData(
  () => api.students.list({ pageSize: 5 }),
)
</script>

<template>
  <main>
    <h1>{{ t('dashboard.title') }}</h1>

    <section>
      <h2>{{ t('students.list.title') }}</h2>

      <p v-if="isPending">
        {{ t('shared.states.loading') }}
      </p>

      <div v-else-if="error">
        <p>{{ t(`shared.errors.${error.kind}`) }}</p>
        <button type="button" @click="refresh">
          {{ t('shared.actions.retry') }}
        </button>
      </div>

      <template v-else-if="data">
        <p>{{ t('students.list.count', data.total) }}</p>
        <ul>
          <li v-for="student in data.items" :key="student.id">
            {{ student.lastName }}, {{ student.firstName }} — {{ student.standing }}
            <span v-if="student.openLicenceClasses.length">
              ({{ student.openLicenceClasses.join(', ') }})
            </span>
          </li>
        </ul>
      </template>
    </section>

    <section>
      <h2>{{ t('dashboard.widgets.upcomingLessons') }}</h2>
      <p>{{ t('shared.states.empty') }}</p>
    </section>

    <fieldset>
      <legend>Locale</legend>
      <label v-for="code in SUPPORTED_LOCALES" :key="code">
        <input v-model="locale" type="radio" name="locale" :value="code">
        {{ code }}
      </label>
    </fieldset>

    <ApiDevPanel />
  </main>
</template>

<style scoped></style>
