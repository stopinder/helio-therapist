<template>
  <div class="flex flex-1 h-full overflow-hidden" data-testid="calendar-layout">
    <!-- Agenda Panel (Desktop/Tablet Sidebar) -->
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
          <!-- Mini Month Calendar -->
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
              <div v-for="cell in miniCalendarCells" :key="cell.key" 
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

          <!-- Google Sync State in Sidebar -->
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
                <span class="text-[10px]">✓</span>
                <span class="text-caption font-medium">Connected</span>
              </div>
              <p v-if="googleAccount" class="text-[10px] text-ink-subtle truncate">{{ googleAccount }}</p>
              <p v-if="lastSyncedAt" class="text-[9px] text-ink-subtle uppercase tracking-tighter">Last synced {{ formatSyncTime(lastSyncedAt) }}</p>
            </div>
          </div>

          <!-- Today Section -->
          <section class="space-y-stack-sm">
            <h3 class="text-caption font-bold text-ink-muted uppercase tracking-widest">Today</h3>
            <div v-if="todayEvents.length === 0" class="text-body-sm text-ink-subtle py-stack-sm px-inline-sm italic">
              No appointments today.
            </div>
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
                    <div class="text-caption text-ink-muted truncate">
                      {{ formatTime(event.start) }} · {{ event.type }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Upcoming Section -->
          <section class="space-y-stack-sm">
            <h3 class="text-caption font-bold text-ink-muted uppercase tracking-widest">Upcoming</h3>
            <div v-if="upcomingEvents.length === 0" class="text-body-sm text-ink-subtle py-stack-sm px-inline-sm italic">
              No upcoming appointments.
            </div>
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
                    <div class="text-caption text-ink-muted truncate">
                      {{ formatDate(event.start) }} · {{ formatTime(event.start) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Tablet Collapse Toggle -->
      <button 
        v-if="isTablet" 
        @click="isAgendaExpanded = !isAgendaExpanded"
        class="absolute -right-3 top-20 w-6 h-6 bg-surface border border-border-muted rounded-pill shadow-sm flex items-center justify-center z-40 hover:bg-surface-elevated transition-colors"
      >
        <span class="text-caption leading-none">{{ isAgendaExpanded ? '‹' : '›' }}</span>
      </button>

      <!-- Footer (Settings Link) -->
      <div v-if="!isTablet || isAgendaExpanded" class="mt-auto p-inline-md border-t border-border-muted py-stack-sm bg-surface-subtle">
        <router-link to="/settings" class="text-caption font-medium text-action-link hover:underline flex items-center gap-1">
          <span>⚙</span> Google Calendar Settings
        </router-link>
      </div>
    </aside>

    <!-- Main Calendar Canvas -->
    <main class="flex-1 flex flex-col bg-surface-canvas overflow-hidden relative" data-testid="calendar-canvas">
      <!-- Mobile Agenda Toggle -->
      <button 
        v-if="isMobile" 
        @click="isAgendaExpanded = !isAgendaExpanded"
        class="fixed bottom-6 right-6 w-14 h-14 bg-action-primary text-on-action rounded-pill shadow-overlay flex items-center justify-center z-50 hover:bg-action-primary-hover transition-all"
        :class="isAgendaExpanded ? 'rotate-45' : ''"
      >
        <span class="text-2xl">{{ isAgendaExpanded ? '+' : '📅' }}</span>
      </button>

      <!-- Calendar Header/Toolbar -->
      <header class="h-14 flex items-center justify-between px-page border-b border-border-muted bg-surface shrink-0 z-20">
        <div class="flex items-center gap-inline-md">
          <h2 class="text-body font-semibold text-ink">{{ currentRangeLabel }}</h2>
          <div class="flex items-center bg-surface-muted rounded-control p-0.5 border border-border-muted">
            <button @click="move(-1)" class="px-2 py-0.5 hover:bg-surface-elevated rounded transition-colors" aria-label="Previous">‹</button>
            <button @click="goToday" class="px-inline-sm py-0.5 text-body-sm font-medium hover:bg-surface-elevated rounded transition-colors">Today</button>
            <button @click="move(1)" class="px-2 py-0.5 hover:bg-surface-elevated rounded transition-colors" aria-label="Next">›</button>
          </div>
        </div>
        
        <div class="flex items-center gap-inline-sm">
          <!-- View Switcher -->
          <div class="bg-surface-muted rounded-control p-0.5 flex border border-border-muted">
            <button 
              v-for="mode in ['day', 'week', 'month']" 
              :key="mode"
              @click="viewMode = mode"
              class="px-inline-md py-stack-xs text-body-sm font-medium rounded-control capitalize transition-all"
              :class="viewMode === mode ? 'bg-surface-elevated shadow-sm text-ink' : 'text-ink-muted hover:text-ink'"
            >
              {{ mode }}
            </button>
          </div>
          
          <!-- Sync Button -->
          <button 
            v-if="isGoogleConnected"
            @click="refreshEvents"
            class="p-2 text-ink-muted hover:text-action-primary transition-colors rounded-pill hover:bg-surface-muted"
            :class="{ 'animate-spin': googleLoading }"
            title="Refresh events"
          >
            ↻
          </button>
        </div>
      </header>

      <!-- Loading/Error State -->
      <div v-if="loading && !normalizedEvents.length" class="flex-1 flex items-center justify-center">
        <p class="text-ink-muted animate-pulse">Loading calendar...</p>
      </div>
      <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center p-page text-center">
        <p class="text-body text-state-danger mb-stack-md">{{ error }}</p>
        <button @click="loadData" class="px-inline-md py-stack-sm bg-action-primary text-on-action rounded-control font-medium">Retry</button>
      </div>

      <!-- Grid Area -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden relative" ref="gridContainer" @click="selectedEventId = null">
        <!-- Day View -->
        <div v-if="viewMode === 'day'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface">
          <!-- Timed Scroll Area (Actually fitted, no scrollbar) -->
          <div class="flex-1 flex relative overflow-hidden" data-testid="timed-grid-scroll">
            <!-- Time Axis -->
            <div class="w-16 border-r border-border-muted bg-surface shrink-0">
              <div class="relative h-full">
                <div v-for="hour in workingHours" :key="hour" 
                  class="border-b border-border-muted/30 text-right pr-2 pt-1"
                  :style="{ height: hourHeight + 'px' }"
                >
                  <span class="text-caption font-bold text-ink-subtle uppercase">{{ formatHour(hour) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Day Content -->
            <div class="flex-1 relative h-full bg-surface-canvas overflow-hidden">
              <!-- Earlier Indicator -->
              <div v-if="hasEarlierEvents(dayData(viewDate).events)" class="absolute top-0 left-0 right-0 z-20 bg-surface-subtle/90 border-b border-border-muted p-1 text-[10px] text-center font-bold text-ink-muted uppercase">
                Earlier events ({{ earlierEvents(dayData(viewDate).events).length }})
              </div>
              
              <!-- Hour markers background -->
              <div v-for="hour in workingHours" :key="'bg-'+hour" class="border-b border-border-muted/30" :style="{ height: hourHeight + 'px' }"></div>
              
              <!-- Events -->
              <div 
                v-for="event in dayData(viewDate).events.filter(e => !isOutsideWorkingHours(e))" 
                :key="event.id"
                @click.stop="selectAppointment(event, $event)"
                class="absolute rounded-control border text-caption leading-tight p-2 transition-all overflow-hidden select-none group focus-visible:ring-2 focus-visible:ring-action-primary outline-none"
                :style="getEventStyle(event, overlappingStyles[event.id], hourHeight, 8)"
                :class="[
                  selectedEventId === event.id 
                    ? 'bg-state-selected border-action-primary shadow-md z-20 ring-1 ring-action-primary/20' 
                    : 'bg-surface border-border-muted hover:border-border-strong hover:shadow-sm z-10'
                ]"
              >
                <div class="font-bold text-ink truncate">{{ event.clientName }}</div>
                <div class="text-ink-secondary">{{ formatTime(event.start) }} – {{ formatTime(event.end) }}</div>
                <div v-if="event.source === 'google'" class="text-[10px] text-action-primary mt-0.5">Google Calendar</div>
              </div>

              <!-- Later Indicator -->
              <div v-if="hasLaterEvents(dayData(viewDate).events)" class="absolute bottom-0 left-0 right-0 z-20 bg-surface-subtle/90 border-t border-border-muted p-1 text-[10px] text-center font-bold text-ink-muted uppercase">
                Later events ({{ laterEvents(dayData(viewDate).events).length }})
              </div>
            </div>
          </div>
        </div>

        <!-- Week View -->
        <div v-else-if="viewMode === 'week'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface" data-testid="week-view">
          <div class="flex flex-1 relative overflow-hidden" data-testid="timed-grid-scroll">
            <!-- Time Axis -->
            <div class="w-16 border-r border-border-muted bg-surface shrink-0">
              <div class="h-10 border-b border-border-muted"></div> <!-- Header spacer -->
              <div class="relative">
                <div v-for="hour in workingHours" :key="hour" 
                  class="border-b border-border-muted/30 text-right pr-2 pt-1"
                  :style="{ height: hourHeight + 'px' }"
                >
                  <span class="text-caption font-bold text-ink-subtle uppercase">{{ formatHour(hour) }}</span>
                </div>
              </div>
            </div>

            <!-- Days Grid -->
            <div class="flex-1 grid grid-cols-5 h-full relative">
              <div v-for="day in weekDays" :key="day.date.toISOString()" 
                class="border-r border-border-muted flex flex-col h-full relative"
                :class="day.isToday ? 'bg-surface-subtle' : ''"
              >
                <!-- Day Header -->
                <div class="h-10 border-b border-border-muted flex items-center justify-center gap-2 sticky top-0 bg-surface z-10">
                  <span class="text-caption font-bold text-ink-muted uppercase">{{ day.shortName }}</span>
                  <span class="text-body-sm font-bold" :class="day.isToday ? 'text-action-primary' : 'text-ink'">{{ day.date.getDate() }}</span>
                </div>

                <!-- Events Container -->
                <div class="flex-1 relative overflow-hidden bg-surface-canvas/30">
                  <!-- Earlier Indicator -->
                  <div v-if="hasEarlierEvents(day.events)" class="absolute top-0 left-0 right-0 z-20 bg-surface-subtle/90 border-b border-border-muted px-1 py-0.5 text-[9px] text-center font-bold text-ink-muted">
                    Earlier ({{ earlierEvents(day.events).length }})
                  </div>

                  <!-- Hour markers background -->
                  <div v-for="hour in workingHours" :key="'bg-'+hour" class="border-b border-border-muted/30" :style="{ height: hourHeight + 'px' }"></div>
                  
                  <!-- Events -->
                  <div 
                    v-for="event in day.events.filter(e => !isOutsideWorkingHours(e))" 
                    :key="event.id"
                    @click.stop="selectAppointment(event, $event)"
                    class="absolute rounded-control border text-[10px] leading-tight p-1 transition-all overflow-hidden select-none group focus-visible:ring-2 focus-visible:ring-action-primary outline-none"
                    :style="getEventStyle(event, overlappingStyles[event.id], hourHeight, 8)"
                    :class="[
                      selectedEventId === event.id 
                        ? 'bg-state-selected border-action-primary shadow-md z-20' 
                        : 'bg-surface border-border-muted hover:border-border-strong hover:shadow-sm z-10'
                    ]"
                  >
                    <div class="font-bold text-ink truncate">{{ event.clientName }}</div>
                    <div class="text-ink-muted truncate">{{ formatTime(event.start) }}</div>
                  </div>

                  <!-- Later Indicator -->
                  <div v-if="hasLaterEvents(day.events)" class="absolute bottom-0 left-0 right-0 z-20 bg-surface-subtle/90 border-t border-border-muted px-1 py-0.5 text-[9px] text-center font-bold text-ink-muted">
                    Later ({{ laterEvents(day.events).length }})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Month View -->
        <div v-else-if="viewMode === 'month'" class="flex-1 flex flex-col min-h-0 bg-surface" data-testid="month-view">
          <!-- Weekday Headers -->
          <div class="grid grid-cols-7 border-b border-border-muted bg-surface shrink-0">
            <div v-for="d in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="d" class="py-2 text-center text-caption font-bold text-ink-muted uppercase">
              {{ d }}
            </div>
          </div>
          
          <!-- Month Grid (6 rows) -->
          <div class="flex-1 grid grid-cols-7 grid-rows-6">
            <div v-for="cell in monthCells" :key="cell.key" 
              class="border-r border-b border-border-muted p-1 flex flex-col gap-1 overflow-hidden"
              :class="[
                cell.isCurrentMonth ? 'bg-surface' : 'bg-surface-subtle text-ink-muted',
                cell.isToday ? 'ring-1 ring-inset ring-action-primary/20' : ''
              ]"
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
                  class="px-1.5 py-0.5 rounded-pill text-[10px] font-medium truncate border"
                  :class="[
                    event.source === 'google' ? 'bg-action-primary/10 text-action-primary border-action-primary/20' : 'bg-surface-subtle text-ink border-border-muted',
                    selectedEventId === event.id ? 'ring-1 ring-action-primary border-action-primary shadow-sm' : ''
                  ]"
                >
                  {{ formatTime(event.start) }} {{ event.clientName }}
                </div>
                <div v-if="cell.events.length > 3" class="px-1.5 text-[10px] font-bold text-ink-muted">
                  +{{ cell.events.length - 3 }} more
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Popover -->
      <div v-if="selectedEvent && popoverPosition" 
        class="fixed z-40 w-64 bg-surface-elevated border border-border-strong rounded-panel shadow-overlay p-4 animate-in fade-in zoom-in duration-200"
        :style="{ top: popoverPosition.top + 'px', left: popoverPosition.left + 'px' }"
        @click.stop
      >
        <div class="flex justify-between items-start mb-3">
          <div class="min-w-0 flex-1">
            <h3 class="text-body font-bold text-ink truncate">{{ selectedEvent.clientName }}</h3>
            <p class="text-caption text-ink-secondary">{{ fullEventDateTime(selectedEvent) }}</p>
            <div v-if="selectedEvent.source === 'google'" class="mt-1 flex items-center gap-1">
              <span class="text-[10px] px-1.5 py-0.5 bg-action-primary/10 text-action-primary rounded-pill font-bold uppercase">Google</span>
              <a v-if="selectedEvent.htmlLink" :href="selectedEvent.htmlLink" target="_blank" class="text-[10px] text-action-link hover:underline">View in Calendar ↗</a>
            </div>
          </div>
          <button @click="selectedEventId = null" class="text-ink-subtle hover:text-ink-secondary p-1 text-xl leading-none ml-2" aria-label="Close">×</button>
        </div>
        
        <div v-if="selectedEvent.location" class="mb-3 flex gap-2 items-start">
          <span class="text-caption">📍</span>
          <span class="text-caption text-ink-muted break-words">{{ selectedEvent.location }}</span>
        </div>

        <div class="flex flex-col gap-2">
          <router-link 
            v-if="selectedEvent.clientId && isValidId(selectedEvent.clientId)"
            :to="`/clients/${selectedEvent.clientId}`"
            class="w-full text-center py-2 text-body-sm font-medium text-ink bg-surface border border-border-muted rounded-control hover:bg-surface-subtle transition-colors"
          >
            Open Client
          </router-link>
          <router-link 
            v-if="selectedEvent.isEligibleForStart"
            :to="`/clients/${selectedEvent.clientId}/sessions/${selectedEvent.originalId}`"
            class="w-full text-center py-2 text-body-sm font-medium text-on-action bg-action-primary rounded-control hover:bg-action-primary-hover transition-colors shadow-sm"
          >
            Start Session
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
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
const viewMode = ref('week')
const gridContainer = ref(null)
const popoverPosition = ref(null)
const isAgendaExpanded = ref(true)

const miniViewDate = ref(new Date())

const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)

