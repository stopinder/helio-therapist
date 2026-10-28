<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[70] bg-black/45 flex">
      <section class="relative w-full h-full bg-surface-subtle flex flex-col" role="dialog" aria-modal="true" data-testid="client-document-composer">
        <header class="px-5 py-3 border-b border-border bg-surface-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div><p class="type-overline text-ink-muted">{{ isSessionSummary ? (preparedAudience === 'client' ? 'Client-facing summary' : 'Therapist working document') : 'Client document' }}</p><h2 class="text-h3 font-semibold">{{ finalised ? (isSessionSummary ? 'Session Summary Finalised' : 'Document Finalised') : (document ? (isSessionSummary ? 'Edit session summary' : 'Edit client document') : (isSessionSummary ? ('Create ' + preparationLabel.toLowerCase()) : 'Create client document')) }}</h2></div>
          <div v-if="!finalised" class="flex flex-wrap items-center gap-2"><HelpLink v-if="isSessionSummary" topic="client-summary" label="How client summaries work" /><span class="text-caption" :class="dirty ? 'text-state-warning' : 'text-ink-muted'">{{ dirty ? 'Unsaved changes' : saveMessage }}</span><button v-if="!isSessionSummary" class="button-secondary" type="button" @click="sourcePanelOpen = true">Add from clinical notes</button><button class="button-secondary" :disabled="saving || generatingSummary || !form.title.trim()" @click="saveDraft">{{ saving && action === 'save' ? 'Saving…' : 'Save Draft' }}</button><button class="button-primary" :disabled="saving || generatingSummary || !form.title.trim() || !form.body.trim()" @click="finaliseDocument">{{ saving && action === 'finalise' ? 'Finalising…' : 'Finalise PDF' }}</button><button class="button-secondary" :disabled="saving || generatingSummary" @click="requestClose">Close</button></div>
        </header>
        <div v-if="finalised" class="flex-1 overflow-auto p-8">
          <div class="max-w-2xl mx-auto rounded-panel border border-state-success/20 bg-state-success-surface p-6">
            <p class="text-h3 font-semibold text-state-success">✓ PDF finalised and saved</p>
            <p class="text-body-sm text-ink-secondary mt-2"><strong>{{ currentDocument.title }}</strong> is stored privately with this client and this version is read-only.</p>
            <p class="text-caption text-ink-muted mt-3">Finalised {{ formatDateTime(currentDocument.finalizedAt) }}</p>
            <div class="mt-5 flex flex-wrap items-center gap-3">
              <div class="flex gap-2">
                <button class="button-primary" @click="downloadFinalised">Download PDF</button>
                <a v-if="isSessionSummary && preparedAudience === 'client' && clientEmail" :href="mailtoLink" class="button-secondary inline-flex items-center">Prepare email</a>
                <button class="button-secondary" @click="$emit('show-documents')">View Client Documents</button>
                <button class="button-secondary" @click="requestClose">Close</button>
              </div>
              <p v-if="isSessionSummary && preparedAudience === 'client' && clientEmail" class="text-caption text-ink-muted w-full mt-1">Opens your email app with a draft. Attach the downloaded PDF before sending.</p>
            </div>
          </div>
        </div>
        <div v-else-if="loading" class="flex-1 grid place-items-center text-ink-muted">
          <div v-if="error" class="max-w-md text-center">
            <p class="text-state-danger font-semibold">Could not load workspace</p>
            <p class="mt-2 text-body-sm">{{ error }}</p>
            <button class="button-secondary mt-4" @click="loadWorkspace">Retry</button>
          </div>
          <div v-else-if="loadingEvidence && availableSummarySessions.length === 0">Loading reviewed sessions…</div>
          <div v-else>Loading document workspace…</div>
        </div>
        <div v-else class="flex-1 min-h-0 overflow-auto"><div class="max-w-5xl mx-auto px-4 sm:px-8 py-5 space-y-5">
          <section v-if="isSessionSummary" class="space-y-3">
            <DocumentPreparationPanel :key="preparationRevision" :client-id="client.id" :anchor-session-id="preparationChoice.anchorSessionId || initialSessionId"
              :initial-options="preparationChoice" :locked-audience="lockedAudience"
              :has-existing-text="hasDraftText" :disabled="saving || finalised"
              @busy="generatingSummary = $event" @options-change="updatePreparationChoice" @generated="applyPreparedResult" />
            <p v-if="summaryGenerationMessage" class="text-caption text-ink-secondary" role="status">{{ summaryGenerationMessage }}</p>
            <details v-if="summarySources.length" class="rounded-control border border-border-muted bg-surface-elevated p-3">
              <summary class="text-caption font-semibold cursor-pointer">Sources used in this draft</summary>
              <ul class="mt-2 space-y-2 text-caption"><li v-for="source in summarySources" :key="source.id">
                <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="text-action-link underline">{{ sourceLabel(source) }}</a>
                <span v-else>{{ sourceLabel(source) }}</span>
              </li></ul>
              <details v-if="summaryClaims.length" class="mt-3"><summary class="text-caption cursor-pointer">Check statements against sources</summary>
                <p class="text-caption text-ink-muted mt-2">These links show provenance, not proof that the interpretation is correct. Edits to the document do not update the original AI claim map.</p>
                <div v-for="(claim,index) in summaryClaims" :key="index" class="mt-3 border-t border-border-muted pt-2 text-caption">
                  <p>{{ claim.text }}</p><p class="text-ink-muted">{{ claim.evidenceStrength.replaceAll('_',' ') }}</p>
                  <span v-for="id in claim.sourceIds" :key="id" class="mr-3"><a v-if="summarySources.find(s=>s.id===id)?.url" :href="summarySources.find(s=>s.id===id).url" target="_blank" rel="noopener noreferrer" class="text-action-link underline">{{ sourceLabel(summarySources.find(s=>s.id===id)) }}</a><span v-else>{{ sourceLabel(summarySources.find(s=>s.id===id)||{}) }}</span></span>
                </div>
              </details>
            </details>
            <div v-if="previousSummaryVersions.length" class="flex items-center gap-3 text-caption"><button type="button" class="button-secondary" :disabled="saving || generatingSummary" @click="restorePreviousSummary">Restore previous version</button><span class="text-ink-muted">Up to five prior drafts are preserved with this document when saved.</span></div>
          </section>
          <section class="rounded-panel border border-border bg-surface-elevated p-4 sm:p-5" aria-labelledby="document-details-heading"><div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h3 id="document-details-heading" class="text-body font-semibold text-ink">Document details</h3><p class="text-caption text-ink-muted mt-1">{{ isSessionSummary ? (preparedAudience === 'client' ? 'Client-facing draft. Review carefully before sharing.' : 'Therapist working document. Do not share without preparing a separate client-facing draft.') : 'Keep the document generic or add clinical context when it is useful.' }}</p></div><span v-if="!isSessionSummary && selectedSourceIds.length" class="text-caption text-ink-muted">{{ selectedSourceIds.length }} clinical source{{ selectedSourceIds.length === 1 ? '' : 's' }} linked</span></div><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><label class="block xl:col-span-2"><span class="text-caption font-semibold">Title</span><input v-model="form.title" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Document title" /></label><label class="block"><span class="text-caption font-semibold">Document type</span><select v-model="form.documentType" :disabled="isSessionSummary" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface"><option value="other">General document</option><option value="session_summary">Session summary</option><option value="clinical_summary">Clinical summary</option><option value="progress_report">Progress report</option><option value="care_letter">Care letter</option></select></label><label class="block"><span class="text-caption font-semibold">Recipient</span><input v-model="form.recipient" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label><label class="block md:col-span-2"><span class="text-caption font-semibold">Purpose</span><input v-model="form.purpose" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label><div class="grid grid-cols-2 gap-2 md:col-span-2"><label><span class="text-caption font-semibold">From</span><input v-model="form.periodStart" type="date" class="mt-1 w-full p-2 border border-border rounded-control bg-surface" /></label><label><span class="text-caption font-semibold">To</span><input v-model="form.periodEnd" type="date" class="mt-1 w-full p-2 border border-border rounded-control bg-surface" /></label></div></div><div v-if="error" class="mt-4 p-3 rounded-control bg-state-danger/10 text-state-danger text-body-sm">{{ error }}</div></section>
          <article class="clinical-paper mx-auto bg-white text-ink shadow-lg" data-testid="clinical-document-canvas"><header class="clinical-letterhead"><div><strong>{{ identity.heading }}</strong><span v-if="identity.professionalTitle">{{ identity.professionalTitle }}</span></div><div class="text-right"><span v-for="line in identity.contactLines" :key="line">{{ line }}</span></div></header><div class="clinical-rule"></div><p class="clinical-eyebrow">{{ isSessionSummary ? (preparedAudience === 'therapist' ? 'THERAPIST WORKING DOCUMENT' : preparationLabel.toUpperCase()) : 'CONFIDENTIAL CLINICAL DOCUMENT' }}</p><h1 class="clinical-title">{{ form.title || (isSessionSummary ? 'Session summary' : 'Untitled document') }}</h1><dl class="clinical-meta"><div><dt>Client</dt><dd>{{ client.display_name }}</dd></div><div v-if="form.recipient"><dt>Recipient</dt><dd>{{ form.recipient }}</dd></div><div v-if="periodLabel"><dt>Period</dt><dd>{{ periodLabel }}</dd></div><div v-if="form.purpose"><dt>Purpose</dt><dd>{{ form.purpose }}</dd></div></dl><RichDocumentEditor
  v-model="form.body"
  v-model:rich-content="form.richContent"
  :editable="!generatingSummary && !saving"
  :placeholder="isSessionSummary ? 'Generate a client summary above, then review and edit it here.' : 'Write the document here. Use Add from clinical notes when you want to bring completed session material into the draft.'"
