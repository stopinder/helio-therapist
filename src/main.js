import { createApp } from 'vue'
import AuthGate from './AuthGate.vue'
import PublicBooking from './views/PublicBooking.vue'
import router from './router'
import './main.css'

const isPublicBooking = window.location.pathname.startsWith('/book/')
const app = createApp(isPublicBooking ? PublicBooking : AuthGate)
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