const updateDimensions = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
  if (windowWidth.value < 1024) isAgendaExpanded.value = false
  else isAgendaExpanded.value = true
}

// Figma-like: fit 10 hours (8-18) in the available viewport height minus headers
const hourHeight = computed(() => {
  if (isMobile.value) return 80
  const headerHeight = 56 // header
  const dayHeaderHeight = viewMode.value === 'week' ? 40 : 0
  const available = windowHeight.value - headerHeight - dayHeaderHeight
  return Math.max(available / 10, 60)
})

onMounted(() => {
  refreshEvents()
  window.addEventListener('resize', updateDimensions)
  window.addEventListener('keydown', handleGlobalEsc)
  updateDimensions()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
  window.removeEventListener('keydown', handleGlobalEsc)
})

const isMobile = computed(() => windowWidth.value < 640)
const isTablet = computed(() => windowWidth.value >= 640 && windowWidth.value < 1024)

const selectedEvent = computed(() => {
  return normalizedEvents.value.find(e => e.id === selectedEventId.value)
})

const currentRangeLabel = computed(() => {
  if (viewMode.value === 'day') {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(viewDate.value)
  }
  
  if (viewMode.value === 'week') {
    const start = getStartOfWeek(viewDate.value)
    const end = new Date(start)
    end.setDate(end.getDate() + 4) // Friday per instructions "Monday-Friday fitted"
    
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

const miniMonthName = computed(() => {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(miniViewDate.value)
})

const workingHours = Array.from({ length: 11 }, (_, i) => i + 8) // 08:00 - 18:00

const miniCalendarCells = computed(() => {
  return getMiniCalendarCells(miniViewDate.value, viewDate.value)
})

const weekDays = computed(() => {
  const start = getStartOfWeek(viewDate.value)
  return Array.from({ length: 5 }, (_, i) => { // Monday-Friday
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
      events: normalizedEvents.value.filter(e => isSameDay(e.start, date)).sort((a, b) => a.start - b.start)
    })
  }
  return cells
})

function dayData(date) {
  const events = normalizedEvents.value.filter(e => isSameDay(e.start, date))
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
    Object.assign(styles, getOverlappingGroups(dayData(viewDate.value).events.filter(e => !isOutsideWorkingHours(e))))
  } else if (viewMode.value === 'week') {
    weekDays.value.forEach(day => {
      Object.assign(styles, getOverlappingGroups(day.events.filter(e => !isOutsideWorkingHours(e))))
    })
  }
  return styles
})

