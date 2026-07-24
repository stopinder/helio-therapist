<template>
  <section class="reflection-workspace">
    <header v-if="localView === 'main'" class="reflection-introduction">
      <h1>Reflections</h1>
      <p>A private place to write or speak about your work.</p>
    </header>
    <header v-else class="reflection-introduction">
      <div class="flex items-center gap-2">
        <button type="button" class="text-ink-secondary hover:text-ink transition-colors" @click="localView = 'main'">← Back</button>
        <h1>Archive</h1>
      </div>
      <p>Your complete history of private reflections.</p>
    </header>

    <p v-if="localView === 'main'" class="privacy-reassurance">Private reflection · Not part of a client’s clinical record.</p>

    <!-- Editor (Primary focus on main screen) -->
    <form v-if="localView === 'main'" class="journal" @submit.prevent="saveReflection">
      <label class="sr-only" for="reflection-body">Reflection</label>
      <section class="editor-surface">
        <textarea id="reflection-body" ref="editor" v-model="body" class="reflection-editor" placeholder="Write or speak whatever feels important…" aria-label="Reflection" />
      </section>
      <div class="action-bar">
        <div class="voice-control">
          <button v-if="!isRecording" type="button" class="secondary-action" :disabled="isTranscribing" @click="startRecording">{{ isTranscribing ? 'Adding to reflection…' : '🎙 Record voice' }}</button>
          <template v-else>
            <span class="recording-status" aria-live="polite"><span class="recording-indicator" aria-hidden="true" />Recording · {{ elapsed }}</span>
            <button type="button" class="secondary-action" @click="togglePause">{{ isPaused ? 'Resume' : 'Pause' }}</button>
            <button type="button" class="secondary-action" @click="stopRecording">Stop and add to reflection</button>
          </template>
        </div>
        <div class="save-actions">
          <button type="button" class="secondary-action" @click="summariseCurrentAttempt">
            {{ generatingSummary ? 'Preparing draft…' : 'Summarise for supervision' }}
          </button>
          <button type="submit" class="primary-action" :disabled="saving">{{ saving ? 'Saving…' : 'Save reflection' }}</button>
        </div>
      </div>
      <p v-if="showThresholdGuidance && !canSummarise" id="summary-threshold" class="quiet threshold-note text-state-warning">
        Write a little more to create a supervision summary (${minimumSummaryCharacters} characters).
      </p>
      <p v-if="saveError" class="error-message" role="alert">{{ saveError }}</p>
    </form>

    <!-- History List -->
    <section class="reflection-history" :aria-labelledby="localView === 'main' ? 'recent-reflections-heading' : 'archive-heading'">
      <h2 v-if="localView === 'main'" id="recent-reflections-heading">Recent reflections</h2>
      <p v-if="loading" class="quiet">Opening your reflections…</p>
      <p v-else-if="!reflections.length" class="quiet">Nothing here yet. This is a place to return to when something feels worth holding onto.</p>
      
      <div v-else class="compact-history divide-y divide-border border-y border-border mb-6">
        <button 
          v-for="reflection in displayedReflections" 
          :key="reflection.id" 
          type="button"
          class="w-full text-left px-inline-md py-stack-md hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-action-primary transition-colors group"
          @click="openDetail(reflection)"
        >
          <div class="flex justify-between items-baseline mb-1">
            <span class="type-caption font-semibold text-ink-secondary">{{ date(reflection.created_at) }}</span>
            <span class="type-caption text-action-link opacity-0 group-hover:opacity-100 transition-opacity">View</span>
          </div>
          <p class="type-body-sm text-ink-secondary line-clamp-2">{{ reflection.body || 'Empty reflection' }}</p>
        </button>
      </div>

      <button v-if="localView === 'main' && reflections.length > 3" type="button" class="text-action-link hover:underline type-body-sm" @click="localView = 'archive'">
        View all reflections
      </button>
    </section>

    <!-- Detail View Modal -->
    <div v-if="selectedReflection" class="modal-backdrop" @click.self="closeDetail">
      <section class="detail-dialog" role="dialog" aria-modal="true" :aria-labelledby="`detail-title-${selectedReflection.id}`">
        <header class="flex justify-between items-center mb-6">
          <h2 :id="`detail-title-${selectedReflection.id}`" class="type-h3">{{ date(selectedReflection.created_at) }}</h2>
          <button type="button" class="close-button text-2xl" aria-label="Close" @click="closeDetail">×</button>
        </header>
        
        <div class="detail-content space-y-8 overflow-y-auto max-h-[70vh]">
          <div class="reflection-text whitespace-pre-wrap type-body">
            {{ selectedReflection.body }}
          </div>

          <div class="summary-section border-t border-border pt-6">
            <h3 class="type-overline mb-4">Supervision Summary</h3>
            
            <div v-if="selectedReflection.latestSummary" class="saved-summary-box bg-surface-muted p-4 rounded-control">
              <p class="type-body italic mb-4">{{ selectedReflection.latestSummary.edited_content }}</p>
              <button type="button" class="secondary-action" @click="openSummary(selectedReflection)">Edit summary</button>
            </div>

            <div v-else class="summary-actions">
              <button 
                type="button" 
                class="secondary-action" 
                :disabled="generatingSummary"
                @click="summariseFromDetail(selectedReflection)"
              >
                {{ generatingSummary ? 'Preparing draft…' : 'Summarise for supervision' }}
              </button>
              <p v-if="!canSummariseText(selectedReflection.body)" class="type-caption text-ink-muted mt-2">
                This reflection is too short to summarise.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Summary Editor Modal (Existing logic preserved) -->
    <div v-if="summaryOpen" class="modal-backdrop" @click.self="closeSummary">
      <section class="summary-dialog" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <header>
          <h2 id="summary-title">Supervision summary</h2>
          <button type="button" class="close-button" aria-label="Close" @click="closeSummary">×</button>
        </header>
        <p class="quiet">A private, editable draft based only on this reflection. Use it as you choose in human supervision.</p>
        <p v-if="summaryError" class="error-message" role="alert">{{ summaryError }} <button type="button" class="inline-action" @click="generateSummary">Try again</button></p>
        <p v-else-if="generatingSummary" class="quiet" aria-live="polite">Preparing a draft from this reflection…</p>
        <textarea v-else v-model="summaryDraft" aria-label="Supervision summary" class="w-full min-h-[200px] p-3 border border-border rounded-control bg-surface" />
        <footer>
          <button type="button" class="secondary-action" :disabled="generatingSummary" @click="generateSummary">Regenerate draft</button>
          <button type="button" class="secondary-action" @click="closeSummary">Discard</button>
          <button type="button" class="primary-action" :disabled="savingSummary || generatingSummary || !summaryDraft.trim()" @click="saveSummary">{{ savingSummary ? 'Saving…' : 'Save summary' }}</button>
        </footer>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { supabase } from '../lib/supabase.js'
