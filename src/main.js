import { createApp } from 'vue'
import AuthGate from './AuthGate.vue'
import router from './router'
import './main.css'
import { capturePublicPageView, getAnalyticsConsent, installPublicCtaTracking } from './lib/analytics.js'

const app = createApp(AuthGate)
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
  installPublicCtaTracking()

  if (getAnalyticsConsent() === true) capturePublicPageView(router.currentRoute.value)
  router.afterEach((to) => {
    if (getAnalyticsConsent() === true) capturePublicPageView(to)
  })
})
