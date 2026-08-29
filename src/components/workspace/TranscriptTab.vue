<template>
  <div class="flex flex-col gap-stack-md">
    <div v-if="loading" class="min-h-64 flex flex-col items-center justify-center gap-3 rounded-panel border border-border bg-surface p-6 text-center"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p class="text-body text-ink-muted">Checking session capture…</p></div>
    <div v-else-if="error" class="min-h-64 flex flex-col items-center justify-center gap-4 rounded-panel border border-state-danger/20 bg-surface p-6 text-center"><div><h3 class="text-h3 font-semibold text-state-danger">Session capture unavailable</h3><p class="mt-2 text-body text-ink-muted">{{ error }}</p></div><button class="px-4 py-2 bg-action-primary text-on-action rounded-control font-medium hover:bg-action-primary-hover" @click="$emit('retry')">Retry</button></div>
    <div v-else-if="!transcript" class="min-h-48 flex flex-col items-center justify-center rounded-panel border border-border bg-surface p-6 text-center">
      <h3 class="text-h3 font-semibold text-ink">Waiting for session capture</h3>
      <p class="mt-2 max-w-lg text-body-sm text-ink-muted">Your Zoom transcript will be linked to this session when it becomes available. You can continue working in Helio normally.</p>
      <p class="mt-4 text-caption text-ink-subtle italic max-w-md">Transcript Inbox is only needed when Helio cannot confidently match an imported transcript.</p>
    </div>
    <template v-else>
      <div class="flex flex-col lg:flex-row gap-6">
        <div class="flex-1 flex flex-col gap-6">
          <section class="rounded-panel border border-border bg-surface p-5">
            <header class="mb-4">
              <p class="text-caption font-medium uppercase tracking-wider text-action-link">Session capture ready</p>
              <h3 class="mt-1 text-h3 font-semibold text-ink">Zoom transcript linked to this session</h3>
            </header>
            <div class="mt-4 p-4 rounded-panel bg-surface-subtle border border-border">
              <h4 class="text-body font-semibold text-ink">Quick clinical summary</h4>
              <p class="mt-1 text-body-sm text-ink-muted">Helio can prepare an editable summary of the session for therapist review, grounded only in this transcript. This is not an approved Clinical Record.</p>
              <div v-if="canPrepareDraft" class="mt-4 flex flex-col items-start gap-2">
                <button type="button" class="button-primary" :disabled="preparingDraft" @click="prepareRequestedDraft">
                  {{ preparingDraft ? 'Preparing…' : prepareButtonLabel }}
                </button>
                <p class="text-caption text-ink-muted">{{ prepareHelpText }}</p>
                <p v-if="draftError" class="text-body-sm text-state-danger" role="alert">{{ draftError }}</p>
              </div>
              <div v-else class="mt-2 text-body-sm text-ink-secondary italic">
                {{ requestedOutputLabel || 'No specific triage request found for this transcript.' }}
              </div>
            </div>
            <div class="mt-6 border-t border-border pt-4">
              <button type="button" class="text-body-sm font-medium text-action-link hover:text-action-link-hover" :aria-expanded="isTranscriptVisible" aria-controls="session-transcript-content" @click="isTranscriptVisible = !isTranscriptVisible">
                {{ isTranscriptVisible ? 'Hide original transcript' : 'View original transcript' }}
              </button>
              <pre v-if="isTranscriptVisible" id="session-transcript-content" class="mt-4 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-panel bg-surface-subtle p-4 font-mono text-body-sm leading-relaxed text-ink-secondary">{{ transcript.text }}</pre>
            </div>
          </section>
        </div>
        <div class="w-full lg:w-72">
          <WorkflowStatusPanel :workflowItems="workflowProgress" :activeStage="activeTab" />
          <p class="mt-4 rounded-panel border border-border bg-surface-subtle p-4 text-body-sm text-ink-muted">Markers and important moments are unavailable until their persistence workflow is approved.</p>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'; import { authenticatedFetch } from '../../lib/api.js'; import WorkflowStatusPanel from './WorkflowStatusPanel.vue';
const props=defineProps({transcript:{type:Object,default:null},loading:Boolean,error:{type:String,default:''},activeTab:String}); const emit=defineEmits(['retry','clinical-summary-draft','clinical-note-draft','cbt-care-suggestions']); const preparingDraft=ref(false),draftError=ref(''),isTranscriptVisible=ref(false);
const requestedOutputLabel = computed(() => ({
  clinical_summary: 'Clinical summary requested',
  draft_note: 'Draft clinical note requested',
  cbt: 'CBT reflection requested'
})[props.transcript?.requestedLens] || '');
const canPrepareDraft=computed(()=>['clinical_summary','draft_note','cbt'].includes(props.transcript?.requestedLens));
const prepareButtonLabel=computed(()=>props.transcript?.requestedLens==='draft_note'?'Prepare draft clinical note':props.transcript?.requestedLens==='cbt'?'Prepare CBT Care suggestions':'Prepare clinical summary draft');
const prepareHelpText=computed(()=>props.transcript?.requestedLens==='cbt'?'Helio will prepare tentative Gentle CBT Care possibilities from this transcript. Nothing is saved until you review, accept, and explicitly save suggestions in Care.':'Helio will prepare an editable draft from this transcript only after you choose this action. Review and save remain separate steps.');
async function prepareRequestedDraft(){if(!props.transcript?.id||preparingDraft.value||!canPrepareDraft.value)return;preparingDraft.value=true;draftError.value='';const lens=props.transcript.requestedLens;const endpoint=lens==='draft_note'?'/api/ai/transcript-draft-clinical-note':lens==='cbt'?'/api/ai/transcript-cbt-care-suggestions':'/api/ai/transcript-clinical-summary';try{const response=await authenticatedFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcriptId:props.transcript.id})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error?.message||'Draft preparation is temporarily unavailable.');if(lens==='cbt')emit('cbt-care-suggestions',payload.data||null);else emit(lens==='draft_note'?'clinical-note-draft':'clinical-summary-draft',payload.data?.draft||null)}catch(error){draftError.value=error.message||'Draft preparation is temporarily unavailable.'}finally{preparingDraft.value=false}}
const workflowProgress=[{label:'Recording',status:'In Progress'},{label:'Session Capture',status:'In Progress'},{label:'Notes',status:'Not Started'},{label:'Reflection',status:'Not Started'},{label:'Clinical Summary',status:'Not Started'},{label:'Professional Development',status:'Not Started'}];
</script>
