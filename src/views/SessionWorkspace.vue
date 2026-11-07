<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="cameFromInbox" class="px-inline-lg py-stack-sm border-b border-border bg-surface">
      <RouterLink :to="inboxReturnDestination" class="text-body-sm font-medium text-action-link hover:underline">Back to Transcript Inbox</RouterLink>
    </div>
    <div v-if="cameFromClientTranscripts" class="px-inline-lg py-stack-sm border-b border-border bg-surface">
      <RouterLink :to="{ name: 'ClientWorkspace', params: { clientId: route.params.clientId }, query: { tab: 'Transcripts' } }" class="text-body-sm font-medium text-action-link hover:underline">Back to client transcripts</RouterLink>
    </div>
    <div v-if="loading" class="flex-1 flex items-center justify-center"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p>Loading session…</p></div></div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg"><div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center"><h2 class="text-h2 font-semibold text-state-danger mb-2">Error</h2><p class="text-ink-secondary mb-6">{{ error }}</p><button @click="loadSession" class="button-primary">Try Again</button></div></div>
    <template v-else-if="session">
      <SessionWorkspaceHeader :session="workspaceSession" />
      <div class="flex justify-end px-inline-lg"><HelpLink topic="session-material" label="How summaries and Clinical Records work" /></div>

      <div class="border-b border-border bg-surface px-inline-lg">
        <div class="max-w-4xl mx-auto flex gap-2 py-2" role="tablist" aria-label="Session workspace views">
          <button type="button" role="tab" :aria-selected="activeView === 'summary'" class="px-4 py-2 rounded-control text-body-sm font-medium" :class="activeView === 'summary' ? 'bg-state-selected text-action-link' : 'text-ink-secondary hover:bg-surface-subtle'" @click="activeView = 'summary'">Session Summary</button>
          <button type="button" role="tab" :aria-selected="activeView === 'clinical'" class="px-4 py-2 rounded-control text-body-sm font-medium" :class="activeView === 'clinical' ? 'bg-state-selected text-action-link' : 'text-ink-secondary hover:bg-surface-subtle'" @click="activeView = 'clinical'">Clinical Record</button>
        </div>
      </div>
      
      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
        <div class="max-w-4xl mx-auto space-y-12">
          <template v-if="activeView === 'clinical'">
            <div v-if="session.status === 'completed'" class="space-y-6">
              <div data-testid="session-completion-handoff" class="rounded-panel border border-state-success/20 bg-state-success-surface p-6">
                <h2 class="text-h2 font-semibold text-ink">Clinical record approved and locked.</h2>
                <p class="mt-2 text-body-sm text-ink-secondary">The approved record is read-only. Any correction must be added as an amendment.</p>
                <div class="mt-4 flex flex-wrap gap-3">
                  <RouterLink :to="`/clients/${session.clientId}`" class="button-secondary">Return to client</RouterLink>
                  <RouterLink :to="`/schedule?clientId=${session.clientId}`" class="button-primary">Schedule next appointment</RouterLink>
                </div>
              </div>
              <CompletedClinicalRecord :session="session" :therapistName="therapistName" />
            </div>
            <ClinicalSummaryTab v-else :session="session" :therapistName="therapistName" @update:session="handleSessionUpdate" />
          </template>

          <template v-else>
            <section v-if="sourceReview || summaryUnsafe" ref="sourceReviewNotice" tabindex="-1" class="rounded-panel border border-border bg-surface-elevated p-5 space-y-3" data-testid="source-review-notice">
              <h2 class="text-h3 font-semibold">{{ sourceReview?.resolved ? 'Source review saved' : 'Source needs review' }}</h2>
              <p>{{ sourceReview?.message || 'The earlier output is a source-review notice, not a usable summary. Review its original source and regenerate.' }}</p>
              <p class="text-body-sm">Your previous draft and imported Zoom note have been preserved. No new summary was saved by this review.</p>
              <p v-if="sourceReviewOpenError" role="alert" class="text-body-sm text-state-danger">{{ sourceReviewOpenError }}</p>
              <div v-if="!sourceReview?.resolved" class="flex flex-wrap gap-2">
                <button v-for="(item,index) in reviewableSources" :key="item.transcriptId" type="button" class="button-primary" :aria-expanded="reviewTranscriptId === item.transcriptId" aria-controls="original-source-review" @click="openSourceReview(item,$event)">Review original source {{ index+1 }}</button>
                <button v-if="!reviewableSources.length && transcript?.id" type="button" class="button-primary" :aria-expanded="reviewTranscriptId === transcript.id" aria-controls="original-source-review" @click="openSourceReview(null,$event)">Review original source</button>
                <p v-if="!reviewableSources.length && !transcript?.id" class="text-body-sm text-state-danger">No linked original source is available in this encounter. Check the transcript assignment in Transcript Inbox.</p>
              </div>
            </section>
            <div v-if="reviewTranscriptId" id="original-source-review" ref="sourceReviewRegion" data-testid="source-review-region" tabindex="-1" role="region" aria-label="Original transcript source review" class="scroll-mt-4">
              <SourceReviewPanel :transcript-id="reviewTranscriptId" @close="closeSourceReview" @resolved="sourceReviewResolved" />
            </div>
            <section class="space-y-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 class="font-serif text-h2 text-ink">Session summary</h2>
                  <p v-if="summaryDocument?.id" class="mt-1 text-caption text-ink-muted">{{ summaryDocument.status === 'completed' ? 'Finalised in this client’s Documents.' : 'Saved in this client’s Documents.' }}</p>
                  <div v-if="summaryDocument?.content?.body && summaryDocument.status !== 'completed'" class="mt-2 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                    <span>{{ generatedSummaryLabel }}</span>
                    <button type="button" class="button-secondary text-body-sm" @click="showSummaryOptions = !showSummaryOptions">{{ showSummaryOptions ? 'Hide lens options' : 'Change lens / options' }}</button>
                  </div>
                </div>
                <div class="flex flex-wrap items-center justify-end gap-3">
                  <span v-if="copySuccess" class="text-body-sm text-state-success" role="status">Copied!</span>
                  <template v-if="summaryDocument?.content?.body && !isGenerating && summaryDocument.status !== 'completed'">
                    <button v-if="!isEditingSummary" @click="isEditingSummary = true" class="text-body-sm font-medium text-action-link hover:underline">Edit</button>
                    <button v-else @click="isEditingSummary = false" class="text-body-sm font-medium text-action-link hover:underline">Done reading</button>
                  </template>
                  <button v-if="transcript" type="button" @click="askHeliosAboutSession" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm">Ask Helios</button>
                  <button v-if="summaryDocument?.content?.body && summaryDocument.status !== 'completed'" @click="generateSummary" :disabled="isGenerating || transcriptLoading || !!transcriptError || !transcript" class="text-body-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50">Regenerate</button>
                  <RouterLink v-if="summaryDocument?.id" :to="{ name: 'ClientWorkspace', params: { clientId: session.clientId }, query: { document: summaryDocument.id } }" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm">Open in Client Documents</RouterLink>
                  <button @click="copySummary" :disabled="!summaryDocument?.content?.body || !!sourceReview || summaryUnsafe" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm">Copy summary</button>
                </div>
              </div>

              <div v-if="transcriptError" class="rounded-panel border border-state-danger/20 bg-state-danger-surface p-4" role="alert" data-testid="session-source-error">
                <p class="text-body-sm text-state-danger">{{ transcriptError }}</p>
                <button type="button" class="button-secondary mt-3" :disabled="transcriptLoading" @click="loadTranscript()">Retry source</button>
              </div>
              <p v-else-if="transcriptLoading" role="status" class="text-body-sm text-ink-muted">Loading the assigned source...</p>

              <div
                v-if="transcript && !isGenerating && summaryDocument?.status !== 'completed' && (!summaryDocument?.content?.body || showSummaryOptions || summaryUnsafe)"
                class="rounded-panel border border-border bg-surface-elevated p-5 shadow-sm"
                data-testid="session-summary-options"
              >
                <div class="flex flex-col gap-1">
                  <h3 class="text-h3 font-semibold text-ink">Prepare session summary</h3>
                  <p class="text-body-sm text-ink-secondary">Choose how Helios should frame this summary. Your preferred approach is remembered for this client.</p>
                </div>

                <p v-if="summaryDocument?.content?.body" class="mt-3 text-body-sm text-ink-muted">Your existing draft stays unchanged until you choose Regenerate summary.</p>
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label class="block">
                    <span class="text-caption font-semibold text-ink">Summary approach</span>
                    <select v-model="summaryLens" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" @change="savePreferredSummaryLens">
                      <option value="general">General</option>
                      <option value="integrative">Integrative</option>
                      <option value="gentle_cbt">CBT</option>
                      <option value="internal_family_systems">Internal Family Systems (IFS)</option>
                      <option value="transactional_analysis">Transactional Analysis</option>
                    </select>
                  </label>

                  <label class="block">
                    <span class="text-caption font-semibold text-ink">Evidence</span>
                    <select v-model="summaryWindow" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface">
                      <option value="current">This session</option>
                      <option value="recent">Recent sessions</option>
                    </select>
                  </label>
                </div>

                <div class="mt-4">
                  <button type="button" class="text-body-sm font-semibold text-action-link hover:underline" @click="showSummaryGuidance = !showSummaryGuidance">
                    {{ showSummaryGuidance ? 'Hide emphasis or instruction' : 'Add emphasis or instruction' }}
                  </button>
                  <label v-if="showSummaryGuidance" class="block mt-2">
                    <span class="sr-only">Optional emphasis or instruction for Helios</span>
                    <textarea
                      v-model="therapistGuidance"
                      rows="3"
                      maxlength="6000"
                      class="w-full p-3 border border-border rounded-control bg-surface text-body-sm"
                      placeholder="Optional: add an observation, correction, emphasis or context for this summary."
                    ></textarea>
                  </label>
                </div>

                <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p class="text-caption text-ink-muted">{{ summaryWindow === 'recent' ? 'Uses this encounter plus up to two previous available transcript-backed sessions.' : 'Uses only the transcript linked to this encounter.' }}</p>
                  <button @click="generateSummary" :disabled="isGenerating || transcriptLoading || !!transcriptError || !transcript" class="button-primary py-stack-xs px-inline-md">
                    {{ summaryDocument?.content?.body ? 'Regenerate summary' : 'Generate summary' }}
                  </button>
                </div>
                <p v-if="summaryPreferenceError" class="mt-2 text-caption text-state-danger" role="alert">{{ summaryPreferenceError }}</p>
              </div>

              <p v-if="summaryDocument?.status === 'completed' && prepareRequested" class="rounded-panel border border-border p-4 text-body-sm" role="status">This summary is finalised and read-only. Opening Clinical Workspace does not change or regenerate it.</p>
              <div class="relative min-h-[12rem]">
                <div v-if="isGenerating" role="status" class="py-24 text-center text-ink-muted bg-surface rounded-panel border border-dashed border-border flex flex-col items-center gap-3 shadow-sm">
                  <span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
                  <p class="type-body-medium">Preparing session summary…</p>
                  <p class="text-body-sm">This may take a few minutes. Please keep this page open.</p>
                </div>
                <div v-else-if="generationError && !summaryDocument" class="py-12 px-6 text-center bg-state-danger-surface rounded-panel border border-state-danger/20 shadow-sm">
                  <p class="text-state-danger text-body-sm mb-4">{{ generationError }}</p>
                  <button @click="generateSummary" class="button-primary py-stack-xs px-inline-md text-body-sm">Retry</button>
                </div>
                <template v-else-if="summaryDocument && !summaryUnsafe">
                  <div v-if="generationError" class="mb-4 py-4 px-5 text-center bg-state-danger-surface rounded-panel border border-state-danger/20 shadow-sm" role="alert">
                    <p class="text-state-danger text-body-sm">Generation failed — previous summary unchanged. {{ generationError }}</p>
                    <button @click="generateSummary" class="button-primary mt-3 py-stack-xs px-inline-md text-body-sm">Retry</button>
                  </div>
                  <SessionSummaryDocument v-if="!isEditingSummary" :body="summaryDocument.content.body" :clientName="client?.name" :date="workspaceSession.date" />
                  <div v-else class="bg-surface rounded-panel border border-border p-6 shadow-sm animate-expandIn">
                    <textarea v-model="summaryDocument.content.body" class="w-full min-h-[30rem] p-6 border border-border rounded-control bg-surface-subtle type-body-long focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-y" placeholder="No session summary yet." @input="handleSummaryInput"></textarea>
                    <p v-if="summarySaveError" class="mt-3 text-body-sm text-state-danger" role="alert">{{ summarySaveError }}</p>
                    <div v-if="summaryDocument.sourceManifest?.length" class="mt-4 flex items-center justify-end">
                      <span class="type-metadata text-ink-muted">{{ generatedSummaryLabel }}</span>
                    </div>
                  </div>
                </template>
                <div v-else class="py-24 text-center text-ink-muted bg-surface rounded-panel border border-dashed border-border shadow-sm">
                  <div v-if="transcript" class="flex flex-col items-center gap-2">
                    <p class="type-body-medium">No session summary yet.</p>
                    <p class="text-body-sm">Choose the summary approach above, then generate when ready.</p>
                  </div>
                  <p v-else class="type-body-medium">No session transcript or Zoom summary is available yet.</p>
                </div>
              </div>
            </section>

            <div
              v-if="transcript?.requestedLens === 'cbt'"
              class="rounded-panel border border-border bg-surface-subtle p-4"
            >
              <p class="text-caption font-medium uppercase tracking-wider text-action-link">Transcript triage request</p>
              <h3 class="mt-1 text-body font-semibold text-ink">CBT reflection requested</h3>
              <p class="mt-2 text-body-sm text-ink-muted">This request was saved during transcript review. Nothing is generated or saved to Therapy Focus until you choose to prepare suggestions and then review them.</p>
              <button
                type="button"
                class="button-primary mt-4"
                :disabled="preparingCbtCare"
                @click="prepareCbtCareSuggestions"
              >
                {{ preparingCbtCare ? 'Preparing…' : 'Prepare CBT Therapy Focus suggestions' }}
              </button>
              <p v-if="cbtCareError" class="mt-2 text-body-sm text-state-danger" role="alert">{{ cbtCareError }}</p>
            </div>

            <div class="space-y-4">
              <section class="rounded-panel border border-border bg-surface overflow-hidden">
                <button @click="showTranscript = !showTranscript" class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors" :aria-expanded="showTranscript">
                  <span class="text-body font-semibold text-ink">View transcript</span>
                  <span class="text-ink-muted transition-transform duration-200" :class="{ 'rotate-180': showTranscript }">▼</span>
                </button>
                <div v-if="showTranscript" class="border-t border-border p-6 bg-surface-subtle">
                  <div v-if="transcriptLoading" class="flex items-center justify-center p-8"><span class="w-6 h-6 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span></div>
                  <div v-else-if="transcriptError" class="text-state-danger text-body-sm p-4 text-center">{{ transcriptError }}</div>
                  <div v-else-if="!transcript" class="text-ink-muted text-body-sm p-8 text-center">Linked transcript is not available yet.</div>
                  <pre v-else class="whitespace-pre-wrap break-words font-mono text-body-sm leading-relaxed text-ink-secondary max-h-[36rem] overflow-auto">{{ transcript.text }}</pre>
                </div>
              </section>

              <section class="rounded-panel border border-border bg-surface overflow-hidden">
                <button @click="showReflection = !showReflection" class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors" :aria-expanded="showReflection">
                  <span class="text-body font-semibold text-ink">Therapist reflection</span>
                  <span class="text-ink-muted transition-transform duration-200" :class="{ 'rotate-180': showReflection }">▼</span>
                </button>
                <div v-if="showReflection" class="border-t border-border p-6 bg-surface-subtle">
                  <ReflectionTab :clientId="session.clientId" :sessionId="session.id" />
                </div>
              </section>
            </div>

            <div class="pt-8 border-t border-border flex justify-center">
              <RouterLink :to="`/clients/${session.clientId}`" class="text-body-sm font-medium text-action-link hover:underline">Return to client</RouterLink>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import HelpLink from '../components/help/HelpLink.vue'
