<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-3xl mx-auto" data-testid="client-transcripts-panel">
    <div class="flex items-start justify-between gap-inline-md pt-stack-md mb-stack-lg">
      <div>
        <h3 class="text-h3 font-semibold text-ink">Transcripts</h3>
        <p class="text-body-sm text-ink-muted mt-1">Original source transcripts assigned to this client.</p>
      </div>
      <router-link :to="{ path: '/transcripts', query: { returnClientId: props.clientId } }" class="text-body-sm font-medium text-action-link hover:underline">Transcript Inbox</router-link>
    </div>

    <div v-if="loading" class="py-stack-xl text-center text-body-sm text-ink-subtle">Loading transcripts…</div>
    <div v-else-if="error" class="py-stack-lg">
      <p class="text-body-sm text-state-danger" role="alert">{{ error }}</p>
      <button type="button" class="button-secondary mt-stack-md" @click="load">Try again</button>
    </div>
    <div v-else-if="!clientTranscripts.length" class="py-stack-xl text-center">
      <p class="text-body-sm text-ink-muted">No transcripts are assigned to this client.</p>
      <p class="text-caption text-ink-subtle mt-stack-xs">Assign a transcript from Transcript Inbox and it will appear here.</p>
    </div>

    <div v-else class="space-y-stack-sm pb-stack-lg">
      <article v-for="transcript in clientTranscripts" :key="transcript.id" class="border border-border-muted rounded-control bg-surface p-inline-md py-stack-md">
        <div class="flex items-start justify-between gap-inline-md">
          <div class="min-w-0">
            <p class="text-body-sm font-medium text-ink">{{ titleFor(transcript) }}</p>
            <p class="text-caption text-ink-muted mt-0.5">
              {{ formatDate(transcript.receivedAt) }}
              <template v-if="transcript.sessionRef"> · Linked to session</template>
              <template v-else> · Not linked to a session</template>
            </p>
          </div>

          <div class="flex items-center gap-inline-md shrink-0">
            <button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="toggleTranscript(transcript.id)">
              {{ expandedId === transcript.id ? 'Hide transcript' : 'View transcript' }}
            </button>
            <RouterLink
              v-if="transcript.sessionRef"
              :to="{ name: 'SessionWorkspace', params: { clientId: props.clientId, sessionId: transcript.sessionRef } }"
              class="text-body-sm font-semibold text-action-link hover:underline"
            >Open session</RouterLink>
          </div>
        </div>

        <div class="mt-stack-md border-t border-border-muted pt-stack-md">
          <div v-if="transcript.sessionRef && linkingId !== transcript.id" class="flex items-center justify-between gap-inline-md">
            <p class="text-caption text-ink-muted">Linked to {{ sessionLabelById(transcript.sessionRef) }}</p>
            <button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="beginLinking(transcript)">Change session</button>
          </div>

          <div v-else class="space-y-stack-sm">
            <p class="text-body-sm font-medium text-ink">Session link <span class="font-normal text-ink-muted">(optional)</span></p>
            <p class="text-caption text-ink-muted">Choose the encounter this transcript belongs to. An in-progress session is a valid link.</p>

            <div v-if="sessionsForClient.length" class="flex items-center gap-inline-sm">
              <label :for="`session-${transcript.id}`" class="sr-only">Session</label>
              <select
                :id="`session-${transcript.id}`"
                v-model="selectedSessions[transcript.id]"
                class="control-field flex-1"
              >
                <option value="" disabled>Select a session…</option>
                <option v-for="session in sessionsForClient" :key="session.id" :value="String(session.id)">
                  {{ sessionOptionLabel(session) }}
                </option>
              </select>
              <button
                type="button"
                class="button-secondary whitespace-nowrap"
                :disabled="savingId === transcript.id || !selectedSessions[transcript.id]"
                @click="linkSession(transcript)"
              >
                {{ savingId === transcript.id ? 'Linking…' : 'Link session' }}
              </button>
              <button
                v-if="transcript.sessionRef"
                type="button"
                class="text-body-sm text-ink-muted hover:text-ink"
                :disabled="savingId === transcript.id"
                @click="cancelLinking(transcript)"
              >Cancel</button>
            </div>

            <p v-else class="text-caption text-ink-muted">No sessions are recorded for this client yet. The transcript can remain assigned without a session link.</p>
            <p v-if="linkErrors[transcript.id]" class="text-caption text-state-danger" role="alert">{{ linkErrors[transcript.id] }}</p>
          </div>
        </div>

        <div v-if="expandedId === transcript.id" class="mt-stack-md border-t border-border-muted pt-stack-md">
          <p class="text-caption text-ink-muted mb-stack-sm">Original transcript · unchanged source</p>
          <pre class="whitespace-pre-wrap break-words text-body-sm text-ink-secondary font-sans max-h-96 overflow-y-auto">{{ transcript.text }}</pre>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { authenticatedFetch } from '../../lib/api.js'
