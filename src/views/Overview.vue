<template>
  <div class="max-w-7xl mx-auto px-page py-page space-y-stack-xl">
      <!-- Compact Greeting -->
      <header>
        <p class="text-caption font-medium text-ink-muted uppercase tracking-wider mb-stack-xs">
          {{ todayLabel }}
        </p>
        <h1 class="text-h1 font-semibold text-ink">Good afternoon, Robert</h1>
        <p class="text-body text-ink-secondary mt-stack-xs">
          You have {{ todayEvents.length || 'no' }} appointments today.
        </p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-inline-lg items-start">
        <!-- Today's Schedule (Main Anchor) -->
        <section class="lg:col-span-2 space-y-stack-md">
          <div class="flex items-center justify-between">
            <h2 class="text-h2 font-semibold text-ink">Today’s Schedule</h2>
            <router-link to="/calendar" class="text-body-sm font-medium text-action-link hover:text-action-link-hover">
              View Calendar →
            </router-link>
          </div>

          <div v-if="loading" class="bg-surface border border-border-muted rounded-panel p-page text-center">
            <p class="text-ink-muted animate-pulse">Loading schedule...</p>
          </div>

          <div v-else-if="todayEvents.length === 0" class="bg-surface border border-border-muted rounded-panel p-page text-center">
            <p class="text-ink-muted">No appointments scheduled for today.</p>
          </div>

          <div v-else class="space-y-stack-sm">
            <div 
              v-for="event in todayEvents" 
              :key="event.id"
              class="flex items-center justify-between bg-surface border border-border-muted rounded-panel p-inline-md hover:border-border-strong transition-colors group"
            >
              <div class="flex items-center gap-inline-md">
                <div class="text-body-sm font-mono text-ink-muted w-16">
                  {{ formatTime(event.start) }}
                </div>
                <div>
                  <div class="text-body font-semibold text-ink group-hover:text-action-link transition-colors">
                    {{ event.clientName }}
                  </div>
                  <div class="text-caption text-ink-muted">
                    {{ event.type }} · {{ formatStatus(event.status) }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-inline-sm">
                <router-link 
                  v-if="event.clientId"
                  :to="`/clients/${event.clientId}`"
                  class="px-inline-sm py-stack-xs text-body-sm font-medium text-ink-secondary hover:text-ink hover:bg-surface-subtle rounded-control border border-border-muted transition-colors"
                >
                  Open Client
                </router-link>
                <router-link 
                  v-if="event.isEligibleForStart"
                  :to="`/clients/${event.clientId}/sessions/${event.id}`"
                  class="px-inline-sm py-stack-xs text-body-sm font-medium text-on-action bg-action-primary hover:bg-action-primary-hover rounded-control transition-colors shadow-sm"
                >
                  Start Session
                </router-link>
              </div>
            </div>
          </div>
        </section>

        <!-- Sidebar Components -->
        <aside class="space-y-stack-xl">
          <!-- Continue Working -->
          <section class="space-y-stack-md">
            <h2 class="text-h3 font-semibold text-ink">Continue Working</h2>
            <div v-if="pendingWork.length === 0" class="bg-surface-muted border border-border-muted rounded-panel p-inline-md text-center">
              <p class="text-caption text-ink-subtle">No pending drafts or reviews.</p>
            </div>
            <div v-else class="space-y-stack-xs">
              <router-link 
                v-for="item in pendingWork" 
                :key="item.id"
                :to="item.route"
                class="block bg-surface border border-border-muted rounded-panel p-inline-md hover:bg-surface-subtle transition-colors"
              >
                <div class="text-body-sm font-medium text-ink">{{ item.title }}</div>
                <div class="text-caption text-ink-muted">{{ item.subtitle }}</div>
              </router-link>
            </div>
          </section>

          <!-- Practice Focus -->
          <section class="space-y-stack-md">
            <h2 class="text-h3 font-semibold text-ink">Practice Focus</h2>
            <div class="bg-surface-subtle border border-border-muted rounded-panel p-inline-md">
              <p class="text-body-sm text-ink-secondary">
                {{ practiceFocusObservation }}
              </p>
            </div>
          </section>

          <!-- Professional Development -->
          <section class="space-y-stack-md">
            <h2 class="text-h3 font-semibold text-ink">Development</h2>
            <div class="bg-reflection border border-border-reflection rounded-panel p-inline-md">
              <div class="text-body-sm font-medium text-ink">Supervision Prep</div>
              <p class="text-caption text-ink-muted mt-1">
                {{ reflectionsCount }} reflections are waiting for review.
              </p>
              <router-link 
                to="/supervision" 
                class="inline-block mt-stack-sm text-body-sm font-medium text-action-link hover:underline"
              >
                Go to Supervision →
              </router-link>
            </div>
          </section>

          <!-- Recent Activity -->
          <section class="space-y-stack-md">
            <h2 class="text-h3 font-semibold text-ink">Recent Activity</h2>
            <div class="bg-surface-muted border border-border-muted rounded-panel p-inline-md text-center py-stack-lg">
              <p class="text-caption text-ink-subtle italic">No recent activity to show.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCalendar } from '../composables/useCalendar'
import { getAllPrivateReflections } from '../lib/reflections'

const { loading, todayEvents, loadData, sessions } = useCalendar()
const reflections = ref([])

onMounted(async () => {
  await loadData()
  try {
    reflections.value = await getAllPrivateReflections({ limit: 50 })
  } catch (e) {
    console.error('Failed to load reflections', e)
  }
})

const todayLabel = computed(() => {
  return new Intl.DateTimeFormat('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date())
})

function formatTime(date) {
  return new Intl.DateTimeFormat('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(date)
}

function formatStatus(status) {
  if (!status) return 'Scheduled'
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const pendingWork = computed(() => {
  const items = []
  
  // Find sessions with draft notes
  sessions.value
    .filter(s => s.notesStatus === 'draft')
    .slice(0, 3)
    .forEach(s => {
      items.push({
        id: `session-${s.id}`,
        title: 'Finish session notes',
        subtitle: `Draft started on ${new Date(s.startedAt).toLocaleDateString()}`,
        route: `/clients/${s.clientId}/sessions/${s.id}`
      })
    })

  return items
})

const reflectionsCount = computed(() => {
  return reflections.value.filter(r => r.included_in_supervision).length
})

const practiceFocusObservation = computed(() => {
  const draftNotes = sessions.value.filter(s => s.notesStatus === 'draft').length
  if (draftNotes > 0) {
    return `${draftNotes} session note${draftNotes === 1 ? '' : 's'} remain${draftNotes === 1 ? 's' : ''} in draft.`
  }
  const pendingReflections = reflections.value.filter(r => r.included_in_supervision).length
  if (pendingReflections > 0) {
    return `${pendingReflections} reflection${pendingReflections === 1 ? '' : 's'} are waiting for review.`
  }
  return 'Your clinical documentation is up to date.'
})
</script>
