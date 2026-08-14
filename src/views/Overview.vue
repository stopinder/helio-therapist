<template>
  <div class="max-w-7xl mx-auto px-page py-8 md:py-10 space-y-9">
    <GreetingHeader :eyebrow="eyebrow" :phrase="phrase" :display-name="therapistDisplayName" :supporting="supportingInformation" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-9 items-start">
      <section class="lg:col-span-2 space-y-4">
        <SectionHeader title="Today’s schedule"><template #action><router-link to="/calendar" class="type-ui text-action-link hover:text-action-link-hover underline-offset-4 hover:underline">View calendar →</router-link></template></SectionHeader>
        <SurfaceCard v-if="loading" compact class="text-center"><p class="type-body text-ink-muted animate-pulse">Loading schedule...</p></SurfaceCard>
        <SurfaceCard v-else-if="todayEvents.length === 0" class="text-center"><p class="type-body text-ink-muted">No appointments scheduled for today.</p></SurfaceCard>
        <div v-else class="space-y-2.5">
          <SurfaceCard v-for="event in todayEvents" :key="event.id" compact class="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 group">
            <div class="flex items-center gap-4 min-w-0"><div class="w-[4.25rem] shrink-0 pr-4 border-r border-border-muted"><div class="type-body-medium text-ink">{{ formatTime(event.start) }}</div><div class="type-metadata text-ink-muted mt-1">60 min</div></div><div class="min-w-0"><div class="type-body-medium text-ink truncate">{{ event.clientName }}</div><div class="type-ui text-ink-secondary mt-0.5">{{ event.type }}</div><StatusIndicator class="mt-0.5">{{ formatStatus(event.status) }}</StatusIndicator></div></div>
            <div class="flex items-center gap-2 ml-auto"><AppButton v-if="event.clientId" :to="`/clients/${event.clientId}`">Open client</AppButton><AppButton v-if="event.isEligibleForStart" variant="primary" :disabled="startingEventId === event.id" :aria-busy="startingEventId === event.id" @click="startSession(event)">{{ startingEventId === event.id ? 'Starting…' : 'Start session' }}</AppButton></div>
            <p v-if="sessionOpenErrorId === event.id" role="alert" class="w-full type-metadata text-state-danger">Couldn’t start the session. Please try again.</p>
          </SurfaceCard>
        </div>
      </section>

      <aside class="space-y-6">
        <section class="space-y-3">
          <p class="type-eyebrow text-ink-muted">My reminders</p>
          <SurfaceCard v-if="remindersLoading" tone="base" compact><p class="type-metadata text-ink-subtle">Loading reminders…</p></SurfaceCard>
          <SurfaceCard v-else-if="openReminders.length === 0" tone="base" compact><p class="type-metadata text-ink-subtle">No outstanding reminders.</p></SurfaceCard>
          <SurfaceCard v-else tone="base" compact class="border-brand-amber/25 bg-brand-amber-soft/35">
            <div class="divide-y divide-border-muted">
              <label v-for="reminder in openReminders" :key="reminder.id" class="flex items-start gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer">
                <input type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" :disabled="completingReminderId===reminder.id" @change="completeReminder(reminder)" />
                <span class="type-ui text-ink-secondary leading-6">{{ reminder.body }}</span>
              </label>
            </div>
          </SurfaceCard>
        </section>
        <section class="space-y-3"><p class="type-eyebrow text-ink-muted">Continue working</p><SurfaceCard v-if="pendingWork.length === 0" tone="base" compact class="text-center"><p class="type-metadata text-ink-subtle">No pending drafts or reviews.</p></SurfaceCard><div v-else class="space-y-2.5"><router-link v-for="item in pendingWork" :key="item.id" :to="item.route" class="block focus-visible:rounded-panel"><SurfaceCard compact><div class="type-ui font-semibold text-ink">{{ item.title }}</div><div class="type-metadata text-ink-muted mt-1">{{ item.subtitle }}</div></SurfaceCard></router-link></div></section>
        <section class="space-y-3"><p class="type-eyebrow text-ink-muted">Practice focus</p><SurfaceCard tone="base" compact class="bg-brand-sage-soft/55 border-action-primary/10"><p class="type-ui leading-6 text-ink-secondary">{{ practiceFocusObservation }}</p></SurfaceCard></section>
        <section class="space-y-3"><p class="type-eyebrow text-ink-muted">Development</p><SurfaceCard tone="base" compact class="bg-reflection border-border-reflection"><div class="type-ui font-semibold text-ink">Supervision prep</div><p class="type-metadata text-ink-muted mt-1">{{ reflectionsCount }} reflections are waiting for review.</p><router-link to="/supervision" class="inline-flex mt-2.5 type-ui text-action-link hover:text-action-link-hover underline-offset-4 hover:underline">Go to supervision →</router-link></SurfaceCard></section>
        <section class="space-y-3"><p class="type-eyebrow text-ink-muted">Recent activity</p><SurfaceCard v-if="recentActivity.length === 0" tone="muted" compact class="text-center"><p class="type-metadata text-ink-subtle">No recent activity to show.</p></SurfaceCard><div v-else class="border-y border-border-muted divide-y divide-border-muted"><component v-for="item in recentActivity" :key="item.id" :is="item.route ? 'router-link' : 'div'" :to="item.route || undefined" class="block py-3 first:pt-2 last:pb-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:rounded-control"><div class="type-ui font-medium text-ink group-hover:text-action-link">{{ item.title }}</div><div class="flex flex-wrap items-center gap-x-2 mt-1 type-metadata text-ink-muted"><span v-if="item.detail">{{ item.detail }}</span><span v-if="item.detail" aria-hidden="true">·</span><time :datetime="item.occurredAt.toISOString()">{{ formatActivityTime(item.occurredAt) }}</time></div></component></div></section>
      </aside>
    </div>
    <footer class="pt-5 border-t border-border-muted max-w-3xl"><p class="type-metadata text-ink-subtle leading-relaxed">Showing Helios appointments and completed session history. Google Calendar events appear when connected.</p></footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendar } from '../composables/useCalendar'
