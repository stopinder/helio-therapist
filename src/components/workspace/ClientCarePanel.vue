<template>
<section aria-labelledby="therapy-focus-heading" class="space-y-stack-lg">
  <header class="border-b border-border pb-stack-md flex justify-between items-start flex-wrap gap-inline-md">
    <div>
      <h2 id="therapy-focus-heading" class="text-h2 font-semibold text-ink">Therapy Focus</h2>
      <p class="text-body-sm text-ink-secondary mt-1">The working view of what matters in therapy: aims, shared understanding, what you are trying, change noticed and learning. Nothing AI-assisted is saved without your review.</p>
    </div>
    <div class="flex items-center gap-inline-sm flex-wrap justify-end">
      <HelpLink topic="care-suggestions" label="How Therapy Focus works" />
      <label for="lens-selector" class="text-caption font-medium text-ink-muted">Perspective:</label>
      <select id="lens-selector" v-model="selectedLensId" class="border border-border rounded-control bg-surface px-inline-sm py-stack-xs text-caption text-ink-secondary">
        <option v-for="option in availableLenses" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select>
      <button type="button" class="button-secondary" :aria-expanded="showReview && reviewMode==='history'" aria-controls="therapy-focus-review" @click="openHistoryReview">Review with Helios</button>
      <button type="button" class="button-secondary" :aria-expanded="showReview && reviewMode==='reflection'" aria-controls="therapy-focus-review" @click="openReflection">+ Add reflection</button>
    </div>
  </header>

  <section v-if="showReview" id="therapy-focus-review" class="space-y-stack-md border-t border-border pt-stack-lg" data-testid="therapy-focus-review-panel">
    <div v-if="reviewMode==='session_transcript'" class="rounded-panel border border-state-info/20 bg-state-info/10 p-inline-lg py-stack-md">
      <p class="text-caption font-medium uppercase tracking-wider text-state-info">Session transcript · AI-assisted · not saved</p>
      <p class="mt-1 text-body-sm text-ink-secondary">These CBT-informed possibilities came from the linked session transcript. Review each one. Nothing changes in Therapy Focus unless you accept a suggestion and save the accepted changes.</p>
    </div>

    <div v-else-if="reviewMode==='history'" class="border border-border rounded-panel bg-surface-elevated p-inline-lg py-stack-lg space-y-stack-md">
      <div class="flex flex-wrap items-start justify-between gap-inline-md">
        <div>
          <p class="type-overline text-action-link">Helios Clinical Intelligence</p>
          <h3 class="text-h3 font-semibold text-ink mt-1">Review Therapy Focus with Helios</h3>
          <p class="text-body-sm text-ink-muted mt-1 max-w-3xl">Helios reviews therapist-approved session evidence and the current Therapy Focus, then proposes additions or meaningful updates for you to accept, edit or decline.</p>
        </div>
        <button type="button" class="text-body-sm font-medium text-ink-muted hover:text-ink" @click="closeReview">Close</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-inline-md">
        <label>
          <span class="text-caption font-semibold text-ink">Evidence</span>
          <select v-model="historyWindow" class="mt-1 w-full border border-border rounded-control bg-surface px-inline-sm py-stack-sm text-body-sm text-ink-secondary">
            <option value="current">Latest session</option>
            <option value="last_three">Last 3 sessions</option>
            <option value="last_five">Last 5 sessions</option>
            <option value="history">Entire available history</option>
          </select>
        </label>
        <label>
          <span class="text-caption font-semibold text-ink">Review goal</span>
          <select v-model="reviewGoal" class="mt-1 w-full border border-border rounded-control bg-surface px-inline-sm py-stack-sm text-body-sm text-ink-secondary">
            <option value="fill_empty">Fill empty sections</option>
            <option value="review_updates">Review current Therapy Focus for updates</option>
          </select>
        </label>
        <label>
          <span class="text-caption font-semibold text-ink">Emphasis</span>
          <select v-model="steering" class="mt-1 w-full border border-border rounded-control bg-surface px-inline-sm py-stack-sm text-body-sm text-ink-secondary">
            <option value="">Balanced review</option>
            <option value="stay close to observable evidence">Stay close to evidence</option>
            <option value="offer alternative hypotheses and avoid premature certainty">Alternative possibilities</option>
            <option value="emphasise gentle behavioural experiments and practical next steps">More behavioural</option>
            <option value="make the language less interpretive and more tentative">Less interpretive</option>
          </select>
        </label>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-inline-md pt-stack-sm border-t border-border-muted">
        <p class="text-caption text-ink-muted">Perspective: <strong class="text-ink-secondary">{{ lens.label }}</strong>. Reviewed Session Captures are preferred; transcript-backed session summaries are used when a reviewed capture is unavailable.</p>
        <button type="button" :disabled="generating" class="button-primary shrink-0 justify-center" @click="generateHistory">{{ generating ? 'Reviewing…' : suggestions.length && suggestionSource==='clinical_history' ? 'Review again' : 'Review Therapy Focus' }}</button>
      </div>
      <p v-if="captureError" class="text-body-sm text-state-danger">{{ captureError }}</p>
    </div>

    <div v-else class="border border-border rounded-panel bg-surface-elevated p-inline-lg py-stack-lg space-y-stack-md">
      <div class="flex flex-wrap items-start justify-between gap-inline-md">
        <div>
          <h3 class="text-h3 font-semibold text-ink">Add a therapist reflection</h3>
          <p class="text-body-sm text-ink-muted mt-1">Capture an observation, uncertainty, pattern or possible next step, then ask Helios for suggestions. This draft is not part of the clinical record.</p>
        </div>
        <button type="button" class="text-body-sm font-medium text-ink-muted hover:text-ink" @click="closeReview">Close</button>
      </div>
      <textarea v-model="capture" rows="5" class="w-full border border-border rounded-control bg-surface px-inline-md py-stack-sm text-body text-ink" placeholder="Type here, or use the microphone to dictate…"></textarea>
      <div class="flex flex-wrap items-center gap-inline-sm">
        <button type="button" :disabled="transcribing" class="button-secondary" @click="toggleRecording">{{ recording ? '■ Stop recording' : '🎙 Dictate' }}</button>
        <span v-if="recording" class="text-caption text-action-link">Listening… {{ recordingSeconds }}s</span>
        <span v-else-if="transcribing" class="text-caption text-ink-muted">Transcribing securely…</span>
        <select v-model="steering" class="border border-border rounded-control bg-surface px-inline-sm py-stack-xs text-body-sm text-ink-secondary">
          <option value="">Balanced suggestions</option>
          <option value="stay close to observable evidence">Stay close to evidence</option>
          <option value="offer alternative hypotheses and avoid premature certainty">Alternative possibilities</option>
          <option value="emphasise gentle behavioural experiments and practical next steps">More behavioural</option>
          <option value="make the language less interpretive and more tentative">Less interpretive</option>
        </select>
        <button type="button" :disabled="generating || !capture.trim()" class="button-primary ml-auto" @click="generateReflection">{{ generating ? 'Thinking…' : suggestions.length && suggestionSource==='therapist_reflection' ? 'Regenerate suggestions' : 'Generate suggestions' }}</button>
      </div>
      <p v-if="captureError" class="text-body-sm text-state-danger">{{ captureError }}</p>
    </div>

    <div v-if="suggestionSource==='clinical_history' && historySources.length" class="rounded-control border border-border-muted bg-surface-subtle px-inline-md py-stack-sm">
      <p class="text-caption font-semibold text-ink">Evidence reviewed</p>
      <p class="mt-1 text-caption text-ink-muted">{{ historySources.map(source => formatDate(source.occurredAt)).filter(Boolean).join(' · ') }} · {{ historySources.length }} session source{{ historySources.length===1?'':'s' }}</p>
    </div>

    <section v-if="suggestions.length" class="space-y-stack-md">
      <div>
        <h3 class="text-h3 font-semibold text-ink">Suggestions to review</h3>
        <p class="text-body-sm text-ink-muted mt-1">Suggestions remain provisional until you accept, edit and save them.</p>
      </div>
      <article v-for="suggestion in suggestions" :key="suggestion.id" :data-suggestion-id="suggestion.id" class="border rounded-panel p-inline-lg py-stack-md" :class="suggestion.decision==='accepted'?'border-action-link bg-surface-subtle':'border-border bg-surface-elevated'">
        <div class="flex flex-wrap gap-inline-sm mb-stack-sm">
          <span class="text-caption font-medium text-ink-secondary">{{ sectionTitle(suggestion.kind) }}</span>
          <span class="text-caption text-ink-muted">{{ suggestion.action==='update'?'Possible update':'Possible addition' }}</span>
          <span class="text-caption text-ink-muted">{{ epistemicLabel(suggestion.epistemic) }}</span>
          <span class="text-caption text-ink-muted">{{ basisLabel(suggestion.basis) }}</span>
          <span v-if="suggestion.evidenceStrength" class="text-caption text-ink-muted">{{ evidenceStrengthLabel(suggestion.evidenceStrength) }}</span>
        </div>
        <p v-if="suggestion.sourceIds?.length" class="mb-stack-sm text-caption text-ink-muted">Based on: {{ suggestionSourceLabel(suggestion) }}</p>
        <div v-if="suggestion.action==='update' && targetItem(suggestion)" class="mb-stack-sm pl-inline-md border-l-2 border-border">
          <p class="text-caption text-ink-muted">Current understanding</p>
          <p class="text-body-sm text-ink-secondary mt-1">{{ targetItem(suggestion).body }}</p>
        </div>
        <textarea v-if="suggestion.decision==='accepted'" v-model="suggestion.body" rows="3" class="w-full border border-border rounded-control bg-surface px-inline-md py-stack-sm text-body text-ink"></textarea>
        <p v-else class="text-body text-ink leading-relaxed">{{ suggestion.body }}</p>
        <p v-if="suggestion.reason" class="text-caption text-ink-muted mt-stack-xs">Why Helios raised this: {{ suggestion.reason }}</p>
        <div class="flex gap-inline-sm mt-stack-md">
          <button type="button" class="px-inline-sm py-stack-xs rounded-control text-body-sm font-medium" :class="suggestion.decision==='accepted'?'bg-action-link text-on-action':'border border-border text-ink'" @click="reviewSuggestion(suggestion,'accepted')">Accept</button>
          <button type="button" class="px-inline-sm py-stack-xs border border-border rounded-control text-body-sm text-ink-secondary" @click="reviewSuggestion(suggestion,'declined')">Decline</button>
        </div>
      </article>
      <div v-if="acceptedCount" ref="saveAcceptedArea" class="flex justify-end border-t border-border pt-stack-md">
        <button type="button" :disabled="saving" class="button-primary" @click="saveAccepted">{{ saving?'Saving…':`Save ${acceptedCount} accepted ${acceptedCount===1?'change':'changes'}` }}</button>
      </div>
      <p v-if="saveError" class="text-body-sm text-state-danger">{{ saveError }}</p>
    </section>
  </section>

  <p v-if="loading" class="text-body-sm text-ink-muted py-stack-lg">Loading Therapy Focus…</p>
  <div v-else class="space-y-stack-xl" data-testid="current-care-view">
    <section v-for="section in sections" :key="section.kind">
      <div class="mb-stack-sm">
        <h3 class="text-h3 font-semibold text-ink">{{ section.title }}</h3>
        <div v-if="!itemsFor(section.kind).length" class="mt-1">
          <p class="text-body-sm font-medium text-ink-muted">No entry yet.</p>
          <p class="mt-1 text-caption text-ink-subtle">{{ section.empty }}</p>
        </div>
      </div>
      <div v-if="itemsFor(section.kind).length" class="border-y border-border divide-y divide-border">
        <article v-for="item in itemsFor(section.kind)" :key="item.id" class="py-stack-md flex gap-inline-md justify-between items-start">
          <div>
            <p class="text-body text-ink leading-relaxed">{{ item.body }}</p>
            <p class="text-caption text-ink-muted mt-stack-xs">{{ formatDate(item.updatedAt) }}<span v-if="item.origin==='ai_assisted'"> · AI-assisted, therapist accepted</span></p>
          </div>
          <select :value="item.status" class="shrink-0 border border-border rounded-control bg-surface px-inline-sm py-stack-xs text-caption text-ink-secondary" @change="changeStatus(item,$event.target.value)">
            <option value="current">Current</option>
            <option value="less_relevant">Less relevant</option>
            <option value="paused">Paused</option>
            <option value="historical">Earlier</option>
          </select>
        </article>
      </div>
    </section>
  </div>
  <p v-if="saveError && !showReview" class="text-body-sm text-state-danger">{{ saveError }}</p>
