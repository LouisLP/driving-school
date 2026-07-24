<script setup lang="ts">
/**
 * Reka's `ConfigProvider`, bound to the vue-i18n locale. Mounted once, around the whole app.
 *
 * Every Reka primitive reads its locale and reading direction from this, so switching the
 * language switcher reorders `UiDateField`'s segments and would flip direction for an RTL locale —
 * with nothing else in the app aware that either happened.
 *
 * A wrapper for the same reason as every other file here, and one more: the rule that Reka is
 * imported nowhere outside `src/shared/ui/**` is worth more as an absolute than as an absolute
 * with one exception for the app root. Binding the locale here rather than at the call site also
 * means there is one place that knows the two libraries have to agree.
 *
 * `docs/students-slice.md` mounts `ConfigProvider` in `main.ts` directly; it is a component and it
 * needs `useI18n()`, so it lives in `App.vue` behind this wrapper instead. The doc says so now.
 */
import { ConfigProvider } from 'reka-ui'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
</script>

<template>
  <ConfigProvider :locale="locale">
    <slot />
  </ConfigProvider>
</template>
