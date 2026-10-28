<template>
  <section class="rounded-panel border border-border bg-surface-elevated p-4 sm:p-5" aria-labelledby="prepare-document-heading" data-testid="document-preparation">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><h3 id="prepare-document-heading" class="text-h3 font-semibold text-ink">Prepare document</h3>
        <p class="text-body-sm text-ink-secondary mt-1">Choose the purpose, perspective and source material. Nothing is added to Care.</p></div>
      <button v-if="!expanded" type="button" class="button-secondary" @click="expanded = true">Change preparation</button>
    </div>
    <p v-if="!expanded" class="mt-3 text-body-sm text-ink-secondary">{{ documentPurposeLabel(options.documentPurpose) }} · {{ perspectiveLabel }} · {{ options.audience === 'client' ? 'Client-facing draft' : 'Therapist working document' }} · {{ preview?.sessionCount || 0 }} session(s)</p>
    <div v-else>
      <fieldset :disabled="loading || generating || disabled" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label><span class="text-caption font-semibold">Document</span><select v-model="options.documentPurpose" data-testid="document-purpose" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" @change="changePurpose">
          <option v-for="purpose in DOCUMENT_PURPOSES" :key="purpose.id" :value="purpose.id">{{ purpose.label }}</option>
        </select></label>
        <label><span class="text-caption font-semibold">Perspective</span><select v-model="options.lens" data-testid="document-perspective" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface">
          <option v-for="lens in DOCUMENT_PERSPECTIVES" :key="lens.id" :value="lens.id">{{ lens.label }}</option>
        </select></label>
        <label><span class="text-caption font-semibold">Audience</span><select v-model="options.audience" data-testid="document-audience" :disabled="!!lockedAudience" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface"><option value="client">Client-facing draft</option><option value="therapist">Therapist working document</option></select>
          <span v-if="lockedAudience" class="block mt-1 text-caption text-ink-muted">This draft keeps its audience. Start a new document for a different audience.</span>
        </label>
        <label><span class="text-caption font-semibold">Sessions</span><select v-model="options.window" data-testid="document-window" :disabled="options.documentPurpose === 'session_summary'" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface">
          <option v-if="options.documentPurpose === 'session_summary'" value="current">This session only</option>
          <template v-else><option value="last_three">Last 3 reviewed sessions</option><option value="selected">Choose reviewed sessions</option></template>
        </select></label>
        <label class="sm:col-span-2"><span class="text-caption font-semibold">{{ options.documentPurpose === 'session_summary' ? 'Session' : 'Review ends at' }}</span>
          <select v-model="options.anchorSessionId" data-testid="document-anchor" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" @change="anchorChanged">
            <option :value="null">{{ eligible.length ? 'Choose a session' : 'No eligible session material' }}</option>
            <option v-for="session in eligible" :key="session.sessionId" :value="session.sessionId">{{ date(session.occurredAt) }} — {{ session.reviewedAt ? 'Reviewed capture' : 'Linked transcript / Zoom source' }}</option>
          </select>
        </label>
        <div v-if="options.window === 'selected'" class="sm:col-span-2 max-h-44 overflow-auto rounded-control border border-border p-3" data-testid="document-session-picker">
          <p class="text-caption text-ink-muted mb-2">Choose 2–{{ MAX_DOCUMENT_SESSIONS }} reviewed sessions, including the end session. Later sessions cannot be selected.</p>
          <label v-for="session in selectable" :key="session.sessionId" class="flex items-center gap-2 py-1 text-body-sm">
            <input v-model="options.selectedSessionIds" type="checkbox" :value="session.sessionId" :disabled="!options.selectedSessionIds.includes(session.sessionId) && options.selectedSessionIds.length >= MAX_DOCUMENT_SESSIONS" />{{ date(session.occurredAt) }}
          </label>
        </div>
        <label class="flex gap-2 items-start sm:col-span-2 text-body-sm"><input v-model="options.includeCare" type="checkbox" class="mt-1" />Include current accepted Care (not a historical Care snapshot)</label>
        <label class="sm:col-span-2"><span class="text-caption font-semibold">Your additions or focus (optional)</span><textarea v-model="options.therapistGuidance" rows="2" maxlength="6000" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface text-body-sm" placeholder="An observation, correction or focus. Kept separate from what the client reported." /></label>
      </fieldset>
      <div v-if="loading || previewing" class="mt-3 text-caption text-ink-muted" role="status">Checking the selected sources…</div>
      <div v-if="error" class="mt-3 text-body-sm text-state-danger" role="alert">{{ error }} <button type="button" class="underline" :disabled="generating" @click="load">Reload sources</button></div>
      <details v-if="preview && previewKey === optionKey" open class="mt-4 rounded-control border border-border-muted p-3" data-testid="source-preview">
        <summary class="text-caption font-semibold cursor-pointer">{{ preview.sessionCount }} session(s) selected · Sources to be sent to AI</summary>
        <ul class="mt-2 space-y-2 text-caption text-ink-secondary"><li v-for="source in preview.sources" :key="source.id">
          <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="text-action-link underline">{{ source.occurredAt ? date(source.occurredAt) + ' — ' : '' }}{{ source.label }}</a>
          <span v-else>{{ source.label }}</span>
        </li></ul>
        <p class="mt-2 text-caption text-ink-muted">Private reflections and supervision records are not fetched. Sources are not counted as independent encounters simply because they repeat the same event.</p>
        <p v-for="warning in preview.warnings" :key="warning" class="mt-2 text-caption text-state-warning">{{ warning }}</p>
      </details>
      <div class="mt-4 flex flex-wrap items-center gap-3"><button type="button" data-testid="generate-prepared-document" class="button-primary" :disabled="!ready || generating || disabled" @click="generate">{{ generating ? 'Preparing draft…' : generateLabel }}</button>
        <span class="text-caption text-ink-muted">Uses the existing AI allowance. Review before saving or sharing.</span>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { DOCUMENT_PURPOSES, DOCUMENT_PERSPECTIVES, MAX_DOCUMENT_SESSIONS, defaultPreparation, documentPurposeLabel } from '../../lib/documentPreparation.js'
