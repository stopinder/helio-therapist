<template>
  <div class="flex h-[calc(100vh-3.5rem)] overflow-hidden">
    <!-- Agenda Panel -->
    <aside class="w-80 border-r border-border-muted bg-surface flex flex-col shrink-0 overflow-y-auto hidden md:flex">
      <div class="p-page space-y-stack-lg">
        <!-- Mini Month Calendar -->
        <div class="bg-surface-subtle border border-border-muted rounded-panel p-inline-md">
          <div class="flex items-center justify-between mb-stack-sm">
            <span class="text-body-sm font-semibold text-ink">{{ currentMonthName }}</span>
            <div class="flex gap-1">
              <button @click="prevMonth" class="p-1 hover:bg-surface-muted rounded" aria-label="Previous month">‹</button>
              <button @click="nextMonth" class="p-1 hover:bg-surface-muted rounded" aria-label="Next month">›</button>
            </div>
          </div>
          <div class="grid grid-cols-7 gap-1 text-center">
            <span v-for="d in ['M','T','W','T','F','S','S']" :key="d" class="text-caption text-ink-subtle font-bold py-1">{{ d }}</span>
            <div v-for="(cell, idx) in miniCalendarCells" :key="idx" 
              @click="cell.date && selectDate(cell.date)"
              class="text-body-sm p-1 rounded-pill transition-colors"
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

      <!-- Footer -->
      <div class="mt-auto p-inline-md border-t border-border-muted py-stack-sm bg-surface-subtle">
        <p class="text-caption text-ink-subtle leading-tight">
          Showing Helios session records.<br>
          External calendar sync is not connected.
        </p>
      </div>
    </aside>

    <!-- Main Calendar Canvas -->
    <main class="flex-1 flex flex-col bg-surface-canvas overflow-hidden">
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
      <div v-else class="flex-1 overflow-auto relative" ref="gridContainer">
        <div class="flex min-w-[800px] h-full relative">
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
                  class="absolute left-1 right-1 rounded-control border text-caption leading-tight p-1.5 transition-all overflow-hidden z-0 select-none group"
                  :style="getEventStyle(event)"
                  :class="selectedEventId === event.id 
                    ? 'bg-state-selected border-action-primary shadow-md z-10 ring-1 ring-action-primary/20' 
                    : 'bg-surface border-border-muted hover:border-border-strong hover:shadow-sm'"
                >
                  <div class="font-bold text-ink truncate">{{ event.clientName }}</div>
                  <div class="text-ink-secondary">{{ formatTime(event.start) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Popover Action Surface -->
        <div v-if="selectedEvent && popoverPosition" 
          class="fixed z-40 w-64 bg-surface-elevated border border-border-strong rounded-panel shadow-overlay p-4 animate-in fade-in zoom-in duration-200"
          :style="{ top: popoverPosition.top + 'px', left: popoverPosition.left + 'px' }"
        >
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="text-body font-bold text-ink truncate">{{ selectedEvent.clientName }}</h3>
              <p class="text-caption text-ink-secondary">{{ fullEventDateTime(selectedEvent) }}</p>
            </div>
            <button @click="selectedEventId = null" class="text-ink-subtle hover:text-ink-secondary p-1" aria-label="Close">×</button>
          </div>
          <div class="flex flex-col gap-2">
            <router-link 
              v-if="selectedEvent.clientId"
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
import { ref, computed, onMounted } from 'vue'
import { useCalendar } from '../composables/useCalendar'

const { loading, error, normalizedEvents, todayEvents, upcomingEvents, loadData } = useCalendar()
const selectedEventId = ref(null)
const viewDate = ref(new Date())
const gridContainer = ref(null)
const popoverPosition = ref(null)

onMounted(loadData)

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

const workingHours = Array.from({ length: 11 }, (_, i) => i + 8) // 08:00 - 18:00

const miniCalendarCells = computed(() => {
  const d = new Date(viewDate.value)
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  
  // Monday start: (day + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells = []
  
  for (let i = 0; i < startOffset; i++) cells.push({ date: null })
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(d.getFullYear(), d.getMonth(), day)
    cells.push({
      date,
      isToday: isSameDay(date, new Date()),
      isSelected: isSameDay(date, viewDate.value)
    })
  }
  
  return cells
})

const weekDays = computed(() => {
  const start = getStartOfWeek(viewDate.value)
  return Array.from({ length: 7 }, (_, i) => {
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

function getStartOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - (day === 0 ? 6 : day - 1) // Monday start
  const start = new Date(d.setDate(diff))
  start.setHours(0, 0, 0, 0)
  return start
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
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

function statusColor(status) {
  switch (status) {
    case 'in_progress': return 'bg-state-warning'
    case 'completed': return 'bg-state-success'
    case 'cancelled': return 'bg-state-danger'
    default: return 'bg-ink-subtle'
  }
}

function selectAppointment(event, clickEvent) {
  selectedEventId.value = event.id
  
  if (clickEvent && gridContainer.value) {
    const rect = clickEvent.currentTarget.getBoundingClientRect()
    const containerRect = gridContainer.value.getBoundingClientRect()
    
    // Position popover relative to the clicked element, but keep it within view
    let left = rect.right + 10
    let top = rect.top
    
    if (left + 260 > window.innerWidth) {
      left = rect.left - 270
    }
    
    popoverPosition.value = { top, left }
  }
}

function selectDate(date) {
  viewDate.value = new Date(date)
  selectedEventId.value = null
}

function getEventStyle(event) {
  const startHour = event.start.getHours() + event.start.getMinutes() / 60
  const endHour = event.end.getHours() + event.end.getMinutes() / 60
  const duration = endHour - startHour
  
  const top = (startHour - 8) * 80 + 56 // 80px per hour, 56px for header
  const height = Math.max(duration * 80, 24) // Min height for legibility
  
  return {
    top: `${top}px`,
    height: `${height}px`
  }
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
  const d = new Date(viewDate.value)
  d.setMonth(d.getMonth() - 1)
  viewDate.value = d
}

function nextMonth() {
  const d = new Date(viewDate.value)
  d.setMonth(d.getMonth() + 1)
  viewDate.value = d
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
