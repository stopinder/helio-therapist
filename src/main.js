import { createApp } from 'vue'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { inject } from '@vercel/analytics'
import AuthGate from './AuthGate.vue'
import router from './router'
import './main.css'
import { sanitiseTelemetryEvent } from './lib/telemetry.js'
import { installGoogleAdsTag } from './lib/googleAds.js'

injectSpeedInsights({ beforeSend: sanitiseTelemetryEvent, debug: false })
inject({ beforeSend: sanitiseTelemetryEvent, debug: false })
installGoogleAdsTag()

const app = createApp(AuthGate)
app.use(router)

router.isReady().then(() => {
    app.mount('#app')
})