import { listSessions } from '../../lib/sessions.js'

const props = defineProps({ clientId: { type: String, required: true } })
const transcripts = ref([])
const sessions = ref([])
const loading = ref(true)
const error = ref('')
const expandedId = ref(null)
const linkingId = ref(null)
const savingId = ref(null)
const selectedSessions = ref({})
const linkErrors = ref({})

const clientTranscripts = computed(() => transcripts.value
  .filter(item => String(item.clientId || '') === String(props.clientId))
  .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0)))

const sessionsForClient = computed(() => sessions.value
  .filter(session => String(session.clientId) === String(props.clientId))
  .sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
    if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
    return new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0)
  }))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [response, sessionRows] = await Promise.all([
      authenticatedFetch('/api/zoom/transcripts'),
      listSessions({ clientId: props.clientId })
    ])
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to load transcripts.')
    transcripts.value = data.transcripts || []
    sessions.value = sessionRows || []
    const selected = {}
    for (const transcript of transcripts.value) {
      if (transcript.sessionRef) selected[transcript.id] = String(transcript.sessionRef)
    }
    selectedSessions.value = selected
  } catch (err) {
    console.error('[Client Transcripts] Failed to load', err)
    error.value = err?.message || 'Couldn’t load this client’s transcripts.'
  } finally {
    loading.value = false
  }
}

function toggleTranscript(id) { expandedId.value = expandedId.value === id ? null : id }

function beginLinking(transcript) {
  linkingId.value = transcript.id
  selectedSessions.value = { ...selectedSessions.value, [transcript.id]: String(transcript.sessionRef || '') }
  linkErrors.value = { ...linkErrors.value, [transcript.id]: '' }
}

function cancelLinking(transcript) {
  linkingId.value = null
  selectedSessions.value = { ...selectedSessions.value, [transcript.id]: String(transcript.sessionRef || '') }
  linkErrors.value = { ...linkErrors.value, [transcript.id]: '' }
}

async function linkSession(transcript) {
  const sessionRef = selectedSessions.value[transcript.id]
  if (!sessionRef || savingId.value) return

  savingId.value = transcript.id
  linkErrors.value = { ...linkErrors.value, [transcript.id]: '' }
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: transcript.id,
        expectedUpdatedAt: transcript.updatedAt,
        sessionRef
      })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to link this session.')
    const index = transcripts.value.findIndex(item => item.id === transcript.id)
    if (index >= 0) transcripts.value[index] = data.transcript
    linkingId.value = null
  } catch (err) {
    linkErrors.value = { ...linkErrors.value, [transcript.id]: err?.message || 'Unable to link this session.' }
  } finally {
    savingId.value = null
  }
}

function titleFor(transcript) {
  if (transcript.source === 'zoom_my_notes') return 'Zoom My Notes transcript'
  if (transcript.meetingId?.startsWith?.('manual-')) return 'Imported Zoom transcript'
  return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript'
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
}

function sessionOptionLabel(session) {
  const date = formatDate(session.startedAt || session.createdAt)
  if (session.status === 'in_progress') return `In progress · ${date}`
  if (session.status === 'completed') return `Completed · ${date}`
  if (session.status === 'closed') return `Closed · ${date}`
  if (session.status === 'planned') return `Planned · ${date}`
  return `${date}`
}

function sessionLabelById(id) {
  const session = sessionsForClient.value.find(item => String(item.id) === String(id))
  return session ? sessionOptionLabel(session) : 'session'
}

watch(() => props.clientId, () => {
  expandedId.value = null
  linkingId.value = null
  load()
})

onMounted(load)
</script>