</section>
</template>

<script setup>
import HelpLink from '../help/HelpLink.vue'
import { computed,nextTick,onBeforeUnmount,onMounted,ref } from 'vue'
import { createClientCareItem,generateCareSuggestions,listClientCareItems,transcribeCareAudio,updateClientCareItem } from '../../lib/clientCare.js'
import { CLINICAL_LENSES,DEFAULT_LENS_ID,getLens } from '../../lib/clinicalLenses.js'

const props=defineProps({clientId:{type:String,required:true}})
const emit=defineEmits(['changed'])
const items=ref([]),loading=ref(true),capture=ref(''),steering=ref(''),suggestions=ref([]),generating=ref(false),saving=ref(false),recording=ref(false),transcribing=ref(false),recordingSeconds=ref(0),captureError=ref(''),saveError=ref(''),selectedLensId=ref(DEFAULT_LENS_ID),showReview=ref(false),reviewMode=ref('history'),historyWindow=ref('last_three'),reviewGoal=ref('fill_empty'),suggestionSource=ref(''),historySources=ref([]),provenanceSessionId=ref(null),saveAcceptedArea=ref(null)
let recorder=null,chunks=[],stream=null,recordingTimer=null

const lens=computed(()=>getLens(selectedLensId.value))
const availableLenses=computed(()=>Object.values(CLINICAL_LENSES))
const sections=computed(()=>Object.entries(lens.value.sections).map(([kind,cfg])=>({kind,title:cfg.label,empty:cfg.emptyState})))
const acceptedCount=computed(()=>suggestions.value.filter(s=>s.decision==='accepted').length)

