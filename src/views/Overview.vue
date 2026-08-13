<template>
  <div class="max-w-7xl mx-auto px-page py-8 md:py-10 space-y-9">
      <header class="max-w-3xl">
        <p class="type-overline text-action-primary/80 mb-2">{{ todayLabel }}</p>
        <h1 class="font-serif text-[2rem] leading-[1.12] md:text-[2.35rem] font-semibold tracking-[-0.025em] text-ink">{{ greeting }}, Robert</h1>
        <p class="text-body leading-6 text-ink-muted mt-2.5">You have {{ todayEvents.length || 'no' }} appointments today.</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-9 items-start">
        <section class="lg:col-span-2 space-y-4">
          <div class="flex items-end justify-between gap-4">
            <h2 class="font-serif text-[1.45rem] leading-tight font-semibold tracking-[-0.015em] text-ink">Today’s schedule</h2>
            <router-link to="/calendar" class="text-body-sm font-medium text-action-link hover:text-action-link-hover transition-colors">View calendar →</router-link>
          </div>

          <div v-if="loading" class="bg-surface-elevated border border-border-muted rounded-panel p-7 text-center shadow-elevated"><p class="text-ink-muted animate-pulse">Loading schedule...</p></div>
          <div v-else-if="todayEvents.length === 0" class="bg-surface-elevated border border-border-muted rounded-panel p-8 text-center shadow-elevated"><p class="text-ink-muted">No appointments scheduled for today.</p></div>
          <div v-else class="space-y-2.5">
            <div v-for="event in todayEvents" :key="event.id" class="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 bg-surface-elevated border border-border-muted rounded-panel px-5 py-4.5 shadow-elevated hover:border-border transition-colors group">
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-[4.25rem] shrink-0 pr-4 border-r border-border-muted">
                  <div class="text-body font-semibold text-ink">{{ formatTime(event.start) }}</div>
                  <div class="text-caption text-ink-muted mt-1">60 min</div>
                </div>
                <div class="min-w-0">
                  <div class="text-body font-semibold text-ink group-hover:text-action-link transition-colors truncate">{{ event.clientName }}</div>
                  <div class="text-body-sm text-ink-secondary mt-0.5">{{ event.type }}</div>
                  <div class="text-caption text-ink-muted mt-0.5">{{ formatStatus(event.status) }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-auto">
                <router-link v-if="event.clientId" :to="`/clients/${event.clientId}`" class="min-h-10 inline-flex items-center px-3.5 text-body-sm font-medium text-ink-secondary hover:text-ink hover:bg-surface-subtle rounded-control border border-border-muted transition-colors">Open client</router-link>
                <button v-if="event.isEligibleForStart" :disabled="startingEventId === event.id" :aria-busy="startingEventId === event.id" @click="startSession(event)" class="min-h-10 inline-flex items-center px-4 text-body-sm font-semibold text-on-action bg-action-primary hover:bg-action-primary-hover disabled:opacity-60 rounded-control transition-colors shadow-sm">{{ startingEventId === event.id ? 'Opening…' : 'Start session' }}</button>
              </div>
              <p v-if="sessionOpenErrorId === event.id" class="w-full text-caption text-state-danger">Couldn’t open the session workspace. Please try again.</p>
            </div>
          </div>
        </section>

        <aside class="space-y-6">
          <section class="space-y-3">
            <h2 class="type-overline text-ink-muted">Continue working</h2>
            <div v-if="pendingWork.length === 0" class="bg-surface-subtle border border-border-muted rounded-panel p-4 text-center"><p class="text-caption text-ink-subtle">No pending drafts or reviews.</p></div>
            <div v-else class="space-y-2.5"><router-link v-for="item in pendingWork" :key="item.id" :to="item.route" class="block bg-surface-elevated border border-border-muted rounded-panel p-4 shadow-elevated hover:border-border transition-colors"><div class="text-body-sm font-semibold text-ink">{{ item.title }}</div><div class="text-caption text-ink-muted mt-1">{{ item.subtitle }}</div></router-link></div>
          </section>
          <section class="space-y-3"><h2 class="type-overline text-ink-muted">Practice focus</h2><div class="bg-brand-sage-soft/55 border border-action-primary/10 rounded-panel p-4"><p class="text-body-sm leading-6 text-ink-secondary">{{ practiceFocusObservation }}</p></div></section>
          <section class="space-y-3"><h2 class="type-overline text-ink-muted">Development</h2><div class="bg-reflection border border-border-reflection rounded-panel p-4"><div class="text-body-sm font-semibold text-ink">Supervision prep</div><p class="text-caption text-ink-muted mt-1">{{ reflectionsCount }} reflections are waiting for review.</p><router-link to="/supervision" class="inline-flex mt-2.5 text-body-sm font-medium text-action-link hover:text-action-link-hover">Go to supervision →</router-link></div></section>
          <section class="space-y-3"><h2 class="type-overline text-ink-muted">Recent activity</h2><div class="bg-surface-muted/60 border border-border-muted rounded-panel p-4 text-center"><p class="text-caption text-ink-subtle">No recent activity to show.</p></div></section>
        </aside>
      </div>
      <footer class="pt-5 border-t border-border-muted max-w-3xl"><p class="text-caption text-ink-subtle leading-relaxed">Showing Helios appointments and completed session history. Google Calendar events appear when connected.</p></footer>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendar } from '../composables/useCalendar'
import { getAllPrivateReflections } from '../lib/reflections'
import { createOrResumeSession } from '../lib/sessions.js'

const router = useRouter()
const { loading, todayEvents, loadData, sessions } = useCalendar()
const reflections = ref([])
const startingEventId = ref(null)
const sessionOpenErrorId = ref(null)

onMounted(async () => { await loadData(); try { reflections.value = await getAllPrivateReflections({ limit: 50 }) } catch (e) { console.error('Failed to load reflections', e) } })
async function startSession(event) { if (!event?.clientId || startingEventId.value) return; startingEventId.value = event.id; sessionOpenErrorId.value = null; try { const { session } = await createOrResumeSession(event.clientId); await router.push({ name: 'SessionWorkspace', params: { clientId: event.clientId, sessionId: session.id } }) } catch (error) { console.error('Failed to open session workspace from overview:', error); sessionOpenErrorId.value = event.id } finally { startingEventId.value = null } }
const todayLabel = computed(() => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()))
const greeting = computed(() => { const hour = new Date().getHours(); if (hour < 12) return 'Good morning'; if (hour < 18) return 'Good afternoon'; return 'Good evening' })
function formatTime(date) { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date) }
function formatStatus(status) { if (!status) return 'Scheduled'; return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
const pendingWork = computed(() => { const items = []; sessions.value.filter(s => s.notesStatus === 'draft').slice(0, 3).forEach(s => items.push({ id: `session-${s.id}`, title: 'Finish session notes', subtitle: `Draft started on ${new Date(s.startedAt).toLocaleDateString()}`, route: `/clients/${s.clientId}/sessions/${s.id}` })); return items })
const reflectionsCount = computed(() => reflections.value.filter(r => r.included_in_supervision).length)
const practiceFocusObservation = computed(() => { const draftNotes = sessions.value.filter(s => s.notesStatus === 'draft').length; if (draftNotes > 0) return `${draftNotes} session note${draftNotes === 1 ? '' : 's'} remain${draftNotes === 1 ? 's' : ''} in draft.`; const pendingReflections = reflections.value.filter(r => r.included_in_supervision).length; if (pendingReflections > 0) return `${pendingReflections} reflection${pendingReflections === 1 ? '' : 's'} are waiting for review.`; return 'Your clinical documentation is up to date.' })
</script>
