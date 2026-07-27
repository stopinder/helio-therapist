import { createRouter, createWebHistory } from 'vue-router'
import Overview from '../views/Overview.vue'
import Calendar from '../views/Calendar.vue'
import Clients from '../views/Clients.vue'
import ClientWorkspace from '../views/ClientWorkspace.vue'
import SessionWorkspace from '../views/SessionWorkspace.vue'
import Transcripts from '../views/Transcripts.vue'
import Supervision from '../views/Supervision.vue'
import Settings from '../views/Settings.vue'

const routes = [
  {
    path: '/',
    name: 'Overview',
    component: Overview
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: Calendar
  },
  {
    path: '/clients',
    name: 'Clients',
    component: Clients
  },
  {
    path: '/clients/:clientId',
    name: 'ClientWorkspace',
    component: ClientWorkspace
  },
  {
    path: '/clients/:clientId/sessions/:sessionId',
    name: 'SessionWorkspace',
    component: SessionWorkspace
  },
  {
    path: '/transcripts',
    name: 'Transcripts',
    component: Transcripts
  },
  {
    path: '/supervision',
    name: 'Supervision',
    component: Supervision
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
