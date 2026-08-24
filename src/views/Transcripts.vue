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
      <div class="max-w-[68rem] mx-auto mb-stack-md">
        <div class="flex justify-end gap-inline-sm">
          <button
            type="button"
            class="button-secondary"
            :disabled="checkingZoom"
            @click="checkZoomNotes"
          >{{ checkingZoom ? 'Checking Zoom…' : 'Check Zoom Notes' }}</button>
          <button
            type="button"
            class="button-secondary"
            :aria-expanded="showPasteImport"
            @click="togglePasteImport"
          >{{ showPasteImport ? 'Close paste' : 'Paste transcript' }}</button>
          <input ref="fileInput" class="sr-only" type="file" accept=".vtt,.txt,text/vtt,text/plain" @change="importTranscriptFile" />
          <button
            type="button"
            class="button-secondary"
            :disabled="importing"
            @click="fileInput?.click()"
          >{{ importing ? 'Importing…' : 'Choose file' }}</button>
        </div>

        <section v-if="showPasteImport" class="mt-stack-md rounded-panel border border-border-muted bg-surface p-stack-lg" aria-label="Paste transcript">
          <div class="mb-stack-md">
            <h2 class="text-body font-semibold text-ink">Paste transcript</h2>
            <p class="mt-stack-xs text-body-sm text-ink-muted">Copy the transcript from Zoom and paste it here. Helios will preserve it as the original source and will not analyse it automatically.</p>
          </div>
          <label for="pasted-transcript" class="sr-only">Transcript text</label>
          <textarea
            id="pasted-transcript"
            v-model="pastedTranscript"
            class="control-field min-h-48 resize-y"
            placeholder="Paste the Zoom transcript here…"
            :disabled="importing"
          ></textarea>
          <div class="mt-stack-md flex items-center justify-between gap-inline-md">
            <p class="text-caption text-ink-muted">Up to 2 MB. Re-importing the same transcript will not create a duplicate.</p>
            <button
              type="button"
              class="button-primary shrink-0"
              :disabled="importing || !pastedTranscript.trim()"
              @click="importPastedTranscript"
            >{{ importing ? 'Importing…' : 'Import pasted transcript' }}</button>
          </div>
        </section>
      </div>

      <p v-if="importError" class="max-w-[68rem] mx-auto mb-stack-md text-body-sm text-state-danger" role="alert">{{ importError }}</p>
      <p v-else-if="importSuccess" class="max-w-[68rem] mx-auto mb-stack-md text-body-sm text-state-success" role="status">{{ importSuccess }}</p>
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
const importSuccess = ref('')
const importing = ref(false)
const checkingZoom = ref(false)
const fileInput = ref(null)
const inboxKey = ref(0)
const showPasteImport = ref(false)
const pastedTranscript = ref('')
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

function togglePasteImport() {
  showPasteImport.value = !showPasteImport.value
  importError.value = ''
  importSuccess.value = ''
}

async function checkZoomNotes() {
  checkingZoom.value = true
  importError.value = ''
  importSuccess.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/reconcile-my-notes', { method: 'POST' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to check Zoom Notes.')
    if (data.imported > 0) {
      inboxKey.value += 1
      importSuccess.value = `${data.imported} ${data.imported === 1 ? 'transcript' : 'transcripts'} imported from Zoom.`
    } else {
      importSuccess.value = 'Zoom Notes checked. No missing transcripts found.'
    }
  } catch (err) {
    importError.value = err.message || 'Unable to check Zoom Notes.'
  } finally {
    checkingZoom.value = false
  }
}

async function submitTranscriptImport(filename, text) {
  importError.value = ''
  importSuccess.value = ''

  if (!text.trim()) {
    importError.value = 'Paste some transcript text before importing.'
    return false
  }
  if (new Blob([text]).size > MAX_IMPORT_BYTES) {
    importError.value = 'That transcript is too large to import.'
    return false
  }

  importing.value = true
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, text })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to import the transcript.')
    inboxKey.value += 1
    importSuccess.value = data.duplicate ? 'That transcript is already in your inbox.' : 'Transcript imported. Assign the client when you are ready.'
    return true
  } catch (err) {
    console.error('[Transcript Import] Failed', err)
    importError.value = 'Couldn’t import the transcript. Please try again.'
    return false
  } finally {
    importing.value = false
  }
}

async function importPastedTranscript() {
  const imported = await submitTranscriptImport('pasted-transcript.txt', pastedTranscript.value)
  if (imported) {
    pastedTranscript.value = ''
    showPasteImport.value = false
  }
}

async function importTranscriptFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  importError.value = ''
  importSuccess.value = ''
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['vtt', 'txt'].includes(extension)) {
    importError.value = 'Choose a Zoom transcript in .vtt or .txt format.'
    return
  }
  if (file.size > MAX_IMPORT_BYTES) {
    importError.value = 'That transcript file is too large to import.'
    return
  }

  const text = await file.text()
  await submitTranscriptImport(file.name, text)
}

onMounted(() => {
  load()
})
</script>