import { authenticatedFetch } from '../lib/api.js'

const props = defineProps({
  view: { type: String, default: 'main' }
})
const emit = defineEmits(['update:view'])

const localView = computed({
  get: () => props.view,
  set: (val) => emit('update:view', val)
})

// A short paragraph, not a word count: enough material for a specific, grounded draft.
const minimumSummaryCharacters = 80
const reflections = ref([]), loading = ref(false), saving = ref(false), savingSummary = ref(false), generatingSummary = ref(false)
const body = ref(''), saveError = ref(''), summaryOpen = ref(false), summaryDraft = ref(''), summaryReflection = ref(null), summaryError = ref('')
const editor = ref(null), recorder = ref(null), audioChunks = ref([]), isRecording = ref(false), isPaused = ref(false), isTranscribing = ref(false), seconds = ref(0), timer = ref(null)

const selectedReflection = ref(null)
const showThresholdGuidance = ref(false)

const elapsed = computed(() => `00:${String(seconds.value).padStart(2, '0')}`)
const canSummarise = computed(() => canSummariseText(body.value))
const canSummariseText = value => String(value || '').trim().length >= minimumSummaryCharacters

const displayedReflections = computed(() => {
  if (localView.value === 'main') {
    return reflections.value.slice(0, 3)
  }
  return reflections.value
})

async function load() {
  if (!supabase) return
  loading.value = true
  try {
    const [{ data: notes }, { data: summaries }] = await Promise.all([
      supabase.from('private_reflections').select('*').order('created_at', { ascending: false }),
      supabase.from('reflection_supervision_summaries').select('*').in('generation_status', ['saved']).order('created_at', { ascending: false })
    ])
    const summaryByReflection = new Map()
    for (const summary of summaries || []) if (!summaryByReflection.has(summary.reflection_id)) summaryByReflection.set(summary.reflection_id, summary)
    reflections.value = (notes || []).map(note => ({ ...note, latestSummary: summaryByReflection.get(note.id) || null }))
  } finally {
    loading.value = false
  }
}

