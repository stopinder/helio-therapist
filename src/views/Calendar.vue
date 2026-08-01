<template>
  <AppShell>
    <div class="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <!-- Agenda Panel -->
      <aside class="w-80 border-r border-border-muted bg-surface flex flex-col shrink-0 overflow-y-auto hidden md:flex">
        <div class="p-page space-y-stack-lg">
          <!-- Mini Month Calendar Placeholder -->
          <div class="bg-surface-subtle border border-border-muted rounded-panel p-inline-md">
            <div class="flex items-center justify-between mb-stack-sm">
              <span class="text-body-sm font-semibold text-ink">{{ currentMonthName }}</span>
              <div class="flex gap-1">
                <button @click="prevMonth" class="p-1 hover:bg-surface-muted rounded">‹</button>
                <button @click="nextMonth" class="p-1 hover:bg-surface-muted rounded">›</button>
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center">
              <span v-for="d in ['M','T','W','T','F','S','S']" :key="d" class="text-caption text-ink-subtle font-bold">{{ d }}</span>
              <!-- Simple month grid placeholder -->
              <div v-for="n in 31" :key="n" 
                class="text-body-sm p-1 rounded-pill"
                :class="n === currentDay ? 'bg-action-primary text-on-action' : 'hover:bg-surface-muted cursor-pointer'"
              >
                {{ n }}
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
                @click="selectAppointment(event)"
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
                @click="selectAppointment(event)"
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
          <p class="text-caption text-ink-subtle">
            Calendar integration not connected
          </p>
        </div>
      </aside>

      <!-- Main Calendar Canvas -->
      <main class="flex-1 flex flex-col bg-surface-canvas overflow-hidden">
        <!-- Calendar Header/Toolbar -->
        <header class="h-14 flex items-center justify-between px-page border-b border-border-muted bg-surface shrink-0">
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
              <button class="px-inline-md py-stack-xs text-body-sm font-medium text-ink-muted hover:text-ink transition-colors" disabled>Day</button>
            </div>
          </div>
        </header>

        <!-- Grid -->
        <div class="flex-1 overflow-auto relative">
          <!-- Desktop Week Grid -->
          <div class="grid grid-cols-7 h-full min-w-[800px]">
            <div v-for="day in weekDays" :key="day.date.toISOString()" 
              class="border-r border-border-muted flex flex-col min-h-full"
              :class="day.isToday ? 'bg-surface-subtle/30' : ''"
            >
              <!-- Day Header -->
              <div class="sticky top-0 bg-surface border-b border-border-muted p-stack-sm text-center z-10">
                <div class="text-caption font-bold text-ink-muted uppercase tracking-wider">{{ day.shortName }}</div>
                <div class="text-h2 font-semibold" :class="day.isToday ? 'text-action-primary' : 'text-ink'">{{ day.date.getDate() }}</div>
              </div>

              <!-- Events Container -->
              <div class="flex-1 relative p-stack-xs space-y-stack-xs">
                <div 
                  v-for="event in day.events" 
                  :key="event.id"
                  @click="selectAppointment(event)"
                  class="p-inline-sm py-stack-xs rounded-control cursor-pointer border text-body-sm transition-all"
                  :class="selectedEventId === event.id 
                    ? 'bg-state-selected border-action-primary shadow-sm ring-1 ring-action-primary/20' 
                    : 'bg-surface border-border-muted hover:border-border-strong'"
                >
                  <div class="font-semibold truncate">{{ event.clientName }}</div>
                  <div class="text-caption text-ink-muted">{{ formatTime(event.start) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Selection Action Overlay (Mobile/Selected) -->
          <Transition name="fade">
            <div v-if="selectedEvent" class="fixed bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 z-30 w-[calc(100%-3rem)] max-w-sm bg-surface-elevated border border-border-strong rounded-panel shadow-overlay p-page">
              <div class="flex justify-between items-start mb-stack-md">
                <div>
                  <h3 class="text-h3 font-semibold text-ink">{{ selectedEvent.clientName }}</h3>
                  <p class="text-body-sm text-ink-secondary">{{ fullEventDateTime(selectedEvent) }}</p>
                </div>
                <button @click="selectedEventId = null" class="text-ink-subtle hover:text-ink-secondary p-1">×</button>
              </div>
              <div class="flex gap-inline-sm">
                <router-link 
                  :to="`/clients/${selectedEvent.clientId}`"
                  class="flex-1 text-center py-stack-sm text-body-sm font-medium text-ink bg-surface border border-border-muted rounded-control hover:bg-surface-subtle transition-colors"
                >
                  Open Client
                </router-link>
                <router-link 
                  v-if="selectedEvent.id"
                  :to="`/clients/${selectedEvent.clientId}/sessions/${selectedEvent.id}`"
                  class="flex-1 text-center py-stack-sm text-body-sm font-medium text-on-action bg-action-primary rounded-control hover:bg-action-primary-hover transition-colors shadow-sm"
                >
                  Start Session
                </router-link>
              </div>
            </div>
          </Transition>
        </div>
      </main>
    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '../layouts/AppShell.vue'
import { useCalendar } from '../composables/useCalendar'

const { loading, normalizedEvents, todayEvents, upcomingEvents, loadData } = useCalendar()
const selectedEventId = ref(null)
const viewDate = ref(new Date())

onMounted(loadData)

const selectedEvent = computed(() => {
  return normalizedEvents.value.find(e => e.id === selectedEventId.value)
})

const currentMonthName = computed(() => {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(viewDate.value)
})

const currentDay = computed(() => new Date().getDate())

const currentRangeLabel = computed(() => {
  const start = getStartOfWeek(viewDate.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(end)}`
  }
  return `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(start)} – ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)}`
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  return new Date(d.setDate(diff))
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date)
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
    default: return 'bg-ink-subtle'
  }
}

function selectAppointment(event) {
  selectedEventId.value = event.id
}

function moveWeek(dir) {
  const d = new Date(viewDate.value)
  d.setDate(d.getDate() + (dir * 7))
  viewDate.value = d
}

function goToday() {
  viewDate.value = new Date()
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
