<template>
  <div class="flex flex-1 h-full overflow-hidden" data-testid="calendar-layout">
    <aside
      class="border-r border-border-muted bg-surface flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 overflow-hidden"
      data-testid="calendar-agenda"
      :class="[
        isMobile ? (isAgendaExpanded ? 'fixed inset-0 pt-14 flex' : 'hidden') : '',
        !isMobile && isTablet ? (isAgendaExpanded ? 'w-72 flex' : 'w-12 flex') : '',
        !isMobile && !isTablet ? 'w-72 flex' : ''
      ]"
    >
      <div v-if="!isTablet || isAgendaExpanded" class="flex-1 flex flex-col min-h-0">
        <div class="p-page space-y-stack-lg overflow-y-auto">
          <div class="bg-surface-subtle border border-border-muted rounded-panel p-inline-md">
            <div class="flex items-center justify-between mb-stack-sm mt-stack-sm">
              <span class="text-body-sm font-semibold text-ink">{{ miniMonthName }}</span>
              <div class="flex gap-1">
                <button @click="miniPrevMonth" class="p-1 hover:bg-surface-muted rounded" aria-label="Previous month">‹</button>
                <button @click="miniNextMonth" class="p-1 hover:bg-surface-muted rounded" aria-label="Next month">›</button>
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center mb-stack-sm">
              <span v-for="(d, idx) in ['M','T','W','T','F','S','S']" :key="`${d}-${idx}`" class="text-caption text-ink-subtle font-bold py-1">{{ d }}</span>
              <div
                v-for="cell in miniCalendarCells"
                :key="cell.key"
                @click="cell.date && selectDate(cell.date)"
                @keydown.enter="cell.date && selectDate(cell.date)"
                @keydown.space.prevent="cell.date && selectDate(cell.date)"
                :tabindex="cell.date ? 0 : -1"
                class="text-body-sm p-1 rounded-pill transition-colors focus-visible:ring-2 focus-visible:ring-action-primary outline-none"
                :class="[
                  cell.date ? 'cursor-pointer' : '',
                  cell.isSelected ? 'bg-action-primary text-on-action' :
                  cell.isToday ? 'text-action-primary font-bold' :
                  cell.date ? 'hover:bg-surface-muted text-ink' : ''
                ]"
                :aria-label="cell.date ? cell.date.toDateString() : ''"
              >
                {{ cell.date ? cell.date.getDate() : '' }}
              </div>
            </div>
          </div>

          <div v-if="isGoogleConnected || googleLoading || googleError" class="p-inline-sm py-stack-sm rounded-panel border border-border-muted bg-surface-subtle space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-caption font-bold text-ink-muted uppercase">Google Calendar</span>
              <div v-if="googleLoading" class="w-3 h-3 border-2 border-action-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div v-if="googleError === 'RECONNECT_REQUIRED'" class="space-y-2">
              <p class="text-caption text-state-warning leading-snug">Connection expired. Reconnect to sync events.</p>
              <button @click="reconnectGoogle" class="w-full py-1 text-caption font-medium bg-state-warning-surface text-state-warning border border-state-warning/20 rounded-control hover:bg-state-warning/10">Reconnect</button>
            </div>
            <div v-else-if="googleError" class="space-y-2">
              <p class="text-caption text-state-danger leading-snug">Sync failed.</p>
              <button @click="refreshEvents" class="w-full py-1 text-caption font-medium bg-state-danger-surface text-state-danger border border-state-danger/20 rounded-control hover:bg-state-danger/10">Retry</button>
            </div>
            <div v-else-if="isGoogleConnected" class="space-y-1">
              <div class="flex items-center gap-1.5 text-state-success">
                <span class="text-caption font-medium">Connected</span>
              </div>
              <p v-if="googleAccount" class="text-caption text-ink-subtle truncate">{{ googleAccount }}</p>
              <p v-if="lastSyncedAt" class="text-caption text-ink-subtle uppercase tracking-tighter">Last synced {{ formatSyncTime(lastSyncedAt) }}</p>
            </div>
          </div>

          <section class="space-y-stack-sm">
            <h3 class="text-caption font-bold text-ink-muted uppercase tracking-widest">Today</h3>
            <div v-if="todayEvents.length === 0" class="text-body-sm text-ink-subtle py-stack-sm px-inline-sm italic">No appointments today.</div>
            <div v-else class="space-y-stack-xs">
              <div
                v-for="event in todayEvents"
                :key="event.id"
                @click="selectAppointment(event, $event)"
                class="group p-inline-sm rounded-control cursor-pointer transition-colors border"
                :class="selectedEventId === event.id ? 'bg-state-selected border-action-primary' : 'hover:bg-surface-subtle border-transparent'"
              >
                <div class="flex items-start gap-inline-sm">
                  <div class="w-1.5 h-1.5 rounded-pill mt-2 shrink-0" :class="statusColor(event.status)"></div>
                  <div class="min-w-0">
                    <div class="text-body-sm font-semibold text-ink truncate">{{ event.clientName }}</div>
                    <div class="text-caption text-ink-muted truncate">{{ formatTime(event.start) }} · {{ eventContext(event) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-stack-sm">
            <h3 class="text-caption font-bold text-ink-muted uppercase tracking-widest">Upcoming</h3>
            <div v-if="upcomingEvents.length === 0" class="text-body-sm text-ink-subtle py-stack-sm px-inline-sm italic">No upcoming appointments.</div>
            <div v-else class="space-y-stack-xs">
              <div
                v-for="event in upcomingEvents.slice(0, 10)"
                :key="event.id"
                @click="selectAppointment(event, $event)"
                class="group p-inline-sm rounded-control cursor-pointer transition-colors border"
                :class="selectedEventId === event.id ? 'bg-state-selected border-action-primary' : 'hover:bg-surface-subtle border-transparent'"
              >
                <div class="flex items-start gap-inline-sm">
                  <div class="w-1.5 h-1.5 rounded-pill mt-2 shrink-0" :class="statusColor(event.status)"></div>
                  <div class="min-w-0">
                    <div class="text-body-sm font-semibold text-ink truncate">{{ event.clientName }}</div>
                    <div class="text-caption text-ink-muted truncate">{{ formatDate(event.start) }} · {{ formatTime(event.start) }} · {{ eventContext(event) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <button
        v-if="isTablet"
        @click="isAgendaExpanded = !isAgendaExpanded"
        class="absolute -right-3 top-20 w-6 h-6 bg-surface border border-border-muted rounded-pill shadow-sm flex items-center justify-center z-40 hover:bg-surface-elevated transition-colors"
        aria-label="Toggle agenda"
      >
        <span class="text-caption leading-none">{{ isAgendaExpanded ? '‹' : '›' }}</span>
      </button>

      <div v-if="!isTablet || isAgendaExpanded" class="mt-auto p-inline-md border-t border-border-muted py-stack-sm bg-surface-subtle">
        <router-link to="/settings" class="text-caption font-medium text-action-link hover:underline flex items-center gap-1">
          <span>⚙</span> Google Calendar Settings
        </router-link>
      </div>
    </aside>

    <main class="flex-1 flex flex-col bg-surface-canvas overflow-hidden relative" data-testid="calendar-canvas">
      <button
        v-if="isMobile"
        @click="isAgendaExpanded = !isAgendaExpanded"
        class="fixed bottom-6 right-6 w-14 h-14 bg-action-primary text-on-action rounded-pill shadow-overlay flex items-center justify-center z-50 hover:bg-action-primary-hover transition-all"
        :class="isAgendaExpanded ? 'rotate-45' : ''"
        aria-label="Toggle agenda"
      >
        <span class="text-h2">{{ isAgendaExpanded ? '+' : '📅' }}</span>
      </button>

      <header class="h-14 flex items-center justify-between px-page border-b border-border-muted bg-surface shrink-0 z-20">
        <div class="flex items-center gap-inline-md">
          <h2 class="text-body font-semibold text-ink">{{ currentRangeLabel }}</h2>
          <div class="flex items-center bg-surface-muted rounded-control p-0.5 border border-border-muted">
            <button @click="move(-1)" class="px-2 py-0.5 hover:bg-surface-elevated rounded transition-colors" aria-label="Previous">‹</button>
            <button
              @click="goToday"
              :disabled="isCurrentPeriod"
              :aria-disabled="isCurrentPeriod"
              :title="isCurrentPeriod ? 'Already showing the current period' : 'Go to today'"
              class="px-inline-sm py-0.5 text-body-sm font-medium rounded transition-colors"
              :class="isCurrentPeriod ? 'text-ink-subtle opacity-60 cursor-default' : 'text-ink-secondary hover:bg-surface-elevated hover:text-ink'"
            >Today</button>
            <button @click="move(1)" class="px-2 py-0.5 hover:bg-surface-elevated rounded transition-colors" aria-label="Next">›</button>
          </div>
        </div>

        <div class="flex items-center gap-inline-sm">
          <div class="bg-surface-muted rounded-control p-0.5 flex border border-border-muted">
            <button
              v-for="mode in ['day', 'week', 'month']"
              :key="mode"
              @click="viewMode = mode"
              class="px-inline-md py-stack-xs text-body-sm font-medium rounded-control capitalize transition-all"
              :class="viewMode === mode ? 'bg-surface-elevated shadow-sm text-ink' : 'text-ink-muted hover:text-ink'"
            >{{ mode }}</button>
          </div>
          <button
            v-if="isGoogleConnected"
            @click="refreshEvents"
            class="p-2 text-ink-muted hover:text-action-primary transition-colors rounded-pill hover:bg-surface-muted"
            :class="{ 'animate-spin': googleLoading }"
            title="Refresh events"
          >↻</button>
        </div>
      </header>

      <div v-if="loading && !normalizedEvents.length" class="flex-1 flex items-center justify-center">
        <p class="text-ink-muted animate-pulse">Loading calendar...</p>
      </div>
      <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center p-page text-center">
        <p class="text-body text-state-danger mb-stack-md">{{ error }}</p>
        <button @click="loadData" class="px-inline-md py-stack-sm bg-action-primary text-on-action rounded-control font-medium">Retry</button>
      </div>

      <div class="flex-1 flex flex-col min-h-0 overflow-hidden relative" ref="gridContainer" @click="selectedEventId = null">
        <div v-if="viewMode === 'day'" class="flex-1 flex flex-col min-h-0 bg-surface">
          <div class="h-10 border-b border-border-muted flex items-center justify-center gap-2 bg-surface shrink-0">
            <span class="text-caption font-bold text-ink-muted uppercase">{{ dayData(viewDate).shortName }}</span>
            <span class="text-body-sm font-bold" :class="dayData(viewDate).isToday ? 'text-action-primary' : 'text-ink'">{{ viewDate.getDate() }}</span>
          </div>
          <div
            class="flex-1 flex relative overflow-y-auto"
            data-testid="timed-grid-scroll"
            ref="timedGridScrollDay"
            tabindex="0"
            role="region"
            aria-label="Calendar hours"
          >
            <div class="w-16 border-r border-border-muted bg-surface shrink-0 sticky left-0 z-30">
              <div class="h-10 border-b border-border-muted bg-surface sticky top-0 z-40"></div>
              <div class="relative">
                <div v-for="hour in workingHours" :key="hour" class="border-b border-border-muted/30 text-right pr-2 pt-1 bg-surface" :style="{ height: hourHeight + 'px' }">
                  <span class="text-caption font-bold text-ink-subtle uppercase">{{ formatHour(hour) }}</span>
                </div>
              </div>
            </div>
            <div class="flex-1 relative h-full bg-surface-canvas overflow-visible">
              <div v-for="hour in workingHours" :key="'bg-'+hour" class="border-b border-border-muted/30" :style="{ height: hourHeight + 'px' }"></div>
              <div
                v-for="event in dayData(viewDate).events.filter(e => !isOutsideWorkingHours(e))"
                :key="event.id"
                @click.stop="selectAppointment(event, $event)"
                class="absolute rounded-control border text-caption leading-tight p-2 transition-all overflow-hidden select-none group focus-visible:ring-2 focus-visible:ring-action-primary outline-none"
                :style="getEventStyle(event, overlappingStyles[event.id], hourHeight, 0)"
                :class="selectedEventId === event.id ? 'bg-state-selected border-action-primary shadow-md z-20' : 'bg-surface border-border-muted hover:border-border-strong hover:shadow-sm z-10'"
              >
                <div class="font-bold text-ink truncate">{{ event.clientName }}</div>
                <div class="text-ink-secondary">{{ formatTime(event.start) }} – {{ formatTime(event.end) }}</div>
                <div v-if="event.source === 'google'" class="text-caption text-ink-muted mt-0.5 truncate">{{ eventContext(event) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="viewMode === 'week'" class="flex-1 flex flex-col min-h-0 bg-surface" data-testid="week-view">
          <div
            class="flex flex-1 relative overflow-y-auto"
            data-testid="timed-grid-scroll"
            ref="timedGridScrollWeek"
            tabindex="0"
            role="region"
            aria-label="Calendar hours"
          >
            <div class="w-16 border-r border-border-muted bg-surface shrink-0 sticky left-0 z-30">
              <div class="h-10 border-b border-border-muted bg-surface sticky top-0 z-40"></div>
              <div class="relative">
                <div v-for="hour in workingHours" :key="hour" class="border-b border-border-muted/30 text-right pr-2 pt-1 bg-surface" :style="{ height: hourHeight + 'px' }">
                  <span class="text-caption font-bold text-ink-subtle uppercase">{{ formatHour(hour) }}</span>
                </div>
              </div>
            </div>
            <div class="flex-1 grid grid-cols-5 h-full relative min-w-0">
              <div v-for="day in weekDays" :key="day.date.toISOString()" class="border-r border-border-muted flex flex-col h-full relative min-w-0" :class="day.isToday ? 'bg-surface-subtle' : ''">
                <div class="h-10 border-b border-border-muted flex items-center justify-center gap-2 sticky top-0 bg-surface z-40">
                  <span class="text-caption font-bold text-ink-muted uppercase truncate">{{ day.shortName }}</span>
                  <span class="text-body-sm font-bold" :class="day.isToday ? 'text-action-primary' : 'text-ink'">{{ day.date.getDate() }}</span>
                </div>
                <div class="flex-1 relative overflow-visible bg-surface-canvas/30">
                  <div v-for="hour in workingHours" :key="'bg-'+hour" class="border-b border-border-muted/30" :style="{ height: hourHeight + 'px' }"></div>
                  <div
                    v-for="event in day.events.filter(e => !isOutsideWorkingHours(e))"
                    :key="event.id"
                    @click.stop="selectAppointment(event, $event)"
                    class="absolute rounded-control border text-caption leading-tight p-1 transition-all overflow-hidden select-none group focus-visible:ring-2 focus-visible:ring-action-primary outline-none"
                    :style="getEventStyle(event, overlappingStyles[event.id], hourHeight, 0)"
                    :class="selectedEventId === event.id ? 'bg-state-selected border-action-primary shadow-md z-20' : 'bg-surface border-border-muted hover:border-border-strong hover:shadow-sm z-10'"
                  >
                    <div class="font-bold text-ink truncate">{{ event.clientName }}</div>
                    <div class="text-ink-muted truncate">{{ formatTime(event.start) }}</div>
                    <div v-if="event.source === 'google'" class="text-ink-subtle truncate">{{ eventContext(event) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="viewMode === 'month'" class="flex-1 flex flex-col min-h-0 bg-surface" data-testid="month-view">
          <div class="grid grid-cols-7 border-b border-border-muted bg-surface shrink-0">
            <div v-for="d in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="d" class="py-2 text-center text-caption font-bold text-ink-muted uppercase">{{ d }}</div>
          </div>
          <div class="flex-1 grid grid-cols-7 grid-rows-6">
            <div
              v-for="cell in monthCells"
              :key="cell.key"
              class="border-r border-b border-border-muted p-1 flex flex-col gap-1 overflow-hidden"
              :class="[cell.isCurrentMonth ? 'bg-surface' : 'bg-surface-subtle text-ink-muted', cell.isToday ? 'ring-1 ring-inset ring-action-primary/20' : '']"
              @click="selectDate(cell.date)"
            >
              <div class="flex justify-between items-center px-1">
                <span class="text-caption font-bold" :class="cell.isToday ? 'text-action-primary' : ''">{{ cell.date.getDate() }}</span>
              </div>
              <div class="flex-1 flex flex-col gap-0.5 overflow-hidden">
                <div
                  v-for="event in cell.events.slice(0, 3)"
                  :key="event.id"
                  @click.stop="selectAppointment(event, $event)"
                  class="px-1.5 py-0.5 rounded-pill text-caption font-medium truncate border"
                  :class="[event.source === 'google' ? 'bg-action-primary/10 text-action-primary border-action-primary/20' : 'bg-surface-subtle text-ink border-border-muted', selectedEventId === event.id ? 'ring-1 ring-action-primary border-action-primary shadow-sm' : '']"
                >{{ formatTime(event.start) }} {{ event.clientName }}</div>
                <div v-if="cell.events.length > 3" class="px-1.5 text-caption font-bold text-ink-muted">+{{ cell.events.length - 3 }} more</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="selectedEvent && popoverPosition"
        class="fixed z-40 w-[280px] sm:w-72 bg-surface-elevated border border-border-strong rounded-panel shadow-overlay p-4 animate-in fade-in zoom-in duration-200"
        :style="{ top: popoverPosition.top + 'px', left: popoverPosition.left + 'px' }"
        @click.stop
      >
        <div class="flex justify-between items-start mb-3">
          <div class="min-w-0 flex-1">
            <h3 class="text-body font-bold text-ink truncate">{{ selectedEvent.clientName }}</h3>
            <p v-if="selectedEvent.source === 'google' && eventContext(selectedEvent) !== 'Google Calendar'" class="text-body-sm text-ink-secondary truncate mt-0.5">{{ eventContext(selectedEvent) }}</p>
            <p class="text-caption text-ink-secondary">{{ fullEventDateTime(selectedEvent) }}</p>
            <div v-if="selectedEvent.source === 'google'" class="mt-1 flex items-center gap-1">
              <span class="text-caption px-1.5 py-0.5 bg-action-primary/10 text-action-primary rounded-pill font-bold uppercase">Google</span>
              <a v-if="selectedEvent.htmlLink" :href="selectedEvent.htmlLink" target="_blank" class="text-caption text-action-link hover:underline">View in Calendar ↗</a>
            </div>
          </div>
          <button @click="selectedEventId = null" class="text-ink-subtle hover:text-ink-secondary p-1 text-xl leading-none ml-2" aria-label="Close">×</button>
        </div>

        <div v-if="selectedEvent.location" class="mb-3 flex gap-2 items-start overflow-hidden">
          <span class="text-caption flex-shrink-0">📍</span>
          <div class="min-w-0 flex-1">
            <template v-if="isLocationUrl(selectedEvent.location)">
              <a :href="selectedEvent.location" target="_blank" rel="noopener noreferrer" class="text-caption text-action-link hover:underline font-medium block truncate">Open meeting link ↗</a>
              <span class="text-caption text-ink-muted block truncate opacity-70">{{ getLocationHostname(selectedEvent.location) }}</span>
            </template>
            <span v-else class="text-caption text-ink-muted break-words whitespace-pre-wrap leading-tight">{{ selectedEvent.location }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <router-link
            v-if="selectedEvent.clientId && isValidId(selectedEvent.clientId)"
            :to="`/clients/${selectedEvent.clientId}`"
            class="w-full text-center py-2 text-body-sm font-medium text-ink bg-surface border border-border-muted rounded-control hover:bg-surface-subtle transition-colors"
          >Open Client</router-link>
          <router-link
            v-if="selectedEvent.isEligibleForStart"
            :to="`/clients/${selectedEvent.clientId}/sessions/${selectedEvent.originalId}`"
            class="w-full text-center py-2 text-body-sm font-medium text-on-action bg-action-primary rounded-control hover:bg-action-primary-hover transition-colors shadow-sm"
          >Start Session</router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import { useCalendar } from '../composables/useCalendar.js'
import {
  getStartOfWeek,
  isSameDay,
  addMonths,
  getEventStyle,
  getOverlappingGroups,
  isValidId,
  getMiniCalendarCells,
  getViewRange
} from '../lib/calendarHelpers.js'

const {
  loading,
  error,
  normalizedEvents,
  todayEvents,
  upcomingEvents,
  loadData,
  loadGoogleEvents,
  isGoogleConnected,
  googleLoading,
  googleError,
  googleAccount,
  lastSyncedAt
} = useCalendar()

const selectedEventId = ref(null)
const viewDate = ref(new Date())
const viewMode = ref((() => {
  const today = new Date()
  const day = today.getDay()
  return (day === 0 || day === 6) ? 'day' : 'week'
})())
const gridContainer = ref(null)
const popoverPosition = ref(null)
const isAgendaExpanded = ref(true)
const timedGridScrollDay = ref(null)
const timedGridScrollWeek = ref(null)
const miniViewDate = ref(new Date())
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const workingDayStartHour = 8

const updateDimensions = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
  if (windowWidth.value < 1024) isAgendaExpanded.value = false
  else isAgendaExpanded.value = true
}

const isMobile = computed(() => windowWidth.value < 640)
const isTablet = computed(() => windowWidth.value >= 640 && windowWidth.value < 1024)
const hourHeight = computed(() => isMobile.value ? 80 : 60)
const selectedEvent = computed(() => normalizedEvents.value.find(event => event.id === selectedEventId.value))

const isCurrentPeriod = computed(() => {
  const today = new Date()
  if (viewMode.value === 'day') return isSameDay(viewDate.value, today)
  if (viewMode.value === 'week') return isSameDay(getStartOfWeek(viewDate.value), getStartOfWeek(today))
  return viewDate.value.getMonth() === today.getMonth() && viewDate.value.getFullYear() === today.getFullYear()
})

const currentRangeLabel = computed(() => {
  if (viewMode.value === 'day') {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(viewDate.value)
  }
  if (viewMode.value === 'week') {
    const start = getStartOfWeek(viewDate.value)
    const end = new Date(start)
    end.setDate(end.getDate() + 4)
    const options = { day: 'numeric', month: 'short' }
    const yearOptions = { ...options, year: 'numeric' }
    if (start.getFullYear() !== end.getFullYear()) {
      return `${new Intl.DateTimeFormat('en-GB', yearOptions).format(start)} – ${new Intl.DateTimeFormat('en-GB', yearOptions).format(end)}`
    }
    if (start.getMonth() !== end.getMonth()) {
      return `${new Intl.DateTimeFormat('en-GB', options).format(start)} – ${new Intl.DateTimeFormat('en-GB', yearOptions).format(end)}`
    }
    return `${start.getDate()} – ${new Intl.DateTimeFormat('en-GB', yearOptions).format(end)}`
  }
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(viewDate.value)
})

const miniMonthName = computed(() => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(miniViewDate.value))
const workingHours = Array.from({ length: 24 }, (_, i) => i)
const miniCalendarCells = computed(() => getMiniCalendarCells(miniViewDate.value, viewDate.value))

const weekDays = computed(() => {
  const start = getStartOfWeek(viewDate.value)
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    return dayData(date)
  })
})

const monthCells = computed(() => {
  const range = getViewRange(viewDate.value, 'month')
  const cells = []
  const today = new Date()
  for (let i = 0; i < 42; i++) {
    const date = new Date(range.start)
    date.setDate(date.getDate() + i)
    cells.push({
      key: date.toISOString(),
      date,
      isToday: isSameDay(date, today),
      isCurrentMonth: date.getMonth() === viewDate.value.getMonth(),
      events: normalizedEvents.value.filter(event => isSameDay(event.start, date)).sort((a, b) => a.start - b.start)
    })
  }
  return cells
})

function dayData(date) {
  const events = normalizedEvents.value.filter(event => isSameDay(event.start, date))
  return {
    date,
    shortName: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
    isToday: isSameDay(date, new Date()),
    events: events.sort((a, b) => a.start - b.start)
  }
}

const overlappingStyles = computed(() => {
  const styles = {}
  if (viewMode.value === 'day') {
    Object.assign(styles, getOverlappingGroups(dayData(viewDate.value).events.filter(event => !isOutsideWorkingHours(event))))
  } else if (viewMode.value === 'week') {
    weekDays.value.forEach(day => Object.assign(styles, getOverlappingGroups(day.events.filter(event => !isOutsideWorkingHours(event)))))
  }
  return styles
})

async function scrollToWorkingDay() {
  if (viewMode.value === 'month') return
  await nextTick()
  const container = viewMode.value === 'day' ? timedGridScrollDay.value : timedGridScrollWeek.value
  if (!container) return
  window.requestAnimationFrame(() => {
    container.scrollTop = workingDayStartHour * hourHeight.value
  })
}

watch(viewMode, async mode => {
  selectedEventId.value = null
  if (mode !== 'month') await scrollToWorkingDay()
  await refreshEvents()
}, { flush: 'post' })

onMounted(async () => {
  window.addEventListener('resize', updateDimensions)
  window.addEventListener('keydown', handleGlobalEsc)
  updateDimensions()
  await refreshEvents()
  await scrollToWorkingDay()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
  window.removeEventListener('keydown', handleGlobalEsc)
})

function isOutsideWorkingHours() { return false }
function formatTime(date) { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date) }
function formatHour(hour) { return `${hour.toString().padStart(2, '0')}:00` }
function formatDate(date) { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date) }
function fullEventDateTime(event) { return `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(event.start)} at ${formatTime(event.start)}` }
function formatSyncTime(value) { return value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '' }

function eventContext(event) {
  if (event?.source !== 'google') return event?.type || 'Session'
  const title = String(event.title || '').trim()
  const clientName = String(event.clientName || '').trim()
  if (title && title.toLowerCase() !== clientName.toLowerCase()) return title
  return 'Google Calendar'
}

function statusColor(status) {
  switch (status) {
    case 'in_progress': return 'bg-state-warning'
    case 'completed': return 'bg-state-success'
    case 'cancelled': return 'bg-state-danger'
    case 'external': return 'bg-action-primary'
    default: return 'bg-ink-subtle'
  }
}

function isLocationUrl(location) {
  if (!location) return false
  try {
    const url = new URL(location)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch { return false }
}

function getLocationHostname(location) {
  try { return new URL(location).hostname } catch { return '' }
}

async function refreshEvents() {
  const range = getViewRange(viewDate.value, viewMode.value)
  await loadData()
  await loadGoogleEvents(range)
}

function selectAppointment(event, clickEvent) {
  selectedEventId.value = event.id
  if (!clickEvent) return
  const rect = clickEvent.currentTarget.getBoundingClientRect()
  const popoverWidth = window.innerWidth < 640 ? 280 : 288
  const popoverHeight = 220
  const padding = 12
  let left = rect.right + padding
  let top = rect.top
  if (isMobile.value) {
    left = (window.innerWidth - popoverWidth) / 2
    top = (window.innerHeight - popoverHeight) / 2
  } else {
    if (left + popoverWidth + padding > window.innerWidth) left = rect.left - popoverWidth - padding
    left = Math.max(padding, Math.min(left, window.innerWidth - popoverWidth - padding))
    if (top + popoverHeight + padding > window.innerHeight) top = window.innerHeight - popoverHeight - padding
    top = Math.max(padding + 56, Math.min(top, window.innerHeight - popoverHeight - padding))
  }
  popoverPosition.value = { top, left }
}

function selectDate(date) {
  const oldMonth = viewDate.value.getMonth()
  viewDate.value = new Date(date)
  if (viewDate.value.getMonth() !== oldMonth) refreshEvents()
  selectedEventId.value = null
}

async function move(dir) {
  const date = new Date(viewDate.value)
  if (viewMode.value === 'day') date.setDate(date.getDate() + dir)
  else if (viewMode.value === 'week') date.setDate(date.getDate() + (dir * 7))
  else date.setMonth(date.getMonth() + dir)
  viewDate.value = date
  selectedEventId.value = null
  await refreshEvents()
  await scrollToWorkingDay()
}

async function goToday() {
  if (isCurrentPeriod.value) return
  viewDate.value = new Date()
  miniViewDate.value = new Date()
  selectedEventId.value = null
  await refreshEvents()
  await scrollToWorkingDay()
}

function miniPrevMonth() { miniViewDate.value = addMonths(miniViewDate.value, -1) }
function miniNextMonth() { miniViewDate.value = addMonths(miniViewDate.value, 1) }
function reconnectGoogle() { window.location.href = '/settings' }
function handleGlobalEsc(event) { if (event.key === 'Escape') selectedEventId.value = null }
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease-out, transform 0.2s ease-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 10px); }
@media (min-width: 768px) {
  .fade-enter-from, .fade-leave-to { transform: translateY(10px); }
}
</style>
