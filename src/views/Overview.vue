<template>
  <div class="midnight-overview">
    <div class="midnight-stage">
      <section class="midnight-orientation" aria-labelledby="today-greeting">
        <div class="midnight-meridian-line" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>

        <GreetingHeader
          id="today-greeting"
          :eyebrow="eyebrow"
          :phrase="phrase"
          :display-name="therapistDisplayName"
          :supporting="supportingInformation"
        />

        <dl class="midnight-day-counts" aria-label="Today at a glance">
          <div>
            <dt>Sessions</dt>
            <dd>{{ String(todayEvents.length).padStart(2, '0') }}</dd>
          </div>
          <div>
            <dt>Drafts</dt>
            <dd>{{ String(pendingWork.length).padStart(2, '0') }}</dd>
          </div>
        </dl>
      </section>

      <section
        v-if="nextFocusEvent"
        class="midnight-aperture"
        aria-labelledby="next-session-heading"
      >
        <div class="midnight-aperture-ring" aria-hidden="true">
          <span v-for="tick in 12" :key="tick" :style="{ '--tick': tick }"></span>
        </div>

        <p class="midnight-aperture-label">Next session</p>
        <time class="midnight-aperture-time" :datetime="nextFocusEvent.start.toISOString()">
          {{ formatTime(nextFocusEvent.start) }}
        </time>
        <h2 id="next-session-heading" class="midnight-aperture-client">
          {{ nextFocusEvent.clientName }}
        </h2>
        <p class="midnight-aperture-meta">
          {{ nextFocusEvent.type }}
          <span aria-hidden="true">·</span>
          {{ formatDuration(nextFocusEvent) }}
        </p>
        <p class="midnight-aperture-status">
          <span class="midnight-status-signal" aria-hidden="true"></span>
          {{ formatStatus(nextFocusEvent.status) }}
          <span aria-hidden="true">·</span>
          {{ formatRelativeStart(nextFocusEvent.start) }}
        </p>

        <AppButton
          v-if="nextFocusEvent.isEligibleForStart"
          variant="primary"
          class="midnight-session-action"
          :disabled="startingEventId === nextFocusEvent.id"
          :aria-busy="startingEventId === nextFocusEvent.id"
          @click="startSession(nextFocusEvent)"
        >
          {{ startingEventId === nextFocusEvent.id ? 'Opening…' : 'Clinical Workspace' }}
          <span aria-hidden="true">→</span>
        </AppButton>

        <router-link
          v-else-if="nextFocusEvent.clientId"
          :to="`/clients/${nextFocusEvent.clientId}`"
          class="midnight-session-action midnight-session-link"
        >
          Open client <span aria-hidden="true">→</span>
        </router-link>

        <router-link
          v-else
          to="/calendar"
          class="midnight-session-action midnight-session-link"
        >
          View calendar <span aria-hidden="true">→</span>
        </router-link>

        <p
          v-if="sessionOpenErrorId === nextFocusEvent.id"
          role="alert"
          class="midnight-aperture-error"
        >
          Couldn’t open the session workspace. Please try again.
        </p>
      </section>

      <section v-else class="midnight-aperture midnight-aperture-empty" aria-labelledby="next-session-heading">
        <p class="midnight-aperture-label">Next session</p>
        <h2 id="next-session-heading" class="midnight-aperture-empty-title">Open space</h2>
        <p class="midnight-aperture-meta">No appointments scheduled for today.</p>
        <router-link to="/schedule" class="midnight-session-action midnight-session-link">
          Schedule appointment <span aria-hidden="true">→</span>
        </router-link>
      </section>
    </div>

    <section v-if="!loading && isNewWorkspace" class="midnight-onboarding">
      <div>
        <p class="midnight-kicker">Getting started</p>
        <h2>Add your first client to begin using your practice workspace.</h2>
        <p>Client records give Helios the context needed for appointments, sessions, notes and documents. You can add only the details you need now.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton to="/clients" variant="primary">Go to clients</AppButton>
        <AppButton to="/settings">Complete practice details</AppButton>
      </div>
    </section>

    <div class="midnight-workspace">
      <section class="midnight-folio" aria-labelledby="today-schedule-heading">
        <header class="midnight-folio-header">
          <div>
            <p class="midnight-kicker">The day</p>
            <h2 id="today-schedule-heading">Today’s schedule</h2>
          </div>
          <router-link to="/calendar">View calendar →</router-link>
        </header>

        <div v-if="loading" class="midnight-ledger-state" aria-live="polite">
          Loading schedule...
        </div>

        <div v-else-if="todayEvents.length === 0" class="midnight-ledger-state">
          {{ isNewWorkspace ? 'Your schedule will appear here once you add clients and appointments.' : 'No appointments scheduled for today.' }}
        </div>

        <div v-else class="midnight-ledger">
          <div class="midnight-ledger-head" aria-hidden="true">
            <span>Time</span>
            <span></span>
            <span>Session</span>
            <span>Status</span>
            <span>Context</span>
            <span>Action</span>
          </div>

          <article
            v-for="event in todayEvents"
            :key="event.id"
            class="midnight-ledger-row"
            :class="{ 'midnight-ledger-row-current': nextFocusEvent?.id === event.id }"
          >
            <time class="midnight-ledger-time" :datetime="event.start.toISOString()">
              {{ formatTime(event.start) }}
            </time>

            <span class="midnight-ledger-node" aria-hidden="true"></span>

            <div class="midnight-ledger-session">
              <p class="midnight-ledger-name">{{ event.clientName }}</p>
              <p>{{ event.type }} · {{ formatDuration(event) }}</p>
            </div>

            <StatusIndicator :tone="statusTone(event.status)">
              {{ formatStatus(event.status) }}
            </StatusIndicator>

            <p class="midnight-ledger-context">
              {{ event.id === nextFocusEvent?.id ? formatRelativeStart(event.start) : eventContext(event) }}
            </p>

            <div class="midnight-ledger-actions">
              <router-link
                v-if="event.clientId"
                :to="`/clients/${event.clientId}`"
                class="midnight-ledger-link"
              >
                Open client
              </router-link>

              <button
                v-if="event.isEligibleForStart && event.id !== nextFocusEvent?.id"
                type="button"
                class="midnight-ledger-link"
                :disabled="startingEventId === event.id"
                :aria-busy="startingEventId === event.id"
                @click="startSession(event)"
              >
                {{ startingEventId === event.id ? 'Opening…' : 'Open workspace' }}
              </button>

              <span v-else-if="event.id === nextFocusEvent?.id" class="midnight-ledger-current-label">
                Current focus
              </span>
            </div>

            <p
              v-if="sessionOpenErrorId === event.id && event.id !== nextFocusEvent?.id"
              role="alert"
              class="midnight-ledger-error"
            >
              Couldn’t open the session workspace. Please try again.
            </p>
          </article>
        </div>
      </section>

      <aside class="midnight-attached-work" aria-label="Attached work">
        <p class="midnight-attached-label">Attached work</p>

        <section class="midnight-work-tab midnight-work-tab-primary">
          <div class="midnight-work-tab-index">
            {{ String(Math.max(pendingWork.length, 1)).padStart(2, '0') }}
          </div>
          <div>
            <p class="midnight-work-tab-label">Continue working</p>
            <template v-if="pendingWork.length">
              <router-link
                v-for="item in pendingWork"
                :key="item.id"
                :to="item.route"
                class="midnight-work-link"
              >
                <span>{{ item.title }}</span>
                <small>{{ item.subtitle }}</small>
              </router-link>
            </template>
            <p v-else class="midnight-work-empty">No pending drafts or reviews.</p>
          </div>
        </section>

        <section class="midnight-work-tab">
          <div class="midnight-work-tab-index">
            {{ String(reflectionsCount).padStart(2, '0') }}
          </div>
          <div>
            <p class="midnight-work-tab-label">Development</p>
            <h3>Supervision prep</h3>
            <p>{{ reflectionsCount }} reflections are waiting for review.</p>
            <router-link to="/supervision">Go to supervision →</router-link>
          </div>
        </section>
      </aside>
    </div>

    <footer class="midnight-overview-footer">
      <section>
        <p class="midnight-kicker">Practice focus</p>
        <p class="midnight-footer-value">{{ practiceFocusObservation }}</p>
      </section>

      <section>
        <p class="midnight-kicker">Recent activity</p>
        <p v-if="recentActivity.length === 0" class="midnight-footer-value text-ink-muted">
          No recent activity to show.
        </p>
        <component
          v-else
          :is="recentActivity[0].route ? 'router-link' : 'div'"
          :to="recentActivity[0].route || undefined"
          class="midnight-activity-link"
        >
          <span>{{ recentActivity[0].title }}</span>
          <small v-if="recentActivity[0].detail">{{ recentActivity[0].detail }}</small>
          <time :datetime="recentActivity[0].occurredAt.toISOString()">
            {{ formatActivityTime(recentActivity[0].occurredAt) }}
          </time>
        </component>
      </section>

      <p class="midnight-source-note">
        Showing Helios appointments and completed session history. Google Calendar events appear when connected.
      </p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendar } from '../composables/useCalendar'
