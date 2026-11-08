<template>
  <section class="rounded-panel border border-border bg-surface-elevated p-5 space-y-4" data-testid="summary-refinement-panel">
    <div><h3 class="text-h3 font-semibold text-ink">Refine Summary</h3>
      <p class="mt-1 text-body-sm text-ink-secondary">Direct the writing, preview the revised draft, then decide what to keep. Your current draft stays unchanged until you accept the revision.</p></div>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="button-secondary" :disabled="busy || disabled" @click="chooseExample('understanding')">Sharpen the understanding</button>
      <button type="button" class="button-secondary" :disabled="busy || disabled" @click="chooseExample('concise')">Reduce repetition</button>
      <button type="button" class="button-secondary" :disabled="busy || disabled" @click="chooseExample('exercise')">Request a sensing exercise</button>
    </div>
    <label class="block text-body-sm font-medium">What would you like to change?
      <textarea v-model="instruction" data-testid="summary-refinement-instruction" rows="3" maxlength="1800" :disabled="busy || disabled" class="mt-1 w-full border border-border rounded-control bg-surface p-3" placeholder="Describe the emphasis, correction or addition you want. No practitioner or method is selected for you." />
    </label>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label class="block text-body-sm font-medium">Write for
        <select v-model="audience" data-testid="summary-audience" :disabled="busy || disabled" class="mt-1 w-full border border-border rounded-control bg-surface p-2.5">
          <option value="auto">Use the encounter context</option><option value="individual">The individual client</option><option value="shared">The people attending together</option>
        </select>
      </label>
      <label class="block text-body-sm font-medium">Optional addition
        <select v-model="addition" data-testid="summary-addition" :disabled="busy || disabled" class="mt-1 w-full border border-border rounded-control bg-surface p-2.5">
          <option value="none">No new exercise or resource</option><option value="exercise">An optional exercise</option><option value="resource">A resource I select</option><option value="exercise_and_resource">An optional exercise and selected resource</option>
        </select>
      </label>
    </div>
    <p class="text-caption text-ink-muted">Actions already agreed in the session can still be recorded. New exercises are optional suggestions, not completed work or an agreed plan.</p>
    <div v-if="wantsResource" class="rounded-control border border-border-muted bg-surface-subtle p-4 space-y-3" data-testid="summary-resource-picker">
      <h4 class="text-body-sm font-semibold">Select a resource to review</h4>
      <p class="text-caption text-ink-muted">No resource or practitioner is preselected. Paste a public resource or video link. Only the URL is sent for the link check, never the summary or client details. Do not use confidential links.</p>
      <label class="block text-body-sm">Public HTTPS link
        <input v-model="resourceUrl" type="url" maxlength="1000" data-testid="summary-resource-url" :disabled="busy || disabled || checkingLink" class="mt-1 w-full border border-border rounded-control bg-surface p-2.5" placeholder="https://" />
      </label>
      <button type="button" class="button-secondary" data-testid="summary-check-link" :disabled="busy || disabled || checkingLink || !resourceUrl.trim()" @click="checkResource">{{ checkingLink ? 'Checking link...' : 'Check link and preview details' }}</button>
      <div v-if="checkedResource" class="text-body-sm space-y-2" data-testid="summary-resource-details">
        <a :href="checkedResource.url" target="_blank" rel="noopener noreferrer" class="text-action-link underline">{{ checkedResource.title }}</a>
        <p class="text-caption text-ink-muted">Link and metadata checked. This is not an assessment of clinical suitability or an endorsement.</p>
        <label class="block">Client-facing title
          <input v-model="resourceTitle" maxlength="180" :disabled="busy || disabled" class="mt-1 w-full border border-border rounded-control bg-surface p-2" />
        </label>
        <label class="block">Why offer this? <span class="text-ink-muted">(optional)</span>
          <textarea v-model="resourcePurpose" maxlength="500" rows="2" :disabled="busy || disabled" class="mt-1 w-full border border-border rounded-control bg-surface p-2" />
        </label>
        <label class="flex gap-2 items-start"><input v-model="resourceReviewed" type="checkbox" data-testid="summary-resource-reviewed" :disabled="busy || disabled" class="mt-1" /><span>I have reviewed this resource and consider it suitable to offer for this client to consider.</span></label>
      </div>
      <button type="button" class="text-body-sm text-action-link underline" :disabled="busy || disabled" @click="omitResource">Continue without a resource</button>
    </div>
    <p v-if="localError || error" role="alert" class="text-body-sm text-state-danger">{{ localError || error }}</p>
    <button type="button" class="button-primary" data-testid="summary-preview-revision" :disabled="busy || disabled || checkingLink || !body.trim()" @click="requestRevision">{{ busy ? 'Preparing revision...' : 'Preview revised summary' }}</button>
    <div v-if="showPreview && candidate && candidateIsCurrent" class="space-y-3 border-t border-border pt-4" data-testid="summary-revision-preview">
      <h4 class="text-body font-semibold">Proposed revised draft</h4>
      <p class="text-caption text-ink-muted">This has not replaced or approved the current summary. Review it, including any optional addition.</p>
      <SessionSummaryDocument :body="candidate.result.draft.body" compact />
      <p v-for="warning in candidate.result.qualityReview?.warnings || []" :key="warning" class="text-caption text-ink-muted">{{ warning }}</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="button-primary" data-testid="summary-accept-revision" :disabled="busy || disabled" @click="acceptRevision">Use revised draft</button>
        <button type="button" class="button-secondary" data-testid="summary-discard-revision" :disabled="busy" @click="emit('discard')">Keep current draft</button>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue';
