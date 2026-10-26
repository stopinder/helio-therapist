<template>
  <section class="space-y-3 rounded-panel border border-border-muted bg-surface-subtle p-3 sm:p-4" aria-label="Session document preparation" data-testid="inline-document-workbench">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-body font-semibold text-ink">{{ parentDraft ? 'Separate client summary' : 'Prepare a document' }}</h3>
        <p v-if="parentDraft" class="text-caption text-ink-muted mt-1">Starts from reviewed sources. The internal formulation and private additions are not copied.</p>
      </div>
      <button type="button" class="text-caption text-action-link underline" :disabled="busy || saving" @click="close">Close options</button>
    </header>
    <DocumentPreparationPanel :key="preparationRevision" :client-id="client.id"
      :anchor-session-id="seed.anchorSessionId || anchorSessionId" :initial-options="seed"
      :locked-audience="parentDraft ? 'client' : (body.trim() || record ? (generation?.audience || options.audience) : null)"
      :has-existing-text="!!body.trim()" :disabled="saving"
      @options-change="options = $event" @busy="setBusy" @generated="applyResult" />
    <div v-if="body || generation" class="space-y-3" data-testid="inline-draft">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-body font-semibold">{{ documentPurposeLabel(generation?.documentPurpose || options.documentPurpose) }}</h4>
        <span class="text-caption text-ink-muted">{{ (generation?.audience || options.audience) === 'therapist' ? 'Internal working draft' : 'Client-facing draft for review' }}</span>
      </div>
      <label class="block"><span class="sr-only">Draft text</span><textarea v-model="body" data-testid="inline-draft-text" rows="14" :disabled="busy || saving" class="w-full resize-y rounded-control border border-border bg-surface p-4 text-body-sm leading-relaxed" /></label>
      <details v-if="sources.length" class="text-caption" data-testid="inline-provenance">
        <summary class="cursor-pointer text-action-link">Sources and working interpretations</summary>
        <ul class="mt-2 space-y-2"><li v-for="source in sources" :key="source.id">
          <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="text-action-link underline">{{ sourceLabel(source) }}</a><span v-else>{{ sourceLabel(source) }}</span>
        </li></ul>
        <p class="mt-2 text-ink-muted">Source links show provenance, not proof of an interpretation. Edits do not update the original AI claim map.</p>
        <details v-if="claims.length" class="mt-2"><summary class="cursor-pointer">Inspect original claim map</summary>
          <div v-for="(claim, index) in claims" :key="index" class="mt-3"><p>{{ claim.text }}</p><p class="text-ink-muted">{{ claim.evidenceStrength.replaceAll('_', ' ') }}</p>
            <span v-for="id in claim.sourceIds" :key="id" class="mr-2"><a v-if="sources.find(s => s.id === id)?.url" :href="sources.find(s => s.id === id).url" target="_blank" rel="noopener noreferrer" class="underline">{{ sourceLabel(sources.find(s => s.id === id)) }}</a><span v-else>{{ sourceLabel(sources.find(s => s.id === id) || {}) }}</span></span>
          </div>
        </details>
      </details>
      <div class="flex flex-wrap gap-3 items-center">
        <button type="button" class="button-primary" :disabled="busy || saving || !body.trim()" @click="save">{{ saving ? 'Saving...' : 'Save draft' }}</button>
        <button v-if="versions.length" type="button" class="text-caption text-action-link underline" :disabled="busy || saving" @click="restore">Restore previous version</button>
        <a v-if="record && !dirty" :href="`/clients/${client.id}?document=${record.id}#section-documents`" target="_blank" rel="noopener noreferrer" class="text-caption text-action-link underline">Open saved document</a>
        <span class="text-caption text-ink-muted" role="status">{{ dirty ? 'Unsaved changes' : notice }}</span>
      </div>
      <button v-if="generation?.documentPurpose === 'working_formulation' && !parentDraft" type="button" class="text-caption text-action-link underline" :disabled="busy || saving" @click="beginClientSummary">Prepare a separate client summary</button>
    </div>
    <button v-if="parentDraft" type="button" class="text-caption text-action-link underline" :disabled="busy || saving" @click="returnToFormulation">Back to internal formulation</button>
    <p v-if="error" class="text-body-sm text-state-danger" role="alert">{{ error }}</p>
  </section>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import DocumentPreparationPanel from './DocumentPreparationPanel.vue'
