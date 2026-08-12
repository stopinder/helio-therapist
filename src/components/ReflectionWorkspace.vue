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

    <form v-if="localView === 'main'" class="journal" @submit.prevent="saveReflection">
      <label class="sr-only" for="reflection-body">Reflection</label>
      <section class="editor-surface">
        <textarea id="reflection-body" ref="editor" v-model="body" class="reflection-editor" placeholder="Write or speak whatever feels important…" aria-label="Reflection" />
      </section>

      <div class="action-bar gap-4">
        <div class="voice-control">
          <button v-if="!isRecording" type="button" class="secondary-action" :disabled="isTranscribing" @click="startRecording">{{ isTranscribing ? 'Adding to reflection...' : '🎙️ Record voice' }}</button>
          <template v-else>
            <span class="recording-status" aria-live="polite"><span class="recording-indicator" aria-hidden="true" />Recording · {{ elapsed }}</span>
            <button type="button" class="secondary-action" @click="togglePause">{{ isPaused ? 'Resume' : 'Pause' }}</button>
            <button type="button" class="secondary-action" @click="stopRecording">Stop and add to reflection</button>
          </template>
        </div>
        <div class="save-actions">
          <button type="button" class="secondary-action" @click="summariseCurrentAttempt">
            {{ generatingSummary ? 'Preparing draft...' : 'Summarise for supervision' }}
          </button>
          <button type="button" class="secondary-action" :disabled="saving || !isBodyReady || isTranscribing || isRecording" @click="saveAndReflectWithAI">
            {{ savingForAI ? 'Saving…' : '✨ Save & Reflect with AI' }}
          </button>
          <button type="submit" class="primary-action" :disabled="saving || !isBodyReady">{{ saving && !savingForAI ? 'Saving...' : 'Save reflection' }}</button>
        </div>
      </div>
      <p class="quiet ai-handoff-note">AI reflection is optional. Your reviewed text is saved privately first, then sent only when you continue from the AI confirmation.</p>
      <p v-if="showThresholdGuidance && !canSummarise" id="summary-threshold" class="quiet threshold-note text-state-warning">
        Write a little more to create a supervision summary ({{ minimumSummaryCharacters }} characters).
      </p>
      <p v-if="saveError" class="error-message" role="alert">{{ saveError }}</p>
    </form>

    <section class="reflection-history" :aria-labelledby="localView === 'main' ? 'recent-reflections-heading' : 'archive-heading'">
      <h2 v-if="localView === 'main'" id="recent-reflections-heading">Recent reflections</h2>
      <p v-if="loading" class="quiet">Opening your reflections...</p>
      <p v-else-if="!reflections.length" class="quiet">Nothing here yet. This is a place to return to when something feels worth holding onto.</p>
      <div v-else class="compact-history divide-y divide-border border-y border-border mb-6">
        <button v-for="reflection in displayedReflections" :key="reflection.id" type="button" class="w-full text-left px-inline-md py-stack-md hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-action-primary transition-colors group" @click="openDetail(reflection)">
          <div class="flex justify-between items-baseline mb-1">
            <span class="type-caption font-semibold text-ink-secondary">{{ date(reflection.created_at) }}</span>
            <span class="type-caption text-action-link opacity-0 group-hover:opacity-100 transition-opacity">View</span>
          </div>
          <p class="type-body-sm text-ink-secondary line-clamp-2">{{ reflection.body || 'Empty reflection' }}</p>
        </button>
      </div>
      <button v-if="localView === 'main' && reflections.length > 3" type="button" class="text-action-link hover:underline type-body-sm" @click="localView = 'archive'">View all reflections</button>
    </section>

    <div v-if="selectedReflection" class="modal-backdrop" @click.self="closeDetail">
      <section class="modal-panel shadow-2xl" role="dialog" aria-modal="true" :aria-labelledby="`detail-title-${selectedReflection.id}`">
        <template v-if="detailStage === 'reflection'">
          <header class="flex justify-between items-center mb-6">
            <div class="flex flex-col">
              <h2 :id="`detail-title-${selectedReflection.id}`" class="type-h3">{{ date(selectedReflection.created_at) }}</h2>
              <div class="relationship-info mt-1"><span class="type-caption text-ink-muted block mt-0.5">Not part of the client’s clinical record.</span></div>
            </div>
            <button type="button" class="close-button text-2xl" aria-label="Close" @click="closeDetail">×</button>
          </header>
          <div class="modal-content space-y-8 overflow-y-auto max-h-[70vh]">
            <div class="reflection-text whitespace-pre-wrap type-body">{{ selectedReflection.body }}</div>
            <div class="summary-section border-t border-border pt-6">
              <h3 class="type-overline mb-4">Supervision Summary</h3>
              <div v-if="selectedReflection.latestSummary" class="saved-summary-box bg-surface-muted p-4 rounded-control">
                <p class="type-body mb-4">{{ selectedReflection.latestSummary.edited_content }}</p>
                <div class="flex gap-2"><button type="button" class="secondary-action" @click="summariseFromDetail(selectedReflection)">Edit summary</button><button type="button" class="secondary-action" @click="closeDetail">Close</button></div>
              </div>
              <div v-else class="summary-actions">
                <button type="button" class="secondary-action" :disabled="!canSummariseText(selectedReflection.body)" @click="summariseFromDetail(selectedReflection)">Summarise for supervision</button>
                <p v-if="!canSummariseText(selectedReflection.body)" class="type-caption text-state-warning mt-2">This reflection needs at least {{ minimumSummaryCharacters }} characters before a useful summary can be prepared.</p>
              </div>
            </div>
          </div>
        </template>
        <template v-else-if="detailStage === 'generating'">
          <header class="flex justify-between items-center mb-6"><h2 class="type-h3">Supervision summary</h2><button type="button" class="close-button text-2xl" aria-label="Close" @click="closeDetail">×</button></header>
          <div class="modal-content py-12 text-center">
            <p v-if="summaryError" class="text-state-error mb-6">{{ summaryError }}</p><p v-else class="text-ink-secondary animate-pulse">Preparing a draft from this reflection…</p>
            <div class="flex justify-center gap-3 mt-8"><button v-if="summaryError" type="button" class="primary-action" @click="generateSummary">Try again</button><button type="button" class="secondary-action" @click="backToReflection">Back to reflection</button></div>
          </div>
        </template>
        <template v-else-if="detailStage === 'summary'">
          <header class="flex justify-between items-center mb-6"><h2 class="type-h3">Supervision summary</h2><button type="button" class="close-button text-2xl" aria-label="Close" @click="closeDetail">×</button></header>
          <p class="type-body-sm text-ink-secondary mb-4">A private, editable draft based only on this reflection. Use it as you choose in human supervision.</p>
          <div class="modal-content">
            <textarea v-model="summaryDraft" aria-label="Supervision summary" class="w-full min-h-[300px] p-4 border border-border rounded-control bg-surface-muted type-body outline-none focus:border-action-primary" />
            <p v-if="summaryError" class="text-state-error mt-2">{{ summaryError }}</p>
            <footer class="flex justify-between items-center mt-8 pt-6 border-t border-border">
              <div class="flex gap-2"><button type="button" class="secondary-action" @click="backToReflection">Back</button><button type="button" class="secondary-action" @click="generateSummary(true)">Regenerate draft</button></div>
              <div class="flex gap-2"><button type="button" class="secondary-action" @click="discardDraft">Discard</button><button type="button" class="primary-action" :disabled="savingSummary || !summaryDraft.trim()" @click="saveSummary">{{ savingSummary ? 'Saving…' : 'Save summary' }}</button></div>
            </footer>
          </div>
        </template>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { withSessionRecovery, authenticatedFetch } from '../lib/api.js'

