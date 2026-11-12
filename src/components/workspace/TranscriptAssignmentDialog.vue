<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[120] flex items-center justify-center bg-backdrop p-2 sm:p-5" @keydown="handleKeydown">
      <section ref="dialogElement" role="dialog" aria-modal="true" aria-labelledby="assignment-title" tabindex="-1"
        class="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-panel border border-border bg-surface-elevated shadow-overlay" data-testid="assignment-correction-dialog">
        <header class="flex items-start justify-between gap-3 border-b border-border-muted p-4 sm:px-5">
          <div><h2 id="assignment-title" class="text-h3 font-semibold text-ink">Change assignment</h2><p class="mt-1 text-body-sm text-ink-muted">Remove this transcript from this client and encounter, or assign it correctly.</p></div>
          <button ref="closeButton" class="button-secondary" :disabled="busy" @click="emit('close')">Close</button>
        </header>
        <div class="min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          <p v-if="loading" role="status">Checking assignment and related work…</p>
          <div v-if="error" role="alert" class="rounded-control border border-border-muted p-3 text-state-danger"><p>{{ error }}</p><button v-if="!busy" class="button-secondary mt-2" @click="load">Reload current assignment</button></div>
          <div v-if="result" class="rounded-control border border-border bg-surface-subtle p-4 space-y-3" data-testid="assignment-correction-result">
            <p role="status" class="font-semibold text-ink">{{ resultMessage }}</p>
            <p v-if="result.action === 'flag'" class="text-body-sm">The source is marked as disputed and cannot be used to generate or share summaries until reviewed. Its assignment and existing records are retained.</p>
            <p v-else-if="result.deleted" class="text-body-sm">The imported source has been deleted from Helios. The original in Zoom is unchanged.</p>
            <p v-else class="text-body-sm">The correction is saved. Existing client records have not been moved or deleted.</p>
            <div class="flex flex-wrap gap-2">
              <RouterLink v-if="result.action === 'detach'" :to="{path:'/transcripts',query:{view:'unassigned'}}" class="button-secondary" @click="emit('close')">View Unassigned</RouterLink>
              <button v-if="result.canUndo" class="button-secondary" :disabled="busy" @click="save('undo')">{{ busy ? 'Undoing…' : 'Undo correction' }}</button>
              <RouterLink v-if="result.action === 'reassign' && result.sessionId" :to="workspace(result.clientId,result.sessionId)" class="button-primary" @click="emit('close')">Open corrected encounter</RouterLink>
              <RouterLink v-if="result.action === 'detach_archive'" :to="{path:'/transcripts',query:{transcript:transcriptId,view:'archived'}}" class="button-secondary" @click="emit('show-archive'); emit('close')">View archived transcript</RouterLink>
              <button class="button-primary" :disabled="busy" @click="emit('close')">Done</button>
            </div>
          </div>
          <template v-else-if="source && !loading">
            <div class="rounded-control border border-border-muted bg-surface-subtle p-3">
              <p class="text-body-sm">Assigned to <strong>{{ clientName(source.clientId) }}</strong></p>
              <p class="text-caption text-ink-muted">Encounter: {{ formatDate(source.occurredAt) }}</p>
            </div>
            <details v-if="source.text || source.zoomNote" class="rounded-control border border-border-muted p-3">
              <summary class="cursor-pointer font-medium text-action-link">Review source</summary>
              <p v-if="source.zoomNote" class="mt-3 whitespace-pre-wrap break-words text-body-sm">{{ source.zoomNote }}</p>
              <details v-if="source.text" class="mt-3"><summary class="cursor-pointer text-action-link">Original transcript</summary><TranscriptConversation class="mt-3" :transcript="source" /></details>
            </details>
            <div v-if="source.blocked" class="rounded-control border border-border-muted p-4 space-y-3" data-testid="assignment-affected-work">
              <h3 class="font-semibold text-ink">Related work needs review</h3>
              <p class="text-body-sm text-ink-secondary">These items are linked to the current encounter. Review them before moving or deleting the transcript. Approved records require an explicit correction.</p>
              <ul class="list-disc pl-5 text-body-sm space-y-1"><li v-for="(item,index) in source.affected" :key="index">{{ item.label }}<span v-if="item.count > 1"> ({{ item.count }})</span><span v-if="item.status"> · {{ item.status }}</span></li></ul>
              <RouterLink v-if="source.clientId && source.sessionId" :to="workspace(source.clientId,source.sessionId)" class="button-secondary" @click="emit('close')">Review affected encounter</RouterLink>
              <RouterLink v-if="source.clientId" :to="{path:'/clients/'+source.clientId,query:{tab:'documents'}}" class="button-secondary" @click="emit('close')">Review client documents</RouterLink>
              <button class="button-primary" :disabled="busy" @click="save('flag')">{{ busy ? 'Marking for review…' : 'Mark assignment incorrect and pause source use' }}</button>
            </div>
            <template v-else>
              <fieldset class="space-y-3" :disabled="busy">
                <legend class="mb-3 font-semibold text-ink">What would you like to do?</legend>
                <label v-for="option in options" :key="option.value" class="flex items-start gap-3 rounded-control border p-3 cursor-pointer" :class="action===option.value ? 'border-border bg-surface-subtle' : 'border-border-muted'">
                  <input v-model="action" type="radio" name="correction-action" :value="option.value" class="mt-1" />
                  <span><span class="block font-medium text-body-sm" :class="option.value==='detach_delete' ? 'text-state-danger' : 'text-ink'">{{ option.label }}</span><span class="block mt-1 text-caption text-ink-muted">{{ option.description }}</span></span>
                </label>
              </fieldset>
              <div v-if="action==='reassign'" class="space-y-3">
                <label class="block text-body-sm font-medium">Correct client<select v-model="targetClientId" class="control-field mt-1 w-full" :disabled="busy"><option value="">Choose client…</option><option v-for="client in availableClients.filter(c=>!c.archived && c.id!==source.clientId)" :key="client.id" :value="client.id">{{ client.name || client.display_name }}</option></select></label>
                <label v-if="targetClientId" class="block text-body-sm font-medium">Encounter<select v-model="targetSessionId" class="control-field mt-1 w-full" :disabled="busy || sessionsLoading"><option value="">New imported encounter · {{ formatDate(source.occurredAt) }}</option><option v-for="session in targetSessions" :key="session.id" :value="session.id">{{ formatDate(session.occurredAt || session.startedAt || session.createdAt) }} · {{ session.status }}</option></select></label>
                <p v-if="sessionsLoading" role="status" class="text-caption text-ink-muted">Loading encounters…</p>
              </div>
              <p v-if="action==='detach_delete'" class="text-body-sm text-state-danger">This deletes the imported transcript and Zoom note from Helios. It cannot be undone.</p>
              <label class="flex items-start gap-2 text-body-sm"><input v-model="confirmed" type="checkbox" :disabled="busy" class="mt-1" /><span>{{ confirmationText }}</span></label>
              <p v-if="!confirmed" class="text-caption text-ink-muted">Review the source and tick the confirmation before continuing.</p>
              <button class="button-primary" :disabled="busy || !confirmed || (action==='reassign' && (!targetClientId || sessionsLoading))" @click="save(action)">{{ busy ? 'Saving correction…' : options.find(o=>o.value===action)?.label }}</button>
              <p class="text-caption text-ink-muted">An empty original encounter is retained so you can undo the correction. No existing notes or records are transferred.</p>
            </template>
          </template>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import TranscriptConversation from '../TranscriptConversation.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { authenticatedFetch } from '../../lib/api.js'