function isOutsideWorkingHours(event) {
  const startHour = event.start.getHours()
  const endHour = event.end.getHours() + (event.end.getMinutes() > 0 ? 1 : 0)
  return startHour < 8 || endHour > 18
}

function earlierEvents(events) {
  return events.filter(e => e.start.getHours() < 8)
}

function hasEarlierEvents(events) {
  return earlierEvents(events).length > 0
}

function laterEvents(events) {
  return events.filter(e => {
    const endHour = e.end.getHours() + (e.end.getMinutes() > 0 ? 1 : 0)
    return endHour > 18
  })
}

function hasLaterEvents(events) {
  return laterEvents(events).length > 0
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatHour(hour) {
  return `${hour.toString().padStart(2, '0')}:00`
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function fullEventDateTime(event) {
  return `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(event.start)} at ${formatTime(event.start)}`
}

function formatSyncTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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

async function refreshEvents() {
  const range = getViewRange(viewDate.value, viewMode.value)
  await loadData()
  await loadGoogleEvents(range)
}

function selectAppointment(event, clickEvent) {
  selectedEventId.value = event.id
  
  if (clickEvent) {
    const rect = clickEvent.currentTarget.getBoundingClientRect()
    const popoverWidth = 256
    const popoverHeight = 180
    const padding = 10
    
    let left = rect.right + padding
    let top = rect.top
    
    if (isMobile.value) {
      left = (window.innerWidth - popoverWidth) / 2
      top = (window.innerHeight - popoverHeight) / 2
    } else {
      if (left + popoverWidth + padding > window.innerWidth) {
        left = rect.left - popoverWidth - padding
      }
      left = Math.max(padding, Math.min(left, window.innerWidth - popoverWidth - padding))
      
      if (top + popoverHeight + padding > window.innerHeight) {
        top = window.innerHeight - popoverHeight - padding
      }
      top = Math.max(padding + 56, Math.min(top, window.innerHeight - popoverHeight - padding))
    }
    popoverPosition.value = { top, left }
  }
}

function selectDate(date) {
  const oldMonth = viewDate.value.getMonth()
  viewDate.value = new Date(date)
  if (viewDate.value.getMonth() !== oldMonth) {
    refreshEvents()
  }
  selectedEventId.value = null
}

function move(dir) {
  const d = new Date(viewDate.value)
  if (viewMode.value === 'day') d.setDate(d.getDate() + dir)
  else if (viewMode.value === 'week') d.setDate(d.getDate() + (dir * 7))
  else if (viewMode.value === 'month') d.setMonth(d.getMonth() + dir)
  
  viewDate.value = d
  selectedEventId.value = null
  refreshEvents()
}

function goToday() {
  viewDate.value = new Date()
  selectedEventId.value = null
  refreshEvents()
}

function miniPrevMonth() {
  miniViewDate.value = addMonths(miniViewDate.value, -1)
}

function miniNextMonth() {
  miniViewDate.value = addMonths(miniViewDate.value, 1)
}

function reconnectGoogle() {
  window.location.href = '/settings'
}

function handleGlobalEsc(e) {
  if (e.key === 'Escape') {
    selectedEventId.value = null
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
@media (min-width: 768px) {
  .fade-enter-from, .fade-leave-to {
    transform: translateY(10px);
  }
}
</style>
