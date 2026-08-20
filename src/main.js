import { createApp } from 'vue'
import AuthGate from './AuthGate.vue'
import router from './router'
import './main.css'

const app = createApp(AuthGate)
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