/><footer class="clinical-footer"><span>{{ identity.footer }}</span><span>{{ isSessionSummary ? 'Session summary' : 'Confidential clinical document' }}</span></footer></article>
        </div></div>
        <aside v-if="!finalised && !isSessionSummary && sourcePanelOpen" class="absolute inset-y-0 right-0 z-20 w-full sm:w-[26rem] min-w-0 overflow-x-hidden bg-surface-elevated border-l border-border shadow-2xl flex flex-col" data-testid="clinical-source-panel"><div class="p-4 border-b border-border-muted"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="text-body font-semibold">Add from clinical notes</h3><p class="text-caption text-ink-muted mt-1">Completed clinical session notes only. Private reflections and supervision material are excluded.</p></div><button class="button-secondary shrink-0" type="button" @click="sourcePanelOpen = false">Done</button></div><input v-model="sourceQuery" type="search" class="mt-3 w-full min-w-0 p-2.5 border border-border rounded-control bg-surface text-body-sm" placeholder="Search session notes…" @input="resetSourceWindow" /></div><div class="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-2 space-y-1"><div v-if="!sources.length" class="p-3 text-body-sm text-ink-muted">No completed session notes are available.</div><div v-for="source in visibleSources" :key="source.id" class="min-w-0 overflow-hidden border border-border rounded-control bg-surface"><div class="flex items-center gap-2 p-2.5"><input v-model="selectedSourceIds" type="checkbox" :value="source.id"/><button class="min-w-0 flex-1 text-left" @click="toggleSourcePreview(source.id)"><strong class="block text-body-sm">{{ formatDate(source.occurredAt) }}</strong><span class="block text-caption text-ink-muted">Clinical session note · v{{ source.version }}</span></button><span v-if="addedSourceIds.includes(source.id)" class="text-caption text-state-success font-semibold">Added</span></div><div v-if="expandedSourceId === source.id" class="min-w-0 px-3 pb-3 pt-3 border-t border-border-muted text-body-sm text-ink-secondary whitespace-pre-wrap break-words">{{ source.notes || 'No note text' }}</div></div><div v-if="hasMoreSources" class="p-3 text-center"><button class="text-body-sm font-semibold text-action-link" @click="loadMoreSources">Load {{ nextSourceCount }} more</button></div></div><div class="p-3 border-t border-border-muted"><button class="button-primary w-full" :disabled="!addableSelectedSources.length" @click="appendSources">{{ addableSelectedSources.length ? `Add ${addableSelectedSources.length} selected note${addableSelectedSources.length === 1 ? '' : 's'} to document` : 'Select session notes to add' }}</button></div></aside>
      </section>
    </div>
  </teleport>
