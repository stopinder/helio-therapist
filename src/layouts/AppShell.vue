<template>
  <div
    data-testid="workspace-shell"
    class="flex h-screen overflow-hidden bg-surface-canvas text-ink"
  >
    <Transition name="slide">
      <aside
        v-if="isMobileMenuOpen"
        class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border-muted bg-sidebar shadow-overlay md:hidden"
      >
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <router-link to="/overview" class="midnight-brand" aria-label="Helios home">
            <span class="midnight-brand-mark">
              <Sun class="workspace-icon" aria-hidden="true" />
            </span>
            <span class="leading-none">
              <span class="block font-serif text-[1.35rem] font-semibold text-white">Helios</span>
              <span class="mt-1 block text-[0.56rem] uppercase tracking-[0.18em] text-midnight-mist">Practice</span>
            </span>
          </router-link>

          <button
            class="-mr-2 rounded-control p-2 text-midnight-mist transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
            @click="isMobileMenuOpen=false"
          >
            <X class="workspace-icon-lg" />
          </button>
        </div>

        <nav class="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-7" aria-label="Primary navigation">
          <section v-for="group in navGroups" :key="group.label">
            <p class="midnight-nav-group">{{ group.label }}</p>
            <div class="space-y-1.5">
              <router-link
                v-for="item in group.items"
                :key="item.name"
                :to="item.path"
                :aria-label="item.name"
                class="midnight-nav-item"
                :class="isNavActive(item.path) ? 'midnight-nav-active' : 'midnight-nav-rest'"
                @click="isMobileMenuOpen=false"
              >
                <span class="midnight-nav-index">{{ item.index }}</span>
                <component :is="item.icon" class="workspace-icon-sm" aria-hidden="true" />
                <span>{{ item.displayName || item.name }}</span>
              </router-link>
            </div>
          </section>
        </nav>

        <div class="relative shrink-0 border-t border-b border-border-muted bg-sidebar px-3 py-2">
          <div
            v-if="accountMenuOpen"
            class="absolute bottom-[4.25rem] left-3 right-3 z-50 rounded-panel border border-border-muted bg-surface-overlay p-1.5 shadow-overlay"
            role="menu"
          >
            <router-link
              to="/settings"
              class="flex min-h-touch items-center gap-2.5 rounded-control px-3 type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink"
              role="menuitem"
              @click="accountMenuOpen=false"
            >
              <Settings class="workspace-icon-sm" aria-hidden="true" />
              <span>Settings</span>
            </router-link>

            <button
              type="button"
              class="flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 text-left type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink"
              role="menuitem"
              @click="accountMenuOpen=false;handleSignOut()"
            >
              <LogOut class="workspace-icon-sm" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>

          <button
            type="button"
            class="flex min-h-touch w-full items-center gap-3 rounded-control px-2 text-left text-white transition-colors hover:bg-white/10"
            :aria-label="`Account menu for ${accountIdentity.name}`"
            aria-haspopup="menu"
            :aria-expanded="accountMenuOpen"
            @click="accountMenuOpen=!accountMenuOpen"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-midnight-steel type-metadata font-semibold text-white">
              {{ accountIdentity.initials }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate type-ui font-semibold text-white">{{ accountIdentity.name }}</span>
              <span v-if="accountIdentity.subtitle" class="mt-0.5 block truncate text-[0.66rem] text-midnight-mist">
                {{ accountIdentity.subtitle }}
              </span>
            </span>
            <MoreHorizontal class="workspace-icon shrink-0 text-midnight-mist" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </Transition>

    <Transition name="fade">
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden"
        @click="isMobileMenuOpen=false"
      ></div>
    </Transition>

    <aside class="hidden h-full w-44 shrink-0 flex-col border-r border-border-muted bg-sidebar md:flex">
      <div class="flex h-20 shrink-0 items-center border-b border-white/10 px-5">
        <router-link to="/overview" class="midnight-brand" aria-label="Helios home">
          <span class="midnight-brand-mark">
            <Sun class="workspace-icon" aria-hidden="true" />
          </span>
          <span class="leading-none">
            <span class="block font-serif text-[1.35rem] font-semibold text-white">Helios</span>
            <span class="mt-1 block text-[0.56rem] uppercase tracking-[0.18em] text-midnight-mist">Practice</span>
          </span>
        </router-link>
      </div>

      <nav class="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-4 py-7 space-y-7" aria-label="Primary navigation">
        <section v-for="group in navGroups" :key="group.label">
          <p class="midnight-nav-group">{{ group.label }}</p>
          <div class="space-y-1.5">
            <router-link
              v-for="item in group.items"
              :key="item.name"
              :to="item.path"
              :aria-label="item.name"
              class="midnight-nav-item"
              :class="isNavActive(item.path) ? 'midnight-nav-active' : 'midnight-nav-rest'"
            >
              <span class="midnight-nav-index">{{ item.index }}</span>
              <component :is="item.icon" class="workspace-icon-sm" aria-hidden="true" />
              <span>{{ item.displayName || item.name }}</span>
            </router-link>
          </div>
        </section>
      </nav>

      <div class="relative shrink-0 border-t border-b border-border-muted bg-sidebar px-3 py-2">
        <div
          v-if="accountMenuOpen"
          class="absolute bottom-[4.25rem] left-3 right-3 z-50 rounded-panel border border-border-muted bg-surface-overlay p-1.5 shadow-overlay"
          role="menu"
        >
          <router-link
            to="/settings"
            class="flex min-h-touch items-center gap-2.5 rounded-control px-3 type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink"
            role="menuitem"
            @click="accountMenuOpen=false"
          >
            <Settings class="workspace-icon-sm" aria-hidden="true" />
            <span>Settings</span>
          </router-link>

          <button
            type="button"
            class="flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 text-left type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink"
            role="menuitem"
            @click="accountMenuOpen=false;handleSignOut()"
          >
            <LogOut class="workspace-icon-sm" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>

        <button
          type="button"
          class="flex min-h-touch w-full items-center gap-3 rounded-control px-2 text-left text-white transition-colors hover:bg-white/10"
          :aria-label="`Account menu for ${accountIdentity.name}`"
          aria-haspopup="menu"
          :aria-expanded="accountMenuOpen"
          @click="accountMenuOpen=!accountMenuOpen"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-midnight-steel type-metadata font-semibold text-white">
            {{ accountIdentity.initials }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate type-ui font-semibold text-white">{{ accountIdentity.name }}</span>
            <span v-if="accountIdentity.subtitle" class="mt-0.5 block truncate text-[0.64rem] text-midnight-mist">
              {{ accountIdentity.subtitle }}
            </span>
          </span>
          <MoreHorizontal class="workspace-icon shrink-0 text-midnight-mist" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="midnight-utility-rail flex h-16 shrink-0 items-center justify-between border-b border-border-muted px-inline-lg md:px-7">
        <div class="flex min-w-0 items-center gap-inline-md">
          <button
            class="-ml-2 rounded-control p-2 text-ink-secondary transition-colors hover:bg-surface-subtle md:hidden"
            aria-label="Open menu"
            @click="isMobileMenuOpen=true"
          >
            <Menu class="workspace-icon-lg" />
          </button>

          <div class="min-w-0">
            <p class="hidden text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-muted sm:block">
              Workspace
            </p>
            <h2 class="truncate type-body-medium font-semibold text-ink">
              {{ $route.path === '/overview' ? 'Today' : currentPageName }}
            </h2>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <div
            class="hidden items-center gap-2.5 whitespace-nowrap text-ink-muted md:flex"
            data-testid="global-appointment-clock"
            :data-appointment-status="appointmentStatus"
            :data-appointment-approaching="appointmentStatus === 'warning' || appointmentStatus === 'imminent' || undefined"
            aria-live="polite"
          >
            <span class="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">Current</span>
            <time
              class="type-ui tabular-nums font-semibold text-ink"
              :datetime="now.toISOString()"
            >
              {{ currentTimeLabel }}
            </time>

            <span class="h-4 w-px bg-border-muted" aria-hidden="true"></span>

            <span
              v-if="nextAppointment"
              class="type-metadata flex items-center gap-1.5"
              :class="{
                'text-ink-muted': appointmentStatus === 'neutral',
                'text-ink-secondary': appointmentStatus === 'approaching',
                'text-brand-amber font-medium': appointmentStatus === 'warning',
                'text-state-danger font-semibold': appointmentStatus === 'imminent'
              }"
            >
              <span>Next {{ nextAppointmentTimeLabel }}</span>
              <span
                class="tabular-nums"
                :class="{
                  'text-ink-subtle': appointmentStatus === 'neutral',
                  'text-ink-secondary font-medium': appointmentStatus === 'approaching',
                  'text-brand-amber font-semibold': appointmentStatus === 'warning',
                  'text-state-danger font-bold': appointmentStatus === 'imminent'
                }"
              >
                {{ nextAppointmentCountdownLabel }}
              </span>
            </span>

            <span v-else class="type-metadata text-ink-subtle">
              No upcoming appointment
            </span>
          </div>

          <span class="mx-1 hidden h-6 w-px bg-border-muted md:block" aria-hidden="true"></span>

          <button
            type="button"
            class="midnight-utility-control inline-flex h-9 items-center gap-1.5 whitespace-nowrap px-3 type-ui"
            :class="outstandingReminderCount ? 'midnight-utility-control-attention' : ''"
            :aria-expanded="showQuickCapture"
            aria-haspopup="dialog"
            @click="showQuickCapture=!showQuickCapture"
          >
            <Plus class="workspace-icon-sm text-brand-amber" aria-hidden="true" />
            <span class="hidden sm:inline">Quick capture</span>
            <span
              v-if="outstandingReminderCount"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-amber-soft px-1.5 type-metadata font-semibold text-ink"
            >
              {{ outstandingReminderCount }}
            </span>
          </button>

          <router-link
            v-if="$route.path!=='/schedule'"
            to="/schedule"
            class="midnight-utility-control inline-flex h-9 w-9 shrink-0 items-center justify-center lg:w-auto lg:gap-1.5 lg:px-3"
            aria-label="Schedule appointment"
            title="Schedule appointment"
          >
            <CalendarDays class="workspace-icon-sm text-midnight-steel" aria-hidden="true" />
            <span class="hidden lg:inline">Schedule</span>
          </router-link>

          <button
            type="button"
            class="inline-flex h-9 min-w-[3.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-control border px-2.5 type-ui font-semibold transition-colors"
            :class="canJoinNextAppointment
              ? 'border-midnight-deep bg-midnight text-white hover:bg-midnight-steel'
              : 'border-border-muted bg-surface-subtle text-ink-subtle cursor-default'"
            :disabled="!canJoinNextAppointment || joiningNextAppointment"
            :title="canJoinNextAppointment ? 'Join next appointment' : 'No joinable appointment'"
            @click="joinNextAppointment"
          >
            {{ joiningNextAppointment ? 'Opening…' : 'Join' }}
          </button>
        </div>
      </header>

      <main class="relative min-h-0 flex-1 bg-surface-canvas" :class="isFullHeightWorkspace
          ? 'overflow-hidden'
          : 'overflow-y-auto overflow-x-hidden pb-16 md:pb-0'">
        <slot />
      </main>
    </div>

    <nav class="midnight-mobile-index md:hidden" aria-label="Mobile navigation">
      <router-link
        to="/overview"
        aria-label="Overview"
        :class="{ 'is-active': isNavActive('/overview') }"
      >
        <span>01</span>
        <strong>Today</strong>
      </router-link>
      <router-link
        to="/calendar"
        :class="{ 'is-active': isNavActive('/calendar') }"
      >
        <span>02</span>
        <strong>Calendar</strong>
      </router-link>
      <router-link
        to="/clients"
        :class="{ 'is-active': isNavActive('/clients') }"
      >
        <span>03</span>
        <strong>Clients</strong>
      </router-link>
      <button type="button" aria-label="More navigation" @click="isMobileMenuOpen=true">
        <span>04</span>
        <strong>More</strong>
      </button>
    </nav>

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
import {
  CalendarDays,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  Sun,
  Users,
  X
} from '@lucide/vue'
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
const accountIdentity = ref({
  name: 'Signed in',
  subtitle: '',
  initials: '·'
})