async function saveReflection({ keepOpen = false } = {}) {
  if (!supabase || saving.value) return null
  saving.value = true; saveError.value = ''
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) { saving.value = false; saveError.value = 'Please sign in again before saving.'; return null }
  const { data, error } = await supabase.from('private_reflections').insert({ user_id: auth.user.id, body: body.value }).select().single()
  saving.value = false
  if (error || !data) { saveError.value = 'Your reflection could not be saved. Please try again.'; return null }
  reflections.value.unshift({ ...data, latestSummary: null })
  if (!keepOpen) {
    body.value = ''
    showThresholdGuidance.value = false
  }
  return data
}

async function summariseCurrentAttempt() {
  if (!canSummarise.value) {
    showThresholdGuidance.value = true
    return
  }
  const reflection = await saveReflection({ keepOpen: true })
  if (!reflection) return
  body.value = ''
  openSummary(reflection, true)
}

function summariseFromDetail(reflection) {
  if (!canSummariseText(reflection.body)) return
  openSummary(reflection, true)
}

function openDetail(reflection) {
  selectedReflection.value = reflection
}

function closeDetail() {
  selectedReflection.value = null
}

function openSummary(reflection, generate = false) {
  summaryReflection.value = reflection; summaryDraft.value = reflection.latestSummary?.edited_content || ''; summaryError.value = ''; summaryOpen.value = true
  if (generate || !summaryDraft.value) generateSummary()
}

