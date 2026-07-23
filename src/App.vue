<script setup lang="ts">
// Temporary: proves the i18n wiring end-to-end in the browser, across two
// features plus shared strings. Replaced by the real app shell (issue #7).
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from './i18n'
import { useT } from './i18n/use-t'

const { locale } = useI18n()
const t = useT()
</script>

<template>
  <main>
    <h1>{{ t('dashboard.title') }}</h1>

    <section>
      <h2>{{ t('students.list.title') }}</h2>
      <p>{{ t('students.list.count', 3) }}</p>
      <p>{{ t('students.fields.licenceClass') }}</p>
      <button type="button">
        {{ t('shared.actions.save') }}
      </button>
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
  </main>
</template>

<style scoped></style>
