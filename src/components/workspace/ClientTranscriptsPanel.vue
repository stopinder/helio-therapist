<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-3xl mx-auto" data-testid="client-transcripts-panel">
    <div class="flex items-start justify-between gap-inline-md pt-stack-md mb-stack-lg">
      <div><h3 class="text-h3 font-semibold text-ink">Transcripts</h3><p class="text-body-sm text-ink-muted mt-1">Session summaries and original source transcripts assigned to this client.</p></div>
      <router-link :to="{ path: '/transcripts', query: { returnClientId: props.clientId } }" class="text-body-sm font-medium text-action-link hover:underline">Transcript Inbox</router-link>
    </div>
    <div v-if="loading" class="py-stack-xl text-center text-body-sm text-ink-subtle">Loading transcripts…</div>
    <div v-else-if="error" class="py-stack-lg"><p class="text-body-sm text-state-danger" role="alert">Couldn’t load this client’s transcripts.</p><button type="button" class="button-secondary mt-stack-md" @click="load">Try again</button></div>
    <div v-else-if="!clientTranscripts.length" class="py-stack-xl text-center"><p class="text-body-sm text-ink-muted">No transcripts are assigned to this client.</p><p class="text-caption text-ink-subtle mt-stack-xs">Assign a transcript from Transcript Inbox and it will appear here.</p></div>
    <div v-else class="space-y-stack-sm pb-stack-lg">
      <article v-for="transcript in clientTranscripts" :key="transcript.id" class="border border-border-muted rounded-control bg-surface p-inline-md py-stack-md">
        <div class="flex items-start justify-between gap-inline-md">
          <div class="min-w-0"><p class="text-body-sm font-medium text-ink">{{ titleFor(transcript) }}</p><p class="text-caption text-ink-muted mt-0.5">{{ formatDate(transcript.receivedAt) }}<template v-if="transcript.sessionRef"> · Linked to session</template><template v-else> · Needs session</template></p></div>
          <div class="flex items-center gap-inline-md shrink-0"><button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="toggleTranscript(transcript)">{{ expandedId === transcript.id ? 'Hide' : 'View' }}</button><router-link v-if="!transcript.sessionRef" :to="{ path: '/transcripts', query: { transcript: transcript.id, returnClientId: props.clientId } }" class="text-body-sm font-semibold text-action-link hover:underline">Link session</router-link><router-link v-else :to="{ path: '/transcripts', query: { transcript: transcript.id, returnClientId: props.clientId } }" class="text-body-sm font-medium text-action-link hover:underline">Review</router-link></div>
        </div>
        <div v-if="expandedId === transcript.id" class="mt-stack-md border-t border-border-muted pt-stack-md">
          <div v-if="transcript.zoomGeneratedSummary" class="flex items-center gap-1 mb-stack-md" role="group" aria-label="Transcript view">
            <button type="button" class="px-3 py-1.5 rounded-control text-body-sm font-medium" :class="viewFor(transcript) === 'summary' ? 'bg-action-primary text-white' : 'text-ink-muted hover:bg-surface-subtle'" @click="setView(transcript.id, 'summary')">Summary</button>
            <button type="button" class="px-3 py-1.5 rounded-control text-body-sm font-medium" :class="viewFor(transcript) === 'raw' ? 'bg-action-primary text-white' : 'text-ink-muted hover:bg-surface-subtle'" @click="setView(transcript.id, 'raw')">Raw transcript</button>
          </div>
          <template v-if="transcript.zoomGeneratedSummary && viewFor(transcript) === 'summary'"><p class="text-caption text-ink-muted mb-stack-sm">Zoom-generated summary</p><div class="whitespace-pre-wrap break-words text-body-sm text-ink-secondary max-h-96 overflow-y-auto">{{ transcript.zoomGeneratedSummary }}</div></template>
          <template v-else><p class="text-caption text-ink-muted mb-stack-sm">Original transcript · unchanged source</p><pre class="whitespace-pre-wrap break-words text-body-sm text-ink-secondary font-sans max-h-96 overflow-y-auto">{{ transcript.text }}</pre></template>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
const props = defineProps({ clientId: { type: String, required: true } })
const transcripts = ref([]); const loading = ref(true); const error = ref(''); const expandedId = ref(null); const transcriptViews = ref({})
const clientTranscripts = computed(() => transcripts.value.filter(item => String(item.clientId || '') === String(props.clientId)).sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0)))
async function load() { loading.value = true; error.value = ''; try { const response = await authenticatedFetch('/api/zoom/transcripts'); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to load transcripts.'); transcripts.value = data.transcripts || [] } catch (err) { console.error('[Client Transcripts] Failed to load', err); error.value = 'Unable to load transcripts.' } finally { loading.value = false } }
function toggleTranscript(transcript) { if (expandedId.value === transcript.id) { expandedId.value = null; return } expandedId.value = transcript.id; if (!transcriptViews.value[transcript.id]) setView(transcript.id, transcript.zoomGeneratedSummary ? 'summary' : 'raw') }
function setView(id, view) { transcriptViews.value = { ...transcriptViews.value, [id]: view } }
function viewFor(transcript) { return transcriptViews.value[transcript.id] || (transcript.zoomGeneratedSummary ? 'summary' : 'raw') }
function titleFor(transcript) { if (transcript.source === 'zoom_my_notes') return transcript.sourceTitle || 'Zoom My Notes transcript'; if (transcript.meetingId?.startsWith?.('manual-')) return 'Imported Zoom transcript'; return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript' }
function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '' }
watch(() => props.clientId, () => { expandedId.value = null; transcriptViews.value = {}; load() }); onMounted(load)
</script>
