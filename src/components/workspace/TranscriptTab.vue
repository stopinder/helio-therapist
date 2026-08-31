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
            <header>
              <p class="text-caption font-medium uppercase tracking-wider text-action-link">Session source</p>
              <h3 class="mt-1 text-h3 font-semibold text-ink">Linked transcript</h3>
              <p class="mt-2 text-body-sm text-ink-muted">Review the source transcript before preparing any session material. The imported transcript remains unchanged.</p>
            </header>
            <div class="mt-5 border-t border-border pt-4">
              <button type="button" class="text-body-sm font-medium text-action-link hover:text-action-link-hover" :aria-expanded="isTranscriptVisible" aria-controls="session-transcript-content" @click="isTranscriptVisible = !isTranscriptVisible">{{ isTranscriptVisible ? 'Hide transcript' : 'Review transcript' }}</button>
              <pre v-if="isTranscriptVisible" id="session-transcript-content" class="mt-4 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-panel bg-surface-subtle p-4 font-mono text-body-sm leading-relaxed text-ink-secondary">{{ transcript.text }}</pre>
            </div>
            <div class="mt-6 border-t border-border pt-5">
              <h4 class="text-body font-semibold text-ink">Confirm speaker identities</h4>
              <p class="mt-1 text-body-sm text-ink-muted">Tell Helio who is speaking. This is used only to prepare the editable capture and does not alter the source transcript.</p>
              <div v-if="speakerLabels.length" class="mt-4 grid gap-3 sm:grid-cols-2">
                <label v-for="label in speakerLabels" :key="label" class="text-body-sm text-ink-secondary">
                  <span class="mb-1 block font-medium text-ink">{{ label }}</span>
                  <select v-model="speakerIdentities[label]" class="w-full rounded-control border border-border bg-surface px-3 py-2 text-ink" :disabled="speakersConfirmed">
                    <option value="">Choose identity</option><option value="Therapist">Therapist</option><option value="Client">Client</option><option value="Other participant">Other participant</option>
                  </select>
                </label>
              </div>
              <p v-else class="mt-3 text-body-sm text-ink-muted">No speaker labels were found in this transcript. Confirm that the transcript is ready to use.</p>
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <button v-if="!speakersConfirmed" type="button" class="button-primary" :disabled="!canConfirmSpeakers" @click="confirmSpeakers">Confirm speakers</button>
                <template v-else><p class="text-body-sm font-medium text-state-success">Speaker identities confirmed</p><button type="button" class="text-body-sm font-medium text-action-link hover:text-action-link-hover" @click="editSpeakers">Change</button></template>
              </div>
            </div>
            <div v-if="speakersConfirmed" class="mt-6 border-t border-border pt-5">
              <h4 class="text-body font-semibold text-ink">Prepare session capture</h4>
              <p class="mt-1 text-body-sm text-ink-muted">Helio will prepare editable material grounded in this transcript. It remains a working capture for your review and is not an approved Clinical Record.</p>
              <button type="button" class="button-primary mt-4" :disabled="preparingCapture" @click="prepareSessionCapture">{{ preparingCapture ? 'Preparing…' : 'Prepare session capture' }}</button>
              <p v-if="captureError" class="mt-2 text-body-sm text-state-danger" role="alert">{{ captureError }}</p>
            </div>
            <div v-if="captureDraft" class="mt-6 border-t border-border pt-5">
              <p class="text-caption font-medium uppercase tracking-wider text-state-info">Editable working material · not saved</p>
              <h4 class="mt-1 text-body font-semibold text-ink">Review session capture</h4>
              <p class="mt-1 text-body-sm text-ink-muted">Review and edit every field. Notes, Reflection and Clinical Record remain separate steps.</p>
              <div class="mt-4 grid gap-4">
                <label v-for="field in captureFields" :key="field.key" class="text-body-sm text-ink-secondary"><span class="mb-1 block font-medium text-ink">{{ field.label }}</span><textarea v-model="captureDraft[field.key]" rows="3" class="w-full rounded-control border border-border bg-surface px-3 py-2 text-ink focus:border-state-selected focus:outline-none"></textarea></label>
              </div>
              <p class="mt-4 text-caption text-ink-muted">This working capture is temporary and has not been added to the Clinical Record.</p>
            </div>
          </section>
        </div>
        <div class="w-full lg:w-72"><WorkflowStatusPanel :workflowItems="workflowProgress" :activeStage="activeTab" /><p class="mt-4 rounded-panel border border-border bg-surface-subtle p-4 text-body-sm text-ink-muted">Markers and important moments are unavailable until their persistence workflow is approved.</p></div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { authenticatedFetch } from '../../lib/api.js';
