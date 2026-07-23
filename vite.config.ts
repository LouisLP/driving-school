import type { Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { generateI18nTypes } from './scripts/generate-i18n-types'

/** Keeps the typed `t()` schema in sync as feature i18n folders come and go. */
function i18nTypes(): Plugin {
  const isMessageFile = /[\\/]i18n[\\/][^\\/]+\.json$/

  return {
    name: 'driving-school:i18n-types',
    buildStart() {
      generateI18nTypes()
    },
    configureServer(server) {
      const regenerate = (file: string) => {
        if (isMessageFile.test(file))
          generateI18nTypes()
      }
      server.watcher.on('add', regenerate)
      server.watcher.on('unlink', regenerate)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    i18nTypes(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