import { listClients } from '../../lib/clients.js'
import { listSessions } from '../../lib/sessions.js'
const props=defineProps({transcriptId:{type:String,required:true},clients:{type:Array,default:()=>[]}})
const fetchedClients=ref([])
const availableClients=computed(()=>props.clients.length?props.clients:fetchedClients.value)
const emit=defineEmits(['close','changed','show-archive'])
const source=ref(null),loading=ref(false),busy=ref(false),error=ref(''),result=ref(null)
const action=ref('reassign'),targetClientId=ref(''),targetSessionId=ref(''),targetSessions=ref([]),sessionsLoading=ref(false),confirmed=ref(false)
const dialogElement=ref(null),closeButton=ref(null)
let requestVersion=0,sessionVersion=0,previousFocus,previousOverflow
const options=[
  {value:'reassign',label:'Assign to another client',description:'Choose the correct client and encounter.'},
  {value:'detach',label:'Detach and return to Inbox',description:'Remove the client and encounter links; keep the source under Unassigned.'},
  {value:'detach_archive',label:'Detach and archive',description:'Remove both links and keep the source under Archived.'},
  {value:'detach_delete',label:'Detach and delete',description:'Remove both links and permanently delete the imported source from Helios.'}
]
const clientName=id=>availableClients.value.find(c=>c.id===id)?.name||availableClients.value.find(c=>c.id===id)?.display_name||(id?'Assigned client':'Unassigned')
const formatDate=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Date unavailable'
const workspace=(clientId,sessionId)=>({name:'SessionWorkspace',params:{clientId,sessionId},query:{view:'summary',transcriptId:props.transcriptId}})
const confirmationText=computed(()=>action.value==='reassign'?`I reviewed the source and confirm it belongs to ${targetClientId.value?clientName(targetClientId.value):'the client I select'} and the selected encounter.`:action.value==='detach_delete'?'I confirm this assignment is incorrect and want to permanently delete the imported source.':`I confirm this assignment is incorrect and want to detach it from ${clientName(source.value?.clientId)}.`)
const resultMessage=computed(()=>({reassign:`Assigned to ${clientName(result.value?.clientId)}.`,detach:'Detached and returned to Unassigned.',detach_archive:'Detached and archived.',detach_delete:'Detached and deleted.',flag:'Assignment marked incorrect. Related work needs review.',undo:'Correction undone. The previous assignment is restored.'})[result.value?.action]||'Correction saved.')
async function load(){
  if(busy.value)return
  const version=++requestVersion;loading.value=true;error.value='';result.value=null;source.value=null;confirmed.value=false
  try{const [response,rows]=await Promise.all([authenticatedFetch('/api/zoom/transcript-assignment?id='+encodeURIComponent(props.transcriptId)),props.clients.length?Promise.resolve([]):listClients()]);if(version===requestVersion)fetchedClients.value=rows;const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to check the assignment.');if(version!==requestVersion)return;source.value=data.data}
  catch(e){if(version===requestVersion)error.value=e.message}finally{if(version===requestVersion)loading.value=false}
}
async function save(operation){
  if(busy.value || !source.value || (operation!=='flag' && operation!=='undo' && !confirmed.value))return
  busy.value=true;error.value=''
  const version=requestVersion,current=result.value||source.value
  try{
    const response=await authenticatedFetch('/api/zoom/transcript-assignment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:props.transcriptId,action:operation,sourceVersion:current.sourceVersion,expectedUpdatedAt:current.updatedAt,confirmed:true,targetClientId:operation==='reassign'?targetClientId.value:undefined,targetSessionId:operation==='reassign'?targetSessionId.value||null:undefined,eventId:operation==='undo'?current.eventId:undefined})})
    const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'The correction could not be saved. Reload to check the current assignment.');if(version!==requestVersion)return
    if(data.data?.id!==props.transcriptId || data.data?.action!==operation || !data.data?.sourceVersion)throw new Error('The saved result could not be verified. Reload to check the current assignment.')
    result.value=data.data;emit('changed',data.data)
  }catch(e){if(version===requestVersion)error.value=e.message}finally{busy.value=false}
}
watch([action,targetClientId,targetSessionId],()=>{confirmed.value=false})
watch(targetClientId,async id=>{
  const version=++sessionVersion;targetSessionId.value='';targetSessions.value=[];sessionsLoading.value=!!id
  if(!id)return
  try{const rows=await listSessions({clientId:id});if(version===sessionVersion)targetSessions.value=(rows||[]).filter(s=>String(s.clientId)===String(id) && ['source_ready','in_progress'].includes(s.status))}
  catch{if(version===sessionVersion)error.value='Existing encounters could not be loaded. A new imported encounter is available.'}
  finally{if(version===sessionVersion)sessionsLoading.value=false}
})
function handleKeydown(event){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy.value)emit('close');return}
  if(event.key!=='Tab')return
  const elements=[...dialogElement.value.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(e=>e.getClientRects().length)
  const first=elements[0],last=elements.at(-1)
  if(!first){event.preventDefault();dialogElement.value.focus()}
  else if(event.shiftKey && (document.activeElement===first || document.activeElement===dialogElement.value)){event.preventDefault();last.focus()}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
}
watch(()=>props.transcriptId,load)
onMounted(async()=>{previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';await nextTick();closeButton.value?.focus();void load()})
onBeforeUnmount(()=>{requestVersion++;sessionVersion++;document.body.style.overflow=previousOverflow;void nextTick(()=>{if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})})})
</script>
