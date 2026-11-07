<template>
  <section :class="embedded ? 'space-y-4' : 'rounded-panel border border-border bg-surface-elevated p-5 space-y-4'" data-testid="source-review-panel" aria-label="Review transcript source">
    <header v-if="!embedded" class="flex flex-wrap justify-between gap-3"><div><h3 class="text-h3 font-semibold">Review the source</h3><p class="text-body-sm text-ink-secondary">Check the original conversation, not just the imported Zoom note. This review does not generate or share a summary.</p></div><button type="button" class="button-secondary" :disabled="busy" @click="$emit('close')">Close review</button></header>
    <p v-if="error" role="alert" class="text-state-danger">{{ error }}</p>
    <button v-if="error && !busy" type="button" class="button-secondary" @click="load">Reload current source</button>
    <p v-if="loading" role="status">Loading the original source...</p>
    <template v-else-if="source">
      <p v-if="source.state === 'separated'" role="status">This original has been separated. Use its reviewed conversation segments.</p>
      <template v-else>
        <p class="text-body-sm">{{ source.message }}</p>
        <div v-for="(item,index) in source.evidence" :key="index" class="border-l-2 border-border pl-3">
          <p class="text-caption font-semibold">{{ evidenceLabel(item.sourceType) }}<span v-if="item.startLine"> · lines {{ item.startLine }}–{{ item.endLine }}</span></p>
          <blockquote class="whitespace-pre-wrap text-body-sm">{{ item.quote }}</blockquote>
        </div>
        <details v-if="source.zoomNote"><summary class="cursor-pointer text-action-link">Imported Zoom note — secondary interpretation</summary><p class="whitespace-pre-wrap text-body-sm mt-3">{{ source.zoomNote }}</p></details>
        <label class="block"><span class="font-semibold text-body-sm">Original transcript · {{ lines.length }} numbered lines</span><textarea :value="numberedSource" readonly rows="12" class="mt-2 w-full font-mono text-body-sm border border-border rounded-control p-3" aria-label="Original transcript with line numbers"></textarea></label>
        <p v-if="!source.text?.trim()" class="text-body-sm text-state-danger">The original transcript is missing. Recover it before confirming attribution or separating conversations.</p>
        <fieldset class="flex flex-wrap gap-4"><legend class="font-semibold mb-2">What does this source contain?</legend><label><input v-model="mode" type="radio" value="confirm" :disabled="busy" /> One encounter</label><label v-if="!source.parentId"><input v-model="mode" type="radio" value="split" :disabled="busy" /> Separate conversations</label></fieldset>
        <template v-if="mode === 'confirm'">
          <p class="text-body-sm">Assigned client: <strong>{{ clientName(source.clientId) }}</strong>. Confirming the encounter does not make an imported note authoritative.</p>
          <label class="block"><span class="text-body-sm font-semibold">Participants and context</span><textarea v-model="context" rows="3" maxlength="4000" class="w-full border border-border rounded-control p-3 mt-1" placeholder="Explain who is speaking and why other people or relationships are discussed." :disabled="busy"></textarea></label>
          <label class="flex gap-2 items-start"><input v-model="reviewed" type="checkbox" :disabled="busy" /><span>I have reviewed the original source and confirm that it belongs to this assigned encounter.</span></label>
          <button type="button" class="button-primary" :disabled="!canConfirm" @click="confirmSource">{{ busy ? 'Saving review...' : 'Confirm this encounter' }}</button>
        </template>
        <template v-else>
          <p class="text-body-sm">Select non-overlapping ranges in source order. Only the selected lines enter each new encounter. Unselected lines remain in the original but are excluded from the new summaries. The original is retained unchanged.</p>
          <fieldset v-for="(segment,index) in segments" :key="segment.key" class="border border-border rounded-panel p-4 space-y-3" :disabled="busy">
            <legend class="font-semibold px-1">Conversation {{ index+1 }}</legend>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>First line<input v-model.number="segment.startLine" type="number" min="1" :max="lines.length" class="control-field" @input="segment.reviewed=false" /></label>
              <label>Last line<input v-model.number="segment.endLine" type="number" min="1" :max="lines.length" class="control-field" @input="segment.reviewed=false" /></label>
              <label>Client<select v-model="segment.clientId" class="control-field" @change="segment.reviewed=false"><option value="">Choose client</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name || client.display_name }}</option></select></label>
              <label>Encounter date and time<input v-model="segment.localDate" type="datetime-local" class="control-field" @input="segment.reviewed=false" /></label>
            </div>
            <details><summary class="cursor-pointer text-action-link">Review this conversation's selected text</summary><pre class="whitespace-pre-wrap break-words max-h-64 overflow-auto text-body-sm mt-2">{{ segmentText(segment) }}</pre></details>
            <label class="flex gap-2"><input v-model="segment.reviewed" type="checkbox" /><span>I reviewed these boundaries and this client assignment.</span></label>
            <button v-if="segments.length>2" type="button" class="button-secondary" @click="segments.splice(index,1)">Remove conversation</button>
          </fieldset>
          <p v-if="segmentError" class="text-state-danger text-body-sm">{{ segmentError }}</p>
          <div class="flex flex-wrap gap-3"><button type="button" class="button-secondary" :disabled="busy || segments.length>=10" @click="addSegment">Add conversation</button><button type="button" class="button-primary" :disabled="busy || !!segmentError" @click="splitSource">{{ busy ? 'Saving reviewed segments...' : 'Create separate reviewed encounters' }}</button></div>
        </template>
      </template>
      <div v-if="createdSegments.length" class="space-y-3" data-testid="reviewed-segments"><p role="status">Separate encounters are available. No summaries were generated by this action.</p><RouterLink v-for="segment in createdSegments" :key="segment.id" :to="{name:'SessionWorkspace',params:{clientId:segment.clientId,sessionId:segment.sessionId},query:{view:'summary',transcriptId:segment.id}}" class="button-primary">Open summary for {{ clientName(segment.clientId) }}</RouterLink></div>
    </template>
  </section>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { authenticatedFetch } from '../../lib/api.js';
