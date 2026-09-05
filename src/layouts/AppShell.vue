<template>
  <div class="flex h-screen overflow-hidden bg-surface-canvas text-ink">
    <Transition name="slide">
      <aside
        v-if="isMobileMenuOpen"
        class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-muted bg-sidebar shadow-overlay md:hidden"
      >
        <AppSidebar
          mobile
          :account-identity="accountIdentity"
          @close="isMobileMenuOpen=false"
          @sign-out="handleSignOut"
        />
      </aside>
    </Transition>

    <Transition name="fade">
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden"
        @click="isMobileMenuOpen=false"
      ></div>
    </Transition>

    <aside class="hidden h-full w-64 shrink-0 flex-col border-r border-border-muted bg-sidebar md:flex">
      <AppSidebar :account-identity="accountIdentity" @sign-out="handleSignOut" />
    </aside>

    <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <AppHeader
        :page-name="currentPageName"
        :route-path="route.path"
        :now="now"
        :current-time-label="currentTimeLabel"
        :next-appointment="nextAppointment"
        :next-appointment-time-label="nextAppointmentTimeLabel"
        :next-appointment-countdown-label="nextAppointmentCountdownLabel"
        :appointment-status="appointmentStatus"
        :can-join-next-appointment="canJoinNextAppointment"
        :joining-next-appointment="joiningNextAppointment"
        :outstanding-reminder-count="outstandingReminderCount"
        :quick-capture-open="showQuickCapture"
        @open-menu="isMobileMenuOpen=true"
        @toggle-quick-capture="showQuickCapture=!showQuickCapture"
        @join-next-appointment="joinNextAppointment"
      />

      <main
        class="relative min-h-0 flex-1 bg-surface-canvas"
        :class="isFullHeightWorkspace ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'"
      >
        <slot />
      </main>
    </div>

    <GlobalQuickCapture
      v-if="showQuickCapture"
      :reminders="openReminders"
      @close="showQuickCapture=false"
      @saved="refreshReminders"
      @changed="refreshReminders"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { authenticatedFetch } from '../lib/authenticatedFetch.js'
import { listScheduledAppointments } from '../lib/appointments.js'
import { nextTimedAppointment } from '../lib/nextAppointment.js'
import { createOrResumeSession } from '../lib/sessions.js'
import { listTherapistReminders } from '../lib/therapistReminders.js'
import AppHeader from '../components/shell/AppHeader.vue'
import AppSidebar from '../components/shell/AppSidebar.vue'
import GlobalQuickCapture from '../components/reminders/GlobalQuickCapture.vue'

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)
const accountIdentity = ref({ name: 'Signed in', subtitle: '', initials: '·' })
const showQuickCapture = ref(false)
const reminders = ref([])
const now = ref(new Date())
const appointments = ref([])
const googleEvents = ref([])
const joiningNextAppointment = ref(false)

let clockTimer
let appointmentRefreshTimer

const fullHeightWorkspacePaths = new Set(['/calendar', '/transcripts'])
const isFullHeightWorkspace = computed(() => fullHeightWorkspacePaths.has(route.path))
const openReminders = computed(() => reminders.value.filter(item => !item.completedAt))
const outstandingReminderCount = computed(() => openReminders.value.length)
const nextAppointment = computed(() => nextTimedAppointment({
  appointments: appointments.value,
  googleEvents: googleEvents.value,
  now: now.value
}))
const canJoinNextAppointment = computed(() =>
  nextAppointment.value?.source === 'appointment' && Boolean(nextAppointment.value.appointment?.zoom_meeting_id)
)
const minutesUntilNextAppointment = computed(() => nextAppointment.value
  ? Math.ceil((nextAppointment.value.start.getTime() - now.value.getTime()) / 60000)
  : null
)
const appointmentStatus = computed(() => {
  if (minutesUntilNextAppointment.value === null || minutesUntilNextAppointment.value < 0) return 'none'
  if (minutesUntilNextAppointment.value <= 5) return 'imminent'
  if (minutesUntilNextAppointment.value <= 15) return 'warning'
  if (minutesUntilNextAppointment.value <= 30) return 'approaching'
  return 'neutral'
})
const currentTimeLabel = computed(() => now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
const nextAppointmentTimeLabel = computed(() => nextAppointment.value
  ? nextAppointment.value.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  : ''
)
const nextAppointmentCountdownLabel = computed(() => {
  if (!nextAppointment.value) return ''
  const minutes = Math.max(0, minutesUntilNextAppointment.value)
  if (minutes < 60) return minutes === 1 ? 'in 1 min' : `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `in ${hours}h ${remaining}m` : `in ${hours}h`
})

const pageTitles = {
  '/overview': 'Today',
  '/calendar': 'Calendar',
  '/schedule': 'Schedule appointment',
  '/clients': 'Clients',
  '/transcripts': 'Transcript inbox',
  '/documents': 'Practice documents',
  '/supervision': 'Reflect',
  '/settings': 'Settings'
}
const currentPageName = computed(() => pageTitles[route.path] || route.meta?.title?.replace(' — Helios', '') || 'Workspace')

async function refreshReminders() {
  try {
    reminders.value = await listTherapistReminders()
  } catch (error) {
    console.warn('[AppShell] Reminders unavailable', error)
  }
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
  } catch {
    return []
  }
}

async function refreshAppointments() {
  try {
    ;[appointments.value, googleEvents.value] = await Promise.all([
      listScheduledAppointments(),
      loadUpcomingGoogleEvents()
    ])
  } catch (error) {
    console.warn('[AppShell] Appointments unavailable', error)
  }
}

function refreshAppointmentsWhenActive() {
  if (document.visibilityState === 'visible') refreshAppointments()
}

async function joinNextAppointment() {
  if (!canJoinNextAppointment.value || joiningNextAppointment.value) return
  joiningNextAppointment.value = true
  try {
    const appointment = nextAppointment.value.appointment
    const { session } = await createOrResumeSession(appointment.client_id)
    const response = await authenticatedFetch('/api/zoom/join-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: appointment.client_id, appointmentId: appointment.id })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to join the appointment.')
    window.open(data.startUrl, '_blank', 'noopener,noreferrer')
    await router.push(`/clients/${session.clientId}/sessions/${session.id}`)
  } finally {
    joiningNextAppointment.value = false
  }
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
    accountIdentity.value = {
      name,
      subtitle: profile?.professional_title?.trim() || profile?.role?.trim() || (name !== email ? email : ''),
      initials: initialsFor(name)
    }
  } catch {
    console.warn('[AppShell] Could not load account identity')
  }
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
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active { transition: transform .25s ease-out; }
.slide-enter-from,
.slide-leave-to { transform: translateX(-100%); }
.fade-enter-active,
.fade-leave-active { transition: opacity .2s ease-out; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
