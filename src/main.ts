import { Icon } from '@iconify/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { i18n, reportMessageDrift } from './i18n'
import router from './router'
import { API_KEY } from './shared/api'
import {
  createFakeApi,
  createSnapshotWriter,
  FAKE_API_CONTROLS_KEY,
  loadDatabase,
} from './shared/api/fake'
import { installShellVariantGuard } from './shared/shell/prototype/use-shell-variant'

import './styles/index.css'

if (import.meta.env.DEV)
  reportMessageDrift()

const app = createApp(App)

/**
 * The seam, wired. This is the whole swap surface: `createHttpApi('/api')` here, and no feature,
 * store or component changes. See `docs/api-seam.md`.
 */
const api = createFakeApi(loadDatabase(), {
  latencyMs: [150, 400],
  onChange: createSnapshotWriter(),
})

app.provide(API_KEY, api)

// The latency/failure dials are dev scaffolding, so they travel under their own key and are not
// provided in a production build.
if (import.meta.env.DEV) {
  app.provide(FAKE_API_CONTROLS_KEY, api.controls)

  // PROTOTYPE (#7): keeps `?shell=` across navigation while the three shell variants are up for
  // review. Goes when the variant is chosen.
  installShellVariantGuard(router)
}

app.component('Icon', Icon)
app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