const fullHeightWorkspacePaths = new Set(['/calendar', '/transcripts'])
const isFullHeightWorkspace = computed(() =>
  fullHeightWorkspacePaths.has(route.path)
)

const showQuickCapture = ref(false)
const reminders = ref([])

const openReminders = computed(() =>
  reminders.value.filter(item => !item.completedAt)
)

const outstandingReminderCount = computed(() =>
  openReminders.value.length
)

const now = ref(new Date())
const appointments = ref([])
const googleEvents = ref([])
const joiningNextAppointment = ref(false)

let clockTimer
let appointmentRefreshTimer

const nextAppointment = computed(() =>
  nextTimedAppointment({
    appointments: appointments.value,
    googleEvents: googleEvents.value,
    now: now.value
  })
)

const canJoinNextAppointment = computed(() =>
  nextAppointment.value?.source === 'appointment' &&
  Boolean(nextAppointment.value.appointment?.zoom_meeting_id)
)

const minutesUntilNextAppointment = computed(() =>
  nextAppointment.value
    ? Math.ceil(
        (nextAppointment.value.start.getTime() - now.value.getTime()) / 60000
      )
    : null
)

const appointmentStatus = computed(() => {
  if (
    minutesUntilNextAppointment.value === null ||
    minutesUntilNextAppointment.value < 0
  ) return 'none'

  if (minutesUntilNextAppointment.value <= 5) return 'imminent'
  if (minutesUntilNextAppointment.value <= 15) return 'warning'
  if (minutesUntilNextAppointment.value <= 30) return 'approaching'

  return 'neutral'
})