import SourceReviewPanel from '../components/workspace/SourceReviewPanel.vue';
import { isUnusableSummary } from '../lib/summarySafety.js';
import { ref, onMounted, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/sessions.js';
import { getClient, updateClientSummaryPreference } from '../lib/clients.js';
import { findSessionSummary, createClientDocumentDraft, saveClientDocumentDraft, generateSessionSummary, checkSummarySourceSafety } from '../lib/clientDocuments.js';
import { authenticatedFetch } from '../lib/api.js';
import SessionWorkspaceHeader from '../components/workspace/SessionWorkspaceHeader.vue';
import ReflectionTab from '../components/workspace/ReflectionTab.vue';
import SessionSummaryDocument from '../components/workspace/SessionSummaryDocument.vue';
import ClinicalSummaryTab from '../components/workspace/ClinicalSummaryTab.vue';
import CompletedClinicalRecord from '../components/workspace/CompletedClinicalRecord.vue';
import { useAskHelios } from '../composables/useAskHelios.js';

const route = useRoute();
const cameFromInbox = computed(() => route.query.from === 'transcript-inbox');
const cameFromClientTranscripts = computed(() => route.query.from === 'client-transcripts');
const prepareRequested = computed(() => route.query.prepare === '1');
const inboxReturnDestination = computed(() => ({ name: 'Transcripts', query: typeof route.query.inboxReturn === 'string' ? { resume: route.query.inboxReturn } : {} }));
const router = useRouter();
const { openClinicalContext } = useAskHelios();
const session = ref(null), client = ref(null), loading = ref(true), error = ref(''), transcript = ref(null), transcriptLoading = ref(false), transcriptError = ref(''), therapistName = ref('');
const summaryDocument = ref(null);
const sourceReview=ref(null),reviewTranscriptId=ref('');
const sourceReviewRegion=ref(null),sourceReviewNotice=ref(null),sourceReviewOpenError=ref('');
const summaryUnsafe=computed(()=>isUnusableSummary(summaryDocument.value?.content));
// The model may return a list of candidate sources, but only stored transcript
// UUIDs can be opened. Do not silently substitute a different client's source.
const sourceReviewIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reviewableSources=computed(()=>Array.isArray(sourceReview.value?.sources)
  ? [...new Map(sourceReview.value.sources
      .filter(item=>sourceReviewIdPattern.test(String(item?.transcriptId||'')))
      .map(item=>[item.transcriptId,item])).values()]
  : []);
let sourceReviewOpener=null;
async function openSourceReview(item,event){
  const candidate=item?item.transcriptId:transcript.value?.id;
  if(!sourceReviewIdPattern.test(String(candidate||''))){
    sourceReviewOpenError.value='The original transcript could not be located for this encounter. Check its assignment in Transcript Inbox.';
    return false;
  }
  sourceReviewOpener=event?.currentTarget||sourceReviewOpener;
  sourceReviewOpenError.value='';
  reviewTranscriptId.value=candidate;
  await nextTick();
  const region=sourceReviewRegion.value;
  if(!region){
    sourceReviewOpenError.value='The source review could not be opened. Return to Transcript Inbox and try again.';
    return false;
  }
  // The review is rendered below the warning, often below the viewport.
  // Bring it into view immediately and announce the new region to keyboard users.
  region.scrollIntoView({block:'start',behavior:'auto'});
  region.focus({preventScroll:true});
  return true;
}
async function closeSourceReview(){
  reviewTranscriptId.value='';
  await nextTick();
  if(sourceReviewOpener?.isConnected)sourceReviewOpener.focus({preventScroll:true});
  else sourceReviewNotice.value?.focus({preventScroll:true});
}
async function sourceReviewResolved(result){
  if(result.action==='confirm'){
    reviewTranscriptId.value='';sourceReview.value={resolved:true,message:'Source review saved. Generate a fresh summary before copying or sharing. Your earlier draft is unchanged.',sources:[]};await loadTranscript();await nextTick();sourceReviewNotice.value?.focus({preventScroll:true});
  }else{sourceReview.value={message:'The original was separated. Open one of the reviewed encounters below.',sources:[]};transcript.value=null;}
}
async function verifySavedSummary(){
  if(!summaryDocument.value?.id)return !summaryUnsafe.value;
  try{const safety=await checkSummarySourceSafety(summaryDocument.value.id);if(!safety.safe){sourceReview.value=safety.review;return false}return true}
  catch{sourceReview.value={message:'Source safety could not be verified. Review before copying or sharing.',sources:[]};return false}
}
const activeView = ref(route.query.view === 'clinical' ? 'clinical' : 'summary');
const isEditingSummary = ref(false);
const showTranscript = ref(false);
const showReflection = ref(false);
const copySuccess = ref(false);
const copyError = ref('');
const isGenerating = ref(false);
const generationError = ref('');
const summarySaveError = ref('');
const summaryLens = ref('integrative');
const summaryWindow = ref('current');
const therapistGuidance = ref('');
const showSummaryOptions = ref(true);
const showSummaryGuidance = ref(false);
const summaryPreferenceError = ref('');
const preparingCbtCare = ref(false);
const cbtCareError = ref('');
let saveTimer = null;
let disposed = false;
watch(() => [route.query.prepare, route.query.view], () => {
  if (prepareRequested.value) { activeView.value = 'summary'; showSummaryOptions.value = true; }
});
onBeforeUnmount(() => { disposed = true; clearTimeout(saveTimer); });

function handleSessionUpdate(updatedSession) {
  session.value = updatedSession;
  activeView.value = 'clinical';
}
function askHeliosAboutSession() {
  if (!session.value?.clientId || !session.value?.id) return;
  void openClinicalContext({
    clientId: String(session.value.clientId),
    clientName: client.value?.display_name || client.value?.name || '',
    anchorSessionId: String(session.value.id),
    window: summaryWindow.value === 'recent' ? 'last_three' : 'current',
    lens: summaryLens.value,
    source: 'session_workspace'
  });
}

async function generateSummary() {
  if (!session.value || !transcript.value || transcriptLoading.value || transcriptError.value || isGenerating.value || summaryDocument.value?.status === 'completed') return;
  isGenerating.value = true;
  generationError.value = '';
  try {
    const transcriptId = transcript.value?.id;
    const result = await generateSessionSummary({
      clientId: session.value.clientId,
      sessionId: session.value.id,
      transcriptId,
      lens: summaryLens.value,
      window: summaryWindow.value,
      therapistGuidance: therapistGuidance.value
    });
    if (disposed) return;
    const generation = {
      outcome:'ready',
      id: result.generationId,
      generatedAt: result.generatedAt,
      promptVersion: result.promptVersion,
      model: result.model,
      lens: result.lens || summaryLens.value,
      window: result.window || summaryWindow.value,
      sessionCount: result.sessionCount || 1
    };
    if (summaryDocument.value) {
      const currentContent = summaryDocument.value.content || {};
      const history = Array.isArray(currentContent.history) ? currentContent.history : [];
      const updated = await saveClientDocumentDraft(summaryDocument.value, {
        content: {
          ...currentContent,
          body: result.draft.body,
          summaryGeneration: generation,
          history: [
            ...history,
            {
              body: currentContent.body,
              summaryGeneration: currentContent.summaryGeneration || null,
              timestamp: new Date().toISOString(),
              type: 'pre_regeneration'
            }
          ].slice(-5)
        },
        sourceManifest: result.sources
      });
      summaryDocument.value = updated;
    } else {
      summaryDocument.value = await createClientDocumentDraft({
        client: client.value,
        title: `Session Summary - ${workspaceSession.value.date}`,
        documentType: 'session_summary',
        content: { body: result.draft.body, summaryGeneration: generation },
        sourceManifest: result.sources
      });
    }
    sourceReview.value=null;
    showSummaryOptions.value = prepareRequested.value;
    showSummaryGuidance.value = false;
    therapistGuidance.value = '';
  } catch (err) {
    if(err.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=err.review||{message:err.message,sources:[]};return;}
    if (disposed) return;
    generationError.value = err.message || 'Summary generation failed. Please try again.';
    console.error('Generation failed:', err);
  } finally {
    isGenerating.value = false;
  }
}

async function savePreferredSummaryLens() {
  if (!client.value?.id) return;
  summaryPreferenceError.value = '';
  try {
    const updated = await updateClientSummaryPreference({ clientId: client.value.id, lens: summaryLens.value });
    client.value = { ...client.value, preferred_summary_lens: updated.preferred_summary_lens };
  } catch (err) {
    summaryPreferenceError.value = 'This approach will be used now, but the client preference could not be saved.';
  }
}

async function prepareCbtCareSuggestions() {
  if (!transcript.value?.id || !session.value?.clientId || preparingCbtCare.value) return;
  preparingCbtCare.value = true;
  cbtCareError.value = '';
  try {
    const response = await authenticatedFetch('/api/ai/transcript-cbt-care-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptId: transcript.value.id })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || 'CBT Therapy Focus suggestions could not be prepared.');
    }
    const payload = data?.data;
    if (!payload?.suggestions?.length) throw new Error('No CBT Therapy Focus suggestions were returned.');
    sessionStorage.setItem(
      `helios-care-suggestions:${session.value.clientId}`,
      JSON.stringify({
        suggestions: payload.suggestions,
        sessionId: payload.sessionId || session.value.id,
        lensId: 'gentle_cbt'
      })
    );
    await router.push({
      name: 'ClientWorkspace',
      params: { clientId: session.value.clientId },
      query: { tab: 'Therapy Focus', source: 'session-cbt' }
    });
  } catch (err) {
    cbtCareError.value = err?.message || 'CBT Therapy Focus suggestions could not be prepared.';
  } finally {
    preparingCbtCare.value = false;
  }
}

async function copySummary() {
  if (!summaryDocument.value?.content?.body || sourceReview.value || summaryUnsafe.value) return;
  if(!await verifySavedSummary())return;
  copyError.value = '';
  try {
    await navigator.clipboard.writeText(summaryDocument.value.content.body);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch (err) {
    copyError.value = 'Failed to copy to clipboard. Please select and copy manually.';
    console.error('Failed to copy summary:', err);
  }
}

async function handleSummaryInput() {
  if (summaryDocument.value?.status === 'completed') return;
  clearTimeout(saveTimer);
  summarySaveError.value = '';
  saveTimer = setTimeout(async () => {
    if (!summaryDocument.value || summaryDocument.value.status === 'completed') return;
    try {
      const updated = await saveClientDocumentDraft(summaryDocument.value, { content: summaryDocument.value.content });
      summaryDocument.value.version = updated.version;
      summarySaveError.value = '';
    } catch (err) {
      summarySaveError.value = 'Your changes could not be saved. Please try editing again.';
      console.error('Failed to auto-save summary:', err);
    }
  }, 1000);
}

async function loadTherapistProfile(){if(!supabase)return;try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:profile}=await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle();const metadataName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';therapistName.value=profile?.full_name?.trim()||metadataName||''}catch(e){console.warn('[Session] Could not load therapist identity',e)}}

async function loadSession(){
  loading.value=true;
  error.value='';
  try{
    const {clientId,sessionId}=route.params;
    const [sessionData,clientData]=await Promise.all([getSession({clientId,sessionId}),getClient({clientId}),loadTherapistProfile()]);
    session.value=sessionData;
    client.value=clientData;
    summaryDocument.value = await findSessionSummary({ clientId, sessionId });
    await verifySavedSummary();
    const previousGeneration = summaryDocument.value?.content?.summaryGeneration || null;
    summaryLens.value = clientData.preferred_summary_lens || previousGeneration?.lens || 'integrative';
    summaryWindow.value = previousGeneration?.window || 'current';
    showSummaryOptions.value = prepareRequested.value || summaryUnsafe.value || !summaryDocument.value?.content?.body;
    loadTranscript();
  }catch(e){
    error.value='The session could not be loaded.';
  }finally{
    loading.value=false;
  }
}

async function loadTranscript(){
  if(!session.value?.id||!session.value?.clientId)return;
  transcriptLoading.value=true;transcriptError.value='';transcript.value=null;
  try{
    const sessionRef=String(session.value.id),clientId=String(session.value.clientId);
    const requestedId=typeof route.query.transcriptId==='string'?route.query.transcriptId:'';
    const params=requestedId?new URLSearchParams({id:requestedId}):new URLSearchParams({sessionRef,clientId});
    const response=await authenticatedFetch(`/api/zoom/transcripts?${params.toString()}`);
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||'Unable to load the linked transcript.');
    const source=requestedId?data?.transcript:data?.transcripts?.[0];
    if(requestedId&&!source)throw new Error('The assigned source could not be found. Return to Transcript Inbox to review it.');
    if(source&&(String(source.clientId)!==clientId||String(source.sessionRef)!==sessionRef||(requestedId&&source.id!==requestedId)))throw new Error('This transcript no longer belongs to this encounter. Return to Transcript Inbox to review its assignment.');
    transcript.value=source||null;
  }catch(err){transcriptError.value=err?.message||'Unable to load the linked transcript.'}
  finally{transcriptLoading.value=false}
}

const summaryGeneration = computed(() => summaryDocument.value?.content?.summaryGeneration || null);
function summaryApproachLabel(lens) {
  return ({ general: 'General', integrative: 'Integrative', gentle_cbt: 'CBT', internal_family_systems: 'Internal Family Systems (IFS)', transactional_analysis: 'Transactional Analysis' })[lens] || 'Integrative';
}
function summaryWindowLabel(window) {
  return window === 'recent' ? 'Recent sessions' : 'This session';
}
const generatedSummaryLabel = computed(() => {
  const generation = summaryGeneration.value;
  const lens = generation?.lens || 'integrative';
  const window = generation?.window || 'current';
  return `${summaryApproachLabel(lens)} · ${summaryWindowLabel(window)} · Generated from transcript`;
});

const workspaceSession=computed(()=>{if(!session.value)return null;const dateObj=new Date(session.value.startedAt),isValidDate=!isNaN(dateObj.getTime());const sourceReady=session.value.status==='source_ready';return{id:session.value.id,clientId:session.value.clientId,status:sourceReady?'Transcript Ready':(session.value.status==='in_progress'?'In Progress':(session.value.status==='completed'?'Completed':session.value.status)),clientName:client.value?.display_name||client.value?.name||'Unknown Client',date:isValidDate?dateObj.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'Pending',time:isValidDate?dateObj.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}):'',type:sourceReady?'Imported transcript encounter':'Clinical session',videoProvider:'zoom',isInPerson:false}});
onMounted(loadSession);
</script>
