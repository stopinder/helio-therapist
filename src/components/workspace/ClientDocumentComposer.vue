<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[70] bg-black/45 flex">
      <section class="relative w-full h-full bg-surface-subtle flex flex-col" role="dialog" aria-modal="true" data-testid="client-document-composer">
        <header class="px-5 py-3 border-b border-border bg-surface-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div><p class="type-overline text-ink-muted">{{ isSessionSummary ? 'Client-facing summary' : 'Client document' }}</p><h2 class="text-h3 font-semibold">{{ finalised ? (isSessionSummary ? 'Session Summary Finalised' : 'Document Finalised') : (document ? (isSessionSummary ? 'Edit session summary' : 'Edit client document') : (isSessionSummary ? 'Create session summary' : 'Create client document')) }}</h2></div>
          <div v-if="!finalised" class="flex flex-wrap items-center gap-2"><HelpLink v-if="isSessionSummary" topic="client-summary" label="How client summaries work" /><span class="text-caption" :class="dirty ? 'text-state-warning' : 'text-ink-muted'">{{ dirty ? 'Unsaved changes' : saveMessage }}</span><button v-if="!isSessionSummary" class="button-secondary" type="button" @click="sourcePanelOpen = true">Add from clinical notes</button><button class="button-secondary" :disabled="saving || !form.title.trim()" @click="saveDraft">{{ saving && action === 'save' ? 'Saving…' : 'Save Draft' }}</button><button class="button-primary" :disabled="saving || !form.title.trim() || !form.body.trim() || !!sourceReview || summaryUnsafe || sourceSafetyChecking" @click="finaliseDocument">{{ saving && action === 'finalise' ? 'Finalising…' : 'Finalise PDF' }}</button><button class="button-secondary" :disabled="saving" @click="requestClose">Close</button></div>
        </header>
        <p v-if="sourceSafetyChecking" role="status" class="p-4">Checking summary source before sharing...</p>
        <section v-if="sourceReview || summaryUnsafe" class="p-4 border-b border-border bg-surface-elevated" data-testid="composer-source-review">
          <h3 class="font-semibold">{{ sourceReview?.resolved ? 'Source review saved' : 'Source needs review' }}</h3><p>{{ sourceReview?.message || 'This saved item is a source-review notice, not clinical evidence. Review its original and regenerate.' }}</p><p class="text-body-sm">Your previous draft is unchanged.</p>
          <button v-for="(item,index) in reviewSources" :key="index" class="button-secondary mt-2" :disabled="!item.transcriptId" @click="reviewTranscriptId=item.transcriptId">Review source {{index+1}}</button>
          <a v-if="sourceReview?.resolved && confirmedEncounterUrl" :href="confirmedEncounterUrl" class="button-primary">Open this encounter to regenerate</a>
        </section>
        <SourceReviewDialog v-if="reviewTranscriptId" :transcript-id="reviewTranscriptId" :source-label="(client?.display_name || client?.name || 'Client') + ' · Original transcript'" @close="reviewTranscriptId=''" @resolved="handleSourceReviewResolved" />
        <div v-if="finalised" class="flex-1 overflow-auto p-8">
          <div class="max-w-2xl mx-auto rounded-panel border border-state-success/20 bg-state-success-surface p-6">
            <p class="text-h3 font-semibold text-state-success">✓ PDF finalised and saved</p>
            <p class="text-body-sm text-ink-secondary mt-2"><strong>{{ currentDocument.title }}</strong> is stored privately with this client and this version is read-only.</p>
            <p class="text-caption text-ink-muted mt-3">Finalised {{ formatDateTime(currentDocument.finalizedAt) }}</p>
            <div class="mt-5 flex flex-wrap items-center gap-3">
              <div class="flex flex-wrap gap-2">
                <button class="button-primary" :disabled="sourceSafetyChecking || !!sourceReview || summaryUnsafe" @click="downloadFinalised">Download PDF</button>
                <button v-if="isSessionSummary" class="button-secondary" :disabled="copySummaryState === 'copying' || !!sourceReview || summaryUnsafe || sourceSafetyChecking" @click="copySummary">{{ copySummaryLabel }}</button>
                <a v-if="isSessionSummary && clientEmail" :href="mailtoLink" class="button-secondary inline-flex items-center">Prepare email</a>
                <button class="button-secondary" @click="$emit('show-documents')">View Client Documents</button>
                <button class="button-secondary" @click="requestClose">Close</button>
              </div>
              <p v-if="isSessionSummary && clientEmail" class="text-caption text-ink-muted w-full mt-1">Opens your email app with a draft. Attach the downloaded PDF before sending.</p>
            </div>
          </div>
        </div>
        <div v-else-if="loading" class="flex-1 grid place-items-center text-ink-muted">
          <div v-if="error" class="max-w-md text-center">
            <p class="text-state-danger font-semibold">Could not load workspace</p>
            <p class="mt-2 text-body-sm">{{ error }}</p>
            <button class="button-secondary mt-4" @click="loadWorkspace">Retry</button>
          </div>
          <div v-else-if="loadingEvidence && availableSummarySessions.length === 0">Loading available sessions…</div>
          <div v-else>Loading document workspace…</div>
        </div>
        <div v-else ref="composerScrollContainer" class="flex-1 min-h-0 overflow-auto" @scroll.passive="handleComposerScroll"><div class="max-w-5xl mx-auto px-4 sm:px-8 py-5 space-y-5">
          <section v-if="isSessionSummary" class="rounded-panel border border-action-link/20 bg-surface-elevated p-4 sm:p-5" aria-labelledby="clinical-intelligence-heading">
            <div>
              <p class="type-overline text-action-link">Helios Clinical Intelligence</p>
              <h3 id="clinical-intelligence-heading" class="text-h3 font-semibold text-ink mt-1">Prepare a useful client summary</h3>
              <p class="text-body-sm text-ink-secondary mt-1 max-w-3xl">Choose the clinical perspective and evidence scope first. Helios will then generate an editable client-facing draft from reviewed Session Captures, transcript-backed summaries and therapist-accepted Therapy Focus.</p>
            </div>

            <div class="mt-4 rounded-control border border-border-muted bg-surface-subtle p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-body-sm font-semibold text-ink">Summary setup</p>
                  <p class="text-caption text-ink-muted mt-0.5">Decide how Helios should read the available material before generating.</p>
                </div>
                <span v-if="evidenceWindow.length" class="rounded-pill border border-border-muted bg-surface px-2.5 py-1 text-caption text-ink-secondary">{{ evidenceWindow.length }} session source{{ evidenceWindow.length===1?'':'s' }}</span>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                <label class="block">
                  <span class="text-caption font-semibold">Perspective</span>
                  <span class="block text-caption text-ink-muted mt-0.5">Clinical lens</span>
                  <select v-model="summaryLens" class="mt-1.5 w-full p-2.5 border border-border rounded-control bg-surface"><option value="general">General</option><option value="integrative">Integrative</option><option value="gentle_cbt">CBT</option><option value="internal_family_systems">Internal Family Systems (IFS)</option><option value="transactional_analysis">Transactional Analysis</option></select>
                </label>
                <label class="block">
                  <span class="text-caption font-semibold">Continuity</span>
                  <span class="block text-caption text-ink-muted mt-0.5">How much recent history</span>
                  <select v-model="summaryWindow" class="mt-1.5 w-full p-2.5 border border-border rounded-control bg-surface"><option value="current" :disabled="!!currentDocument && isAcrossSessionReview">This session only</option><option value="last_three" :disabled="!!currentDocument && !isAcrossSessionReview">Last 3 sessions</option><option value="last_five" :disabled="!!currentDocument && !isAcrossSessionReview">Last 5 sessions</option><option value="history" :disabled="!!currentDocument && !isAcrossSessionReview">Entire history</option></select>
                </label>
                <label class="block">
                  <span class="text-caption font-semibold">Anchor session</span>
                  <span class="block text-caption text-ink-muted mt-0.5">Latest session to include</span>
                  <select v-model="anchorSessionId" class="mt-1.5 w-full p-2.5 border border-border rounded-control bg-surface" :disabled="!availableSummarySessions.length || loadingEvidence">
                    <option v-if="loadingEvidence" value="">Loading available sessions…</option>
                    <option v-else-if="evidenceError" value="">Error loading sessions</option>
                    <option v-else-if="!availableSummarySessions.length" value="">No available sessions found</option>
                    <option v-for="session in availableSummarySessions" :key="session.sessionId" :value="session.sessionId">{{ formatDate(session.occurredAt) }}</option>
                  </select>
                </label>
              </div>

              <p v-if="evidenceError" class="text-caption text-state-danger mt-3">{{ evidenceError }}</p>
              <div v-else-if="evidenceWindow.length" class="mt-3 flex flex-wrap items-center gap-2 rounded-control border border-border-muted bg-surface px-3 py-2">
                <span class="text-caption font-semibold text-ink-secondary">Evidence selected</span>
                <span class="text-caption text-ink-muted">{{ evidenceWindow.map(session=>formatDate(session.occurredAt)).join(' · ') }}</span>
              </div>

              <label class="block mt-4">
                <span class="text-caption font-semibold">Therapist additions <span class="font-normal text-ink-muted">(optional)</span></span>
                <span class="block text-caption text-ink-muted mt-0.5">Add a correction, observation or emphasis Helios should take into account.</span>
                <div class="relative mt-1.5">
                  <textarea v-model="therapistGuidance" rows="3" maxlength="6000" class="w-full p-2.5 pr-12 border border-border rounded-control bg-surface text-body-sm" placeholder="Add therapist-authored context for this summary…" :disabled="guidanceDictation.transcribing.value" />
                  <div class="absolute bottom-2 right-2">
                    <WhisperMicButton :recording="guidanceDictation.recording.value" :transcribing="guidanceDictation.transcribing.value" :disabled="generatingSummary" label="Dictate therapist additions" @toggle="guidanceDictation.toggle()" />
                  </div>
                </div>
              </label>
              <p v-if="guidanceDictation.error.value" class="text-caption text-state-danger mt-2" role="alert">{{ guidanceDictation.error.value }}</p>
              <p v-else class="text-caption text-ink-muted mt-2">This remains explicitly therapist-authored and is never presented as something the client said.</p>

              <div class="mt-4 pt-4 border-t border-border-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-caption font-semibold text-ink">{{ summaryLensLabel }} · {{ summaryWindowLabel }}</p>
                  <p class="text-caption text-ink-muted mt-0.5">{{ evidenceWindow.length ? `${evidenceWindow.length} session source${evidenceWindow.length===1?'':'s'} selected` : 'Choose an available anchor session to generate.' }}</p>
                  <p v-if="summaryGenerationMessage" class="text-caption mt-1" :class="summaryGenerationError ? 'text-state-danger' : 'text-ink-muted'">{{ summaryGenerationMessage }}</p>
                </div>
                <div class="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                  <button v-if="form.body.trim() && form.body.trim() !== SESSION_SUMMARY_TEMPLATE.trim()" type="button" class="button-secondary w-full sm:w-auto justify-center" :disabled="generatingSummary || copySummaryState === 'copying' || !!sourceReview || summaryUnsafe || sourceSafetyChecking" @click="copySummary">{{ copySummaryLabel }}</button>
                  <button type="button" class="button-primary w-full sm:w-auto sm:min-w-[15rem] justify-center shrink-0" :disabled="generatingSummary || loadingEvidence || !anchorSessionId || Boolean(evidenceError) || guidanceDictation.busy.value" @click="generateSummary">{{ generatingSummary ? 'Generating…' : (hasExistingSummary ? 'Regenerate client summary' : 'Generate client summary') }}</button>
                </div>
              </div>
            </div>

            <SummaryRefinementPanel v-if="hasExistingSummary && !finalised" :body="form.body" :context-key="refinementContext"
              :busy="generatingSummary || saving" :disabled="!!sourceReview || summaryUnsafe || sourceSafetyChecking || loadingEvidence || !anchorSessionId || !!evidenceError || guidanceDictation.busy.value"
              :candidate="pendingSummary" :error="summaryGenerationError ? summaryGenerationMessage : ''"
              @generate="requestSummaryRefinement" @accept="acceptSummaryRevision" @discard="pendingSummary=null" />

            <div v-if="summarySources.length" class="mt-4 rounded-control border border-border-muted bg-surface-subtle p-3"><div class="flex flex-wrap items-center justify-between gap-2"><p class="text-caption font-semibold text-ink">Evidence used</p><button v-if="previousSummaryVersions.length" type="button" class="text-caption font-semibold text-action-link" @click="restorePreviousSummary">Restore previous version</button></div><ul class="mt-2 space-y-1 text-caption text-ink-secondary"><li v-for="source in summarySources" :key="source.id">{{ sourceLabel(source) }}</li></ul><p class="mt-2 text-caption text-ink-muted">Provenance is stored with this draft. Review the wording against these sources before finalising.</p></div>
          </section>
          <section class="rounded-panel border border-border bg-surface-elevated p-4 sm:p-5" aria-labelledby="document-details-heading"><div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h3 id="document-details-heading" class="text-body font-semibold text-ink">Document details</h3><p class="text-caption text-ink-muted mt-1">{{ isSessionSummary ? 'Write this for the client. Internal clinical notes are not included automatically.' : 'Keep the document generic or add clinical context when it is useful.' }}</p></div><span v-if="!isSessionSummary && selectedSourceIds.length" class="text-caption text-ink-muted">{{ selectedSourceIds.length }} clinical source{{ selectedSourceIds.length === 1 ? '' : 's' }} linked</span></div><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><label class="block xl:col-span-2"><span class="text-caption font-semibold">Title</span><input v-model="form.title" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Document title" /></label><label class="block"><span class="text-caption font-semibold">Document type</span><select v-model="form.documentType" :disabled="isSessionSummary" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface"><option value="other">General document</option><option value="session_summary">Session summary</option><option value="across_session_review">Across-session review</option><option value="clinical_summary">Clinical summary</option><option value="progress_report">Progress report</option><option value="care_letter">Therapy letter</option></select></label><label class="block"><span class="text-caption font-semibold">Recipient</span><input v-model="form.recipient" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label><label class="block md:col-span-2"><span class="text-caption font-semibold">Purpose</span><input v-model="form.purpose" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label><div class="grid grid-cols-2 gap-2 md:col-span-2"><label><span class="text-caption font-semibold">From <span class="font-normal text-ink-muted">(optional)</span></span><input v-model="form.periodStart" type="date" class="mt-1 w-full p-2 border border-border rounded-control bg-surface" /></label><label><span class="text-caption font-semibold">To <span class="font-normal text-ink-muted">(optional)</span></span><input v-model="form.periodEnd" type="date" class="mt-1 w-full p-2 border border-border rounded-control bg-surface" /></label><p v-if="isSessionSummary && evidenceWindow.length" class="col-span-2 text-caption text-ink-muted">Auto-filled from the selected evidence window. You can edit or clear either date.</p></div></div><div v-if="error" class="mt-4 p-3 rounded-control bg-state-danger/10 text-state-danger text-body-sm">{{ error }}</div></section>
          <article ref="composerDocumentCanvas" class="clinical-paper mx-auto bg-white text-ink shadow-lg" data-testid="clinical-document-canvas"><header class="clinical-letterhead"><div><strong>{{ identity.heading }}</strong><span v-if="identity.professionalTitle">{{ identity.professionalTitle }}</span></div><div class="text-right"><span v-for="line in identity.contactLines" :key="line">{{ line }}</span></div></header><div class="clinical-rule"></div><p class="clinical-eyebrow">{{ isAcrossSessionReview ? 'ACROSS-SESSION REVIEW' : isSessionSummary ? 'SESSION SUMMARY' : 'CONFIDENTIAL CLINICAL DOCUMENT' }}</p><h1 class="clinical-title">{{ form.title || (isSessionSummary ? 'Session summary' : 'Untitled document') }}</h1><dl class="clinical-meta"><div><dt>Client</dt><dd>{{ client.display_name }}</dd></div><div v-if="form.recipient"><dt>Recipient</dt><dd>{{ form.recipient }}</dd></div><div v-if="periodLabel"><dt>Period</dt><dd>{{ periodLabel }}</dd></div><div v-if="form.purpose"><dt>Purpose</dt><dd>{{ form.purpose }}</dd></div></dl><div v-if="isSessionSummary && generatingSummary" ref="composerGenerationProgress" tabindex="-1" class="summary-generation-placeholder scroll-mt-8" data-testid="summary-generation-placeholder" role="status" aria-live="polite">
  <div class="summary-generation-spinner" aria-hidden="true"></div>
  <p class="text-body font-semibold text-ink">Generating a new {{ summaryLensLabel }} summary</p>
  <p class="text-body-sm text-ink-secondary mt-2">{{ evidenceWindow.length ? `Reviewing ${evidenceWindow.length} session source${evidenceWindow.length === 1 ? '' : 's'}…` : 'Reviewing the selected session evidence…' }}</p>
  <p class="text-caption text-ink-muted mt-3">{{ hasExistingSummary ? 'Your current summary is being kept unchanged until the new draft is ready. If generation fails, it will return unchanged.' : 'The new draft will appear here when generation is complete.' }}</p>