import { useGreeting } from '../composables/useGreeting'
import { useTherapistIdentity } from '../composables/useTherapistIdentity'
import { getAllPrivateReflections } from '../lib/reflections'
import { createOrResumeSession } from '../lib/sessions.js'
import { buildRecentActivity } from '../lib/activityFeed.js'
import GreetingHeader from '../components/ui/GreetingHeader.vue'
import AppButton from '../components/ui/AppButton.vue'
import StatusIndicator from '../components/ui/StatusIndicator.vue'

const router = useRouter()
const { loading, todayEvents, loadData, sessions, clients } = useCalendar()
const { displayName, loadTherapistIdentity } = useTherapistIdentity()
const {
  eyebrow,
  phrase,
  therapistDisplayName,
  supportingInformation
} = useGreeting({
  displayName,
  appointmentCount: computed(() => todayEvents.value.length)
})

const reflections = ref([])
const startingEventId = ref(null)
const sessionOpenErrorId = ref(null)

const isNewWorkspace = computed(() =>
  clients.value.length === 0 && sessions.value.length === 0
)

const nextFocusEvent = computed(() => {
  const now = Date.now()
  return todayEvents.value.find(event => event.start?.getTime?.() >= now) ||
    todayEvents.value[0] ||
    null
})

onMounted(async () => {
  await Promise.all([loadData(), loadTherapistIdentity()])

  try {
    reflections.value = await getAllPrivateReflections({ limit: 50 })
  } catch (error) {
    console.error('Failed to load reflections', error)
  }
})