import { useGreeting } from '../composables/useGreeting'
import { useTherapistIdentity } from '../composables/useTherapistIdentity'
import { getAllPrivateReflections } from '../lib/reflections'
import { createOrResumeSession } from '../lib/sessions.js'
import { buildRecentActivity } from '../lib/activityFeed.js'
import { listTherapistReminders, setTherapistReminderCompleted } from '../lib/therapistReminders.js'
import GreetingHeader from '../components/ui/GreetingHeader.vue'
import SectionHeader from '../components/ui/SectionHeader.vue'
import AppButton from '../components/ui/AppButton.vue'
import SurfaceCard from '../components/ui/SurfaceCard.vue'
import StatusIndicator from '../components/ui/StatusIndicator.vue'

const router = useRouter()
const { loading, todayEvents, loadData, sessions, clients } = useCalendar()
const { displayName, loadTherapistIdentity } = useTherapistIdentity()
const { eyebrow, phrase, therapistDisplayName, supportingInformation } = useGreeting({ displayName, appointmentCount: computed(() => todayEvents.value.length) })
const reflections = ref([]), reminders = ref([]), remindersLoading = ref(true), completingReminderId = ref(null)
const startingEventId = ref(null), sessionOpenErrorId = ref(null)
const openReminders = computed(() => reminders.value.filter(item => !item.completedAt))
async function loadReminders(){remindersLoading.value=true;try{reminders.value=await listTherapistReminders()}catch(error){console.warn('[Overview] Reminders unavailable',error)}finally{remindersLoading.value=false}}
async function completeReminder(reminder){if(!reminder?.id||completingReminderId.value)return;completingReminderId.value=reminder.id;try{await setTherapistReminderCompleted({id:reminder.id,completed:true});reminders.value=reminders.value.filter(item=>item.id!==reminder.id);window.dispatchEvent(new CustomEvent('helios-reminders-changed'))}catch(error){console.warn('[Overview] Could not complete reminder',error)}finally{completingReminderId.value=null}}
const handleReminderChange=()=>loadReminders()
onMounted(async () => { window.addEventListener('helios-reminders-changed',handleReminderChange); await Promise.all([loadData(), loadTherapistIdentity(), loadReminders()]); try { reflections.value = await getAllPrivateReflections({ limit: 50 }) } catch (e) { console.error('Failed to load reflections', e) } })
onUnmounted(()=>window.removeEventListener('helios-reminders-changed',handleReminderChange))
async function startSession(event) { if (!event?.clientId || startingEventId.value) return; startingEventId.value = event.id; sessionOpenErrorId.value = null; try { await createOrResumeSession(event.clientId); await router.push({ name: 'ClientWorkspace', params: { clientId: event.clientId } }) } catch (error) { console.error('Failed to start session from overview:', error); sessionOpenErrorId.value = event.id } finally { startingEventId.value = null } }
function formatTime(date) { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date) }
function formatStatus(status) { if (!status) return 'Scheduled'; return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
function formatActivityTime(value) { const date = value instanceof Date ? value : new Date(value); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1); const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date); if (sameDay(date, today)) return `Today, ${time}`; if (sameDay(date, yesterday)) return `Yesterday, ${time}`; return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) }
const pendingWork = computed(() => { const items = []; sessions.value.filter(s => s.notesStatus === 'draft').slice(0, 3).forEach(s => items.push({ id: `session-${s.id}`, title: 'Finish session notes', subtitle: `Draft started on ${new Date(s.startedAt).toLocaleDateString()}`, route: `/clients/${s.clientId}/sessions/${s.id}` })); return items })
const recentActivity = computed(() => buildRecentActivity({ sessions: sessions.value, clients: clients.value, reflections: reflections.value }, { limit: 5 }))
const reflectionsCount = computed(() => reflections.value.filter(r => r.included_in_supervision).length)
const practiceFocusObservation = computed(() => { const draftNotes = sessions.value.filter(s => s.notesStatus === 'draft').length; if (draftNotes > 0) return `${draftNotes} session note${draftNotes === 1 ? '' : 's'} remain${draftNotes === 1 ? 's' : ''} in draft.`; const pendingReflections = reflections.value.filter(r => r.included_in_supervision).length; if (pendingReflections > 0) return `${pendingReflections} reflection${pendingReflections === 1 ? '' : 's'} are waiting for review.`; return 'Your clinical documentation is up to date.' })
</script>
