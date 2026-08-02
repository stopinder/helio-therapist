<template>
  <div class="flex flex-col h-full bg-surface-canvas overflow-hidden">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="w-8 h-8 border-4 border-action-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-ink-muted animate-pulse">Loading transcripts...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center p-page text-center">
      <div class="w-16 h-16 bg-state-danger-surface text-state-danger rounded-pill flex items-center justify-center text-h2 mb-stack-md">
        ⚠️
      </div>
      <h2 class="text-h2 font-semibold text-ink mb-stack-xs">Unable to load Transcripts</h2>
      <p class="text-body text-ink-muted mb-stack-lg max-w-md">{{ error }}</p>
      <button 
        @click="load" 
        class="px-inline-md py-stack-sm bg-action-primary text-on-action rounded-control font-medium hover:bg-action-primary-hover transition-colors shadow-sm"
      >
        Retry
      </button>
    </div>

    <main v-else class="flex-1 overflow-y-auto p-page">
      <TranscriptInbox :clients="clients" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TranscriptInbox from '../components/TranscriptInbox.vue'
import { listClients } from '../lib/clients.js'

const clients = ref([])
const loading = ref(true)
const error = ref('')

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

onMounted(() => {
  load()
})
</script>
