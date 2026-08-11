<template>
  <div class="flex flex-col h-full bg-surface-canvas overflow-hidden">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="w-8 h-8 border-4 border-action-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-ink-muted animate-pulse">Loading transcripts...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center p-page text-center">
      <div class="w-16 h-16 bg-state-danger-surface text-state-danger rounded-pill flex items-center justify-center text-h2 mb-stack-md">⚠️</div>
      <h2 class="text-h2 font-semibold text-ink mb-stack-xs">Unable to load Transcripts</h2>
      <p class="text-body text-ink-muted mb-stack-lg max-w-md">{{ error }}</p>
      <button @click="load" class="px-inline-md py-stack-sm bg-action-primary text-on-action rounded-control font-medium hover:bg-action-primary-hover transition-colors shadow-sm">Retry</button>
    </div>

    <main v-else class="flex-1 overflow-y-auto p-page">
      <div class="max-w-[68rem] mx-auto flex justify-end mb-stack-md">
        <input ref="fileInput" class="sr-only" type="file" accept=".vtt,.txt,text/vtt,text/plain" @change="importTranscript" />
        <button
          type="button"
          class="button-secondary"
          :disabled="importing"
          @click="fileInput?.click()"
        >{{ importing ? 'Importing…' : 'Import transcript' }}</button>
      </div>
      <p v-if="importError" class="max-w-[68rem] mx-auto mb-stack-md text-body-sm text-state-danger" role="alert">{{ importError }}</p>
      <TranscriptInbox :key="inboxKey" :clients="clients" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TranscriptInbox from '../components/TranscriptInbox.vue'
import { listClients } from '../lib/clients.js'
import { authenticatedFetch } from '../lib/api.js'

const clients = ref([])
const loading = ref(true)
const error = ref('')
const importError = ref('')
const importing = ref(false)
const fileInput = ref(null)
const inboxKey = ref(0)
const MAX_IMPORT_BYTES = 2 * 1024 * 1024

async function load() {
  loading.value = true
  error.value = ''
  try {
    clients.value = await listClients()
  } catch (err) {
    error.value = err.message || 'Failed to initialize transcripts workspace.'
  } finally {
    loading.value = false
  }
}

async function importTranscript(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  importError.value = ''
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['vtt', 'txt'].includes(extension)) {
    importError.value = 'Choose a Zoom transcript in .vtt or .txt format.'
    return
  }
  if (file.size > MAX_IMPORT_BYTES) {
    importError.value = 'That transcript file is too large to import.'
    return
  }

  importing.value = true
  try {
    const text = await file.text()
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, text })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to import the transcript.')
    inboxKey.value += 1
  } catch (err) {
    console.error('[Transcript Import] Failed', err)
    importError.value = 'Couldn’t import the transcript. Please try again.'
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  load()
})
</script>
