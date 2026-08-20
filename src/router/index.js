import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import Landing from '../views/Landing.vue'
import AuthEntry from '../views/AuthEntry.vue'
import Terms from '../views/Terms.vue'
import Privacy from '../views/Privacy.vue'
import AiData from '../views/AiData.vue'
import Cookies from '../views/Cookies.vue'
import Support from '../views/Support.vue'
import Overview from '../views/Overview.vue'
import Calendar from '../views/Calendar.vue'
import Clients from '../views/Clients.vue'
import ClientWorkspace from '../views/ClientWorkspace.vue'
import SessionWorkspace from '../views/SessionWorkspace.vue'
import Transcripts from '../views/Transcripts.vue'
import Documents from '../views/Documents.vue'
import Settings from '../views/Settings.vue'
import PublicBooking from '../views/PublicBooking.vue'
import ClientCompletion from '../components/ClientCompletion.vue'
import ScheduleAppointment from '../components/ScheduleAppointment.vue'
import ProfessionalDevelopmentLayout from '../layouts/ProfessionalDevelopmentLayout.vue'
import SupervisionHome from '../views/supervision/SupervisionHome.vue'
import SupervisionReflections from '../views/supervision/SupervisionReflections.vue'
import SupervisionWorkspace from '../views/supervision/SupervisionWorkspace.vue'
import SupervisionGrowth from '../views/supervision/SupervisionGrowth.vue'
import SupervisionInsights from '../views/supervision/SupervisionInsights.vue'

const routes = [
  { path: '/', name: 'Landing', component: Landing, meta: { public: true, title: 'Helios — Therapist workspace' } },
  { path: '/sign-in', name: 'SignIn', component: AuthEntry, meta: { authEntry: 'signin', title: 'Sign in — Helios' } },
  { path: '/get-started', name: 'GetStarted', component: AuthEntry, meta: { authEntry: 'signup', title: 'Get started — Helios' } },
  { path: '/terms', name: 'Terms', component: Terms, meta: { public: true, title: 'Terms of Service — Helios' } },
  { path: '/privacy', name: 'Privacy', component: Privacy, meta: { public: true, title: 'Privacy Notice — Helios' } },
  { path: '/ai-data', name: 'AiData', component: AiData, meta: { public: true, title: 'AI & data processing — Helios' } },
  { path: '/cookies', name: 'Cookies', component: Cookies, meta: { public: true, title: 'Cookie information — Helios' } },
  { path: '/support', name: 'Support', component: Support, meta: { public: true, title: 'Support & contact — Helios' } },
  { path: '/overview', name: 'Overview', component: Overview, meta: { title: 'Overview — Helios' } },
  { path: '/calendar', name: 'Calendar', component: Calendar, meta: { title: 'Calendar — Helios' } },
  { path: '/schedule', name: 'ScheduleAppointment', component: ScheduleAppointment, meta: { title: 'Schedule — Helios' } },
  { path: '/book/:token', name: 'PublicBooking', component: PublicBooking, meta: { public: true, title: 'Book an appointment — Helios' } },
  { path: '/complete', name: 'ClientCompletion', component: ClientCompletion, meta: { public: true, title: 'Complete questionnaire — Helios' } },
  { path: '/clients', name: 'Clients', component: Clients, meta: { title: 'Clients — Helios' } },
  { path: '/clients/:clientId', name: 'ClientWorkspace', component: ClientWorkspace, meta: { title: 'Client workspace — Helios' } },
  { path: '/clients/:clientId/sessions/:sessionId', name: 'SessionWorkspace', component: SessionWorkspace, meta: { title: 'Session workspace — Helios' } },
  { path: '/transcripts', name: 'Transcripts', component: Transcripts, meta: { title: 'Transcripts — Helios' } },
  { path: '/documents', name: 'Documents', component: Documents, meta: { title: 'Documents — Helios' } },
  {
    path: '/supervision',
    component: ProfessionalDevelopmentLayout,
    meta: { title: 'Supervision & CPD — Helios' },
    children: [
      { path: '', name: 'SupervisionHome', component: SupervisionHome },
      { path: 'reflections', name: 'SupervisionReflections', component: SupervisionReflections, meta: { title: 'Reflections — Helios' } },
      { path: 'workspace', name: 'SupervisionWorkspace', component: SupervisionWorkspace, meta: { title: 'Supervision workspace — Helios' } },
      { path: 'growth', name: 'SupervisionGrowth', component: SupervisionGrowth, meta: { title: 'Growth — Helios' } },
      { path: 'insights', name: 'SupervisionInsights', component: SupervisionInsights, meta: { title: 'Insights — Helios' } }
    ]
  },
  { path: '/settings', name: 'Settings', component: Settings, meta: { title: 'Settings — Helios' } }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  if (to.meta.public || to.meta.authEntry || !supabase) return true
  const { data } = await supabase.auth.getSession()
  if (data.session) return true
  return { path: '/sign-in', query: { redirect: to.fullPath } }
})

router.afterEach((to) => {
  document.title = to.meta.title || 'Helios'
})

export default router
