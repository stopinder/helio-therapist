import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase.js'

const Landing = () => import('../views/Landing.vue')
const AuthEntry = () => import('../views/AuthEntry.vue')
const Terms = () => import('../views/Terms.vue')
const Privacy = () => import('../views/Privacy.vue')
const AiData = () => import('../views/AiData.vue')
const Cookies = () => import('../views/Cookies.vue')
const Support = () => import('../views/Support.vue')
const Overview = () => import('../views/Overview.vue')
const Calendar = () => import('../views/Calendar.vue')
const Clients = () => import('../views/Clients.vue')
const ClientWorkspace = () => import('../views/ClientWorkspace.vue')
const SessionWorkspace = () => import('../views/SessionWorkspace.vue')
const Transcripts = () => import('../views/Transcripts.vue')
const Documents = () => import('../views/Documents.vue')
const Settings = () => import('../views/Settings.vue')
const PublicBooking = () => import('../views/PublicBooking.vue')
const ClientCompletion = () => import('../components/ClientCompletion.vue')
const ScheduleAppointment = () => import('../components/ScheduleAppointment.vue')
const ProfessionalDevelopmentLayout = () => import('../layouts/ProfessionalDevelopmentLayout.vue')
const SupervisionHome = () => import('../views/supervision/SupervisionHome.vue')
const SupervisionReflections = () => import('../views/supervision/SupervisionReflections.vue')
const SupervisionWorkspace = () => import('../views/supervision/SupervisionWorkspace.vue')
const SupervisionGrowth = () => import('../views/supervision/SupervisionGrowth.vue')
const SupervisionInsights = () => import('../views/supervision/SupervisionInsights.vue')

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

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  }
})

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