</template>
<script setup>
import HelpLink from '../help/HelpLink.vue'
import DocumentPreparationPanel from './DocumentPreparationPanel.vue'
import { defaultPreparation, documentPurposeLabel, documentOutputType } from '../../lib/documentPreparation.js'
import RichDocumentEditor from '../documents/RichDocumentEditor.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { createClientDocumentDraft, downloadClientDocument, finaliseClientDocument, listDocumentSourceSessions, saveClientDocumentDraft } from '../../lib/clientDocuments.js'
import { loadDocumentProfile, profileDisplay } from '../../lib/documentProfile.js'
const SESSION_SUMMARY_TEMPLATE = `Where things are now\n\nWhat we have been working on\n\nPatterns across our recent work\n\nWhat has shifted — and what has been different\n\nStrengths and resources\n\nMaking sense of what we have noticed\n\nIdeas to carry forward\n\nClosing reflection`
const props = defineProps({ client: { type: Object, required: true }, clientEmail: { type: String, default: '' }, document: { type: Object, default: null }, initialDocumentType: { type: String, default: 'other' }, initialSessionId: { type: String, default: null } })
const emit = defineEmits(['close', 'saved', 'show-documents'])
const SOURCE_PAGE_SIZE = 8
const requestedPurpose = props.document?.content?.clinicalIntelligence?.generation?.documentPurpose || (props.initialDocumentType === 'recent_review' ? 'recent_review' : 'session_summary')
const initialType = props.document?.documentType || (props.initialDocumentType === 'recent_review' ? 'clinical_summary' : props.initialDocumentType) || 'other'
const workflowRequested = ['session_summary','recent_review'].includes(props.initialDocumentType) || props.document?.documentType === 'session_summary' || !!props.document?.content?.clinicalIntelligence
const isSessionSummary = computed(() => workflowRequested || form.documentType === 'session_summary' || !!summaryGeneration.value)
const loading = ref(true), saving = ref(false), action = ref(''), error = ref(''), saveMessage = ref(props.document ? 'Saved' : 'Not saved yet'), sources = ref([]), selectedSourceIds = ref([]), addedSourceIds = ref([]), expandedSourceId = ref(null), sourceQuery = ref(''), visibleSourceCount = ref(SOURCE_PAGE_SIZE), currentDocument = ref(props.document), baseline = ref(''), profile = ref({}), sourcePanelOpen = ref(false)
const generatingSummary = ref(false), loadingEvidence = ref(false), evidenceError = ref(''), summaryLens = ref('general'), summaryWindow = ref('last_three'), therapistGuidance = ref(''), summaryGenerationMessage = ref(''), summaryGenerationError = ref(false), summarySources = ref(props.document?.content?.clinicalIntelligence?.sources || []), summaryClaims = ref(props.document?.content?.clinicalIntelligence?.claims || []), summaryGeneration = ref(props.document?.content?.clinicalIntelligence?.generation || null), previousSummaryVersions = ref(props.document?.content?.clinicalIntelligence?.history || []), lastGeneratedBody = ref(props.document?.content?.clinicalIntelligence?.lastGeneratedBody || ''), availableSummarySessions = ref([]), anchorSessionId = ref(null)
const form = reactive({ title: props.document?.title || (workflowRequested ? documentPurposeLabel(requestedPurpose) : initialType === 'session_summary' ? 'Session summary' : ''), documentType: initialType, recipient: props.document?.recipient || '', purpose: props.document?.purpose || (initialType === 'session_summary' ? 'A client-facing summary of the session' : ''), periodStart: props.document?.periodStart || '', periodEnd: props.document?.periodEnd || '', body: props.document?.content?.body || (initialType === 'session_summary' ? SESSION_SUMMARY_TEMPLATE : ''), richContent: props.document?.content?.richContent || null })
const preparationDefaults = { ...defaultPreparation(requestedPurpose), ...(props.document?.content?.clinicalIntelligence?.preparation || {}), ...(props.document?.content?.clinicalIntelligence?.generation || {}) }
const preparationChoice = ref({ ...preparationDefaults })
const preparationRevision = ref(0)
const preparedPurpose = computed(() => summaryGeneration.value?.documentPurpose || preparationChoice.value.documentPurpose)
const preparedAudience = computed(() => summaryGeneration.value?.audience || preparationChoice.value.audience)
const lockedAudience = computed(() => props.document || summaryGeneration.value || hasDraftText.value ? preparedAudience.value : null)
const hasDraftText = computed(() => !!form.body.trim() && form.body.trim() !== SESSION_SUMMARY_TEMPLATE.trim())
const preparationLabel = computed(() => documentPurposeLabel(preparedPurpose.value))
const identity = computed(() => profileDisplay(profile.value)), finalised = computed(() => currentDocument.value?.status === 'completed')
const mailtoLink = computed(() => {
  if (!props.clientEmail) return ''
  const subject = encodeURIComponent('Session Summary')
  const body = encodeURIComponent('Hi,\n\nPlease find your session summary attached.\n\nKind regards,')
  return `mailto:${props.clientEmail}?subject=${subject}&body=${body}`
})
const selectedSources = computed(() => isSessionSummary.value ? [] : sources.value.filter(s => selectedSourceIds.value.includes(s.id)))
const addableSelectedSources = computed(() => selectedSources.value.filter(s => !addedSourceIds.value.includes(s.id)))
const filteredSources = computed(() => { const q = sourceQuery.value.trim().toLowerCase(); return q ? sources.value.filter(s => `${formatDate(s.occurredAt)} ${s.notes || ''}`.toLowerCase().includes(q)) : sources.value })
const visibleSources = computed(() => filteredSources.value.slice(0, visibleSourceCount.value)), hasMoreSources = computed(() => visibleSources.value.length < filteredSources.value.length), nextSourceCount = computed(() => Math.min(SOURCE_PAGE_SIZE, filteredSources.value.length - visibleSources.value.length)), periodLabel = computed(() => [form.periodStart && formatDate(form.periodStart), form.periodEnd && formatDate(form.periodEnd)].filter(Boolean).join(' – '))
const evidenceWindow=computed(()=>{const index=availableSummarySessions.value.findIndex(session=>session.sessionId===anchorSessionId.value);if(index<0)return[];return availableSummarySessions.value.slice(index,index+(summaryWindow.value==='current'?1:3))})
function changes() { const clinicalIntelligence=isSessionSummary.value?{preparation:preparationChoice.value,generation:summaryGeneration.value,claims:summaryClaims.value,sources:summarySources.value,history:previousSummaryVersions.value.slice(-5),lastGeneratedBody:lastGeneratedBody.value}:undefined; return { title: form.title, documentType: form.documentType, recipient: form.recipient, purpose: form.purpose, periodStart: form.periodStart || null, periodEnd: form.periodEnd || null, content: { body: form.body, richContent: form.richContent,...(clinicalIntelligence?{clinicalIntelligence}:{}) }, sourceManifest: isSessionSummary.value ? [...summarySources.value,{kind:'ai_generation',...(summaryGeneration.value||{})}] : selectedSources.value.map(s => ({ kind: 'session', id: s.id, version: s.version, occurredAt: s.occurredAt })) } }
function snapshot() { return JSON.stringify(changes()) }
const dirty = computed(() => !finalised.value && baseline.value !== snapshot())
onMounted(() => { loadWorkspace() })
async function loadWorkspace() {
  loading.value = true
  error.value = ''
  try {
    const p = await loadDocumentProfile()
    profile.value = p
    if (!isSessionSummary.value) {
      sources.value = await listDocumentSourceSessions(props.client.id)
      const ids = new Set((props.document?.sourceManifest || []).filter(i => i.kind === 'session').map(i => i.id))
      selectedSourceIds.value = sources.value.filter(s => ids.has(s.id)).map(s => s.id)
      addedSourceIds.value = [...selectedSourceIds.value]
    } else {
      sourcePanelOpen.value = false
      selectedSourceIds.value = []
      addedSourceIds.value = []

    }
    baseline.value = snapshot()
  } catch (e) {
    error.value = e.message || 'Could not load document workspace.'
  } finally {
    loading.value = false
  }
}
function updatePreparationChoice(options) {
  const previousPurpose = preparationChoice.value.documentPurpose
  preparationChoice.value = { ...options, selectedSessionIds: [...options.selectedSessionIds] }
  if (!hasDraftText.value && !currentDocument.value) {
    form.documentType = documentOutputType(options)
    if (!form.title || form.title === documentPurposeLabel(previousPurpose)) form.title = documentPurposeLabel(options.documentPurpose)
    form.purpose = options.audience === 'therapist' ? 'Therapist working document - not prepared for sharing' : 'Client-facing draft for therapist review'
  }
}
function draftSnapshot() {
  return { body:form.body,richContent:form.richContent,title:form.title,documentType:form.documentType,
    purpose:form.purpose,recipient:form.recipient,periodStart:form.periodStart,periodEnd:form.periodEnd,
    savedAt:new Date().toISOString(),generation:summaryGeneration.value,sources:summarySources.value,
    claims:summaryClaims.value,lastGeneratedBody:lastGeneratedBody.value,
    preparation: summaryGeneration.value ? { ...preparationChoice.value,
      ...Object.fromEntries(Object.keys(defaultPreparation()).filter(k => summaryGeneration.value[k] !== undefined).map(k => [k, summaryGeneration.value[k]]))
    } : preparationChoice.value }
}
function applyPreparedResult(result) {
  if (finalised.value || saving.value) return
  const previousPurpose = preparedPurpose.value
  if (hasDraftText.value) previousSummaryVersions.value=[...previousSummaryVersions.value,draftSnapshot()].slice(-5)
  form.body=result.draft.body; form.richContent=null; lastGeneratedBody.value=result.draft.body
  summarySources.value=result.sources||[]; summaryClaims.value=result.claims||[]
  summaryGeneration.value={ id:result.generationId,generatedAt:result.generatedAt,promptVersion:result.promptVersion,
    model:result.model,lens:result.lens,window:result.window,documentPurpose:result.documentPurpose,
    audience:result.audience,anchorSessionId:result.anchorSessionId,selectedSessionIds:result.selectedSessionIds,
    includeCare:result.includeCare,sourceVersion:result.sourceVersion,usage:result.usage }
  form.documentType=documentOutputType(result)
  if(!props.document && (!form.title || form.title === documentPurposeLabel(previousPurpose))) form.title=documentPurposeLabel(result.documentPurpose)
  if(result.audience==='therapist') form.recipient=''
  form.purpose=result.audience==='therapist'?'Therapist working document - not prepared for sharing':'Client-facing draft for therapist review'
  const dates=(result.sources||[]).filter(s=>s.occurredAt).map(s=>localDateInput(s.occurredAt)).filter(Boolean).sort()
  form.periodStart=dates[0]||''; form.periodEnd=dates.at(-1)||''
  summaryGenerationMessage.value='Draft prepared from '+result.sessionCount+' session(s). Review before saving. Nothing was changed in Care.'
}
function restorePreviousSummary() {
  if(saving.value || generatingSummary.value || finalised.value)return
  const previous=previousSummaryVersions.value.at(-1);if(!previous)return
  if(!window.confirm('Restore the previous draft? Your current wording will also remain in Previous versions.'))return
  const current=draftSnapshot()
  for(const key of ['body','richContent','title','documentType','purpose','recipient','periodStart','periodEnd']) if(previous[key]!==undefined)form[key]=previous[key]
  preparationChoice.value = previous.preparation || preparationChoice.value
  summaryGeneration.value=previous.generation||null;summarySources.value=previous.sources||[];summaryClaims.value=previous.claims||[]
  lastGeneratedBody.value=previous.lastGeneratedBody||previous.body
  previousSummaryVersions.value=[...previousSummaryVersions.value.slice(0,-1),current].slice(-5)
  preparationRevision.value++
  summaryGenerationMessage.value='Previous version restored. Review before saving.'
}
function sourceLabel(source) {
  if(source.label)return (source.occurredAt?formatDate(source.occurredAt)+' - ':'')+source.label
  if(source.kind==='session_capture')return 'Reviewed Session Capture - '+formatDate(source.occurredAt)
  if(source.kind==='accepted_care')return 'Current accepted Care'
  if(source.sessionId)return 'Session source - '+formatDate(source.occurredAt)
  return 'Therapist-authored guidance'
}
function appendSources() { if (isSessionSummary.value) return; const pending = addableSelectedSources.value; const text = pending.map(s => `Session ${formatDate(s.occurredAt)}\n${s.notes || ''}`.trim()).join('\n\n'); if (text) { form.body = [form.body.trim(), text].filter(Boolean).join('\n\n'); form.richContent = null; } addedSourceIds.value = [...new Set([...addedSourceIds.value, ...pending.map(s => s.id)])] }
function toggleSourcePreview(id) { expandedSourceId.value = expandedSourceId.value === id ? null : id } function loadMoreSources() { visibleSourceCount.value += SOURCE_PAGE_SIZE } function resetSourceWindow() { visibleSourceCount.value = SOURCE_PAGE_SIZE; expandedSourceId.value = null }
async function persistDraft() { currentDocument.value = currentDocument.value ? await saveClientDocumentDraft(currentDocument.value, changes()) : await createClientDocumentDraft({ client: props.client, ...changes() }); baseline.value = snapshot(); saveMessage.value = `Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute:'2-digit' })} to Client Documents`; emit('saved', currentDocument.value); return currentDocument.value }
async function saveDraft() { if (saving.value || generatingSummary.value) return; saving.value = true; action.value = 'save'; error.value = ''; try { await persistDraft() } catch (e) { error.value = e.message || 'Could not save this draft.' } finally { saving.value = false; action.value = '' } }
async function finaliseDocument() { if (saving.value || generatingSummary.value || !form.body.trim()) return; const label = isSessionSummary.value ? 'session summary' : 'clinical document'; if (!window.confirm(`Finalise this ${label}? This version will become read-only.`)) return; saving.value = true; action.value = 'finalise'; error.value = ''; try { const draft = await persistDraft(); currentDocument.value = await finaliseClientDocument(draft); baseline.value = snapshot(); emit('saved', currentDocument.value) } catch (e) { error.value = e.message || 'Could not finalise this document.' } finally { saving.value = false; action.value = '' } }
async function downloadFinalised() { try { await downloadClientDocument(currentDocument.value) } catch (e) { error.value = e.message } } function requestClose() { if (saving.value || generatingSummary.value) return; if (!finalised.value && dirty.value && !window.confirm('You have unsaved changes. Close without saving?')) return; emit('close') }
function localDateInput(value) {
  const d = new Date(value); if (!Number.isFinite(d.getTime())) return ''
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
}
function formatDate(v) { if (!v) return ''; const d = new Date(v.length === 10 ? `${v}T00:00:00` : v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) } function formatDateTime(v) { return v ? new Date(v).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' }) : '' }
</script>
<style scoped>
.clinical-paper{width:min(210mm,100%);min-height:297mm;padding:18mm 19mm;display:flex;flex-direction:column;font-family:'Noto Sans',Arial,sans-serif;background:repeating-linear-gradient(to bottom,#fff 0,#fff 297mm,#e7ecee 297mm,#e7ecee 305mm);background-size:100% 305mm;border-left:1px solid #d9e0e3;border-right:1px solid #d9e0e3;box-shadow:0 8px 28px rgba(30,48,55,.12)}.clinical-letterhead{display:flex;justify-content:space-between;gap:24px;font-size:10px;color:#52616b}.clinical-letterhead strong{display:block;font-size:13px;color:#17242b}.clinical-letterhead span{display:block;margin-top:2px}.clinical-rule{height:1px;background:#cfd8dc;margin:14px 0 36px}.clinical-eyebrow{font-size:9px;font-weight:700;letter-spacing:.16em;color:#657780;margin-bottom:10px}.clinical-title{font-size:28px;line-height:1.2;font-weight:600;color:#17242b;margin:0 0 22px}.clinical-meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 0;border-top:1px solid #e2e8ea;border-bottom:1px solid #e2e8ea;margin-bottom:24px}.clinical-meta dt{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#718087}.clinical-meta dd{font-size:11px;margin:3px 0 0}.clinical-footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8ea;display:flex;justify-content:space-between;gap:20px;font-size:8.5px;color:#718087}
</style>