const props = defineProps({ view: { type: String, default: 'main' } })
const emit = defineEmits(['update:view'])
const router = useRouter()
const localView = computed({ get: () => props.view, set: val => emit('update:view', val) })
const minimumSummaryCharacters = 80
const maxReflectionCharacters = 20000
const reflections = ref([]), loading = ref(false), saving = ref(false), savingForAI = ref(false), savingSummary = ref(false), generatingSummary = ref(false)
const body = ref(''), saveError = ref(''), summaryDraft = ref(''), summaryReflection = ref(null), summaryError = ref(''), summaryGeneratedContent = ref('')
const detailStage = ref('reflection')
const editor = ref(null), recorder = ref(null), audioChunks = ref([]), isRecording = ref(false), isPaused = ref(false), isTranscribing = ref(false), seconds = ref(0), timer = ref(null)
const selectedReflection = ref(null), showThresholdGuidance = ref(false)
const elapsed = computed(() => `00:${String(seconds.value).padStart(2, '0')}`)
const isBodyValid = computed(() => (body.value || '').length <= maxReflectionCharacters)
const isBodyReady = computed(() => Boolean(body.value.trim()) && isBodyValid.value)
const canSummarise = computed(() => canSummariseText(body.value))
const canSummariseText = value => String(value || '').trim().length >= minimumSummaryCharacters
const displayedReflections = computed(() => localView.value === 'main' ? reflections.value.slice(0, 3) : reflections.value)

