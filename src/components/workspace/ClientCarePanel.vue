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
          <p class="text-body-sm text-ink-muted mt-1 max-w-3xl">Helios compares the available session evidence and the current Therapy Focus, then proposes additions or meaningful updates for you to accept, edit or decline.</p>
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
      <div class="relative">
        <textarea v-model="capture" rows="5" class="w-full border border-border rounded-control bg-surface px-inline-md py-stack-sm pr-20 text-body text-ink" placeholder="Type or speak your reflection…" :disabled="generating"></textarea>
        <div class="absolute bottom-2 right-2 flex items-center gap-1">
          <WhisperMicButton :recording="dictation.recording.value" :transcribing="dictation.transcribing.value" :disabled="generating" label="Dictate therapist reflection" @toggle="dictation.toggle()" />
          <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-action-primary text-on-action shadow-sm hover:bg-action-primary-hover disabled:opacity-40" :disabled="generating || !capture.trim() || dictation.busy.value" aria-label="Generate suggestions" title="Generate suggestions" @click="generateReflection">
            <LoaderCircle v-if="generating" class="h-4 w-4 animate-spin" aria-hidden="true" />
            <Send v-else class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-inline-sm">
        <select v-model="steering" class="border border-border rounded-control bg-surface px-inline-sm py-stack-xs text-body-sm text-ink-secondary">
          <option value="">Balanced suggestions</option>
          <option value="stay close to observable evidence">Stay close to evidence</option>
          <option value="offer alternative hypotheses and avoid premature certainty">Alternative possibilities</option>
          <option value="emphasise gentle behavioural experiments and practical next steps">More behavioural</option>
          <option value="make the language less interpretive and more tentative">Less interpretive</option>
        </select>
      </div>
      <p v-if="dictation.error.value || captureError" class="text-body-sm text-state-danger">{{ dictation.error.value || captureError }}</p>
    </div>

    <div v-if="suggestionSource==='clinical_history' && historySources.length" class="rounded-control border border-border-muted bg-surface-subtle px-inline-md py-stack-sm">
      <p class="text-caption font-semibold text-ink">Evidence reviewed</p>
      <p v-if="historyCoverage" class="mt-1 text-caption text-ink-muted">{{ historyCoverage.selectedSessions }} of {{ historyCoverage.totalSessions }} recorded sessions included. Sessions without eligible reviewed material, and sessions outside the selected window, are not evidence for this review.</p>
      <p v-if="historySources.length===1" class="mt-1 text-caption text-ink-muted">One session supports a snapshot, not an established pattern across sessions.</p>
      <p v-if="!suggestions.length" class="mt-1 text-body-sm text-ink-secondary">No supported additions or meaningful changes were identified.</p>
      <p class="mt-1 text-caption text-ink-muted">{{ historySources.length }} session source{{ historySources.length===1?'':'s' }}</p>
      <p v-for="source in historySources" :key="source.id" class="mt-1 text-caption text-ink-muted">{{ formatDate(source.occurredAt) || 'Date unavailable' }} · {{ source.sourceType==='reviewed_session_capture' ? 'Reviewed Session Capture' : 'Transcript-backed summary' }} · {{ source.reviewStatus || 'Review status unavailable' }}</p>
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
            <p v-if="item.evidence" class="text-caption text-ink-muted mt-stack-xs">{{ epistemicLabel(item.evidence.epistemic) }} · {{ evidenceStrengthLabel(item.evidence.evidenceStrength) }} · Evidence: {{ (item.evidence.sources || []).map(source => formatDate(source.occurredAt) || 'Date unavailable').join(' · ') }}</p>
            <p class="text-caption text-ink-muted mt-stack-xs">Updated {{ formatDate(item.updatedAt) }}<span v-if="item.origin==='ai_assisted'"> · AI-assisted, therapist accepted</span></p>
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
  <details v-if="items.some(item=>item.status==='historical')" class="border-t border-border-muted pt-stack-md">
    <summary class="cursor-pointer text-body-sm font-medium text-action-link">Earlier Therapy Focus</summary>
    <article v-for="item in items.filter(item=>item.status==='historical')" :key="item.id" class="mt-stack-md border-l-2 border-border-muted pl-inline-md">
      <p class="text-caption font-semibold text-ink-muted">{{ sectionTitle(item.kind) }} · Earlier working view</p>
      <p class="mt-1 text-body-sm text-ink-secondary">{{ item.body }}</p>
      <p class="mt-1 text-caption text-ink-muted">{{ formatDate(item.updatedAt) }}</p>
    </article>
  </details>
  <p v-if="saveError && !showReview" class="text-body-sm text-state-danger">{{ saveError }}</p>
</section>
</template>

<script setup>
import HelpLink from '../help/HelpLink.vue'
import { computed,nextTick,onMounted,ref } from 'vue'
import { LoaderCircle, Send } from '@lucide/vue'
import { saveReviewedCareItem,generateCareSuggestions,listClientCareItems,updateClientCareItem } from '../../lib/clientCare.js'
import { appendDictation, useWhisperDictation } from '../../composables/useWhisperDictation.js'
import WhisperMicButton from '../ui/WhisperMicButton.vue'
import { CLINICAL_LENSES,DEFAULT_LENS_ID,getLens } from '../../lib/clinicalLenses.js'

const props=defineProps({clientId:{type:String,required:true}})
const emit=defineEmits(['changed'])
const items=ref([]),loading=ref(true),capture=ref(''),steering=ref(''),suggestions=ref([]),generating=ref(false),saving=ref(false),captureError=ref(''),saveError=ref(''),selectedLensId=ref(DEFAULT_LENS_ID),showReview=ref(false),reviewMode=ref('history'),historyWindow=ref('history'),reviewGoal=ref('review_updates'),suggestionSource=ref(''),historySources=ref([]),historyCoverage=ref(null),provenanceSessionId=ref(null),saveAcceptedArea=ref(null)
const dictation=useWhisperDictation({onText:text=>{capture.value=appendDictation(capture.value,text,'\n')}})

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
function resetSuggestionContext(){suggestions.value=[];suggestionSource.value='';historySources.value=[];historyCoverage.value=null;captureError.value='';provenanceSessionId.value=null}
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
  if(generating.value)return
  suggestions.value=[]
  historySources.value=[]
  historyCoverage.value=null
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
    historyCoverage.value=result.coverage||null
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
        aiPromptVersion:suggestion.promptVersion,
        evidence: suggestionSource.value==='clinical_history' ? {
          sources:historySources.value.filter(source=>(suggestion.sourceIds||[]).includes(source.id)),
          epistemic:suggestion.epistemic, evidenceStrength:suggestion.evidenceStrength,
          coverage:historyCoverage.value
        } : null
      }
      const old=suggestion.action==='update'?targetItem(suggestion):null
      const saved=await saveReviewedCareItem({...createPayload,replacesId:old?.id||null})
      items.value=[saved,...items.value.map(item=>item.id===old?.id?{...item,status:'historical'}:item)]
      suggestion.decision='saved'
      suggestions.value=suggestions.value.filter(item=>item.id!==suggestion.id)
      emit('changed',items.value)
    }
    suggestions.value=suggestions.value.filter(suggestion=>suggestion.decision!=='saved')
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

function formatDate(value){return value?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):''}

onMounted(load)
</script>