const currentTimeLabel = computed(() =>
  now.value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
)

const nextAppointmentTimeLabel = computed(() =>
  nextAppointment.value
    ? nextAppointment.value.start.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : ''
)

const nextAppointmentCountdownLabel = computed(() => {
  if (!nextAppointment.value) return ''

  const minutes = Math.max(0, minutesUntilNextAppointment.value)

  if (minutes < 60) {
    return minutes === 1 ? 'in 1 min' : `in ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining
    ? `in ${hours}h ${remaining}m`
    : `in ${hours}h`
})

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

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString()
    })

    const response = await authenticatedFetch(
      `/api/google/events?${params.toString()}`
    )

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
  if (document.visibilityState === 'visible') {
    refreshAppointments()
  }
}

function isNavActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

async function joinNextAppointment() {
  if (!canJoinNextAppointment.value || joiningNextAppointment.value) return

  joiningNextAppointment.value = true

  try {
    const appointment = nextAppointment.value.appointment

    const { session } = await createOrResumeSession(
      appointment.client_id
    )

    const response = await authenticatedFetch(
      '/api/zoom/join-appointment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: appointment.client_id,
          appointmentId: appointment.id
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to join the appointment.'
      )
    }

    window.open(
      data.startUrl,
      '_blank',
      'noopener,noreferrer'
    )

    await router.push(
      `/clients/${session.clientId}/sessions/${session.id}`
    )
  } finally {
    joiningNextAppointment.value = false
  }
}

function initialsFor(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return parts.length
    ? parts
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || '')
        .join('')
    : '·'
}

async function loadAccountIdentity() {
  if (!supabase) return

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name,role,professional_title')
      .eq('id', user.id)
      .maybeSingle()

    const metadataName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : ''

    const email = user.email || ''

    const name =
      profile?.full_name?.trim() ||
      metadataName ||
      email ||
      'Signed in'

    accountIdentity.value = {
      name,
      subtitle:
        profile?.professional_title?.trim() ||
        profile?.role?.trim() ||
        (name !== email ? email : ''),
      initials: initialsFor(name)
    }
  } catch {
    console.warn('[AppShell] Could not load account identity')
  }
}

async function handleSignOut() {
  if (supabase) {
    await supabase.auth.signOut()
  }

  await router.replace('/sign-in')
}

const handleReminderChange = () => refreshReminders()

onMounted(() => {
  window.addEventListener(
    'helios-reminders-changed',
    handleReminderChange
  )

  window.addEventListener(
    'focus',
    refreshAppointments
  )

  document.addEventListener(
    'visibilitychange',
    refreshAppointmentsWhenActive
  )

  loadAccountIdentity()
  refreshReminders()
  refreshAppointments()

  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 30000)

  appointmentRefreshTimer = window.setInterval(
    refreshAppointments,
    60000
  )
})

onUnmounted(() => {
  window.removeEventListener(
    'helios-reminders-changed',
    handleReminderChange
  )

  window.removeEventListener(
    'focus',
    refreshAppointments
  )

  document.removeEventListener(
    'visibilitychange',
    refreshAppointmentsWhenActive
  )

  window.clearInterval(clockTimer)
  window.clearInterval(appointmentRefreshTimer)
})

const navGroups = [
  {
    label: 'Practice',
    items: [
      {
        name: 'Overview',
        path: '/overview',
        displayName: 'Today',
        index: '01',
        icon: LayoutDashboard,
        iconTone: 'icon-surface-accent'
      },
      {
        name: 'Calendar',
        path: '/calendar',
        index: '02',
        icon: CalendarDays,
        iconTone: 'icon-surface-reflection'
      },
      {
        name: 'Clients',
        path: '/clients',
        index: '03',
        icon: Users,
        iconTone: 'icon-surface-accent'
      }
    ]
  },
  {
    label: 'Records',
    items: [
      {
        name: 'Transcripts',
        path: '/transcripts',
        index: '04',
        icon: FileText,
        iconTone: 'icon-surface-reflection'
      },
      {
        name: 'Documents',
        path: '/documents',
        index: '05',
        icon: FolderOpen,
        iconTone: 'icon-surface-accent'
      }
    ]
  },
  {
    label: 'Professional',
    items: [
      {
        name: 'CPD',
        path: '/supervision',
        displayName: 'Supervision',
        index: '06',
        icon: GraduationCap,
        iconTone: 'icon-surface-reflection'
      }
    ]
  }
]

const pageTitles = {
  '/overview': 'Overview',
  '/calendar': 'Calendar',
  '/schedule': 'Schedule appointment',
  '/clients': 'Clients',
  '/transcripts': 'Transcripts',
  '/documents': 'Documents',
  '/supervision': 'CPD',
  '/settings': 'Settings'
}

const currentPageName = computed(() =>
  pageTitles[route.path] ||
  route.meta?.title ||
  'Workspace'
)
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform .25s ease-out;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sidebar-navigation {
  scrollbar-width:none;
  -ms-overflow-style: none;
}

.sidebar-navigation::-webkit-scrollbar {
  display:none;
  width: 0;
  height: 0;
}

.midnight-brand {
  display: inline-flex;
  align-items: center;
  gap: .7rem;
  border-radius: var(--radius-control);
}

.midnight-brand-mark {
  display: inline-flex;
  width: 2.1rem;
  height: 2.1rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--midnight-amber-soft);
  color: var(--midnight-deep);
  box-shadow: 0 0 0 1px rgb(255 255 255 / .08), 0 8px 20px rgb(0 0 0 / .18);
}

.midnight-nav-group {
  margin: 0 0 .6rem .7rem;
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .17em;
  text-transform: uppercase;
  color: var(--midnight-mist);
}

.midnight-nav-item {
  position: relative;
  display: grid;
  min-height: 2.75rem;
  grid-template-columns: 1.5rem 1rem minmax(0, 1fr);
  align-items: center;
  gap: .55rem;
  padding: 0 .7rem;
  border-radius: .25rem;
  font-size: .78rem;
  transition:
    background-color var(--motion-standard) var(--motion-ease),
    color var(--motion-standard) var(--motion-ease),
    transform var(--motion-standard) var(--motion-ease),
    box-shadow var(--motion-standard) var(--motion-ease);
}

.midnight-nav-index {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .05em;
}

.midnight-nav-rest {
  color: rgb(226 234 240 / .78);
}

.midnight-nav-rest .midnight-nav-index {
  color: rgb(156 177 195 / .7);
}

.midnight-nav-rest:hover {
  background: rgb(41 71 97 / .55);
  color: white;
  transform: translateX(2px);
}

.midnight-nav-active {
  z-index: 1;
  color: white;
  background: var(--midnight-steel);
  box-shadow:
    inset 5px 0 0 var(--midnight-amber),
    7px 8px 0 var(--midnight-deep);
}

.midnight-nav-active::after {
  content: '';
  position: absolute;
  inset: 0 -1.15rem 0 auto;
  width: 1.2rem;
  background: var(--midnight-steel);
  clip-path: polygon(0 0, 0 100%, 100% 50%);
}

.midnight-nav-active .midnight-nav-index {
  color: var(--midnight-amber-soft);
}

.midnight-utility-rail {
  background:
    linear-gradient(90deg, rgb(247 249 250 / .84), rgb(238 242 245 / .94)),
    var(--surface);
  box-shadow: inset 0 -1px 0 rgb(16 34 53 / .04);
}

.midnight-utility-control {
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: rgb(247 249 250 / .76);
  color: var(--text-secondary);
  transition:
    background-color var(--motion-standard) var(--motion-ease),
    border-color var(--motion-standard) var(--motion-ease),
    transform var(--motion-fast) var(--motion-ease);
}

.midnight-utility-control:hover {
  border-color: var(--border-strong);
  background: var(--surface-elevated);
  transform: translateY(-1px);
}

.midnight-utility-control-attention {
  border-left: 4px solid var(--midnight-amber);
}

.midnight-mobile-index {
  position: fixed;
  z-index: 45;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  height: 4rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: var(--midnight-deep);
  box-shadow: 0 -10px 28px rgb(9 21 34 / .2);
}

.midnight-mobile-index a,
.midnight-mobile-index button {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .2rem;
  border: 0;
  background: transparent;
  color: rgb(199 211 220 / .76);
}

.midnight-mobile-index span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: .55rem;
  color: rgb(156 177 195 / .7);
}

.midnight-mobile-index strong {
  font-size: .62rem;
  font-weight: 700;
}

.midnight-mobile-index .is-active {
  margin-top: -.55rem;
  border-left: 4px solid var(--midnight-amber);
  background: var(--midnight-steel);
  color: white;
  clip-path: polygon(0 0, 88% 0, 100% 18%, 100% 100%, 0 100%);
}

.midnight-mobile-index .is-active span {
  color: var(--midnight-amber-soft);
}

@media (prefers-reduced-motion: reduce) {
  .midnight-nav-rest:hover,
  .midnight-utility-control:hover,
  .midnight-mobile-index .is-active {
    transform: none;
  }
}
</style>
