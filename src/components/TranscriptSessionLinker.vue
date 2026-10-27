<template>
  <section class="session-linker" data-testid="transcript-session-linker">
    <div>
      <p class="eyebrow">Session</p>
      <h3>Which session was this?</h3>
      <p class="field-help">Choose the therapeutic encounter this source belongs to. Helios will not infer the match.</p>
    </div>

    <div v-if="availableSessions.length" class="session-options" role="radiogroup" aria-label="Existing sessions">
      <label v-for="session in availableSessions" :key="session.id" class="session-option" :class="{ selected: selectedSessionRef === String(session.id) }">
        <input v-model="selectedSessionRef" type="radio" name="transcript-session" :value="String(session.id)" :disabled="saving" />
        <span class="session-copy">
          <strong>{{ formatEncounter(session.startedAt || session.createdAt) }}</strong>
          <small>{{ sessionStatusLabel(session) }}</small>
        </span>
      </label>
      <button type="button" class="primary" :disabled="saving || !selectedSessionRef || selectedSessionRef === String(transcript.sessionRef || '')" @click="linkExisting">
        {{ saving ? 'Linking…' : 'Link selected session' }}
      </button>
    </div>
    <p v-else class="field-help">No existing sessions are recorded for this client.</p>

    <div class="create-session">
      <button type="button" class="secondary" :aria-expanded="showCreate" :disabled="saving" @click="showCreate = !showCreate">
        {{ showCreate ? 'Cancel new session' : 'Create another session' }}
      </button>
      <div v-if="showCreate" class="create-fields">
        <p v-if="openSession" class="notice warning">
          A session is already open for this client ({{ formatEncounter(openSession.startedAt || openSession.createdAt) }}). Finish it or link this transcript to it before creating another.
        </p>
        <template v-else>
          <div class="field-grid">
            <label class="field-group">
              <span>Session date</span>
              <input v-model="sessionDate" type="date" class="control-field" :disabled="saving" />
            </label>
            <label class="field-group">
              <span>Session time</span>
              <input v-model="sessionTime" type="time" class="control-field" :disabled="saving" />
            </label>
          </div>
          <p class="field-help">Confirm when the encounter actually happened ({{ localTimezoneLabel }} time). Import time is not used as the clinical date.</p>
          <button type="button" class="primary" :disabled="saving || !sessionDate || !sessionTime" @click="createAndLink">
            {{ saving ? 'Creating…' : 'Create and link session' }}
          </button>
        </template>
      </div>
    </div>

    <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { createSessionFromTranscript } from '../lib/sessions.js'
import { localSessionDateTime, localSessionDateTimeToUtc } from '../lib/sessionDateTime.js'

const props = defineProps({
  transcript: { type: Object, required: true },
  clientId: { type: String, required: true },
  sessions: { type: Array, default: () => [] }
})
const emit = defineEmits(['linked', 'session-created'])

const selectedSessionRef = ref(props.transcript.sessionRef ? String(props.transcript.sessionRef) : '')
const showCreate = ref(false)
const now = localSessionDateTime()
const sessionDate = ref(now.date)
const sessionTime = ref(now.time)
const saving = ref(false)
const errorMessage = ref('')
const locallyCreatedSessions = ref([])
const localTimezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone || 'device local'

const availableSessions = computed(() => {
  const byId = new Map()
  for (const session of [...locallyCreatedSessions.value, ...props.sessions]) {
    if (String(session.clientId || '') !== String(props.clientId)) continue
    byId.set(String(session.id), session)
  }
  return [...byId.values()].sort((a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0))
})
const openSession = computed(() => availableSessions.value.find(session => session.status === 'in_progress') || null)

watch(() => props.transcript.sessionRef, value => {
  selectedSessionRef.value = value ? String(value) : ''
})

async function patchSessionLink(sessionRef) {
  const response = await authenticatedFetch('/api/zoom/transcripts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: props.transcript.id,
      expectedUpdatedAt: props.transcript.updatedAt,
      sessionRef
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to link this transcript to the session.')
  if (!data.transcript?.sessionRef) throw new Error('The transcript was not linked. Reload and try again.')
  return data.transcript
}

async function linkExisting() {
  if (!selectedSessionRef.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const transcript = await patchSessionLink(selectedSessionRef.value)
    emit('linked', transcript)
  } catch (error) {
    errorMessage.value = error?.message || 'Unable to link this transcript to the session.'
  } finally {
    saving.value = false
  }
}

async function createAndLink() {
  if (saving.value || openSession.value || !sessionDate.value || !sessionTime.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const occurredAt = localSessionDateTimeToUtc(sessionDate.value, sessionTime.value)
    const session = await createSessionFromTranscript(props.clientId, occurredAt)
    locallyCreatedSessions.value = [session, ...locallyCreatedSessions.value.filter(item => item.id !== session.id)]
    emit('session-created', session)
    selectedSessionRef.value = String(session.id)
    const transcript = await patchSessionLink(selectedSessionRef.value)
    emit('linked', transcript)
  } catch (error) {
    errorMessage.value = error?.message || 'Unable to create and link the session. Your transcript is safe.'
  } finally {
    saving.value = false
  }
}

function formatEncounter(value) {
  if (!value) return 'Date unavailable'
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function sessionStatusLabel(session) {
  return ({ in_progress: 'Open session', completed: 'Completed session', closed: 'Completed session', planned: 'Planned session' })[session.status] || 'Recorded session'
}
</script>

<style scoped>
.session-linker { display: grid; gap: 1rem; width: 100%; }
.session-linker h3 { margin: .25rem 0; font-size: 1.05rem; color: var(--text-primary); }
.session-options { display: grid; gap: .55rem; }
.session-option { display: flex; gap: .75rem; align-items: flex-start; padding: .8rem; border: 1px solid var(--border-muted); border-radius: .65rem; background: var(--surface); cursor: pointer; }
.session-option.selected { border-color: var(--action-link); background: var(--state-selected); }
.session-option input { margin-top: .2rem; }
.session-copy { display: grid; gap: .15rem; min-width: 0; }
.session-copy strong { color: var(--text-primary); font-size: .9rem; }
.session-copy small, .field-help { color: var(--text-muted); font-size: .8rem; line-height: 1.4; }
.create-session { padding-top: .8rem; border-top: 1px solid var(--border-muted); }
.create-fields { display: grid; gap: .8rem; margin-top: .8rem; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
.field-group { display: grid; gap: .35rem; color: var(--text-secondary); font-size: .82rem; font-weight: 600; }
.notice { margin: 0; padding: .75rem; border-radius: .6rem; font-size: .82rem; line-height: 1.4; }
.notice.warning { background: var(--state-warning-surface, #fff7ed); color: var(--text-secondary); }
.notice.error { background: var(--state-danger-surface); color: var(--state-danger); }
@media (max-width: 640px) { .field-grid { grid-template-columns: 1fr; } }
</style>