import { defaultPreparation, documentPurposeLabel, documentOutputType, clientSummaryPreparation } from '../../lib/documentPreparation.js'
import { createClientDocumentDraft, saveClientDocumentDraft } from '../../lib/clientDocuments.js'
const props = defineProps({ client: { type: Object, required: true }, anchorSessionId: { type: String, required: true } })
const emit = defineEmits(['close', 'saved', 'busy', 'unsaved'])
const fresh = () => ({ ...defaultPreparation(), anchorSessionId: props.anchorSessionId })
const seed = ref(fresh()), options = ref(fresh()), preparationRevision = ref(0)
const body = ref(''), generation = ref(null), sources = ref([]), claims = ref([]), versions = ref([])
const record = ref(null), parentDraft = ref(null), baseline = ref(''), busy = ref(false), saving = ref(false), notice = ref(''), error = ref('')
const signature = () => JSON.stringify({ body: body.value, generation: generation.value, versions: versions.value })
const dirty = computed(() => !!body.value.trim() && signature() !== baseline.value)
const hasUnsaved = computed(() => dirty.value || !!parentDraft.value?.dirty)
let disposed = false
watch(hasUnsaved, value => emit('unsaved', value), { immediate: true })
function setBusy(value) { busy.value = value; emit('busy', value || saving.value) }
const clone = value => JSON.parse(JSON.stringify(value))
function currentSnapshot() {
  return clone({ body: body.value, generation: generation.value, sources: sources.value, claims: claims.value,
    preparation: generation.value ? { ...options.value, ...generation.value } : options.value,
    savedAt: new Date().toISOString(), lastGeneratedBody: generation.value?.lastGeneratedBody || '' })
}
function applyResult(result) {
  if (disposed || saving.value) return
  if (body.value.trim()) versions.value = [...versions.value, currentSnapshot()].slice(-5)
  body.value = result.draft.body; sources.value = result.sources || []; claims.value = result.claims || []
  generation.value = { id: result.generationId, generatedAt: result.generatedAt, promptVersion: result.promptVersion,
    model: result.model, documentPurpose: result.documentPurpose, lens: result.lens, audience: result.audience,
    window: result.window, anchorSessionId: result.anchorSessionId, selectedSessionIds: result.selectedSessionIds,
    includeCare: result.includeCare, sourceVersion: result.sourceVersion, lastGeneratedBody: result.draft.body }
  notice.value = ''; error.value = ''
}
function restoreSnapshot(snapshot) {
  body.value = snapshot.body; generation.value = snapshot.generation; sources.value = snapshot.sources; claims.value = snapshot.claims
  options.value = { ...defaultPreparation(snapshot.generation?.documentPurpose), ...snapshot.preparation }
  seed.value = clone(options.value); preparationRevision.value++
}
function restore() {
  if (busy.value || saving.value || !versions.value.length || !window.confirm('Restore the previous draft? The current wording will also be retained.')) return
  const previous = versions.value.at(-1), current = currentSnapshot()
  versions.value = [...versions.value.slice(0, -1), current].slice(-5)
  restoreSnapshot(previous)
}
function localDate(value) {
  const date = new Date(value); if (!Number.isFinite(date.getTime())) return ''
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
async function save() {
  if (busy.value || saving.value || !body.value.trim()) return
  saving.value = true; error.value = ''; emit('busy', true)
  const selected = generation.value || options.value
  const dates = sources.value.filter(s => s.occurredAt).map(s => localDate(s.occurredAt)).filter(Boolean).sort()
  const payload = { title: documentPurposeLabel(selected.documentPurpose), documentType: documentOutputType(selected),
    recipient: '', purpose: selected.audience === 'therapist' ? 'Therapist working document - not prepared for sharing' : 'Client-facing draft for therapist review',
    periodStart: dates[0] || null, periodEnd: dates.at(-1) || null,
    content: { body: body.value, richContent: null, clinicalIntelligence: { preparation: options.value, generation: generation.value,
      sources: sources.value, claims: claims.value, history: versions.value.slice(-5), lastGeneratedBody: generation.value?.lastGeneratedBody || '' } },
    sourceManifest: [...sources.value, ...(generation.value ? [{ kind: 'ai_generation', ...generation.value, lastGeneratedBody: undefined }] : [])] }
  try {
    const saved = record.value ? await saveClientDocumentDraft(record.value, payload) : await createClientDocumentDraft({ client: props.client, ...payload })
    if (disposed) return
    record.value = saved; baseline.value = signature(); notice.value = 'Saved to Client Documents'; emit('saved', saved)
  } catch (e) { if (!disposed) error.value = e.message || 'Could not save this draft. Your wording is still here.' }
  finally { saving.value = false; if (!disposed) emit('busy', busy.value) }
}
function beginClientSummary() {
  if (busy.value || saving.value || parentDraft.value) return
  try {
    const next = clientSummaryPreparation(generation.value)
    parentDraft.value = { snapshot: currentSnapshot(), record: record.value, versions: clone(versions.value), baseline: baseline.value, dirty: dirty.value }
    body.value = ''; generation.value = null; sources.value = []; claims.value = []; versions.value = []; record.value = null; baseline.value = ''; notice.value = ''; error.value = ''
    seed.value = next; options.value = clone(next); preparationRevision.value++
  } catch (e) { error.value = e.message }
}
function returnToFormulation() {
  if (busy.value || saving.value || !parentDraft.value) return
  if (dirty.value && !window.confirm('Return to the internal formulation without saving this client draft?')) return
  const saved = parentDraft.value
  record.value = saved.record; versions.value = saved.versions; baseline.value = saved.baseline
  restoreSnapshot(saved.snapshot); parentDraft.value = null; error.value = ''; notice.value = record.value ? 'Saved to Client Documents' : ''
}
function close() {
  if (busy.value || saving.value || (hasUnsaved.value && !window.confirm('Close options without saving the unsaved draft?'))) return
  emit('close')
}
function sourceLabel(source) { return (source.occurredAt ? new Date(source.occurredAt).toLocaleDateString('en-GB') + ' - ' : '') + (source.label || 'Source material') }
function protectReload(event) { if (hasUnsaved.value || busy.value || saving.value) { event.preventDefault(); event.returnValue = '' } }
defineExpose({ close })
onBeforeRouteLeave(() => !(busy.value || saving.value) && (!hasUnsaved.value || window.confirm('Leave this session without saving the unsaved draft?')))
onMounted(() => window.addEventListener('beforeunload', protectReload))
onBeforeUnmount(() => { disposed = true; window.removeEventListener('beforeunload', protectReload) })
</script>
