import { createRouter, createWebHistory } from 'vue-router'
import Overview from '../views/Overview.vue'
import Calendar from '../views/Calendar.vue'
import Clients from '../views/Clients.vue'
import ClientWorkspace from '../views/ClientWorkspace.vue'
import SessionWorkspace from '../views/SessionWorkspace.vue'
import Transcripts from '../views/Transcripts.vue'
import Documents from '../views/Documents.vue'
import Settings from '../views/Settings.vue'
import ScheduleAppointment from '../components/ScheduleAppointment.vue'
import ProfessionalDevelopmentLayout from '../layouts/ProfessionalDevelopmentLayout.vue'
import SupervisionHome from '../views/supervision/SupervisionHome.vue'
import SupervisionReflections from '../views/supervision/SupervisionReflections.vue'
import SupervisionWorkspace from '../views/supervision/SupervisionWorkspace.vue'
import SupervisionGrowth from '../views/supervision/SupervisionGrowth.vue'
import SupervisionInsights from '../views/supervision/SupervisionInsights.vue'
const routes=[
{path:'/',name:'Overview',component:Overview},{path:'/calendar',name:'Calendar',component:Calendar},{path:'/schedule',name:'ScheduleAppointment',component:ScheduleAppointment},{path:'/clients',name:'Clients',component:Clients},{path:'/clients/:clientId',name:'ClientWorkspace',component:ClientWorkspace},{path:'/clients/:clientId/sessions/:sessionId',name:'SessionWorkspace',component:SessionWorkspace},{path:'/transcripts',name:'Transcripts',component:Transcripts},{path:'/documents',name:'Documents',component:Documents},{path:'/supervision',component:ProfessionalDevelopmentLayout,children:[{path:'',name:'SupervisionHome',component:SupervisionHome},{path:'reflections',name:'SupervisionReflections',component:SupervisionReflections},{path:'workspace',name:'SupervisionWorkspace',component:SupervisionWorkspace},{path:'growth',name:'SupervisionGrowth',component:SupervisionGrowth},{path:'insights',name:'SupervisionInsights',component:SupervisionInsights}]},{path:'/settings',name:'Settings',component:Settings}]
const router=createRouter({history:createWebHistory(),routes});export default router