async function startSession(event) {
  if (!event?.clientId || startingEventId.value) return

  startingEventId.value = event.id
  sessionOpenErrorId.value = null

  try {
    const { session } = await createOrResumeSession(event.clientId)
    await router.push({
      name: 'SessionWorkspace',
      params: {
        clientId: event.clientId,
        sessionId: session.id
      }
    })
  } catch (error) {
    console.error('Failed to open session workspace from overview:', error)
    sessionOpenErrorId.value = event.id
  } finally {
    startingEventId.value = null
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatStatus(status) {
  if (!status) return 'Scheduled'
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatDuration(event) {
  const start = event?.start instanceof Date ? event.start : new Date(event?.start)
  const end = event?.end instanceof Date ? event.end : new Date(event?.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Timed appointment'
  }

  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  return `${minutes} min`
}

function formatRelativeStart(value) {
  const date = value instanceof Date ? value : new Date(value)
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return remainder ? `Starts in ${hours}h ${remainder}m` : `Starts in ${hours}h`
  }

  if (minutes > 1) return `Starts in ${minutes} min`
  if (minutes === 1) return 'Starts in 1 min'
  if (minutes >= -10) return 'Starting now'
  return 'Earlier today'
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('complete')) return 'success'
  if (normalized.includes('cancel')) return 'danger'
  if (normalized.includes('ready') || normalized.includes('progress')) return 'warning'
  return 'neutral'
}

function eventContext(event) {
  if (event.source === 'clinical') return 'Clinical record available'
  if (event.source === 'google') return 'External calendar event'
  return event.isEligibleForStart ? 'Workspace available' : 'Scheduled'
}

function formatActivityTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)

  if (sameDay(date, today)) return `Today, ${time}`
  if (sameDay(date, yesterday)) return `Yesterday, ${time}`

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const pendingWork = computed(() => {
  const items = []

  sessions.value
    .filter(session => session.notesStatus === 'draft')
    .slice(0, 3)
    .forEach(session => {
      items.push({
        id: `session-${session.id}`,
        title: 'Finish session notes',
        subtitle: `Draft started on ${new Date(session.startedAt).toLocaleDateString()}`,
        route: `/clients/${session.clientId}/sessions/${session.id}`
      })
    })

  return items
})