import { listDocumentPreparationSessions, previewPreparedDocument, generatePreparedDocument } from '../../lib/clientDocuments.js'
const props = defineProps({ clientId: { type: String, required: true }, anchorSessionId: { type: String, default: null }, initialOptions: { type: Object, default: () => ({}) }, lockedAudience: { type: String, default: null }, hasExistingText: Boolean, disabled: Boolean })
const emit = defineEmits(['generated', 'busy', 'options-change'])
const initial = { ...defaultPreparation(props.initialOptions.documentPurpose), ...props.initialOptions }
const options = reactive({ ...initial, anchorSessionId: props.anchorSessionId || initial.anchorSessionId, audience: props.lockedAudience || initial.audience, selectedSessionIds: [...(initial.selectedSessionIds || [])] })
const catalogue = ref([]), loading = ref(true), generating = ref(false), previewing = ref(false), preview = ref(null), previewKey = ref(''), error = ref(''), expanded = ref(true)
let revision = 0, timer = null, disposed = false
const eligible = computed(() => options.documentPurpose === 'recent_review' ? catalogue.value.filter(s => s.reviewedAt) : catalogue.value)
const selectable = computed(() => eligible.value.filter(s => s.reviewedAt && Date.parse(s.occurredAt) <= Date.parse(eligible.value.find(a => a.sessionId === options.anchorSessionId)?.occurredAt || '')))
const optionKey = computed(() => JSON.stringify({ ...options, clientId: props.clientId }))
const ready = computed(() => !!preview.value?.sourceVersion && previewKey.value === optionKey.value && !loading.value && !previewing.value && !error.value)
const perspectiveLabel = computed(() => DOCUMENT_PERSPECTIVES.find(l => l.id === options.lens)?.label || '')
const generateLabel = computed(() => options.documentPurpose === 'recent_review' ? 'Generate review' : options.audience === 'client' ? 'Generate client summary' : 'Generate working summary')
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable'
function changePurpose() {
  options.window = options.documentPurpose === 'recent_review' ? 'last_three' : 'current'
  if (!props.lockedAudience) options.audience = options.documentPurpose === 'recent_review' ? 'therapist' : 'client'
  if (!eligible.value.some(s => s.sessionId === options.anchorSessionId)) options.anchorSessionId = null
  options.transcriptId = null
  anchorChanged()
}
function anchorChanged() { options.selectedSessionIds = options.anchorSessionId ? [options.anchorSessionId] : []; options.transcriptId = null }
async function refreshPreview() {
  clearTimeout(timer)
  const request = ++revision, key = optionKey.value
  preview.value = null; previewKey.value = ''; error.value = ''
  if (loading.value || !options.anchorSessionId || disposed) return
  previewing.value = true
  try {
    const data = await previewPreparedDocument(JSON.parse(key))
    if (!disposed && request === revision && optionKey.value === key) { preview.value = data; previewKey.value = key }
  } catch (e) { if (!disposed && request === revision) error.value = e.message || 'Could not preview the sources.' }
  finally { if (request === revision) previewing.value = false }
}
async function load() {
  const request = ++revision
  loading.value = true; error.value = ''; preview.value = null
  try {
    const data = await listDocumentPreparationSessions({ clientId: props.clientId, anchorSessionId: options.anchorSessionId })
    if (disposed || request !== revision) return
    catalogue.value = data.availableSessions || []
    // Do not replace an explicitly opened historical encounter with a newer one.
    if (options.anchorSessionId && !eligible.value.some(s => s.sessionId === options.anchorSessionId)) options.anchorSessionId = null
    else if (!options.anchorSessionId) options.anchorSessionId = eligible.value[0]?.sessionId || null
    if (!options.selectedSessionIds.length && options.anchorSessionId) options.selectedSessionIds = [options.anchorSessionId]
  } catch (e) { if (!disposed) error.value = e.message || 'Could not load session sources.' }
  finally { await nextTick(); loading.value = false }
  if (!error.value) await refreshPreview()
}
watch(optionKey, () => {
  emit('options-change', { ...options, selectedSessionIds: [...options.selectedSessionIds] })
  if (loading.value || generating.value) return
  clearTimeout(timer); ++revision; previewing.value = false
  timer = setTimeout(refreshPreview, 300)
}, { immediate: true })
watch(() => props.lockedAudience, value => { if (value) options.audience = value })
async function generate() {
  if (!ready.value || generating.value || props.disabled) return
  if (props.hasExistingText && !window.confirm('Generate a replacement draft? Your current wording will remain available in Previous versions. Nothing is finalised or shared.')) return
  clearTimeout(timer); ++revision
  generating.value = true; error.value = ''; emit('busy', true)
  const key = optionKey.value
  try {
    const result = await generatePreparedDocument({ ...JSON.parse(key), sourceVersion: preview.value.sourceVersion })
    if (disposed || optionKey.value !== key) return
    emit('generated', result); expanded.value = false
  } catch (e) { if (!disposed) { error.value = e.message || 'The draft could not be prepared. Your existing text is unchanged.'; if (e.code === 'SOURCE_PREVIEW_CHANGED') preview.value = null } }
  finally { generating.value = false; emit('busy', false) }
}
onMounted(load)
onBeforeUnmount(() => { disposed = true; ++revision; clearTimeout(timer) })
</script>