async function generateSummary() {
  if (!summaryReflection.value || generatingSummary.value) return
  generatingSummary.value = true; summaryError.value = ''
  try {
    const response = await authenticatedFetch('/api/ai/supervision-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reflection: summaryReflection.value.body }) })
    const data = await response.json()
    if (!response.ok || !data?.content) throw new Error(data?.error || 'Unable to prepare a draft.')
    summaryDraft.value = data.content
    summaryReflection.value.pendingMetadata = { model: data.model, promptVersion: data.promptVersion }
  } catch (error) {
    summaryError.value = error.message || 'The draft could not be prepared. Your reflection was not changed.'
    const { data: auth } = await supabase.auth.getUser()
    if (auth.user) await supabase.from('reflection_supervision_summaries').insert({ reflection_id: summaryReflection.value.id, user_id: auth.user.id, generation_status: 'failed', generation_error: summaryError.value })
  } finally { generatingSummary.value = false }
}

async function saveSummary() {
  if (!supabase || !summaryReflection.value || savingSummary.value) return
  savingSummary.value = true
  const { data: auth } = await supabase.auth.getUser()
  const previous = summaryReflection.value.latestSummary
  if (previous) await supabase.from('reflection_supervision_summaries').update({ generation_status: 'superseded', superseded_at: new Date().toISOString() }).eq('id', previous.id)
  const { data, error } = await supabase.from('reflection_supervision_summaries').insert({ reflection_id: summaryReflection.value.id, user_id: auth.user.id, generated_content: summaryDraft.value.trim(), edited_content: summaryDraft.value.trim(), generation_status: 'saved', model: summaryReflection.value.pendingMetadata?.model || null, prompt_version: summaryReflection.value.pendingMetadata?.promptVersion || null, generated_at: new Date().toISOString(), saved_at: new Date().toISOString() }).select().single()
  savingSummary.value = false
  if (error || !data) { summaryError.value = 'The draft is still open, but could not be saved. Please try again.'; return }
  
  const updatedReflection = { ...summaryReflection.value, latestSummary: data }
  reflections.value = reflections.value.map(item => item.id === summaryReflection.value.id ? updatedReflection : item)
  
  if (selectedReflection.value && selectedReflection.value.id === summaryReflection.value.id) {
    selectedReflection.value = updatedReflection
  }
  
  closeSummary()
}

function closeSummary() { summaryOpen.value = false; summaryError.value = ''; summaryReflection.value = null }
async function startRecording() { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder.value = new MediaRecorder(stream); audioChunks.value = []; recorder.value.ondataavailable = event => audioChunks.value.push(event.data); recorder.value.onstop = transcribe; recorder.value.start(); isRecording.value = true; isPaused.value = false; seconds.value = 0; timer.value = window.setInterval(() => seconds.value += 1, 1000) } catch { saveError.value = 'Microphone access is needed to record a reflection.' } }
function togglePause() { if (!recorder.value) return; if (isPaused.value) { recorder.value.resume(); isPaused.value = false } else { recorder.value.pause(); isPaused.value = true } }
function stopRecording() { if (!recorder.value) return; window.clearInterval(timer.value); recorder.value.stop(); recorder.value.stream.getTracks().forEach(track => track.stop()); isRecording.value = false; isPaused.value = false }
async function transcribe() { const blob = new Blob(audioChunks.value, { type: recorder.value?.mimeType || 'audio/webm' }); const reader = new FileReader(); reader.onloadend = async () => { isTranscribing.value = true; try { const response = await authenticatedFetch('/api/ai/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: reader.result }) }); const data = await response.json(); if (data.text) { body.value = `${body.value}${body.value ? '\n\n' : ''}${data.text}`; editor.value?.focus() } } finally { isTranscribing.value = false } }; reader.readAsDataURL(blob) }
function date(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
onMounted(load); onBeforeUnmount(() => window.clearInterval(timer.value))
</script>

<style scoped>
.reflection-workspace{max-width:48rem;margin:0 auto;padding:clamp(1rem,3vw,2.5rem) 0 5rem}.reflection-introduction h1,.reflection-history h2,.summary-dialog h2{margin:0;font-family:'Newsreader',Georgia,serif;font-weight:500;letter-spacing:-.025em;color:var(--text-primary)}.reflection-introduction h1{font-size:clamp(2.15rem,5vw,3rem);line-height:1}.reflection-introduction p{margin:.85rem 0 0;color:var(--text-secondary);line-height:1.7}.privacy-reassurance{margin:1.4rem 0 0;color:var(--text-muted);font-size:.875rem}.journal{margin-top:2rem}.editor-surface{border:1px solid var(--border);border-radius:.75rem;background:var(--surface-elevated);box-shadow:0 1px 2px rgba(45,38,30,.04)}.reflection-editor{box-sizing:border-box;display:block;min-height:360px;width:100%;resize:none;border:0;background:transparent;padding:1.25rem 1.5rem;color:var(--text-primary);font:inherit;font-size:17px;line-height:1.75;outline:0}.reflection-editor::placeholder{color:var(--text-muted)}.action-bar{display:flex;gap:.75rem;justify-content:space-between;align-items:center;margin-top:1rem}.voice-control,.save-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.secondary-action,.primary-action{border-radius:.6rem;padding:.6rem .85rem;font:inherit;font-size:.875rem;cursor:pointer}.secondary-action{border:1px solid var(--border);background:var(--surface-elevated);color:var(--text-secondary)}.primary-action{border:1px solid var(--text-primary);background:var(--text-primary);color:var(--surface-elevated);font-weight:600}.secondary-action:disabled,.primary-action:disabled{opacity:.5;cursor:not-allowed}.quiet,.threshold-note{margin:.7rem 0 0;color:var(--text-muted);font-size:.9375rem;line-height:1.7}.threshold-note{font-size:.8125rem}.error-message{margin:.7rem 0 0;color:var(--state-danger);font-size:.875rem}.inline-action{border:0;background:transparent;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}.recording-status{display:flex;align-items:center;gap:.4rem;color:var(--text-secondary);font-size:.875rem}.recording-indicator{width:.55rem;height:.55rem;border-radius:999px;background:#b7443e}.reflection-history{margin-top:4.5rem}.reflection-history h2{font-size:1.5rem}.reflection-note{padding:1.3rem 0;border-bottom:1px solid var(--border-muted)}.reflection-note:first-of-type{margin-top:.7rem;border-top:1px solid var(--border-muted)}.reflection-note>p{margin:0;white-space:pre-wrap;line-height:1.75}.reflection-note footer{display:flex;gap:.7rem;margin-top:.75rem;color:var(--text-muted);font-size:.78rem}.reflection-note footer button{border:0;padding:0;background:transparent;color:var(--text-secondary);font:inherit;cursor:pointer}.saved-summary{margin-top:1rem!important;padding:.85rem;border-left:2px solid var(--border);color:var(--text-secondary)!important;font-size:.9rem}.saved-summary strong{display:block;margin-bottom:.3rem;color:var(--text-muted);font-size:.75rem}.modal-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:1rem;background:rgba(35,30,25,.35)}.summary-dialog{width:min(100%,38rem);max-height:90vh;overflow:auto;border:1px solid var(--border);border-radius:.85rem;background:var(--surface-elevated);padding:1.5rem;box-shadow:0 18px 60px rgba(35,30,25,.18)}.summary-dialog header,.summary-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:1rem}.close-button{border:0;background:transparent;color:var(--text-muted);font-size:1.5rem;cursor:pointer}.summary-dialog textarea{box-sizing:border-box;width:100%;min-height:17rem;margin:1.25rem 0;border:1px solid var(--border);border-radius:.65rem;background:transparent;padding:1rem;color:var(--text-primary);font:inherit;line-height:1.7}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:640px){.reflection-workspace{padding-top:.5rem}.action-bar{align-items:stretch;flex-direction:column}.save-actions{justify-content:flex-end}.reflection-editor{min-height:320px;padding:1.15rem}.summary-dialog{padding:1.15rem}}
</style>