const recentActivity = computed(() =>
  buildRecentActivity(
    {
      sessions: sessions.value,
      clients: clients.value,
      reflections: reflections.value
    },
    { limit: 5 }
  )
)

const reflectionsCount = computed(() =>
  reflections.value.filter(reflection => reflection.included_in_supervision).length
)

const practiceFocusObservation = computed(() => {
  if (isNewWorkspace.value) {
    return 'Start by adding a client when you are ready.'
  }

  const draftNotes = sessions.value.filter(session => session.notesStatus === 'draft').length
  if (draftNotes > 0) {
    return `${draftNotes} session note${draftNotes === 1 ? '' : 's'} remain${draftNotes === 1 ? 's' : ''} in draft.`
  }

  const pendingReflections = reflections.value.filter(
    reflection => reflection.included_in_supervision
  ).length

  if (pendingReflections > 0) {
    return `${pendingReflections} reflection${pendingReflections === 1 ? '' : 's'} are waiting for review.`
  }

  return 'Your clinical documentation is up to date.'
})
</script>

<style scoped>
.midnight-overview {
  --overview-max: 80rem;
  position: relative;
  min-height: 100%;
  overflow: hidden;
  padding: clamp(1.25rem, 3vw, 3rem);
  background:
    radial-gradient(circle at 92% 3%, rgb(255 255 255 / .55), transparent 22rem),
    var(--surface-canvas);
}

.midnight-stage {
  position: relative;
  min-height: 25rem;
  max-width: var(--overview-max);
  margin: 0 auto;
}

.midnight-orientation {
  position: relative;
  width: min(72%, 55rem);
  min-height: 25rem;
  overflow: hidden;
  padding: clamp(2.5rem, 6vw, 5.25rem) clamp(2rem, 5vw, 4.5rem);
  color: white;
  background:
    linear-gradient(145deg, var(--midnight), var(--midnight-steel));
  clip-path: polygon(0 0, 100% 0, 100% 86%, 88% 100%, 0 100%);
}

.midnight-orientation::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: rgb(156 177 195 / .6);
}

.midnight-orientation :deep(header) {
  position: relative;
  z-index: 1;
  max-width: 36rem;
}

.midnight-orientation :deep(.type-eyebrow) {
  color: var(--midnight-amber-soft);
}

.midnight-orientation :deep(.type-greeting) {
  max-width: 34rem;
  color: white;
  font-size: clamp(2.7rem, 5vw, 4.4rem);
  line-height: .98;
  letter-spacing: -.045em;
}

.midnight-orientation :deep(.type-body) {
  max-width: 34rem;
  color: rgb(220 229 235 / .82);
  font-weight: 500;
}

.midnight-meridian-line {
  position: absolute;
  top: 2.2rem;
  right: 34%;
  bottom: 2.5rem;
  width: 1px;
  background: rgb(156 177 195 / .18);
}

.midnight-meridian-line span {
  position: absolute;
  left: 50%;
  width: .38rem;
  height: .38rem;
  border-radius: 9999px;
  background: var(--midnight-amber-soft);
  opacity: .34;
  transform: translate(-50%, -50%);
}

.midnight-meridian-line span:nth-child(1) { top: 22%; }
.midnight-meridian-line span:nth-child(2) { top: 50%; }
.midnight-meridian-line span:nth-child(3) { top: 78%; }

.midnight-day-counts {
  position: absolute;
  z-index: 1;
  right: clamp(2rem, 4vw, 4rem);
  bottom: 2.5rem;
  display: flex;
  gap: 3rem;
}

.midnight-day-counts div {
  display: flex;
  align-items: baseline;
  gap: .7rem;
}

.midnight-day-counts dt {
  order: 2;
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--midnight-mist);
}

.midnight-day-counts dd {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--midnight-amber-soft);
}

