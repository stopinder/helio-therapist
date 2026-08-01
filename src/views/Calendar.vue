<template>
  <div class="flex flex-1 overflow-hidden">
    <!-- Agenda Panel -->
    <aside 
      class="border-r border-border-muted bg-surface flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30"
      :class="[
        isMobile ? (isAgendaExpanded ? 'fixed inset-0 pt-14 flex' : 'hidden') : '',
        !isMobile && isTablet ? (isAgendaExpanded ? 'w-72 flex' : 'w-12 flex') : '',
        !isMobile && !isTablet ? 'w-72 flex' : ''
      ]"
    >
      <div v-if="!isTablet || isAgendaExpanded" class="flex-1 flex flex-col overflow-y-auto">
        <div class="p-page space-y-stack-lg">
          <!-- Mini Month Calendar -->
          <div class="bg-surface-subtle border border-border-muted rounded-panel p-inline-md">
            <div class="flex items-center justify-between mb-stack-sm mt-stack-sm">
              <span class="text-body-sm font-semibold text-ink">{{ currentMonthName }}</span>
              <div class="flex gap-1">
                <button @click="prevMonth" class="p-1 hover:bg-surface-muted rounded" aria-label="Previous month">‹</button>
                <button @click="nextMonth" class="p-1 hover:bg-surface-muted rounded" aria-label="Next month">›</button>
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

      <!-- Tablet Collapse Toggle -->
      <button 
        v-if="isTablet" 
        @click="isAgendaExpanded = !isAgendaExpanded"
        class="absolute -right-3 top-20 w-6 h-6 bg-surface border border-border-muted rounded-pill shadow-sm flex items-center justify-center z-40 hover:bg-surface-elevated transition-colors"
      >
        <span class="text-caption leading-none">{{ isAgendaExpanded ? '‹' : '›' }}</span>
      </button>

      <!-- Footer -->
      <div v-if="!isTablet || isAgendaExpanded" class="mt-auto p-inline-md border-t border-border-muted py-stack-sm bg-surface-subtle">
        <p class="text-caption text-ink-subtle leading-tight">
          Showing Helios session records.<br>
          External calendar sync is not connected.
        </p>
      </div>
    </aside>

    <!-- Main Calendar Canvas -->
    <main class="flex-1 flex flex-col bg-surface-canvas overflow-hidden relative">
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
            <button @click="moveWeek(-1)" class="px-2 py-0.5 hover:bg-surface-elevated rounded transition-colors" aria-label="Previous week">‹</button>
            <button @click="goToday" class="px-inline-sm py-0.5 text-body-sm font-medium hover:bg-surface-elevated rounded transition-colors">Today</button>
            <button @click="moveWeek(1)" class="px-2 py-0.5 hover:bg-surface-elevated rounded transition-colors" aria-label="Next week">›</button>
          </div>
        </div>
        <div class="flex items-center gap-inline-sm">
          <div class="bg-surface-muted rounded-control p-0.5 flex border border-border-muted">
            <button class="px-inline-md py-stack-xs text-body-sm font-medium bg-surface-elevated shadow-sm rounded-control">Week</button>
          </div>
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

      <!-- Grid -->
      <div v-else class="flex-1 overflow-auto relative" ref="gridContainer" @click="selectedEventId = null">
        <div v-if="!isMobile" class="flex h-full relative" :class="isTablet ? 'min-w-[600px]' : 'min-w-calendar-grid'">
          <!-- Time Axis -->
          <div class="w-16 border-r border-border-muted bg-surface sticky left-0 z-10 shrink-0">
            <div class="h-14 border-b border-border-muted bg-surface"></div> <!-- Matches day header -->
            <div class="relative">
              <div v-for="hour in workingHours" :key="hour" 
                class="h-20 border-b border-border-muted/30 text-right pr-2 pt-1"
              >
                <span class="text-caption font-bold text-ink-subtle uppercase">{{ formatHour(hour) }}</span>
              </div>
            </div>
          </div>

          <!-- Week Days -->
          <div class="flex-1 grid grid-cols-5 h-full relative">
            <div v-for="day in weekDays.slice(0, 5)" :key="day.date.toISOString()" 
              class="border-r border-border-muted flex flex-col min-h-full"
              :class="day.isToday ? 'bg-surface-subtle' : ''"
            >
              <!-- Day Header -->
              <div class="sticky top-0 bg-surface border-b border-border-muted p-stack-sm text-center z-10 h-14 flex flex-col justify-center">
                <div class="text-caption font-bold text-ink-muted uppercase tracking-wider">{{ day.shortName }}</div>
                <div class="text-body font-semibold" :class="day.isToday ? 'text-action-primary' : 'text-ink'">{{ day.date.getDate() }}</div>
              </div>

              <!-- Events Container (Timed) -->
              <div class="flex-1 relative">
                <!-- Hour markers background -->
                <div v-for="hour in workingHours" :key="'bg-'+hour" class="h-20 border-b border-border-muted/30"></div>
                
                <!-- Events -->
                <div 
                  v-for="event in day.events" 
                  :key="event.id"
                  @click.stop="selectAppointment(event, $event)"
                  @keydown.enter.stop="selectAppointment(event, $event)"
                  @keydown.space.prevent.stop="selectAppointment(event, $event)"
                  tabindex="0"
                  class="absolute rounded-control border text-caption leading-tight p-1.5 transition-all overflow-hidden select-none group focus-visible:ring-2 focus-visible:ring-action-primary outline-none"
                  :style="getEventStyle(event, overlappingStyles[event.id])"
                  :class="[
                    selectedEventId === event.id 
                      ? 'bg-state-selected border-action-primary shadow-md z-20 ring-1 ring-action-primary/20' 
                      : 'bg-surface border-border-muted hover:border-border-strong hover:shadow-sm z-10'
                  ]"
                >
                  <div class="font-bold text-ink truncate">{{ event.clientName }}</div>
                  <div class="text-ink-secondary">{{ formatTime(event.start) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Agenda-First View -->
        <div v-else class="h-full flex flex-col bg-surface">
          <!-- Day Tabs -->
          <div class="flex border-b border-border-muted bg-surface sticky top-0 z-20">
            <button 
              v-for="day in weekDays.slice(0, 5)" 
              :key="'tab-'+day.date.toISOString()"
              @click="selectDate(day.date)"
              class="flex-1 py-3 text-center transition-colors border-b-2"
              :class="isSameDay(day.date, viewDate) ? 'border-action-primary text-action-primary font-bold' : 'border-transparent text-ink-muted'"
            >
              <div class="text-overline uppercase tracking-tighter">{{ day.shortName }}</div>
              <div class="text-body-sm">{{ day.date.getDate() }}</div>
            </button>
          </div>
          
          <!-- Selected Day Events -->
          <div class="flex-1 overflow-y-auto p-page">
            <div v-if="currentDayEvents.length === 0" class="flex flex-col items-center justify-center h-40 text-ink-subtle">
              <span class="text-4xl mb-2">📅</span>
              <p>No appointments for this day.</p>
            </div>
            <div v-else class="space-y-stack-md">
              <div 
                v-for="event in currentDayEvents" 
                :key="'mobile-'+event.id"
                @click.stop="selectAppointment(event, $event)"
                class="bg-surface border border-border-muted rounded-panel p-inline-md py-stack-md shadow-sm active:bg-surface-subtle transition-colors"
                :class="selectedEventId === event.id ? 'ring-2 ring-action-primary border-transparent' : ''"
              >
                <div class="flex justify-between items-start mb-1">
                  <span class="text-body font-bold text-ink">{{ event.clientName }}</span>
                  <span class="text-caption font-medium px-2 py-0.5 rounded-pill" :class="statusBadgeClass(event.status)">
                    {{ event.status }}
                  </span>
                </div>
                <div class="text-body-sm text-ink-muted flex gap-2 items-center">
                  <span>{{ formatTime(event.start) }} – {{ formatTime(event.end) }}</span>
                  <span class="w-1 h-1 bg-ink-subtle rounded-pill"></span>
                  <span>{{ event.type }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedEvent && popoverPosition" 
          class="fixed z-40 w-64 bg-surface-elevated border border-border-strong rounded-panel shadow-overlay p-4 animate-in fade-in zoom-in duration-200"
          :style="{ top: popoverPosition.top + 'px', left: popoverPosition.left + 'px' }"
          @click.stop
        >
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="text-body font-bold text-ink truncate">{{ selectedEvent.clientName }}</h3>
              <p class="text-caption text-ink-secondary">{{ fullEventDateTime(selectedEvent) }}</p>
            </div>
            <button @click="selectedEventId = null" class="text-ink-subtle hover:text-ink-secondary p-1 text-xl leading-none" aria-label="Close">×</button>
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
              :to="`/clients/${selectedEvent.clientId}/sessions/${selectedEvent.id}`"
              class="w-full text-center py-2 text-body-sm font-medium text-on-action bg-action-primary rounded-control hover:bg-action-primary-hover transition-colors shadow-sm"
            >
              Start Session
            </router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCalendar } from '../composables/useCalendar'
import { 
  getStartOfWeek, 
  isSameDay, 
  addMonths, 
  getEventStyle, 
  getOverlappingGroups,
  isValidId
} from '../lib/calendarHelpers.js'

const { loading, error, normalizedEvents, todayEvents, upcomingEvents, loadData } = useCalendar()
const selectedEventId = ref(null)
const viewDate = ref(new Date())
const gridContainer = ref(null)
const popoverPosition = ref(null)
const isAgendaExpanded = ref(true)

const windowWidth = ref(window.innerWidth)
const updateWidth = () => {
  windowWidth.value = window.innerWidth
  if (windowWidth.value < 1024) isAgendaExpanded.value = false
  else isAgendaExpanded.value = true
}

// Custom directive for Escape key
const vKeydownEsc = {
  mounted(el, binding) {
    el._escHandler = (e) => {
      if (e.key === 'Escape' && typeof binding.value === 'function') {
        binding.value()
      }
    }
    window.addEventListener('keydown', el._escHandler)
  },
  unmounted(el) {
    window.removeEventListener('keydown', el._escHandler)
  }
}

const handleGlobalEsc = (e) => {
  if (e.key === 'Escape') {
    selectedEventId.value = null
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', updateWidth)
  window.addEventListener('keydown', handleGlobalEsc)
  updateWidth()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
  window.removeEventListener('keydown', handleGlobalEsc)
})

const isMobile = computed(() => windowWidth.value < 640)
const isTablet = computed(() => windowWidth.value >= 640 && windowWidth.value < 1024)

const selectedEvent = computed(() => {
  return normalizedEvents.value.find(e => e.id === selectedEventId.value)
})

const currentMonthName = computed(() => {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(viewDate.value)
})

const currentRangeLabel = computed(() => {
  const start = getStartOfWeek(viewDate.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 4) // Friday
  
  const options = { day: 'numeric', month: 'short' }
  const yearOptions = { ...options, year: 'numeric' }
  
  if (start.getFullYear() !== end.getFullYear()) {
    return `${new Intl.DateTimeFormat('en-GB', yearOptions).format(start)} – ${new Intl.DateTimeFormat('en-GB', yearOptions).format(end)}`
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${new Intl.DateTimeFormat('en-GB', options).format(start)} – ${new Intl.DateTimeFormat('en-GB', yearOptions).format(end)}`
  }
  return `${start.getDate()} – ${new Intl.DateTimeFormat('en-GB', yearOptions).format(end)}`
})

const workingHours = Array.from({ length: 10 }, (_, i) => i + 8) // 08:00 - 17:00 (10 rows)

const miniCalendarCells = computed(() => {
  const d = new Date(viewDate.value)
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  
  // Monday start: (day + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells = []
  
  // Leading blank cells
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, key: `lead-${i}` })
  }
  
  // Month dates
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(d.getFullYear(), d.getMonth(), day)
    cells.push({
      date,
      key: date.toISOString(),
      isToday: isSameDay(date, new Date()),
      isSelected: isSameDay(date, viewDate.value)
    })
  }

  // Trailing blank cells to fill 6 rows (42 cells)
  const remaining = 42 - cells.length
  for (let i = 0; i < remaining; i++) {
    cells.push({ date: null, key: `trail-${i}` })
  }
  
  return cells
})

const weekDays = computed(() => {
  const start = getStartOfWeek(viewDate.value)
  return Array.from({ length: 5 }, (_, i) => { // Monday-Friday week view
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const isToday = isSameDay(date, new Date())
    const events = normalizedEvents.value.filter(e => isSameDay(e.start, date))
    return {
      date,
      shortName: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
      isToday,
      events: events.sort((a, b) => a.start - b.start)
    }
  })
})

const currentDayEvents = computed(() => {
  return normalizedEvents.value
    .filter(e => isSameDay(e.start, viewDate.value))
    .sort((a, b) => a.start - b.start)
})

const overlappingStyles = computed(() => {
  const styles = {}
  weekDays.value.forEach(day => {
    Object.assign(styles, getOverlappingGroups(day.events))
  })
  return styles
})

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

function statusColor(status) {
  switch (status) {
    case 'in_progress': return 'bg-state-warning'
    case 'completed': return 'bg-state-success'
    case 'cancelled': return 'bg-state-danger'
    default: return 'bg-ink-subtle'
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'in_progress': return 'bg-state-warning/10 text-state-warning border border-state-warning/20'
    case 'completed': return 'bg-state-success/10 text-state-success border border-state-success/20'
    case 'cancelled': return 'bg-state-danger/10 text-state-danger border border-state-danger/20'
    default: return 'bg-surface-muted text-ink-subtle border border-border-muted'
  }
}

function selectAppointment(event, clickEvent) {
  selectedEventId.value = event.id
  
  if (clickEvent && gridContainer.value) {
    const rect = clickEvent.currentTarget.getBoundingClientRect()
    
    // Position popover relative to the clicked element
    let left = rect.right + 10
    let top = rect.top
    
    // Mobile adjustment
    if (isMobile.value) {
      left = (window.innerWidth - 256) / 2
      top = (window.innerHeight - 200) / 2
    } else {
      if (left + 260 > window.innerWidth) {
        left = rect.left - 270
      }
    }
    
    popoverPosition.value = { top, left }
  }
}

function selectDate(date) {
  viewDate.value = new Date(date)
  selectedEventId.value = null
}

function moveWeek(dir) {
  const d = new Date(viewDate.value)
  d.setDate(d.getDate() + (dir * 7))
  viewDate.value = d
  selectedEventId.value = null
}

function goToday() {
  viewDate.value = new Date()
  selectedEventId.value = null
}

function prevMonth() {
  viewDate.value = addMonths(viewDate.value, -1)
}

function nextMonth() {
  viewDate.value = addMonths(viewDate.value, 1)
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