</div>
<RichDocumentEditor
  v-else
  v-model="form.body"
  v-model:rich-content="form.richContent"
  :placeholder="isSessionSummary ? 'Generate a client summary above, then review and edit it here.' : 'Write the document here. Use Add from clinical notes when you want to bring completed session material into the draft.'"
/><footer class="clinical-footer"><span>{{ identity.footer }}</span><span>{{ isAcrossSessionReview ? 'Across-session review' : isSessionSummary ? 'Session summary' : 'Confidential clinical document' }}</span></footer></article>
        </div></div>
        <div v-if="isSessionSummary && !finalised && showComposerTop" class="fixed bottom-5 right-5 z-[80] pointer-events-none" data-testid="composer-back-to-top">
          <button type="button" class="button-secondary pointer-events-auto shadow-lg inline-flex items-center gap-2" @click="scrollComposerToTop" aria-label="Back to top of client summary">
            <ArrowUp class="w-4 h-4" aria-hidden="true" /> Back to top
          </button>
        </div>
        <aside v-if="!finalised && !isSessionSummary && sourcePanelOpen" class="absolute inset-y-0 right-0 z-20 w-full sm:w-[26rem] min-w-0 overflow-x-hidden bg-surface-elevated border-l border-border shadow-2xl flex flex-col" data-testid="clinical-source-panel"><div class="p-4 border-b border-border-muted"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="text-body font-semibold">Add from clinical notes</h3><p class="text-caption text-ink-muted mt-1">Completed clinical session notes only. Private reflections and supervision material are excluded.</p></div><button class="button-secondary shrink-0" type="button" @click="sourcePanelOpen = false">Done</button></div><input v-model="sourceQuery" type="search" class="mt-3 w-full min-w-0 p-2.5 border border-border rounded-control bg-surface text-body-sm" placeholder="Search session notes…" @input="resetSourceWindow" /></div><div class="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-2 space-y-1"><div v-if="!sources.length" class="p-3 text-body-sm text-ink-muted">No completed session notes are available.</div><div v-for="source in visibleSources" :key="source.id" class="min-w-0 overflow-hidden border border-border rounded-control bg-surface"><div class="flex items-center gap-2 p-2.5"><input v-model="selectedSourceIds" type="checkbox" :value="source.id"/><button class="min-w-0 flex-1 text-left" @click="toggleSourcePreview(source.id)"><strong class="block text-body-sm">{{ formatDate(source.occurredAt) }}</strong><span class="block text-caption text-ink-muted">Clinical session note · v{{ source.version }}</span></button><span v-if="addedSourceIds.includes(source.id)" class="text-caption text-state-success font-semibold">Added</span></div><div v-if="expandedSourceId === source.id" class="min-w-0 px-3 pb-3 pt-3 border-t border-border-muted text-body-sm text-ink-secondary whitespace-pre-wrap break-words">{{ source.notes || 'No note text' }}</div></div><div v-if="hasMoreSources" class="p-3 text-center"><button class="text-body-sm font-semibold text-action-link" @click="loadMoreSources">Load {{ nextSourceCount }} more</button></div></div><div class="p-3 border-t border-border-muted"><button class="button-primary w-full" :disabled="!addableSelectedSources.length" @click="appendSources">{{ addableSelectedSources.length ? `Add ${addableSelectedSources.length} selected note${addableSelectedSources.length === 1 ? '' : 's'} to document` : 'Select session notes to add' }}</button></div></aside>
      </section>
    </div>
  </teleport>