import WorkflowStatusPanel from './WorkflowStatusPanel.vue';
const props=defineProps({transcript:{type:Object,default:null},loading:Boolean,error:{type:String,default:''},activeTab:String}); defineEmits(['retry']);
const isTranscriptVisible=ref(true),speakersConfirmed=ref(false),preparingCapture=ref(false),captureError=ref(''),captureDraft=ref(null),speakerIdentities=reactive({});
const captureFields=[{key:'presentingConcerns',label:'Presenting concerns'},{key:'sessionThemes',label:'Session themes'},{key:'interventionsUsed',label:'Interventions used'},{key:'clientResponse',label:'Client response'},{key:'riskSafeguarding',label:'Risk and safeguarding'},{key:'progressGoals',label:'Progress and goals'},{key:'planNextSession',label:'Plan for next session'}];
function findSpeakerLabels(text){const labels=[],seen=new Set();for(const line of String(text||'').split(/\r?\n/)){const match=line.match(/^\s*(?:\[[^\]]+\]\s*)?((?:Speaker\s+\w+)|Therapist|Client|Participant\s+\w+):/i);if(!match)continue;const label=match[1].trim();if(!seen.has(label.toLowerCase())){seen.add(label.toLowerCase());labels.push(label)}}return labels}
const speakerLabels=computed(()=>findSpeakerLabels(props.transcript?.text));
const canConfirmSpeakers=computed(()=>!speakerLabels.value.length||speakerLabels.value.every(label=>speakerIdentities[label]));
watch(()=>props.transcript?.id,()=>{speakersConfirmed.value=false;captureDraft.value=null;captureError.value='';for(const key of Object.keys(speakerIdentities))delete speakerIdentities[key];for(const label of speakerLabels.value){if(/^therapist$/i.test(label))speakerIdentities[label]='Therapist';else if(/^client$/i.test(label))speakerIdentities[label]='Client';else speakerIdentities[label]=''}},{immediate:true});
function confirmSpeakers(){if(!canConfirmSpeakers.value)return;speakersConfirmed.value=true;captureError.value=''}
function editSpeakers(){speakersConfirmed.value=false;captureDraft.value=null;captureError.value=''}
async function prepareSessionCapture(){if(!props.transcript?.id||!speakersConfirmed.value||preparingCapture.value)return;preparingCapture.value=true;captureError.value='';try{const response=await authenticatedFetch('/api/ai/transcript-clinical-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcriptId:props.transcript.id,speakerIdentities:{...speakerIdentities}})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error?.message||'Session capture is temporarily unavailable.');captureDraft.value=payload.data?.draft?{...payload.data.draft}:null;if(!captureDraft.value)throw new Error('Session capture is temporarily unavailable.')}catch(error){captureError.value=error.message||'Session capture is temporarily unavailable.'}finally{preparingCapture.value=false}}
const workflowProgress=[{label:'Recording',status:'Complete'},{label:'Session Capture',status:'In Progress'},{label:'Notes',status:'Not Started'},{label:'Reflection',status:'Not Started'},{label:'Clinical Record',status:'Not Started'},{label:'Professional Development',status:'Not Started'}];
</script>