import { listClients } from '../../lib/clients.js';
const props=defineProps({transcriptId:{type:String,required:true},embedded:{type:Boolean,default:false}});
const emit=defineEmits(['resolved','close']);
const source=ref(null),clients=ref([]),loading=ref(false),busy=ref(false),error=ref(''),mode=ref('confirm'),context=ref(''),reviewed=ref(false),segments=ref([]),createdSegments=ref([]);
const lines=computed(()=>String(source.value?.text||'').replace(/\r\n?/g,'\n').split('\n'));
const numberedSource=computed(()=>lines.value.map((line,index)=>`${index+1} | ${line}`).join('\n'));
const clientName=id=>clients.value.find(client=>client.id===id)?.name||clients.value.find(client=>client.id===id)?.display_name||'Not assigned';
const evidenceLabel=type=>({transcript:'Original transcript',zoom_note:'Imported Zoom note (not proof of mixed appointments)',session_summary:'Earlier summary',session_capture:'Reviewed session material'})[type]||'Source';
const localDate=iso=>{const date=new Date(iso);if(!Number.isFinite(date.getTime()))return '';date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16)};
let segmentKey=0,loadVersion=0;
function addSegment(){segments.value.push({key:++segmentKey,startLine:1,endLine:1,clientId:'',localDate:localDate(source.value?.occurredAt),reviewed:false})}
function segmentText(segment){return lines.value.slice(Math.max(0,segment.startLine-1),segment.endLine).join('\n')}
const canConfirm=computed(()=>!busy.value && !loading.value && !!source.value?.text?.trim() && reviewed.value && context.value.trim().length>=10 && !!source.value?.clientId && !!source.value?.sessionId);
const segmentError=computed(()=>{
  let previous=0;
  for(const segment of segments.value){
    if(!Number.isInteger(segment.startLine)||!Number.isInteger(segment.endLine)||segment.startLine<=previous||segment.endLine<segment.startLine||segment.endLine>lines.value.length)return 'Choose valid, non-overlapping ranges in source order.';
    if(!segment.clientId||!Number.isFinite(Date.parse(segment.localDate))||!segment.reviewed)return 'Choose each client/date and review every conversation.';
    if(segmentText(segment).trim().length<20)return 'Each conversation needs meaningful source text.';
    previous=segment.endLine;
  }
  return segments.value.length<2?'Choose at least two conversations.':'';
});
async function load(){
  const version=++loadVersion;loading.value=true;error.value='';source.value=null;reviewed.value=false;context.value='';createdSegments.value=[];mode.value='confirm';
  try{
    const [response,availableClients]=await Promise.all([authenticatedFetch(`/api/zoom/source-review?id=${encodeURIComponent(props.transcriptId)}`),listClients()]);
    const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to load source.');if(version!==loadVersion)return;
    source.value=data.data;createdSegments.value=data.data.segments||[];clients.value=availableClients;segments.value=[];addSegment();addSegment();
  }catch(e){if(version===loadVersion)error.value=e.message}finally{if(version===loadVersion)loading.value=false}
}
async function save(action){
  if(busy.value||!source.value)return;busy.value=true;error.value='';
  const version=loadVersion,reviewedSource=source.value,id=props.transcriptId;
  try{
    const response=await authenticatedFetch('/api/zoom/source-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,transcriptId:id,sourceVersion:reviewedSource.sourceVersion,reviewed:true,context:context.value,segments:action==='split'?segments.value.map(item=>({startLine:item.startLine,endLine:item.endLine,clientId:item.clientId,occurredAt:new Date(item.localDate).toISOString(),reviewed:item.reviewed})):[]})});
    const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to save review.');if(version!==loadVersion)return;
    source.value={...reviewedSource,state:data.data.review.state,sourceVersion:data.data.sourceVersion};createdSegments.value=data.data.segments||[];
    emit('resolved',{action,clientId:reviewedSource.clientId,sessionId:reviewedSource.sessionId,...data.data});
  }catch(e){if(version===loadVersion)error.value=e.message}finally{busy.value=false}
}
function confirmSource(){if(canConfirm.value)return save('confirm')}
function splitSource(){if(!segmentError.value)return save('split')}
watch(()=>props.transcriptId,load);onMounted(load);onBeforeUnmount(()=>{loadVersion++});
</script>