import { authenticatedFetch } from '../../lib/api.js';
import { normalizeSummaryOptions, safeResourceUrl, candidateMatches } from '../../lib/summaryAuthoring.js';
import SessionSummaryDocument from './SessionSummaryDocument.vue';
const props=defineProps({body:{type:String,default:''},contextKey:{type:String,required:true},busy:Boolean,disabled:Boolean,candidate:{type:Object,default:null},showPreview:{type:Boolean,default:true},error:{type:String,default:''}});
const emit=defineEmits(['generate','accept','discard']);
const instruction=ref(''),audience=ref('auto'),addition=ref('none');
const resourceUrl=ref(''),resourceTitle=ref(''),resourcePurpose=ref(''),resourceReviewed=ref(false),checkedResource=ref(null),checkingLink=ref(false),localError=ref('');
let checkVersion=0;
const wantsResource=computed(()=>['resource','exercise_and_resource'].includes(addition.value));
const candidateIsCurrent=computed(()=>candidateMatches(props.candidate,props.body,props.contextKey));
watch([instruction,audience,addition,resourceTitle,resourcePurpose,resourceReviewed],()=>{localError.value='';emit('discard');});
watch(resourceUrl,()=>{checkVersion++;checkedResource.value=null;resourceReviewed.value=false;localError.value='';emit('discard');});
watch(()=>props.contextKey,()=>{checkVersion++;instruction.value='';addition.value='none';audience.value='auto';resourceUrl.value='';resourceTitle.value='';resourcePurpose.value='';resourceReviewed.value=false;checkedResource.value=null;localError.value='';emit('discard');});
watch(()=>props.body,()=>{if(props.candidate&&!candidateIsCurrent.value)emit('discard');});
function chooseExample(kind) {
  const examples={
    understanding:'Clarify the most meaningful evidence-supported process, including any exception or unresolved tension. Distinguish reported experience from tentative understanding. Do not invent missing motives, bodily responses or progress.',
    concise:'Remove repetition and generic introductions. Preserve important differences, uncertainties and therapist corrections. Develop one coherent account rather than filling every section.',
    exercise:'Suggest a brief optional exercise for noticing present-moment bodily sensations. Keep it adaptable, allow stopping or choosing not to continue, and do not prescribe a named practitioner or method.'
  };
  instruction.value=examples[kind]||'';
  if(kind==='exercise')addition.value=wantsResource.value?'exercise_and_resource':'exercise';
}
function omitResource(){addition.value=addition.value==='exercise_and_resource'?'exercise':'none';checkedResource.value=null;resourceReviewed.value=false;}
async function checkResource(){
  localError.value='';let url;
  try{url=safeResourceUrl(resourceUrl.value);}catch(error){localError.value=error.message;return;}
  const version=++checkVersion;const context=props.contextKey;checkingLink.value=true;
  try{
    const response=await authenticatedFetch('/api/summary-resource-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const payload=await response.json();
    if(!response.ok||!payload.success||payload.data?.status!=='reachable'||payload.data?.url!==url)throw new Error(payload.error?.message||'The link could not be checked.');
    if(version!==checkVersion||context!==props.contextKey)return;
    checkedResource.value=payload.data;resourceTitle.value=payload.data.title;resourceReviewed.value=false;
  }catch(error){if(version===checkVersion)localError.value=error.message||'The link could not be checked.';}
  finally{if(version===checkVersion)checkingLink.value=false;else checkingLink.value=false;}
}
function requestRevision(){
  if(props.busy||props.disabled||checkingLink.value)return;
  localError.value='';
  try{
    if(wantsResource.value&&(!checkedResource.value||checkedResource.value.url!==safeResourceUrl(resourceUrl.value)))throw new Error('Check the resource link before including it.');
    const summaryOptions=normalizeSummaryOptions({audience:audience.value,addition:addition.value,resource:wantsResource.value?{url:checkedResource.value.url,title:resourceTitle.value,purpose:resourcePurpose.value,reviewed:resourceReviewed.value}:null});
    emit('generate',{instruction:instruction.value.trim()||'Improve clarity, specificity and clinical usefulness without adding new facts or recommendations.',summaryOptions,baseBody:props.body,contextKey:props.contextKey});
  }catch(error){localError.value=error.message;}
}
function acceptRevision(){
  if(props.busy||props.disabled)return;
  if(!candidateIsCurrent.value){localError.value='The draft or selected evidence changed. Prepare a new preview.';emit('discard');return;}
  emit('accept');
}
</script>