async function load() {
  if (!supabase) return
  loading.value = true
  try {
    const [{ data: notes, error: notesError }, { data: summaries, error: summariesError }] = await Promise.all([
      withSessionRecovery(() => supabase.from('private_reflections').select('*').order('created_at', { ascending: false })),
      withSessionRecovery(() => supabase.from('reflection_supervision_summaries').select('*').in('generation_status', ['saved']).order('created_at', { ascending: false }))
    ])
    if (notesError) console.error('[Reflections] Load error:', notesError)
    if (summariesError) console.error('[Summaries] Load error:', summariesError)
    const summaryByReflection = new Map()
    for (const summary of summaries || []) if (!summaryByReflection.has(summary.reflection_id)) summaryByReflection.set(summary.reflection_id, summary)
    reflections.value = (notes || []).map(note => ({ ...note, latestSummary: summaryByReflection.get(note.id) || null }))
  } catch (err) { console.error('[Reflections] Unexpected load error:', err) } finally { loading.value = false }
}

async function saveReflection({ keepOpen = false } = {}) {
  if (!supabase || saving.value) return null
  if (!isBodyReady.value) { saveError.value = body.value.trim() ? 'Reflection is too long. The maximum length is 20,000 characters.' : 'Write or dictate a reflection before saving.'; return null }
  saving.value = true; saveError.value = ''
  const { data: auth } = await withSessionRecovery(() => supabase.auth.getUser())
  if (!auth.user) { saving.value = false; saveError.value = 'Please sign in again before saving.'; return null }
  const { data, error } = await withSessionRecovery(() => supabase.from('private_reflections').insert({ user_id: auth.user.id, body: body.value }).select().single())
  saving.value = false
  if (error || !data) { saveError.value = error?.code === '23514' ? 'Your reflection is too long to be saved.' : 'Your reflection could not be saved. Please try again.'; return null }
  reflections.value.unshift({ ...data, latestSummary: null })
  if (!keepOpen) { body.value = ''; showThresholdGuidance.value = false }
  return data
}

async function saveAndReflectWithAI() {
  if (savingForAI.value || isRecording.value || isTranscribing.value) return
  savingForAI.value = true
  const reflection = await saveReflection({ keepOpen: true })
  if (reflection) {
    body.value = ''
    showThresholdGuidance.value = false
    await router.push({ path: '/supervision', query: { aiReflection: reflection.id } })
  }
  savingForAI.value = false
}

