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
      
      <div ref="sessionScrollContainer" class="flex-1 overflow-auto p-inline-lg py-stack-lg" @scroll.passive="handleSessionScroll">
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
              <h2 class="text-h3 font-semibold">{{ sourceReview?.resolved ? 'Source review saved' : sourceReviewNeedsTranscript ? 'Resolve session identity' : 'Check the client and Zoom note' }}</h2>
              <p>{{ sourceReview?.message || 'This summary source needs clarification. Check the Zoom note or original evidence.' }}</p>
              <p class="text-body-sm">Your previous draft and imported note are preserved. No new summary was saved.</p>
              <div v-if="!sourceReviewNeedsTranscript && !sourceReview?.resolved" class="flex flex-wrap items-center gap-3 rounded-control bg-surface-subtle p-3" data-testid="soft-source-review">
                <p class="flex-1 text-body-sm text-ink-secondary">A Zoom note is not proof of another client's conversation. A new draft can use this session only, excluding earlier continuity.</p>
                <button type="button" class="button-primary" :disabled="isGenerating || transcriptLoading" @click="retryCurrentSessionOnly">Try this session only</button>
                <button v-if="transcript?.id" type="button" class="button-secondary" @click="openSourceReview()">Confirm client / review Zoom note</button>
              </div>
              <p v-if="sourceReviewOpenError" class="text-body-sm text-state-danger" role="alert">{{ sourceReviewOpenError }}</p>
              <div v-if="!sourceReview?.resolved && sourceReviewNeedsTranscript" class="flex flex-wrap gap-2">
                <button v-for="(item,index) in reviewableSources" :key="item.transcriptId" type="button" class="button-primary"
                  @click="openSourceReview(item,index)" :aria-label="'Review original transcript ' + (index+1) + ' of ' + reviewableSources.length">
                  Review source {{ index+1 }} of {{ reviewableSources.length }}
                </button>
                <button v-if="!reviewableSources.length && transcript?.id" type="button" class="button-primary" @click="openSourceReview()">Review session source</button>
                <p v-else-if="!reviewableSources.length && !transcript?.id" class="text-body-sm text-state-danger">No original transcript is linked. Check the assignment in Transcript Inbox.</p>
              </div>
            </section>
            <SourceReviewDialog v-if="reviewTranscriptId" :transcript-id="reviewTranscriptId" :source-label="reviewSourceLabel" @close="reviewTranscriptId=''" @resolved="sourceReviewResolved" />
            <section class="space-y-6">
              <details v-if="transcript?.zoomGeneratedSummary && summaryDocument?.status === 'completed'" data-testid="summary-zoom-preview" class="rounded-panel border border-border bg-surface p-3">
                <summary class="cursor-pointer text-body-sm font-semibold text-action-link">Identify this session · Preview Zoom note</summary>
                <p class="mt-2 text-caption text-ink-muted">This is a secondary interpretation. Check the client and encounter before using it.</p>
                <p class="mt-2 whitespace-pre-wrap break-words text-body-sm text-ink-secondary">{{ transcript.zoomGeneratedSummary }}</p>
              </details>
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
                   <button v-if="summaryDocument?.content?.body && summaryDocument.status !== 'completed'" type="button" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm" :aria-expanded="showRefinement" @click="showRefinement = !showRefinement">{{ showRefinement ? 'Hide refinement' : 'Refine' }}</button>
                  <RouterLink v-if="summaryDocument?.id" :to="{ name: 'ClientWorkspace', params: { clientId: session.clientId }, query: { document: summaryDocument.id } }" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm">Open in Client Documents</RouterLink>
                  <button v-show="intelligenceMode === 'client_summary'" @click="copySummary" :disabled="isGenerating || !summaryDocument?.content?.body || !!sourceReview || summaryUnsafe || needsTherapistReview" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm">Copy summary</button>
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
                  <h3 class="text-h3 font-semibold text-ink">{{ intelligenceMode === 'therapist_formulation' ? 'Prepare therapist formulation' : 'Prepare session summary' }}</h3>
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
                    <select ref="summaryEvidenceSelect" v-model="summaryWindow" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface">
                      <option value="current">This session</option>
                      <option value="recent">Recent sessions</option>
                    </select>
                  </label>
                </div>
                <ClinicalIntelligenceControls class="md:col-span-2" :lens="summaryLens" :selection="intelligenceSelection"
                  v-model:mode="intelligenceMode" v-model:include-zoom-summary="includeZoomSummary"
                  :disabled="isGenerating || reviewSaveBusy" />

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
                  <p class="text-caption text-ink-muted">{{ summaryWindow === 'recent' ? 'Uses this encounter and up to two previous encounters. Missing evidence is flagged.' : 'Uses the selected encounter and reviewed clinical context.' }}</p>
                  <button @click="generateSummary" :disabled="isGenerating || transcriptLoading || !!transcriptError || !transcript" class="button-primary py-stack-xs px-inline-md">
                    {{ generationErrorCode === 'EVIDENCE_WINDOW_TOO_LARGE' ? 'Adjust evidence' : intelligenceMode === 'therapist_formulation' ? 'Prepare therapist formulation' : summaryDocument?.content?.body ? 'Regenerate summary' : 'Generate summary' }}
                  </button>
                </div>
                <p v-if="summaryPreferenceError" class="mt-2 text-caption text-state-danger" role="alert">{{ summaryPreferenceError }}</p>
              </div>

              <SummaryEvidencePanel v-if="intelligenceMode === 'client_summary'" :claims="summaryDocument?.content?.clinicalIntelligence?.claims || []" />
              <TherapistFormulationPanel v-if="intelligenceMode === 'therapist_formulation' && privateFormulation && !isGenerating" :formulation="privateFormulation" />
              <SummaryRefinementPanel v-if="intelligenceMode === 'client_summary' && showRefinement && summaryDocument?.content?.body && summaryDocument.status !== 'completed'"
                :body="summaryDocument.content.body" :context-key="refinementContext" :show-preview="false" :busy="isGenerating || reviewSaveBusy"
                :disabled="!!sourceReview || summaryUnsafe || transcriptLoading || !!transcriptError || !transcript"
                :candidate="pendingSummary" :error="generationError"
                @generate="requestSummaryRefinement" @accept="acceptSummaryRevision" @discard="pendingSummary=null" />

              <div v-if="intelligenceMode === 'client_summary' && summaryDocument?.content?.summaryGeneration?.reviewRequired" data-testid="summary-therapist-approval" class="rounded-panel border border-border bg-surface-elevated p-4 space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="font-semibold text-ink">{{ needsTherapistReview ? 'Draft — therapist review needed' : 'Summary reviewed by therapist' }}</p>
                    <p class="text-body-sm text-ink-secondary">{{ needsTherapistReview ? 'Check the client, accuracy and clinical wording. Edit before approving or copying.' : 'Approved for use. Any further edits require review again.' }}</p>
                  </div>
                  <button v-if="needsTherapistReview && summaryDocument.status !== 'completed'" type="button" class="button-primary" :disabled="reviewSaveBusy || isEditingSummary" @click="approveSummaryDraft">{{ reviewSaveBusy ? 'Saving…' : 'Mark summary reviewed' }}</button>
                </div>
                <p v-if="summaryReviewError" role="alert" class="text-body-sm text-state-danger">{{ summaryReviewError }}</p>
                <p v-for="(warning,index) in summaryDocument?.content?.summaryGeneration?.reviewCautions||[]" :key="index" class="text-caption text-ink-muted">{{ warning }}</p>
              </div>

              <p v-if="summaryDocument?.status === 'completed' && prepareRequested" class="rounded-panel border border-border p-4 text-body-sm" role="status">This summary is finalised and read-only. Opening Clinical Workspace does not change or regenerate it.</p>
              <section v-if="intelligenceMode === 'client_summary' && pendingSummary && candidateMatches(pendingSummary, summaryDocument?.content?.body || '', refinementContext)" ref="summaryRevisionPreview" tabindex="-1" class="rounded-panel border border-state-selected/40 bg-surface-elevated p-4 sm:p-5 space-y-4 scroll-mt-8" data-testid="session-summary-revision-preview" aria-label="Revised summary ready">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 class="text-h3 font-semibold text-ink">Revised summary ready</h3>
                    <p class="text-body-sm text-ink-secondary mt-1">Review this version. Your current summary stays unchanged until you choose to use it.</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="button-secondary" :disabled="isGenerating" @click="pendingSummary = null">Keep current</button>
                    <button type="button" class="button-primary" :disabled="isGenerating || reviewSaveBusy || !!sourceReview" @click="acceptSummaryRevision">Use revised draft</button>
                  </div>
                </div>
                <SessionSummaryDocument :body="pendingSummary.result.draft.body" compact />
                <SummaryEvidencePanel :claims="pendingSummary.result.claims || []" />
              </section>
              <div ref="summaryDisplayedDocument" class="relative min-h-[12rem]">
                <div v-if="isGenerating" ref="summaryGenerationProgress" tabindex="-1" data-testid="summary-generation-progress" role="status" aria-live="polite" class="py-20 text-center text-ink-muted bg-surface rounded-panel border border-state-selected/40 flex flex-col items-center gap-3 shadow-sm scroll-mt-8">
                  <span class="w-10 h-10 border-4 border-state-selected border-t-transparent rounded-full motion-safe:animate-spin" aria-hidden="true"></span>
                  <p class="type-body-medium">{{ intelligenceMode === 'therapist_formulation' ? 'Preparing therapist formulation…' : summaryDocument?.content?.body ? 'Regenerating session summary…' : 'Generating session summary…' }}</p>
                  <p class="text-body-sm">{{ summaryDocument?.content?.body ? 'Your existing draft stays unchanged until you accept a revision.' : 'Preparing an editable draft from the reviewed session material.' }}</p>
                </div>
                <div v-else-if="generationError && (!summaryDocument || intelligenceMode === 'therapist_formulation')">
                  <SummaryEvidenceLimitNotice v-if="generationErrorCode === 'EVIDENCE_WINDOW_TOO_LARGE'" :message="generationError" @adjust="adjustSummaryEvidence" />
                  <div v-else class="py-8 px-6 text-center bg-state-danger-surface rounded-panel border border-state-danger/20 shadow-sm" role="alert">
                    <p class="text-state-danger text-body-sm mb-4">{{ generationError }}</p>
                    <button @click="generateSummary" class="button-primary py-stack-xs px-inline-md text-body-sm">Retry</button>
                  </div>
                </div>
                <p v-else-if="intelligenceMode === 'therapist_formulation'" class="text-body-sm text-ink-muted">{{ privateFormulation ? 'The client summary remains unchanged.' : 'Prepare a working formulation above. It stays separate from the client summary and is not saved automatically.' }}</p>
                <template v-else-if="intelligenceMode === 'client_summary' && summaryDocument && !summaryUnsafe">
                  <SummaryEvidenceLimitNotice v-if="generationErrorCode === 'EVIDENCE_WINDOW_TOO_LARGE'" class="mb-4" :message="generationError" @adjust="adjustSummaryEvidence" />
                  <div v-else-if="generationError" class="mb-4 py-4 px-5 text-center bg-state-danger-surface rounded-panel border border-state-danger/20 shadow-sm" role="alert">
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
      <div v-if="activeView === 'summary' && showScrollActions" class="fixed bottom-5 right-4 sm:right-6 z-40 flex flex-wrap justify-end gap-2 pointer-events-none" data-testid="session-summary-scroll-actions">
        <button v-if="summaryDocument?.content?.body && !needsTherapistReview && !summaryUnsafe && !sourceReview" type="button" class="button-primary shadow-lg pointer-events-auto inline-flex items-center gap-2" @click="copySummary" :disabled="isGenerating" aria-label="Copy reviewed session summary">
          <Copy class="w-4 h-4" aria-hidden="true" /> {{ copySuccess ? 'Copied!' : 'Copy summary' }}
        </button>
        <button type="button" class="button-secondary shadow-lg pointer-events-auto inline-flex items-center gap-2" @click="scrollSummaryToTop" aria-label="Back to top of session summary">
          <ArrowUp class="w-4 h-4" aria-hidden="true" /> Back to top
        </button>
        <p v-if="copyError" role="alert" class="basis-full rounded-control bg-state-danger-surface px-3 py-2 text-caption text-state-danger pointer-events-auto">{{ copyError }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import SummaryRefinementPanel from '../components/workspace/SummaryRefinementPanel.vue';
import { candidateMatches, summaryContextKey } from '../lib/summaryAuthoring.js';
import HelpLink from '../components/help/HelpLink.vue'
import SourceReviewDialog from '../components/workspace/SourceReviewDialog.vue';
import { isUnusableSummary } from '../lib/summarySafety.js';
import { ref, onMounted, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { ArrowUp, Copy } from '@lucide/vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/sessions.js';
import { getClient, updateClientSummaryPreference } from '../lib/clients.js';
import SummaryEvidenceLimitNotice from '../components/workspace/SummaryEvidenceLimitNotice.vue';
import ClinicalIntelligenceControls from '../components/workspace/ClinicalIntelligenceControls.vue';
import SummaryEvidencePanel from '../components/workspace/SummaryEvidencePanel.vue';
import TherapistFormulationPanel from '../components/workspace/TherapistFormulationPanel.vue';
import { assertClientSummaryProjection } from '../lib/modalityIntelligence.js';
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
const sessionScrollContainer=ref(null),summaryGenerationProgress=ref(null),summaryRevisionPreview=ref(null),summaryDisplayedDocument=ref(null),sourceReviewNotice=ref(null);
const showScrollActions=ref(false),showRefinement=ref(false);
function handleSessionScroll(event){showScrollActions.value=(event?.target?.scrollTop||0)>280;}
function reducedMotion(){return typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
async function scrollToSummaryTarget(target){
  await nextTick();
  const element=target.value;
  if(!element?.isConnected)return;
  element.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'center'});
  element.focus?.({preventScroll:true});
}
function scrollSummaryToTop(){sessionScrollContainer.value?.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'});}

const excludeEarlierZoomNotes=ref(false),reviewSaveBusy=ref(false),summaryReviewError=ref('');
const needsTherapistReview=computed(()=>summaryDocument.value?.content?.summaryGeneration?.reviewRequired===true &&
  !summaryDocument.value?.content?.summaryGeneration?.reviewedAt);
const sourceReview=ref(null),reviewTranscriptId=ref(''),reviewSourceLabel=ref(''),sourceReviewOpenError=ref('');
const reviewUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reviewableSources=computed(()=>[...new Map((sourceReview.value?.sources||[])
  .filter(item=>reviewUuid.test(String(item?.transcriptId||'')))
  .map(item=>[item.transcriptId,item])).values()]);
const summaryUnsafe=computed(()=>isUnusableSummary(summaryDocument.value?.content));
const sourceReviewNeedsTranscript=computed(()=>{
  const review=sourceReview.value;
  if(!review || review.resolved)return false;
  return (review.sources||[]).some(source=>['needs_review','separated'].includes(source?.state))
    || (review.evidence||[]).some(item=>item?.verified && ['transcript','session_capture'].includes(item?.sourceType))
    || review.reason==='insufficient_source';
});
async function retryCurrentSessionOnly(){
  if(isGenerating.value)return;
  summaryWindow.value='current';excludeEarlierZoomNotes.value=true;
  sourceReview.value=null;
  await generateSummary();
}
function openSourceReview(item=null,index=0){
  const id=item?.transcriptId||transcript.value?.id;
  if(!reviewUuid.test(String(id||''))){
    sourceReviewOpenError.value='The original transcript link is missing or invalid. Open Transcript Inbox to check the encounter assignment.';
    return;
  }
  sourceReviewOpenError.value='';
  const name=client.value?.display_name||client.value?.name||'Client';
  const count=reviewableSources.value.length;
  reviewSourceLabel.value=count>1 ? name+' · Original source '+(index+1)+' of '+count : name+' · Original transcript';
  reviewTranscriptId.value=id;
}
async function sourceReviewResolved(result){
  if(result.action==='reassign'){
    reviewTranscriptId.value='';
    sourceReview.value=null;
    pendingSummary.value=null;
    summaryDocument.value=null;
    transcript.value=null;
    // SessionWorkspace remains mounted across param changes; reload its new
    // client/encounter explicitly so no previous client's draft remains visible.
    await router.replace({name:'SessionWorkspace',params:{clientId:result.clientId,sessionId:result.sessionId},query:{view:'summary',transcriptId:result.id}});
    await loadSession();
    return;
  }
  if(result.action==='confirm'){
    reviewTranscriptId.value='';sourceReview.value={resolved:true,message:'Source review saved. Generate a fresh summary before copying or sharing. Your earlier draft is unchanged.',sources:[]};await loadTranscript();
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
const generationErrorCode = ref('');
const summaryEvidenceSelect = ref(null);
async function adjustSummaryEvidence(){showSummaryOptions.value=true;await scrollToSummaryTarget(summaryEvidenceSelect);}
const summarySaveError = ref('');
const summaryLens = ref('integrative');
const summaryWindow = ref('current');
const therapistGuidance = ref('');
const pendingSummary=ref(null);
const intelligenceMode=ref('client_summary'),includeZoomSummary=ref(false),privateFormulation=ref(null);
const intelligenceSelection=computed(()=>({clientId:session.value?.clientId,sessionId:session.value?.id,transcriptId:transcript.value?.id,scope:'encounter',window:summaryWindow.value}));
const refinementContext=computed(()=>summaryContextKey([session.value?.clientId,session.value?.id,transcript.value?.id,transcript.value?.sourceVersion,summaryLens.value,summaryWindow.value,excludeEarlierZoomNotes.value,therapistGuidance.value,intelligenceMode.value,includeZoomSummary.value]));
watch(refinementContext,()=>{pendingSummary.value=null;privateFormulation.value=null;if(generationErrorCode.value==='EVIDENCE_WINDOW_TOO_LARGE'){generationError.value='';generationErrorCode.value='';}});
const showSummaryOptions = ref(true);
const showSummaryGuidance = ref(false);
const summaryPreferenceError = ref('');
const preparingCbtCare = ref(false);
const cbtCareError = ref('');
let saveTimer = null;
let disposed = false;
watch(() => [route.query.prepare, route.query.view], () => {
  if (prepareRequested.value) { activeView.value = 'summary'; if (!summaryDocument.value?.content?.body) showSummaryOptions.value = true; }
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

async function requestSummaryRefinement(payload) {
  if(payload.baseBody!==summaryDocument.value?.content?.body || payload.contextKey!==refinementContext.value)return;
  await generateSummary(payload);
}
async function generateSummary(payload = null) {
  if(!session.value || !transcript.value || transcriptLoading.value || transcriptError.value || isGenerating.value || reviewSaveBusy.value || summaryDocument.value?.status==='completed')return;
  const refinement=payload && typeof payload.instruction==='string'?payload:null;
  const baseBody=summaryDocument.value?.content?.body||'';
  const contextKey=refinementContext.value;
  if(generationErrorCode.value==='EVIDENCE_WINDOW_TOO_LARGE')return adjustSummaryEvidence();
  isGenerating.value=true;generationError.value='';generationErrorCode.value='';pendingSummary.value=null;
  await scrollToSummaryTarget(summaryGenerationProgress);
  try{
    const result=await generateSessionSummary({clientId:session.value.clientId,sessionId:session.value.id,transcriptId:transcript.value.id,
      lens:summaryLens.value,window:summaryWindow.value,excludeEarlierZoomNotes:excludeEarlierZoomNotes.value,therapistGuidance:therapistGuidance.value,
      refinementRequest:refinement?.instruction||'',previousDraft:refinement?baseBody.slice(0,10000):'',summaryOptions:refinement?.summaryOptions||{},intelligenceOptions:{mode:intelligenceMode.value,includeZoomSummary:includeZoomSummary.value}});
    if(disposed)return;
    if(contextKey!==refinementContext.value || baseBody!==(summaryDocument.value?.content?.body||''))throw new Error('The draft or evidence selection changed. Prepare a new preview; nothing has been replaced.');
    if(result.mode==='therapist_formulation'){privateFormulation.value=result.formulation;return;}
    if(baseBody){pendingSummary.value={result,baseBody,contextKey,instruction:refinement?.instruction||''};showRefinement.value=false;await scrollToSummaryTarget(summaryRevisionPreview);return;}
    await installSummaryResult(result,refinement?.instruction||'');
    await scrollToSummaryTarget(summaryDisplayedDocument);
  }catch(err){
    if(err.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=err.review||{message:err.message,sources:[]};await scrollToSummaryTarget(sourceReviewNotice);return;}
    if(!disposed){generationErrorCode.value=err.code||'';generationError.value=err.message||'Summary generation failed. The current draft is unchanged.';await scrollToSummaryTarget(summaryDisplayedDocument);}
  }finally{isGenerating.value=false;}
}
async function acceptSummaryRevision(){
  if(isGenerating.value||reviewSaveBusy.value||summaryDocument.value?.status==='completed')return;
  const candidate=pendingSummary.value;
  if(!candidateMatches(candidate,summaryDocument.value?.content?.body||'',refinementContext.value)){pendingSummary.value=null;generationError.value='The current draft changed. Prepare a new preview.';return;}
  isGenerating.value=true;generationError.value='';
  try{
    if(sourceReview.value || !await verifySavedSummary())throw new Error('Resolve the source concern before accepting a revision.');
    if(!candidateMatches(candidate,summaryDocument.value?.content?.body||'',refinementContext.value))throw new Error('The current draft changed. Prepare a new preview.');
    await installSummaryResult(candidate.result,candidate.instruction);
    pendingSummary.value=null;
    await scrollToSummaryTarget(summaryDisplayedDocument);
  }catch(error){generationError.value=error.message||'The revised draft could not be saved. Your current draft remains available.';}
  finally{isGenerating.value=false;}
}
async function installSummaryResult(result,instruction=''){
  assertClientSummaryProjection(result);
  clearTimeout(saveTimer);
  const generation={outcome:'ready',mode:'client_summary',intelligenceOptions:result.intelligenceOptions||null,architecture:result.architecture||null,id:result.generationId,generatedAt:result.generatedAt,promptVersion:result.promptVersion,model:result.model,
    lens:result.lens||summaryLens.value,window:result.window||summaryWindow.value,excludeEarlierZoomNotes:excludeEarlierZoomNotes.value,anchorSessionId:session.value.id,sessionCount:result.sessionCount||1,
    reviewCautions:result.reviewCautions||[],qualityReview:result.qualityReview||null,summaryOptions:result.summaryOptions||{},resourceSelection:result.resourceSelection||null,
    reviewRequired:true,reviewedAt:null,refinedWith:instruction||undefined};
  const existing=summaryDocument.value?.content||{};
  const previous=existing.clinicalIntelligence?.history||existing.history||[];
  const snapshot={body:existing.body,richContent:existing.richContent||null,generation:existing.summaryGeneration||existing.clinicalIntelligence?.generation||null,
    sources:summaryDocument.value?.sourceManifest||[],claims:existing.clinicalIntelligence?.claims||[],lastGeneratedBody:existing.clinicalIntelligence?.lastGeneratedBody||'',timestamp:new Date().toISOString(),type:'pre_regeneration'};
  const history=existing.body?[...previous,snapshot].slice(-5):previous;
  const content={...existing,body:result.draft.body,richContent:null,summaryGeneration:generation,
    clinicalIntelligence:{generation,claims:result.claims||[],sources:result.sources||[],history,lastGeneratedBody:result.draft.body},history};
  if(summaryDocument.value){
    summaryDocument.value=await saveClientDocumentDraft(summaryDocument.value,{content,sourceManifest:result.sources});
  }else{
    summaryDocument.value=await createClientDocumentDraft({client:client.value,title:'Session Summary - '+workspaceSession.value.date,documentType:'session_summary',content,sourceManifest:result.sources});
  }
  sourceReview.value=null;summaryReviewError.value='';isEditingSummary.value=false;
  showSummaryOptions.value=false;showSummaryGuidance.value=false;showRefinement.value=false;therapistGuidance.value='';
}

async function approveSummaryDraft(){
  if(!summaryDocument.value?.id || !needsTherapistReview.value || reviewSaveBusy.value || isEditingSummary.value)return;
  reviewSaveBusy.value=true;summaryReviewError.value='';
  try{
    clearTimeout(saveTimer);
    if(!await verifySavedSummary())throw new Error('Resolve any source-boundary issue before approving.');
    const content={...summaryDocument.value.content,summaryGeneration:{
      ...summaryDocument.value.content.summaryGeneration,reviewedAt:new Date().toISOString()
    }};
    summaryDocument.value=await saveClientDocumentDraft(summaryDocument.value,{content});
  }catch(error){summaryReviewError.value=error?.message||'Review status could not be saved. Please try again.'}
  finally{reviewSaveBusy.value=false}
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
  if(intelligenceMode.value !== 'client_summary')return;
  if(isGenerating.value)return;
  if (!summaryDocument.value?.content?.body || sourceReview.value || summaryUnsafe.value || needsTherapistReview.value) return;
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
  if(summaryDocument.value?.content?.summaryGeneration?.reviewRequired)
    summaryDocument.value.content.summaryGeneration.reviewedAt=null;
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
    summaryLens.value = previousGeneration?.lens || clientData.preferred_summary_lens || 'integrative';
    summaryWindow.value = previousGeneration?.window || 'current';
    excludeEarlierZoomNotes.value = previousGeneration?.excludeEarlierZoomNotes === true ||
      (previousGeneration?.excludeEarlierZoomNotes == null && Boolean(previousGeneration?.reviewCautions?.some(note => note.includes('Earlier Zoom notes excluded by therapist choice'))));
    showSummaryOptions.value = summaryUnsafe.value || !summaryDocument.value?.content?.body;
    showRefinement.value = false;
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