</template>
<script setup>
import SummaryRefinementPanel from './SummaryRefinementPanel.vue'
import { candidateMatches, summaryContextKey, summaryBodyToRichContent, SUMMARY_SECTION_GROUPS } from '../../lib/summaryAuthoring.js'
import SourceReviewDialog from './SourceReviewDialog.vue'
import { isUnusableSummary } from '../../lib/summarySafety.js'
import HelpLink from '../help/HelpLink.vue'
import RichDocumentEditor from '../documents/RichDocumentEditor.vue'
import WhisperMicButton from '../ui/WhisperMicButton.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { ArrowUp } from '@lucide/vue'
import { createClientDocumentDraft, downloadClientDocument, finaliseClientDocument, generateClientSessionSummary, listClientSummaryEvidence, listDocumentSourceSessions, saveClientDocumentDraft, checkSummarySourceSafety } from '../../lib/clientDocuments.js'
import { loadDocumentProfile, profileDisplay } from '../../lib/documentProfile.js'
import { appendDictation, useWhisperDictation } from '../../composables/useWhisperDictation.js'
const SESSION_SUMMARY_TEMPLATE = SUMMARY_SECTION_GROUPS.map(group=>group.heading).join('\n\n')
const props = defineProps({ client: { type: Object, required: true }, clientEmail: { type: String, default: '' }, document: { type: Object, default: null }, initialDocumentType: { type: String, default: 'other' } })
const emit = defineEmits(['close', 'saved', 'show-documents'])
const SOURCE_PAGE_SIZE = 8
const initialType = props.document?.documentType || props.initialDocumentType || 'other'
const isSessionSummary = computed(() => ['session_summary','across_session_review'].includes(form.documentType))
const isAcrossSessionReview = computed(() => form.documentType === 'across_session_review' || (form.documentType === 'session_summary' && summaryWindow.value !== 'current'))
const loading = ref(true), saving = ref(false), action = ref(''), error = ref(''), saveMessage = ref(props.document ? 'Saved' : 'Not saved yet'), sources = ref([]), selectedSourceIds = ref([]), addedSourceIds = ref([]), expandedSourceId = ref(null), sourceQuery = ref(''), visibleSourceCount = ref(SOURCE_PAGE_SIZE), currentDocument = ref(props.document), baseline = ref(''), profile = ref({}), sourcePanelOpen = ref(false)
const initialGeneration=props.document?.content?.summaryGeneration || props.document?.content?.clinicalIntelligence?.generation || null
const generatingSummary = ref(false), loadingEvidence = ref(false), evidenceError = ref(''), copySummaryState = ref('idle'), summaryLens = ref(initialGeneration?.lens || 'general'), summaryWindow = ref(initialGeneration?.window === 'recent' ? 'last_three' : initialGeneration?.window || (initialType === 'across_session_review' ? 'last_three' : 'current')), therapistGuidance = ref(''), summaryGenerationMessage = ref(''), summaryGenerationError = ref(false), summarySources = ref(props.document?.content?.clinicalIntelligence?.sources || props.document?.sourceManifest || []), summaryClaims = ref(props.document?.content?.clinicalIntelligence?.claims || []), summaryGeneration = ref(initialGeneration), previousSummaryVersions = ref(props.document?.content?.clinicalIntelligence?.history || []), lastGeneratedBody = ref(props.document?.content?.clinicalIntelligence?.lastGeneratedBody || ''), availableSummarySessions = ref([]), anchorSessionId = ref(null), evidenceDateAutofillArmed = ref(false)
const pendingSummary=ref(null)
const composerScrollContainer=ref(null),composerGenerationProgress=ref(null),composerDocumentCanvas=ref(null),showComposerTop=ref(false)
function handleComposerScroll(event){showComposerTop.value=(event?.target?.scrollTop||0)>280}
function scrollComposerToTop(){composerScrollContainer.value?.scrollTo({top:0,behavior:composerReducedMotion()?'auto':'smooth'})}
function composerReducedMotion(){return typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
async function scrollToComposerTarget(target){
  await nextTick()
  const element=target.value
  if(!element?.isConnected)return
  element.scrollIntoView?.({behavior:composerReducedMotion()?'auto':'smooth',block:'center'})
  element.focus?.({preventScroll:true})
}
const refinementContext=computed(()=>summaryContextKey([props.client.id,currentDocument.value?.id,summaryLens.value,summaryWindow.value,anchorSessionId.value,therapistGuidance.value]))
watch(summaryWindow,(next,previous)=>{if(!currentDocument.value && isSessionSummary.value)form.documentType=next==='current'?'session_summary':'across_session_review';else if(currentDocument.value && isSessionSummary.value && (next==='current')!==(previous==='current'))summaryWindow.value=previous})
watch(refinementContext,()=>{pendingSummary.value=null})
const guidanceDictation=useWhisperDictation({onText:text=>{therapistGuidance.value=appendDictation(therapistGuidance.value,text,'\n')}})
const initialBody = props.document?.content?.body || (['session_summary','across_session_review'].includes(initialType) ? SESSION_SUMMARY_TEMPLATE : '')
const initialRichContent = props.document?.content?.richContent || (['session_summary','across_session_review'].includes(initialType) && initialBody.trim() && initialBody.trim() !== SESSION_SUMMARY_TEMPLATE.trim() ? summaryBodyToRichContent(initialBody) : null)
const form = reactive({ title: props.document?.title || (initialType === 'across_session_review' ? 'Across-session review' : initialType === 'session_summary' ? 'Session summary' : ''), documentType: initialType, recipient: props.document?.recipient || '', purpose: props.document?.purpose || (initialType === 'across_session_review' ? 'A review across sessions' : initialType === 'session_summary' ? 'A client-facing summary of the session' : ''), periodStart: props.document?.periodStart || '', periodEnd: props.document?.periodEnd || '', body: initialBody, richContent: initialRichContent })
const sourceReview=ref(null),reviewTranscriptId=ref(''),confirmedSource=ref(null)
const sourceSafetyChecking=ref(Boolean(props.document?.id && ['session_summary','across_session_review'].includes(initialType)))
const summaryUnsafe=computed(()=>isUnusableSummary({body:form.body,summaryGeneration:summaryGeneration.value}))
const reviewSources=computed(()=>sourceReview.value?.sources || currentDocument.value?.sourceManifest?.filter(item=>item.transcriptId) || [])
const confirmedEncounterUrl=computed(()=>{
  const source=confirmedSource.value
  return source?.clientId&&source?.sessionId&&source?.id?`/clients/${encodeURIComponent(source.clientId)}/sessions/${encodeURIComponent(source.sessionId)}?view=summary&transcriptId=${encodeURIComponent(source.id)}`:''
})
function handleSourceReviewResolved(result){
  if(result.action==='reassign'){
    reviewTranscriptId.value=''
    confirmedSource.value=result
    sourceReview.value={message:'This encounter was moved to the correct client. The existing summary cannot be reused as evidence; open the corrected encounter and regenerate it.',sources:[]}
    pendingSummary.value=null
    return
  }
  if(result.action==='confirm'){
    confirmedSource.value=result;reviewTranscriptId.value=''
    sourceReview.value={resolved:true,message:'Source review saved. Regenerate this encounter summary before using it in a longer-term summary. The earlier draft is not ready to share.',sources:[]}
  }else{sourceReview.value={message:'Open a reviewed conversation below to prepare its session summary.',sources:[]}}
}
onMounted(async()=>{
  if(!currentDocument.value?.id||!isSessionSummary.value){sourceSafetyChecking.value=false;return}
  try{const safety=await checkSummarySourceSafety(currentDocument.value.id);sourceReview.value=safety.safe?null:safety.review}
  catch{sourceReview.value={message:'Source safety could not be verified. Review before copying or sharing.',sources:[]}}
  finally{sourceSafetyChecking.value=false}
})
watch(()=>form.body,()=>{if(summaryGeneration.value?.reviewedAt && currentDocument.value?.status!=='completed')summaryGeneration.value={...summaryGeneration.value,reviewedAt:null}})
const identity = computed(() => profileDisplay(profile.value)), finalised = computed(() => currentDocument.value?.status === 'completed')
const hasExistingSummary = computed(() => isSessionSummary.value && Boolean(form.body.trim()) && form.body.trim() !== SESSION_SUMMARY_TEMPLATE.trim())
const summaryLensLabel = computed(() => ({ general:'General', integrative:'Integrative', gentle_cbt:'CBT', internal_family_systems:'Internal Family Systems (IFS)', transactional_analysis:'Transactional Analysis' })[summaryLens.value] || 'General')
const copySummaryLabel = computed(() => copySummaryState.value === 'copied' ? 'Copied ✓' : copySummaryState.value === 'copying' ? 'Copying…' : copySummaryState.value === 'failed' ? 'Copy failed' : 'Copy summary')
let copySummaryResetTimer = 0
const summaryWindowLabel = computed(() => ({ current:'This session', last_three:'Last 3 sessions', last_five:'Last 5 sessions', history:'Entire history' })[summaryWindow.value] || 'Selected sessions')
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
const evidenceWindow=computed(()=>{const index=availableSummarySessions.value.findIndex(session=>session.sessionId===anchorSessionId.value);if(index<0)return[];const count=summaryWindow.value==='current'?1:summaryWindow.value==='last_three'?3:summaryWindow.value==='last_five'?5:null;return count===null?availableSummarySessions.value.slice(index):availableSummarySessions.value.slice(index,index+count)})
function dateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function syncPeriodFromEvidence() {
  if (!isSessionSummary.value || !evidenceWindow.value.length) return
  form.periodStart = dateInputValue(evidenceWindow.value.at(-1)?.occurredAt)
  form.periodEnd = dateInputValue(evidenceWindow.value[0]?.occurredAt)
}
watch([summaryWindow, anchorSessionId], () => {
  if (evidenceDateAutofillArmed.value) syncPeriodFromEvidence()
})
function changes() { const clinicalIntelligence=isSessionSummary.value?{generation:summaryGeneration.value,claims:summaryClaims.value,sources:summarySources.value,history:previousSummaryVersions.value.slice(-5),lastGeneratedBody:lastGeneratedBody.value}:undefined; return { title: form.title, documentType: form.documentType, recipient: form.recipient, purpose: form.purpose, periodStart: form.periodStart || null, periodEnd: form.periodEnd || null, content: { body: form.body, richContent: form.richContent,...(clinicalIntelligence?{clinicalIntelligence,summaryGeneration:summaryGeneration.value}:{}) }, sourceManifest: isSessionSummary.value ? [...summarySources.value,{kind:'ai_generation',...(summaryGeneration.value||{})}] : selectedSources.value.map(s => ({ kind: 'session', id: s.id, version: s.version, occurredAt: s.occurredAt })) } }
function snapshot() { return JSON.stringify(changes()) }
const dirty = computed(() => !finalised.value && baseline.value !== snapshot())
onMounted(() => { loadWorkspace() })
onBeforeUnmount(() => window.clearTimeout(copySummaryResetTimer))
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
      loadingEvidence.value = true
      evidenceError.value = ''
      try {
        availableSummarySessions.value = await listClientSummaryEvidence(props.client.id)
        anchorSessionId.value = summaryGeneration.value?.anchorSessionId || props.document?.sourceManifest?.find(item=>item.sessionId)?.sessionId || availableSummarySessions.value[0]?.sessionId || null
        if (!props.document?.periodStart && !props.document?.periodEnd) syncPeriodFromEvidence()
      } catch (e) {
        if (e.code === 'NO_REVIEWED_SESSION_CAPTURE' || e.code === 'NO_CLIENT_SUMMARY_EVIDENCE') {
          availableSummarySessions.value = []
        } else {
          evidenceError.value = e.message || 'Failed to load available sessions for anchor selection.'
        }
      } finally {
        loadingEvidence.value = false
        evidenceDateAutofillArmed.value = true
      }
    }
    baseline.value = snapshot()
  } catch (e) {
    error.value = e.message || 'Could not load document workspace.'
  } finally {
    loading.value = false
  }
}
async function requestSummaryRefinement(payload){
  if(payload.baseBody!==form.body || payload.contextKey!==refinementContext.value)return
  await generateSummary(payload)
}
async function generateSummary(payload=null){
  if(generatingSummary.value || saving.value || sourceSafetyChecking.value || finalised.value || loadingEvidence.value || !anchorSessionId.value || evidenceError.value || guidanceDictation.busy.value)return
  const refinement=payload&&typeof payload.instruction==='string'?payload:null
  const baseBody=form.body,contextKey=refinementContext.value
  generatingSummary.value=true;summaryGenerationError.value=false;summaryGenerationMessage.value='Preparing an editable summary...';pendingSummary.value=null
  await scrollToComposerTarget(composerGenerationProgress)
  try{
    const result=await generateClientSessionSummary({clientId:props.client.id,lens:summaryLens.value,window:summaryWindow.value,therapistGuidance:therapistGuidance.value,
      refinementRequest:refinement?.instruction||'',previousDraft:refinement?baseBody.slice(0,10000):'',summaryOptions:refinement?.summaryOptions||{},anchorSessionId:anchorSessionId.value})
    if(contextKey!==refinementContext.value || baseBody!==form.body)throw new Error('The draft or evidence selection changed. Prepare a new preview; nothing has been replaced.')
    if(hasExistingSummary.value){pendingSummary.value={result,baseBody,contextKey,instruction:refinement?.instruction||''};summaryGenerationMessage.value='Revised draft ready to preview. Your current draft is unchanged.';return}
    installSummaryResult(result,refinement?.instruction||'')
    await scrollToComposerTarget(composerDocumentCanvas)
  }catch(error){
    if(error.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=error.review||{message:error.message,sources:[]};summaryGenerationMessage.value='Source review is required. The existing draft is unchanged.';return}
    summaryGenerationError.value=true;summaryGenerationMessage.value=(error.message||'Generation failed.')+' The current draft is unchanged.'
  }finally{generatingSummary.value=false}
}
function acceptSummaryRevision(){
  if(generatingSummary.value||saving.value||finalised.value||sourceReview.value||sourceSafetyChecking.value)return
  const candidate=pendingSummary.value
  if(!candidateMatches(candidate,form.body,refinementContext.value)){pendingSummary.value=null;summaryGenerationError.value=true;summaryGenerationMessage.value='The current draft changed. Prepare a new preview.';return}
  installSummaryResult(candidate.result,candidate.instruction);pendingSummary.value=null
}
function installSummaryResult(result,instruction=''){
  if(!currentDocument.value && isSessionSummary.value)form.documentType=summaryWindow.value==='current'?'session_summary':'across_session_review'
  if(currentDocument.value && isSessionSummary.value && (summaryWindow.value==='current')===isAcrossSessionReview.value)throw new Error('Create a separate document to change between a session summary and an across-session review.')
  if(hasExistingSummary.value)previousSummaryVersions.value=[...previousSummaryVersions.value,{body:form.body,richContent:form.richContent,savedAt:new Date().toISOString(),generation:summaryGeneration.value,sources:summarySources.value,claims:summaryClaims.value,lastGeneratedBody:lastGeneratedBody.value}].slice(-5)
  form.body=result.draft.body;form.richContent=summaryBodyToRichContent(result.draft.body);lastGeneratedBody.value=result.draft.body
  summarySources.value=result.sources||[];summaryClaims.value=result.claims||[]
  summaryGeneration.value={outcome:'ready',id:result.generationId,generatedAt:result.generatedAt,promptVersion:result.promptVersion,model:result.model,lens:result.lens,window:result.window,
    anchorSessionId:anchorSessionId.value,sessionCount:result.sessionCount||evidenceWindow.value.length,usage:result.usage,sample:Boolean(result.sample),refinementRequest:instruction||undefined,summaryOptions:result.summaryOptions||{},
    resourceSelection:result.resourceSelection||null,qualityReview:result.qualityReview||null,reviewRequired:true,reviewedAt:null}
  sourceReview.value=null;summaryGenerationMessage.value=result.sample?'Synthetic example prepared. No AI allowance used.':'Draft ready. Review and edit before saving or finalising.'
}
async function copySummary(){
  if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return;
  if(currentDocument.value?.id){try{const safety=await checkSummarySourceSafety(currentDocument.value.id);if(!safety.safe){sourceReview.value=safety.review;return}}catch{sourceReview.value={message:'Source safety could not be verified. Review before copying.',sources:[]};return}}
  const value=String(form.body||'').trim()
  if(!value)return
  copySummaryState.value='copying'
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(value)
    }else{
      const area=window.document.createElement('textarea')
      area.value=value
      area.setAttribute('readonly','')
      area.style.position='fixed'
      area.style.opacity='0'
      window.document.body.appendChild(area)
      area.select()
      const copied=window.document.execCommand('copy')
      area.remove()
      if(!copied)throw new Error('Copy command was unavailable')
    }
    copySummaryState.value='copied'
  }catch{
    copySummaryState.value='failed'
  }
  window.clearTimeout(copySummaryResetTimer)
  copySummaryResetTimer=window.setTimeout(()=>{copySummaryState.value='idle'},2200)
}
function restorePreviousSummary(){const previous=previousSummaryVersions.value.at(-1);if(!previous)return;const current={body:form.body,richContent:form.richContent,savedAt:new Date().toISOString(),generation:summaryGeneration.value,sources:summarySources.value,claims:summaryClaims.value,lastGeneratedBody:lastGeneratedBody.value};form.body=previous.body;form.richContent=previous.richContent||null;summaryGeneration.value=previous.generation||null;summarySources.value=previous.sources||[];summaryClaims.value=previous.claims||[];lastGeneratedBody.value=previous.lastGeneratedBody||previous.body;previousSummaryVersions.value=[...previousSummaryVersions.value.slice(0,-1),current].slice(-5);summaryGenerationMessage.value='Previous version restored. Review it before saving.'}
function sourceLabel(source){if(source.kind==='session_capture')return `Reviewed Session Capture · ${formatDate(source.occurredAt)}`;if(source.kind==='session_summary')return `${source.status==='completed'?'Finalised':'Existing'} session summary · ${formatDate(source.occurredAt)}`;if(source.kind==='accepted_care')return `Accepted Therapy Focus · ${String(source.careKind||'context').replaceAll('_',' ')}`;return 'Therapist-authored guidance'}
function appendSources() { if (isSessionSummary.value) return; const pending = addableSelectedSources.value; const text = pending.map(s => `Session ${formatDate(s.occurredAt)}\n${s.notes || ''}`.trim()).join('\n\n'); if (text) { form.body = [form.body.trim(), text].filter(Boolean).join('\n\n'); form.richContent = null; } addedSourceIds.value = [...new Set([...addedSourceIds.value, ...pending.map(s => s.id)])] }
function toggleSourcePreview(id) { expandedSourceId.value = expandedSourceId.value === id ? null : id } function loadMoreSources() { visibleSourceCount.value += SOURCE_PAGE_SIZE } function resetSourceWindow() { visibleSourceCount.value = SOURCE_PAGE_SIZE; expandedSourceId.value = null }
async function persistDraft() { currentDocument.value = currentDocument.value ? await saveClientDocumentDraft(currentDocument.value, changes()) : await createClientDocumentDraft({ client: props.client, ...changes() }); baseline.value = snapshot(); saveMessage.value = `Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute:'2-digit' })} to Client Documents`; emit('saved', currentDocument.value); return currentDocument.value }
async function saveDraft() { if (saving.value) return; saving.value = true; action.value = 'save'; error.value = ''; try { await persistDraft() } catch (e) { error.value = e.message || 'Could not save this draft.' } finally { saving.value = false; action.value = '' } }
async function finaliseDocument() { if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return; if (saving.value || !form.body.trim()) return; const label = isSessionSummary.value ? 'session summary' : 'clinical document'; if (!window.confirm(`Finalise this ${label}? This version will become read-only.`)) return; saving.value = true; action.value = 'finalise'; error.value = ''; try { if(isSessionSummary.value && summaryGeneration.value?.reviewRequired)summaryGeneration.value={...summaryGeneration.value,reviewedAt:new Date().toISOString()}; const draft = await persistDraft(); currentDocument.value = await finaliseClientDocument(draft); baseline.value = snapshot(); emit('saved', currentDocument.value) } catch (e) { error.value = e.message || 'Could not finalise this document.' } finally { saving.value = false; action.value = '' } }
async function downloadFinalised() { if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return; try { await downloadClientDocument(currentDocument.value) } catch (e) { error.value = e.message } } function requestClose() { if (saving.value) return; if (!finalised.value && dirty.value && !window.confirm('You have unsaved changes. Close without saving?')) return; emit('close') }
function formatDate(v) { if (!v) return ''; const d = new Date(v.length === 10 ? `${v}T00:00:00` : v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) } function formatDateTime(v) { return v ? new Date(v).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' }) : '' }
</script>
<style scoped>
.summary-generation-placeholder{min-height:360px;border:1px dashed #c9d4d8;border-radius:16px;background:#f7faf9;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px}.summary-generation-spinner{width:28px;height:28px;border:3px solid #d7e0e2;border-top-color:#526f68;border-radius:9999px;animation:summary-spin .8s linear infinite;margin-bottom:18px}@keyframes summary-spin{to{transform:rotate(360deg)}}
.clinical-paper{width:min(210mm,100%);min-height:297mm;padding:18mm 19mm;display:flex;flex-direction:column;font-family:'Noto Sans',Arial,sans-serif;background:repeating-linear-gradient(to bottom,#fff 0,#fff 297mm,#e7ecee 297mm,#e7ecee 305mm);background-size:100% 305mm;border-left:1px solid #d9e0e3;border-right:1px solid #d9e0e3;box-shadow:0 8px 28px rgba(30,48,55,.12)}.clinical-letterhead{display:flex;justify-content:space-between;gap:24px;font-size:10px;color:#52616b}.clinical-letterhead strong{display:block;font-size:13px;color:#17242b}.clinical-letterhead span{display:block;margin-top:2px}.clinical-rule{height:1px;background:#cfd8dc;margin:14px 0 36px}.clinical-eyebrow{font-size:9px;font-weight:700;letter-spacing:.16em;color:#657780;margin-bottom:10px}.clinical-title{font-size:28px;line-height:1.2;font-weight:600;color:#17242b;margin:0 0 22px}.clinical-meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 0;border-top:1px solid #e2e8ea;border-bottom:1px solid #e2e8ea;margin-bottom:24px}.clinical-meta dt{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#718087}.clinical-meta dd{font-size:11px;margin:3px 0 0}.clinical-footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8ea;display:flex;justify-content:space-between;gap:20px;font-size:8.5px;color:#718087}
</style>
