<template>
  <div class="flex h-screen overflow-hidden bg-surface-canvas text-ink">
    <Transition name="slide">
      <aside v-if="isMobileMenuOpen" class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-muted bg-sidebar shadow-overlay md:hidden">
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-border-muted px-5">
          <router-link to="/" class="flex items-center gap-2.5 rounded-control" aria-label="Helios home">
            <span class="icon-surface icon-surface-reflection rounded-pill"><Sun class="workspace-icon" aria-hidden="true" /></span>
            <span class="leading-none"><span class="block font-serif text-[1.35rem] font-semibold text-ink">Helios</span><span class="mt-1 block text-[0.58rem] uppercase tracking-[0.16em] text-ink-muted">Practice</span></span>
          </router-link>
          <button class="-mr-2 p-2 text-ink-subtle hover:text-ink-secondary" aria-label="Close menu" @click="isMobileMenuOpen=false"><X class="workspace-icon-lg" /></button>
        </div>
        <nav class="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
          <section v-for="group in navGroups" :key="group.label">
            <p class="px-3 mb-2 type-eyebrow text-ink-subtle">{{ group.label }}</p>
            <div class="space-y-1">
              <router-link v-for="item in group.items" :key="item.name" :to="item.path" class="flex items-center gap-2.5 min-h-touch px-2.5 rounded-control type-ui transition-colors" :class="isNavActive(item.path)?'bg-state-selected text-ink font-semibold':'text-ink-secondary hover:bg-surface-subtle hover:text-ink'" @click="isMobileMenuOpen=false">
                <span class="icon-surface !h-7 !w-7" :class="item.iconTone"><component :is="item.icon" class="workspace-icon-sm" aria-hidden="true" /></span><span>{{ item.name }}</span>
              </router-link>
            </div>
          </section>
        </nav>
        <div class="relative shrink-0 border-t border-border-muted bg-sidebar px-3 py-2">
          <div v-if="accountMenuOpen" class="absolute bottom-[3.35rem] left-3 right-3 z-50 rounded-panel border border-border-muted bg-surface-overlay p-1.5 shadow-overlay" role="menu">
            <router-link to="/settings" class="flex min-h-touch items-center gap-2.5 rounded-control px-3 type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink" role="menuitem" @click="accountMenuOpen=false"><Settings class="workspace-icon-sm" aria-hidden="true" /><span>Settings</span></router-link>
            <button type="button" class="flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 text-left type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink" role="menuitem" @click="accountMenuOpen=false;handleSignOut()"><LogOut class="workspace-icon-sm" aria-hidden="true" /><span>Sign out</span></button>
          </div>
          <button type="button" class="flex min-h-touch w-full items-center gap-3 rounded-control px-2 text-left hover:bg-surface-subtle" aria-haspopup="menu" :aria-expanded="accountMenuOpen" @click="accountMenuOpen=!accountMenuOpen">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-action-primary type-metadata font-semibold text-on-action">{{ accountIdentity.initials }}</span><span class="min-w-0 flex-1 truncate type-ui font-semibold text-ink">{{ accountIdentity.name }}</span><MoreHorizontal class="workspace-icon shrink-0 text-ink-muted" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </Transition>

    <Transition name="fade"><div v-if="isMobileMenuOpen" class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden" @click="isMobileMenuOpen=false"></div></Transition>

    <aside class="hidden h-full w-64 shrink-0 flex-col border-r border-border-muted bg-sidebar md:flex">
      <div class="flex h-16 shrink-0 items-center border-b border-border-muted px-5">
        <router-link to="/" class="flex items-center gap-2.5 rounded-control" aria-label="Helios home">
          <span class="icon-surface icon-surface-reflection rounded-pill"><Sun class="workspace-icon" aria-hidden="true" /></span>
          <span class="leading-none"><span class="block font-serif text-[1.35rem] font-semibold text-ink">Helios</span><span class="mt-1 block text-[0.58rem] uppercase tracking-[0.16em] text-ink-muted">Practice</span></span>
        </router-link>
      </div>
      <nav class="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
        <section v-for="group in navGroups" :key="group.label">
          <p class="px-3 mb-2 type-eyebrow text-ink-subtle">{{ group.label }}</p>
          <div class="space-y-1">
            <router-link v-for="item in group.items" :key="item.name" :to="item.path" class="flex items-center gap-2.5 min-h-touch px-2.5 rounded-control type-ui transition-colors" :class="isNavActive(item.path)?'bg-state-selected text-ink font-semibold':'text-ink-secondary hover:bg-surface-subtle hover:text-ink'">
              <span class="icon-surface !h-7 !w-7" :class="item.iconTone"><component :is="item.icon" class="workspace-icon-sm" aria-hidden="true" /></span><span>{{ item.name }}</span>
            </router-link>
          </div>
        </section>
      </nav>
      <div class="relative shrink-0 border-t border-border-muted bg-sidebar px-3 py-2">
        <div v-if="accountMenuOpen" class="absolute bottom-[3.35rem] left-3 right-3 z-50 rounded-panel border border-border-muted bg-surface-overlay p-1.5 shadow-overlay" role="menu">
          <router-link to="/settings" class="flex min-h-touch items-center gap-2.5 rounded-control px-3 type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink" role="menuitem" @click="accountMenuOpen=false"><Settings class="workspace-icon-sm" aria-hidden="true" /><span>Settings</span></router-link>
          <button type="button" class="flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 text-left type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink" role="menuitem" @click="accountMenuOpen=false;handleSignOut()"><LogOut class="workspace-icon-sm" aria-hidden="true" /><span>Sign out</span></button>
        </div>
        <button type="button" class="flex min-h-touch w-full items-center gap-3 rounded-control px-2 text-left hover:bg-surface-subtle" aria-haspopup="menu" :aria-expanded="accountMenuOpen" @click="accountMenuOpen=!accountMenuOpen">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-action-primary type-metadata font-semibold text-on-action">{{ accountIdentity.initials }}</span><span class="min-w-0 flex-1 truncate type-ui font-semibold text-ink">{{ accountIdentity.name }}</span><MoreHorizontal class="workspace-icon shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-border-muted bg-surface px-inline-lg md:px-6">
        <div class="flex items-center gap-inline-md"><button class="-ml-2 rounded-control p-2 text-ink-secondary hover:bg-surface-subtle md:hidden" aria-label="Open menu" @click="isMobileMenuOpen=true"><Menu class="workspace-icon-lg" /></button><h2 class="truncate type-body-medium text-ink">{{ currentPageName }}</h2></div>
        <div class="flex items-center gap-2">
          <div class="hidden items-center gap-2.5 whitespace-nowrap text-ink-muted lg:flex" data-testid="global-appointment-clock" :data-appointment-approaching="isAppointmentApproaching?'true':'false'" aria-live="off"><time class="type-ui tabular-nums font-medium text-ink-secondary" :datetime="now.toISOString()">{{ currentTimeLabel }}</time><span class="h-4 w-px bg-border-muted" aria-hidden="true"></span><span v-if="nextAppointment" class="type-metadata" :class="isAppointmentApproaching?'text-ink-secondary':'text-ink-muted'">Next {{ nextAppointmentTimeLabel }}<span class="ml-1.5" :class="isAppointmentApproaching?'font-semibold text-accent':'text-ink-subtle'">{{ nextAppointmentCountdownLabel }}</span></span><span v-else class="type-metadata text-ink-subtle">No upcoming appointment</span></div>
          <span class="mx-1 hidden h-6 w-px bg-border-muted lg:block" aria-hidden="true"></span>
          <button type="button" class="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-control border px-3 type-ui transition-colors" :class="outstandingReminderCount?'border-brand-amber/40 bg-brand-amber-soft/60 text-ink':'border-border-muted bg-surface text-ink-secondary hover:bg-surface-subtle'" :aria-expanded="showQuickCapture" aria-haspopup="dialog" @click="showQuickCapture=!showQuickCapture"><Plus class="workspace-icon-sm text-focus" aria-hidden="true" /><span class="hidden sm:inline">Quick capture</span><span v-if="outstandingReminderCount" class="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-amber/15 px-1.5 type-metadata font-semibold">{{ outstandingReminderCount }}</span></button>
          <router-link v-if="$route.path!=='/schedule'" to="/schedule" class="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-control border border-border-muted bg-surface px-3 type-ui text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink sm:inline-flex"><CalendarDays class="workspace-icon-sm text-accent" aria-hidden="true" /><span>Schedule</span></router-link>
          <button type="button" class="hidden h-9 min-w-[4.25rem] items-center justify-center whitespace-nowrap rounded-control border px-3 type-ui font-semibold transition-colors sm:inline-flex" :class="canJoinNextAppointment?'border-action-primary bg-action-primary text-on-action hover:bg-action-primary-hover':'border-border-muted bg-surface-subtle text-ink-subtle cursor-default'" :disabled="!canJoinNextAppointment||joiningNextAppointment" :title="canJoinNextAppointment?'Join next appointment':'No joinable appointment'" @click="joinNextAppointment">{{ joiningNextAppointment?'Opening…':'Join' }}</button>
        </div>
      </header>
      <main class="relative min-h-0 flex-1 bg-surface-canvas" :class="isFullHeightWorkspace?'overflow-hidden':'overflow-y-auto overflow-x-hidden'"><slot/></main>
    </div>

    <GlobalQuickCapture v-if="showQuickCapture" :reminders="openReminders" @close="showQuickCapture=false" @saved="refreshReminders" @changed="refreshReminders" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, FileText, FolderOpen, GraduationCap, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Settings, Sun, Users, X } from '@lucide/vue'
