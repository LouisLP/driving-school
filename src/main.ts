import { Icon } from '@iconify/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { i18n, reportMessageDrift } from './i18n'
import router from './router'

if (import.meta.env.DEV)
  reportMessageDrift()

const app = createApp(App)

app.component('Icon', Icon)
app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