.midnight-aperture {
  position: absolute;
  z-index: 3;
  top: 4.6rem;
  right: clamp(1rem, 5vw, 5.25rem);
  display: flex;
  width: clamp(18rem, 32vw, 25.25rem);
  aspect-ratio: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 3rem 3rem;
  border-radius: 9999px;
  color: white;
  background:
    radial-gradient(circle at 38% 31%, #4c6b82, var(--midnight-steel) 58%, #1a334a);
  box-shadow:
    .65rem .75rem 0 var(--midnight-deep),
    0 1.8rem 4.4rem rgb(9 21 34 / .22);
}

.midnight-aperture::before {
  content: '';
  position: absolute;
  inset: 1.8rem;
  border: 1px solid rgb(156 177 195 / .55);
  border-radius: 9999px;
  pointer-events: none;
}

.midnight-aperture::after {
  content: '';
  position: absolute;
  top: 2rem;
  left: 15%;
  width: 55%;
  height: 28%;
  border-top: .35rem solid var(--midnight-amber);
  border-radius: 50%;
  pointer-events: none;
}

.midnight-aperture-ring {
  position: absolute;
  inset: 1.25rem;
  border-radius: 9999px;
  pointer-events: none;
}

.midnight-aperture-ring span {
  --angle: calc(var(--tick) * 30deg);
  position: absolute;
  top: 50%;
  left: 50%;
  width: .06rem;
  height: .55rem;
  background: rgb(200 216 227 / .48);
  transform:
    translate(-50%, -50%)
    rotate(var(--angle))
    translateY(-10.9rem);
  transform-origin: center;
}

.midnight-aperture-label {
  margin-bottom: 1.15rem;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgb(231 238 242 / .9);
}

.midnight-aperture-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(3.45rem, 6vw, 5rem);
  font-weight: 700;
  line-height: .95;
  letter-spacing: -.08em;
}

.midnight-aperture-client {
  margin-top: 1.1rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.midnight-aperture-meta,
.midnight-aperture-status {
  margin-top: .45rem;
  font-size: .72rem;
  font-weight: 500;
  color: rgb(218 229 236 / .88);
}

.midnight-aperture-status {
  display: flex;
  align-items: center;
  gap: .45rem;
  margin-top: 1.25rem;
  color: white;
  font-weight: 650;
}

.midnight-status-signal {
  width: .48rem;
  height: .48rem;
  border-radius: 9999px;
  background: var(--midnight-amber);
  box-shadow: 0 0 0 .2rem rgb(200 155 104 / .12);
}

.midnight-session-action {
  position: absolute;
  right: -2.3rem;
  bottom: 1.25rem;
  left: -2.3rem;
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  border-left: .45rem solid var(--midnight-amber);
  border-radius: 0;
  padding: 0 1.5rem 0 2rem;
  background: var(--midnight);
  color: white;
  box-shadow: .45rem .45rem 0 var(--midnight-deep);
  clip-path: polygon(0 0, 94% 0, 100% 50%, 94% 100%, 0 100%);
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  transition:
    transform var(--motion-fast) var(--motion-ease),
    box-shadow var(--motion-fast) var(--motion-ease),
    background-color var(--motion-standard) var(--motion-ease);
}

.midnight-session-action:hover {
  background: #18344d;
  transform: translateY(-4px);
  box-shadow: .45rem .7rem 0 var(--midnight-deep);
}

.midnight-session-action:active {
  transform: translateY(3px);
  box-shadow: .45rem .2rem 0 var(--midnight-deep);
}

.midnight-session-link {
  text-decoration: none;
}

.midnight-aperture-error {
  position: absolute;
  top: calc(100% + 2.8rem);
  width: 100%;
  padding: .75rem 1rem;
  border-left: 4px solid var(--state-danger);
  background: var(--state-danger-surface);
  color: var(--state-danger);
  font-size: .75rem;
}

.midnight-aperture-empty {
  text-align: center;
}

.midnight-aperture-empty-title {
  font-family: var(--font-editorial);
  font-size: 2rem;
  font-weight: 600;
}

.midnight-onboarding {
  display: flex;
  max-width: var(--overview-max);
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin: 2.5rem auto 0;
  padding: 1.5rem 1.75rem;
  border-top: 2px solid var(--midnight);
  border-bottom: 1px solid var(--border);
  background: rgb(247 249 250 / .66);
}

.midnight-onboarding h2 {
  margin-top: .45rem;
  font-family: var(--font-editorial);
  font-size: 1.35rem;
  font-weight: 600;
}

.midnight-onboarding p:not(.midnight-kicker) {
  max-width: 43rem;
  margin-top: .45rem;
  color: var(--text-muted);
  font-size: .8rem;
}

.midnight-workspace {
  position: relative;
  display: grid;
  max-width: var(--overview-max);
  grid-template-columns: minmax(0, 1fr) 10.5rem;
  gap: 0;
  margin: 4.75rem auto 0;
}

.midnight-folio {
  min-width: 0;
  padding-right: 2rem;
}

.midnight-folio-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--midnight);
}