import { supabase } from '../lib/supabase.js'
import { authenticatedFetch } from '../lib/authenticatedFetch.js'
import { listScheduledAppointments } from '../lib/appointments.js'
import { nextTimedAppointment } from '../lib/nextAppointment.js'
import { createOrResumeSession } from '../lib/sessions.js'
import { listTherapistReminders } from '../lib/therapistReminders.js'
import GlobalQuickCapture from '../components/reminders/GlobalQuickCapture.vue'

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)
const accountMenuOpen = ref(false)
const accountIdentity = ref({ name: 'Signed in', subtitle: '', initials: '·' })
const fullHeightWorkspacePaths = new Set(['/calendar', '/transcripts'])
const isFullHeightWorkspace = computed(() => fullHeightWorkspacePaths.has(route.path))
const showQuickCapture = ref(false)
const reminders = ref([])
const openReminders = computed(() => reminders.value.filter(item => !item.completedAt))
const outstandingReminderCount = computed(() => openReminders.value.length)
const now = ref(new Date())
const appointments = ref([])
const googleEvents = ref([])
const joiningNextAppointment = ref(false)
let clockTimer
let appointmentRefreshTimer

const nextAppointment = computed(() => nextTimedAppointment({ appointments: appointments.value, googleEvents: googleEvents.value, now: now.value }))
const canJoinNextAppointment = computed(() => nextAppointment.value?.source === 'appointment' && Boolean(nextAppointment.value.appointment?.zoom_meeting_id))
const minutesUntilNextAppointment = computed(() => nextAppointment.value ? Math.ceil((nextAppointment.value.start.getTime() - now.value.getTime()) / 60000) : null)
const isAppointmentApproaching = computed(() => minutesUntilNextAppointment.value !== null && minutesUntilNextAppointment.value >= 0 && minutesUntilNextAppointment.value <= 15)
const currentTimeLabel = computed(() => now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
const nextAppointmentTimeLabel = computed(() => nextAppointment.value ? nextAppointment.value.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
const nextAppointmentCountdownLabel = computed(() => {
  if (!nextAppointment.value) return ''
  const minutes = Math.max(0, minutesUntilNextAppointment.value)
  if (minutes < 60) return minutes === 1 ? 'in 1 min' : `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `in ${hours}h ${remaining}m` : `in ${hours}h`
})

async function refreshReminders() {
  try { reminders.value = await listTherapistReminders() } catch (error) { console.warn('[AppShell] Reminders unavailable', error) }
}

async function loadUpcomingGoogleEvents() {
  try {
    const statusResponse = await authenticatedFetch('/api/google/status')
    if (!statusResponse.ok) return []
    const status = await statusResponse.json()
    if (!status.connected) return []
    const timeMin = new Date()
    timeMin.setHours(0, 0, 0, 0)
    const timeMax = new Date(timeMin)
    timeMax.setDate(timeMax.getDate() + 31)
    const params = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
    const response = await authenticatedFetch(`/api/google/events?${params.toString()}`)
    if (!response.ok) return []
    return (await response.json()).events || []
  } catch { return [] }
}

async function refreshAppointments() {
  try { [appointments.value, googleEvents.value] = await Promise.all([listScheduledAppointments(), loadUpcomingGoogleEvents()]) } catch (error) { console.warn('[AppShell] Appointments unavailable', error) }
}

function refreshAppointmentsWhenActive() { if (document.visibilityState === 'visible') refreshAppointments() }
function isNavActive(path) { return route.path === path || route.path.startsWith(`${path}/`) }

async function joinNextAppointment() {
  if (!canJoinNextAppointment.value || joiningNextAppointment.value) return
  joiningNextAppointment.value = true
  try {
    const appointment = nextAppointment.value.appointment
    const { session } = await createOrResumeSession(appointment.client_id)
    const response = await authenticatedFetch('/api/zoom/join-appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: appointment.client_id, appointmentId: appointment.id }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to join the appointment.')
    window.open(data.startUrl, '_blank', 'noopener,noreferrer')
    await router.push(`/clients/${session.clientId}/sessions/${session.id}`)
  } finally { joiningNextAppointment.value = false }
}

function initialsFor(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') : '·'
}

async function loadAccountIdentity() {
  if (!supabase) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('full_name,role,professional_title').eq('id', user.id).maybeSingle()
    const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
    const email = user.email || ''
    const name = profile?.full_name?.trim() || metadataName || email || 'Signed in'
    accountIdentity.value = { name, subtitle: profile?.professional_title?.trim() || profile?.role?.trim() || (name !== email ? email : ''), initials: initialsFor(name) }
  } catch { console.warn('[AppShell] Could not load account identity') }
}

async function handleSignOut() {
  if (supabase) await supabase.auth.signOut()
  await router.replace('/sign-in')
}

const handleReminderChange = () => refreshReminders()
onMounted(() => {
  window.addEventListener('helios-reminders-changed', handleReminderChange)
  window.addEventListener('focus', refreshAppointments)
  document.addEventListener('visibilitychange', refreshAppointmentsWhenActive)
  loadAccountIdentity()
  refreshReminders()
  refreshAppointments()
  clockTimer = window.setInterval(() => { now.value = new Date() }, 30000)
  appointmentRefreshTimer = window.setInterval(refreshAppointments, 60000)
})
onUnmounted(() => {
  window.removeEventListener('helios-reminders-changed', handleReminderChange)
  window.removeEventListener('focus', refreshAppointments)
  document.removeEventListener('visibilitychange', refreshAppointmentsWhenActive)
  window.clearInterval(clockTimer)
  window.clearInterval(appointmentRefreshTimer)
})

const navGroups = [
  { label: 'Practice', items: [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard, iconTone: 'icon-surface-accent' },
    { name: 'Calendar', path: '/calendar', icon: CalendarDays, iconTone: 'icon-surface-reflection' },
    { name: 'Clients', path: '/clients', icon: Users, iconTone: 'icon-surface-accent' }
  ] },
  { label: 'Records', items: [
    { name: 'Transcripts', path: '/transcripts', icon: FileText, iconTone: 'icon-surface-reflection' },
    { name: 'Documents', path: '/documents', icon: FolderOpen, iconTone: 'icon-surface-accent' }
  ] },
  { label: 'Professional', items: [
    { name: 'CPD', path: '/supervision', icon: GraduationCap, iconTone: 'icon-surface-reflection' }
  ] }
]

const pageTitles = { '/overview': 'Overview', '/calendar': 'Calendar', '/schedule': 'Schedule appointment', '/clients': 'Clients', '/transcripts': 'Transcripts', '/documents': 'Documents', '/supervision': 'CPD', '/settings': 'Settings' }
const currentPageName = computed(() => pageTitles[route.path] || route.meta?.title || 'Workspace')
</script>

<style scoped>
.slide-enter-active,.slide-leave-active{transition:transform .25s ease-out}.slide-enter-from,.slide-leave-to{transform:translateX(-100%)}.fade-enter-active,.fade-leave-active{transition:opacity .2s ease-out}.fade-enter-from,.fade-leave-to{opacity:0}.sidebar-navigation{scrollbar-width:none;-ms-overflow-style:none}.sidebar-navigation::-webkit-scrollbar{display:none;width:0;height:0}
</style>
