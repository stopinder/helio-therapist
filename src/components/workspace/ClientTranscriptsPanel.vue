<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-3xl mx-auto" data-testid="client-transcripts-panel">
    <div class="flex items-start justify-between gap-inline-md pt-stack-md mb-stack-lg">
      <div>
        <h3 class="text-h3 font-semibold text-ink">Transcripts</h3>
        <p class="text-body-sm text-ink-muted mt-1">Original source transcripts assigned to this client.</p>
      </div>
      <router-link to="/transcripts" class="text-body-sm font-medium text-action-link hover:underline">Transcript Inbox</router-link>
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
            <p class="text-caption text-ink-muted mt-0.5">{{ formatDate(transcript.receivedAt) }}<template v-if="transcript.sessionRef"> · Linked to session</template></p>
          </div>
          <button type="button" class="text-body-sm font-medium text-action-link hover:underline shrink-0" @click="toggleTranscript(transcript.id)">{{ expandedId === transcript.id ? 'Hide' : 'View' }}</button>
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

const props = defineProps({ clientId: { type: String, required: true } })
const transcripts = ref([])
const loading = ref(true)
const error = ref('')
const expandedId = ref(null)

const clientTranscripts = computed(() => transcripts.value
  .filter(item => String(item.clientId || '') === String(props.clientId))
  .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to load transcripts.')
    transcripts.value = data.transcripts || []
  } catch (err) {
    console.error('[Client Transcripts] Failed to load', err)
    error.value = 'Unable to load transcripts.'
  } finally {
    loading.value = false
  }
}

function toggleTranscript(id) { expandedId.value = expandedId.value === id ? null : id }
function titleFor(transcript) { return transcript.meetingId?.startsWith?.('manual-') ? 'Imported Zoom transcript' : transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript' }
function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '' }

watch(() => props.clientId, () => { expandedId.value = null; load() })
onMounted(load)
</script>