.midnight-kicker {
  font-size: .6rem;
  font-weight: 700;
  letter-spacing: .17em;
  text-transform: uppercase;
  color: var(--midnight-steel);
}

.midnight-folio-header h2 {
  margin-top: .4rem;
  font-family: var(--font-editorial);
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 600;
  letter-spacing: -.035em;
}

.midnight-folio-header a {
  flex: none;
  padding-bottom: .25rem;
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--midnight-steel);
}

.midnight-ledger-state {
  padding: 4rem 1rem;
  border-bottom: 1px solid var(--border);
  text-align: center;
  color: var(--text-muted);
  font-size: .88rem;
}

.midnight-ledger {
  position: relative;
}

.midnight-ledger::before {
  content: '';
  position: absolute;
  top: 3.6rem;
  bottom: 1.5rem;
  left: 7.55rem;
  width: 2px;
  background: var(--midnight-steel);
}

.midnight-ledger-head {
  display: grid;
  grid-template-columns: 6.3rem 1.5rem minmax(16rem, 1fr) 9rem 10.5rem 8rem;
  gap: 1rem;
  padding: 1.15rem 1rem .7rem;
  font-size: .56rem;
  font-weight: 700;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.midnight-ledger-head span:first-child {
  text-align: right;
}

.midnight-ledger-row {
  position: relative;
  display: grid;
  min-height: 6rem;
  grid-template-columns: 6.3rem 1.5rem minmax(13rem, 1fr) 9rem 10.5rem 8rem;
  align-items: center;
  gap: 1rem;
  padding: .85rem 1rem;
  border-bottom: 1px solid var(--border);
  transition:
    background-color var(--motion-standard) var(--motion-ease),
    transform var(--motion-standard) var(--motion-ease);
}

.midnight-ledger-row:hover {
  background: rgb(247 249 250 / .5);
  transform: translateX(2px);
}

.midnight-ledger-row-current {
  background:
    linear-gradient(90deg, rgb(215 224 231 / .94), rgb(238 242 245 / .82));
  clip-path: polygon(0 0, 97% 0, 100% 50%, 97% 100%, 0 100%);
}

.midnight-ledger-row-current::before {
  content: '';
  position: absolute;
  top: .85rem;
  bottom: .85rem;
  left: 8.55rem;
  width: 5px;
  background: var(--midnight-amber);
}

.midnight-ledger-time {
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -.04em;
}

.midnight-ledger-node {
  z-index: 1;
  width: .92rem;
  height: .92rem;
  justify-self: center;
  border: 2px solid var(--midnight);
  border-radius: 9999px;
  background: var(--surface-elevated);
}

.midnight-ledger-row-current .midnight-ledger-node::after {
  content: '';
  display: block;
  width: .3rem;
  height: .3rem;
  margin: .18rem;
  border-radius: 9999px;
  background: var(--midnight-steel);
}

.midnight-ledger-name {
  font-size: .92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.midnight-ledger-session > p:last-child,
.midnight-ledger-context {
  margin-top: .35rem;
  color: var(--text-muted);
  font-size: .7rem;
}

.midnight-ledger-context {
  margin-top: 0;
  line-height: 1.4;
}

.midnight-ledger-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: .4rem;
}

.midnight-ledger-link,
.midnight-ledger-current-label {
  font-size: .63rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--midnight-steel);
}

button.midnight-ledger-link {
  border: 0;
  padding: 0;
  background: transparent;
}

.midnight-ledger-current-label {
  color: var(--midnight);
}

.midnight-ledger-error {
  grid-column: 3 / -1;
  padding: .55rem .75rem;
  border-left: 3px solid var(--state-danger);
  background: var(--state-danger-surface);
  color: var(--state-danger);
  font-size: .7rem;
}

.midnight-attached-work {
  padding-top: 5.6rem;
}

.midnight-attached-label {
  margin: 0 0 .8rem 1.4rem;
  font-size: .54rem;
  font-weight: 700;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.midnight-work-tab {
  position: relative;
  display: grid;
  min-height: 8rem;
  grid-template-columns: 2.5rem 1fr;
  gap: .75rem;
  margin-top: 1rem;
  padding: 1.35rem 1rem 1.2rem 1.35rem;
  border-left: 5px solid var(--midnight-amber);
  background: var(--surface-muted);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 18% 100%, 0 66%);
}