function itemsFor(kind){return items.value.filter(item=>item.kind===kind&&item.status!=='historical')}
function targetItem(suggestion){return items.value.find(item=>item.id===suggestion.targetItemId)}
function sectionTitle(kind){return lens.value.sections[kind]?.label||'Therapy Focus'}
function epistemicLabel(value){return{observation:'Observation',clinical_inference:'Clinical inference',possible_next_step:'Possible next step'}[value]||'Possibility'}
function basisLabel(value){return{therapist_input:'From your reflection',approved_record:'From approved record',both:'Your reflection + approved record',session_transcript:'From session transcript',clinical_history:'From clinical history'}[value]||'Source material'}
function evidenceStrengthLabel(value){return{current_observation:'Current observation',recurring:'Recurring across sessions',explicit_change:'Explicit change',tentative_connection:'Tentative connection'}[value]||''}
function suggestionSourceLabel(suggestion){
  const dates=(suggestion.sourceIds||[]).map(id=>historySources.value.find(source=>source.id===id)?.occurredAt).filter(Boolean).map(formatDate)
  return dates.length?[...new Set(dates)].join(' · '):'selected clinical evidence'
}
function resetSuggestionContext(){suggestions.value=[];suggestionSource.value='';historySources.value=[];captureError.value='';provenanceSessionId.value=null}
function openHistoryReview(){reviewMode.value='history';showReview.value=true;resetSuggestionContext()}
function openReflection(){reviewMode.value='reflection';showReview.value=true;resetSuggestionContext()}
function closeReview(){showReview.value=false}
async function reviewSuggestion(suggestion,decision){
  if(suggestion.decision===decision)return
  suggestion.decision=decision
  await nextTick()
  const next=suggestions.value.find(item=>item.decision==='pending')
  if(next){
    const el=document.querySelector(`[data-suggestion-id="${CSS.escape(String(next.id))}"]`)
    el?.scrollIntoView({behavior:'smooth',block:'center'})
    el?.querySelector('button')?.focus({preventScroll:true})
    return
  }
  if(acceptedCount.value){
    saveAcceptedArea.value?.scrollIntoView({behavior:'smooth',block:'center'})
    saveAcceptedArea.value?.querySelector('button')?.focus({preventScroll:true})
  }
}
function loadStagedSuggestions(){
  const key=`helios-care-suggestions:${props.clientId}`
  const raw=sessionStorage.getItem(key)
  if(!raw)return
  try{
    const staged=JSON.parse(raw)
    if(staged?.lensId!=='gentle_cbt'||!Array.isArray(staged?.suggestions))return
    selectedLensId.value='gentle_cbt'
    suggestions.value=staged.suggestions.map(suggestion=>({...suggestion,decision:'pending'}))
    suggestionSource.value='session_transcript'
    provenanceSessionId.value=staged.sessionId||null
    reviewMode.value='session_transcript'
    showReview.value=true
    sessionStorage.removeItem(key)
  }catch{
    sessionStorage.removeItem(key)
  }
}
async function load(){
  loading.value=true
  try{
    items.value=await listClientCareItems(props.clientId)
    loadStagedSuggestions()
  }catch(error){
    saveError.value=error.code==='CARE_SCHEMA_UNAVAILABLE'?'Therapy Focus storage is not configured in this environment yet.':'Therapy Focus could not be loaded.'
  }finally{
    loading.value=false
  }
}
async function generateReflection(){
  generating.value=true
  captureError.value=''
  suggestionSource.value=''
  historySources.value=[]
  provenanceSessionId.value=null
  try{
    const result=await generateCareSuggestions({
      clientId:props.clientId,
      lensId:selectedLensId.value,
      input:capture.value,
      steering:steering.value,
      currentCare:items.value.filter(item=>item.status!=='historical'),
      sourceMode:'reflection'
    })
    suggestions.value=result.suggestions.map(suggestion=>({...suggestion,decision:'pending'}))
    suggestionSource.value='therapist_reflection'
  }catch(error){
    captureError.value=error.message||'Suggestions could not be generated.'
  }finally{
    generating.value=false
  }
}
async function generateHistory(){
  generating.value=true
  captureError.value=''
  suggestionSource.value=''
  provenanceSessionId.value=null
  try{
    const result=await generateCareSuggestions({
      clientId:props.clientId,
      lensId:selectedLensId.value,
      steering:steering.value,
      currentCare:items.value.filter(item=>item.status!=='historical'),
      sourceMode:'history',
      window:historyWindow.value,
      reviewGoal:reviewGoal.value
    })
    suggestions.value=result.suggestions.map(suggestion=>({...suggestion,decision:'pending'}))
    historySources.value=Array.isArray(result.sources)?result.sources:[]
    suggestionSource.value='clinical_history'
  }catch(error){
    captureError.value=error.message||'Therapy Focus could not be reviewed just now.'
  }finally{
    generating.value=false
  }
}
async function saveAccepted(){
  const accepted=suggestions.value.filter(suggestion=>suggestion.decision==='accepted'&&suggestion.body.trim())
  if(!accepted.length)return
  saving.value=true
  saveError.value=''
  try{
    for(const suggestion of accepted){
      const createPayload={
        clientId:props.clientId,
        kind:suggestion.kind,
        body:suggestion.body,
        origin:'ai_assisted',
        provenanceSessionId:provenanceSessionId.value,
        aiPromptVersion:suggestion.promptVersion
      }
      if(suggestion.action==='update'&&targetItem(suggestion)){
        const old=targetItem(suggestion)
        await updateClientCareItem(old.id,{status:'historical'})
        const saved=await createClientCareItem(createPayload)
        items.value=[saved,...items.value.map(item=>item.id===old.id?{...item,status:'historical'}:item)]
      }else{
        const saved=await createClientCareItem(createPayload)
        items.value.unshift(saved)
      }
    }
    suggestions.value=suggestions.value.filter(suggestion=>suggestion.decision!=='accepted')
    if(!suggestions.value.length){
      suggestionSource.value=''
      provenanceSessionId.value=null
      historySources.value=[]
    }
    emit('changed',items.value)
  }catch{
    saveError.value='These Therapy Focus changes could not be saved. Accepted suggestions remain staged so you can retry.'
  }finally{
    saving.value=false
  }
}
async function changeStatus(item,status){
  try{
    const updated=await updateClientCareItem(item.id,{status})
    items.value=items.value.map(entry=>entry.id===updated.id?updated:entry)
    emit('changed',items.value)
  }catch{
    saveError.value='That Therapy Focus item could not be updated.'
  }
}
async function toggleRecording(){
  if(recording.value){recorder?.stop();return}
  captureError.value=''
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true})
    chunks=[]
    recorder=new MediaRecorder(stream)
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)}
    recorder.onstop=transcribeRecording
    recorder.start()
    recording.value=true
    recordingSeconds.value=0
    recordingTimer=setInterval(()=>recordingSeconds.value++,1000)
  }catch{
    captureError.value='Microphone access was not available. You can continue by typing.'
  }
}
async function transcribeRecording(){
  recording.value=false
  clearInterval(recordingTimer)
  stream?.getTracks().forEach(track=>track.stop())
  const blob=new Blob(chunks,{type:recorder?.mimeType||'audio/webm'})
  if(!blob.size)return
  transcribing.value=true
  try{
    const audio=await blobToDataUrl(blob)
    const text=await transcribeCareAudio(audio)
    capture.value=[capture.value.trim(),text.trim()].filter(Boolean).join(capture.value.trim()?'\n':'')
  }catch(error){
    captureError.value=error.message||'The recording could not be transcribed.'
  }finally{
    transcribing.value=false
  }
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}
function formatDate(value){return value?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):''}

onMounted(load)
onBeforeUnmount(()=>{clearInterval(recordingTimer);stream?.getTracks().forEach(track=>track.stop())})
</script>
