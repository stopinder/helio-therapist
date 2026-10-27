<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-3xl mx-auto" data-testid="client-transcripts-panel">
    <div class="flex items-start justify-between gap-inline-md pt-stack-md mb-stack-lg">
      <div>
        <h3 class="text-h3 font-semibold text-ink">Transcripts</h3>
        <p class="text-body-sm text-ink-muted mt-1">Original source material connected to this client’s encounters.</p>
      </div>
      <router-link :to="{ path: '/transcripts', query: { returnClientId: props.clientId } }" class="text-body-sm font-medium text-action-link hover:underline">Transcript Inbox</router-link>
    </div>

    <div v-if="loading" class="py-stack-xl text-center text-body-sm text-ink-subtle">Loading transcripts…</div>
    <div v-else-if="error" class="py-stack-lg">
      <p class="text-body-sm text-state-danger" role="alert">Couldn’t load this client’s transcripts.</p>
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
            <p class="text-caption text-ink-muted mt-0.5">{{ transcriptMeta(transcript) }}</p>
          </div>
          <div class="flex items-center gap-inline-md shrink-0">
            <button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="toggleTranscript(transcript.id)">{{ expandedId === transcript.id ? 'Hide source' : 'View source' }}</button>
            <button
              v-if="!transcript.sessionRef"
              type="button"
              class="text-body-sm font-semibold text-action-link hover:underline"
              @click="linkingId = linkingId === transcript.id ? null : transcript.id"
            >{{ linkingId === transcript.id ? 'Close' : 'Link session' }}</button>
            <router-link
              v-else
              :to="{ name: 'SessionWorkspace', params: { clientId: props.clientId, sessionId: transcript.sessionRef } }"
              class="text-body-sm font-medium text-action-link hover:underline"
            >Open session</router-link>
          </div>
        </div>

        <div v-if="linkingId === transcript.id && !transcript.sessionRef" class="mt-stack-md border-t border-border-muted pt-stack-md">
          <TranscriptSessionLinker
            :transcript="transcript"
            :client-id="props.clientId"
            :sessions="sessions"
            @linked="handleLinked"
            @session-created="handleSessionCreated"
          />
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
import { authenticatedFetch } from '../../lib/api.js'
import { listSessions } from '../../lib/sessions.js'
import TranscriptSessionLinker from '../TranscriptSessionLinker.vue'

const props = defineProps({ clientId: { type: String, required: true } })
const transcripts = ref([])
const sessions = ref([])
const loading = ref(true)
const error = ref('')
const expandedId = ref(null)
const linkingId = ref(null)

const clientTranscripts = computed(() => transcripts.value
  .filter(item => String(item.clientId || '') === String(props.clientId))
  .sort((a, b) => new Date(sessionFor(b)?.startedAt || b.receivedAt || 0) - new Date(sessionFor(a)?.startedAt || a.receivedAt || 0)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [response, sessionData] = await Promise.all([
      authenticatedFetch(`/api/zoom/transcripts?clientId=${encodeURIComponent(props.clientId)}`),
      listSessions({ clientId: props.clientId })
    ])
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to load transcripts.')
    transcripts.value = data.transcripts || []
    sessions.value = sessionData
  } catch (err) {
    console.error('[Client Transcripts] Failed to load', err)
    error.value = 'Unable to load transcripts.'
  } finally {
    loading.value = false
  }
}

function sessionFor(transcript) {
  return sessions.value.find(session => String(session.id) === String(transcript?.sessionRef) || String(session.legacyRef || '') === String(transcript?.sessionRef)) || null
}
function transcriptMeta(transcript) {
  const encounter = sessionFor(transcript)
  if (encounter) return `Session ${formatDate(encounter.startedAt || encounter.createdAt)} · Imported ${formatDate(transcript.receivedAt)}`
  return `Imported ${formatDate(transcript.receivedAt)} · Needs session`
}
function handleSessionCreated(session) {
  sessions.value = [session, ...sessions.value.filter(item => item.id !== session.id)]
}
function handleLinked(transcript) {
  const index = transcripts.value.findIndex(item => item.id === transcript.id)
  if (index >= 0) transcripts.value[index] = transcript
  linkingId.value = null
}
function toggleTranscript(id) { expandedId.value = expandedId.value === id ? null : id }
function titleFor(transcript) {
  if (transcript.source === 'zoom_my_notes') return 'Zoom My Notes transcript'
  if (transcript.meetingId?.startsWith?.('manual-')) return 'Imported Zoom transcript'
  return transcript.sourceTitle || (transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript')
}
function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date unavailable' }

watch(() => props.clientId, () => { expandedId.value = null; linkingId.value = null; load() })
onMounted(load)
</script>