.midnight-work-tab-primary {
  min-height: 9rem;
  margin-top: 0;
  background: var(--midnight-steel);
  color: white;
}

.midnight-work-tab-index {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--midnight);
}

.midnight-work-tab-primary .midnight-work-tab-index {
  color: var(--midnight-amber-soft);
}

.midnight-work-tab-label {
  margin-bottom: .8rem;
  font-size: .54rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.midnight-work-tab-primary .midnight-work-tab-label {
  color: rgb(227 235 240 / .74);
}

.midnight-work-tab h3 {
  font-size: .76rem;
  font-weight: 700;
}

.midnight-work-tab p:not(.midnight-work-tab-label) {
  margin-top: .4rem;
  font-size: .68rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.midnight-work-tab a {
  display: inline-flex;
  margin-top: .65rem;
  font-size: .63rem;
  font-weight: 700;
  color: var(--midnight-steel);
}

.midnight-work-link {
  display: block !important;
  margin-top: .65rem !important;
  color: white !important;
}

.midnight-work-link span,
.midnight-work-link small {
  display: block;
}

.midnight-work-link small {
  margin-top: .25rem;
  color: rgb(219 229 235 / .72);
  font-size: .6rem;
  font-weight: 500;
}

.midnight-work-empty {
  color: rgb(235 241 244 / .78) !important;
}

.midnight-overview-footer {
  display: grid;
  max-width: var(--overview-max);
  grid-template-columns: 1fr 1.5fr;
  gap: 4rem;
  margin: 3.5rem auto 0;
  padding: 1.6rem 0 1rem;
  border-top: 2px solid var(--midnight);
}

.midnight-footer-value {
  margin-top: .75rem;
  font-size: .83rem;
  font-weight: 650;
}

.midnight-activity-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: .3rem 1rem;
  margin-top: .75rem;
  color: var(--text-primary);
}

.midnight-activity-link span {
  font-size: .83rem;
  font-weight: 650;
}

.midnight-activity-link small {
  color: var(--text-muted);
  font-size: .68rem;
}

.midnight-activity-link time {
  grid-row: 1 / 3;
  grid-column: 2;
  align-self: center;
  color: var(--text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: .68rem;
}

.midnight-source-note {
  grid-column: 1 / -1;
  margin-top: 1rem;
  color: var(--text-subtle);
  font-size: .62rem;
}

@media (max-width: 1180px) {
  .midnight-stage {
    min-height: 23rem;
  }

  .midnight-orientation {
    min-height: 23rem;
  }

  .midnight-aperture {
    top: 5rem;
    right: .5rem;
    width: 20rem;
  }

  .midnight-aperture-ring span {
    transform:
      translate(-50%, -50%)
      rotate(var(--angle))
      translateY(-8.6rem);
  }

  .midnight-workspace {
    grid-template-columns: minmax(0, 1fr) 9.25rem;
  }

  .midnight-ledger-head {
    grid-template-columns: 5.4rem 1.3rem minmax(13rem, 1fr) 7.25rem 8rem 6.5rem;
  }

  .midnight-ledger-row {
    grid-template-columns: 5.4rem 1.3rem minmax(11rem, 1fr) 7.25rem 8rem 6.5rem;
  }

  .midnight-ledger::before {
    left: 6.65rem;
  }

  .midnight-ledger-row-current::before {
    left: 7.56rem;
  }
}

@media (max-width: 900px) {
  .midnight-overview {
    padding: 0 0 2.5rem;
  }

  .midnight-stage {
    min-height: 28rem;
  }

  .midnight-orientation {
    width: 100%;
    min-height: 17.5rem;
    padding: 2rem 1.25rem 4.25rem;
    clip-path: polygon(0 0, 100% 0, 100% 88%, 80% 100%, 0 100%);
  }

  .midnight-orientation :deep(.type-greeting) {
    max-width: 15rem;
    font-size: 2.35rem;
  }

  .midnight-orientation :deep(.type-body) {
    max-width: 12rem;
    font-size: .74rem;
    line-height: 1.4;
  }

  .midnight-meridian-line {
    top: 1.1rem;
    right: 68%;
    bottom: 2.4rem;
  }

  .midnight-day-counts {
    display: none;
  }

  .midnight-aperture {
    top: 8.7rem;
    right: -.25rem;
    width: 14.5rem;
    padding: 2.3rem 2rem 2rem;
    box-shadow:
      .42rem .48rem 0 var(--midnight-deep),
      0 1.2rem 3rem rgb(9 21 34 / .2);
  }

  .midnight-aperture::before {
    inset: 1.1rem;
  }

  .midnight-aperture::after {
    top: 1.05rem;
    border-top-width: .25rem;
  }

  .midnight-aperture-ring {
    inset: .8rem;
  }

  .midnight-aperture-ring span {
    height: .38rem;
    transform:
      translate(-50%, -50%)
      rotate(var(--angle))
      translateY(-6.15rem);
  }

  .midnight-aperture-label {
    margin-bottom: .75rem;
    font-size: .48rem;
  }

  .midnight-aperture-time {
    font-size: 2.8rem;
  }

  .midnight-aperture-client {
    margin-top: .65rem;
    font-size: .82rem;
  }

  .midnight-aperture-meta {
    font-size: .58rem;
  }

  .midnight-aperture-status {
    margin-top: .8rem;
    font-size: .58rem;
  }

  .midnight-session-action {
    right: .2rem;
    bottom: -.55rem;
    left: -7.8rem;
    min-height: 2.55rem;
    padding: 0 1rem 0 1.35rem;
    border-left-width: .3rem;
    box-shadow: .35rem .35rem 0 var(--midnight-deep);
    font-size: .53rem;
  }

  .midnight-aperture-error {
    top: calc(100% + 2.4rem);
    right: .5rem;
    width: calc(100% + 6.5rem);
  }

  .midnight-onboarding {
    display: block;
    margin: 1.5rem 1.25rem 0;
  }

  .midnight-onboarding > div:last-child {
    margin-top: 1.25rem;
  }

  .midnight-workspace {
    display: block;
    margin-top: 1.5rem;
    padding: 0 1.25rem;
  }

  .midnight-folio {
    padding-right: 0;
  }

  .midnight-folio-header h2 {
    font-size: 1.7rem;
  }

  .midnight-ledger-head {
    display: none;
  }

  .midnight-ledger::before {
    top: 1.5rem;
    bottom: 1rem;
    left: 3.62rem;
    width: 1.5px;
  }

  .midnight-ledger-row {
    min-height: 4.35rem;
    grid-template-columns: 2.85rem 1rem minmax(0, 1fr) 4.7rem 1.3rem;
    gap: .55rem;
    padding: .6rem .35rem;
  }

  .midnight-ledger-row-current {
    clip-path: none;
  }

  .midnight-ledger-row-current::before {
    top: .55rem;
    bottom: .55rem;
    left: 4.25rem;
    width: 4px;
  }

  .midnight-ledger-time {
    font-size: .76rem;
  }

  .midnight-ledger-node {
    width: .7rem;
    height: .7rem;
    border-width: 1.5px;
  }

  .midnight-ledger-row-current .midnight-ledger-node::after {
    width: .22rem;
    height: .22rem;
    margin: .12rem;
  }

  .midnight-ledger-name {
    font-size: .78rem;
  }

  .midnight-ledger-session > p:last-child {
    font-size: .58rem;
  }

  .midnight-ledger-context {
    display: none;
  }

  .midnight-ledger-row :deep(.type-metadata) {
    font-size: .56rem;
  }

  .midnight-ledger-actions {
    align-items: flex-end;
  }

  .midnight-ledger-link,
  .midnight-ledger-current-label {
    font-size: 0;
  }

  .midnight-ledger-link::after,
  .midnight-ledger-current-label::after {
    content: '→';
    font-size: .8rem;
  }

  .midnight-ledger-error {
    grid-column: 3 / -1;
  }

  .midnight-attached-work {
    padding-top: 1.75rem;
  }

  .midnight-attached-label,
  .midnight-work-tab:not(.midnight-work-tab-primary) {
    display: none;
  }

  .midnight-work-tab-primary {
    min-height: 4.8rem;
    grid-template-columns: 2rem 1fr;
    padding: 1rem 1.1rem 1rem 1.35rem;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 8% 100%, 0 64%);
  }

  .midnight-overview-footer {
    display: block;
    margin: 2.4rem 1.25rem 0;
  }

  .midnight-overview-footer section + section {
    margin-top: 1.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .midnight-session-action:hover,
  .midnight-session-action:active,
  .midnight-ledger-row:hover {
    transform: none;
  }
}
</style>