function summariseCurrentAttempt() { if (!canSummarise.value) { showThresholdGuidance.value = true; return } saveReflection({ keepOpen: true }).then(reflection => { if (reflection) { body.value = ''; openDetail(reflection); summariseFromDetail(reflection) } }) }
function summariseFromDetail(reflection) { if (!canSummariseText(reflection.body)) return; summaryReflection.value = reflection; summaryDraft.value = reflection.latestSummary?.edited_content || ''; summaryError.value = ''; detailStage.value = 'generating'; generateSummary() }
function openDetail(reflection) { selectedReflection.value = reflection; detailStage.value = 'reflection'; document.body.style.overflow = 'hidden' }
function closeDetail() { selectedReflection.value = null; summaryReflection.value = null; summaryDraft.value = ''; summaryGeneratedContent.value = ''; summaryError.value = ''; detailStage.value = 'reflection'; document.body.style.overflow = '' }
async function safeParseJson(response) { const contentType = response.headers.get('content-type') || ''; if (!contentType.includes('application/json')) return null; try { return await response.json() } catch { return null } }
async function generateSummary(forceRegenerate = false) {
  if (!summaryReflection.value || generatingSummary.value) return
  generatingSummary.value = true; summaryError.value = ''; detailStage.value = 'generating'
  try {
    const response = await authenticatedFetch('/api/ai/supervision-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reflectionId: summaryReflection.value.id, forceRegenerate }) })
    const data = await safeParseJson(response)
    if (!response.ok) throw new Error(data?.error?.message || data?.error || `Server error (${response.status}). Please try again later.`)
    if (!data?.success || typeof data.summary !== 'string') throw new Error('The server returned an invalid summary response.')
    summaryGeneratedContent.value = data.summary; summaryDraft.value = data.summary; summaryReflection.value.pendingMetadata = { model: data.model, promptVersion: data.promptVersion, modelPolicyVersion: data.modelPolicyVersion, reused: data.reused === true }; detailStage.value = 'summary'
  } catch (error) { summaryError.value = error.message || 'The draft could not be prepared. Your reflection was not changed.' } finally { generatingSummary.value = false }
}
async function saveSummary() {
  if (!supabase || !summaryReflection.value || savingSummary.value) return
  savingSummary.value = true
  const { data: auth } = await withSessionRecovery(() => supabase.auth.getUser())
  if (!auth.user) { savingSummary.value = false; summaryError.value = 'Please sign in again before saving.'; return }
  const { data, error } = await withSessionRecovery(() => supabase.rpc('save_reflection_supervision_summary', { p_reflection_id: summaryReflection.value.id, p_generated_content: summaryGeneratedContent.value || summaryDraft.value.trim(), p_edited_content: summaryDraft.value.trim(), p_model: summaryReflection.value.pendingMetadata?.model || null, p_prompt_version: summaryReflection.value.pendingMetadata?.promptVersion || null, p_generated_at: new Date().toISOString() }))
  savingSummary.value = false
  const savedSummary = Array.isArray(data) ? data[0] : data
  if (error || !savedSummary) { summaryError.value = 'The draft is still open, but could not be saved. Please try again.'; return }
  const updatedReflection = { ...summaryReflection.value, latestSummary: savedSummary }
  reflections.value = reflections.value.map(item => item.id === summaryReflection.value.id ? updatedReflection : item)
  if (selectedReflection.value?.id === summaryReflection.value.id) selectedReflection.value = updatedReflection
  detailStage.value = 'reflection'
}
function discardDraft() { detailStage.value = 'reflection'; summaryDraft.value = ''; summaryGeneratedContent.value = ''; summaryError.value = '' }
function backToReflection() { detailStage.value = 'reflection' }
async function startRecording() { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder.value = new MediaRecorder(stream); audioChunks.value = []; recorder.value.ondataavailable = event => audioChunks.value.push(event.data); recorder.value.onstop = transcribe; recorder.value.start(); isRecording.value = true; isPaused.value = false; seconds.value = 0; timer.value = window.setInterval(() => seconds.value += 1, 1000) } catch { saveError.value = 'Microphone access is needed to record a reflection.' } }
function togglePause() { if (!recorder.value) return; if (isPaused.value) { recorder.value.resume(); isPaused.value = false } else { recorder.value.pause(); isPaused.value = true } }
function stopRecording() { if (!recorder.value) return; window.clearInterval(timer.value); recorder.value.stop(); recorder.value.stream.getTracks().forEach(track => track.stop()); isRecording.value = false; isPaused.value = false }
async function transcribe() {
  const blob = new Blob(audioChunks.value, { type: recorder.value?.mimeType || 'audio/webm' }); const reader = new FileReader()
  reader.onloadend = async () => { isTranscribing.value = true; try { const response = await authenticatedFetch('/api/ai/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: reader.result }) }); const data = await safeParseJson(response); if (!response.ok) throw new Error(data?.error?.message || data?.error || `Server error (${response.status}). Please try again later.`); if (data?.text) { body.value = `${body.value}${body.value ? '\n\n' : ''}${data.text}`; editor.value?.focus() } } catch (e) { saveError.value = e.message || 'The recording could not be transcribed.' } finally { isTranscribing.value = false } }
  reader.readAsDataURL(blob)
}
function date(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
function handleKeyDown(e) { if (e.key === 'Escape' && selectedReflection.value) closeDetail() }
onMounted(() => { load(); window.addEventListener('keydown', handleKeyDown) })
onBeforeUnmount(() => { window.clearInterval(timer.value); recorder.value?.stream?.getTracks().forEach(track => track.stop()); document.body.style.overflow = ''; window.removeEventListener('keydown', handleKeyDown) })
</script>

<style scoped>
.reflection-workspace { max-width: 48rem; margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0 5rem; }
.reflection-introduction { margin-bottom: 2rem; }
.reflection-introduction h1 { font-size: 1.875rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
.reflection-introduction p { color: var(--text-muted); }
.privacy-reassurance { background: var(--surface-subtle); border: 1px solid var(--border-muted); border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem; }
.privacy-reassurance::before { content: "🔒"; font-size: 1rem; }
.journal { margin-bottom: 3rem; }
.editor-surface { background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-bottom: 1.5rem; transition: border-color 0.2s, box-shadow 0.2s; }
.editor-surface:focus-within { border-color: var(--action-primary); box-shadow: 0 0 0 2px var(--action-primary-alpha); }
.reflection-editor { width: 100%; min-height: 240px; padding: 1.5rem; border: 0; background: transparent; color: var(--text); font-size: 1rem; line-height: 1.6; resize: vertical; outline: none; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
.voice-control { display: flex; align-items: center; gap: 1rem; }
.recording-status { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; color: var(--state-error); }
.recording-indicator { width: 0.75rem; height: 0.75rem; background: var(--state-error); border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
.save-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end; }
.primary-action { background: var(--action-primary); color: white; padding: 0.625rem 1.25rem; border-radius: 0.75rem; font-weight: 600; border: 0; cursor: pointer; transition: background 0.2s; }
.primary-action:hover:not(:disabled) { background: var(--action-primary-hover); }
.primary-action:disabled, .secondary-action:disabled { opacity: 0.5; cursor: not-allowed; }
.secondary-action { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 0.625rem 1.25rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; transition: background 0.2s, border-color 0.2s; }
.secondary-action:hover:not(:disabled) { background: var(--surface-subtle); border-color: var(--border-hover); }
.ai-handoff-note { padding: 0; margin: 0.85rem 0 0; font-size: 0.8rem; text-align: right; font-style: normal; }
.threshold-note { margin-top: 1rem; font-size: 0.875rem; text-align: center; }
.error-message { margin-top: 1rem; color: var(--state-error); font-size: 0.875rem; text-align: center; }
.reflection-history h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
.quiet { color: var(--text-muted); font-style: italic; text-align: center; padding: 2rem 0; }
.modal-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:1rem;background:rgba(20,18,16,.65);backdrop-filter:blur(4px)}
.modal-panel{width:min(100%,42rem);max-height:95vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:1rem;background:var(--surface);padding:2rem;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.modal-content { overflow-y: auto; flex: 1; }
.close-button { border: 0; background: transparent; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 640px) {
  .reflection-workspace { padding-top: 0.5rem; }
  .action-bar { align-items: stretch; flex-direction: column; gap: 1rem; }
  .save-actions { flex-direction: column; gap: 0.75rem; }
  .save-actions button { width: 100%; }
  .ai-handoff-note { text-align: left; }
  .reflection-editor { min-height: 320px; padding: 1.15rem; }
  .modal-panel { padding: 1.25rem; }
}
</style>