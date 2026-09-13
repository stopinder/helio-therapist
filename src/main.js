import { createApp } from 'vue'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { inject } from '@vercel/analytics'
import AuthGate from './AuthGate.vue'
import router from './router'
import './main.css'

injectSpeedInsights()
inject()

const app = createApp(AuthGate)
app.use(router)

router.isReady().then(() => {
    app.mount('#app')
})