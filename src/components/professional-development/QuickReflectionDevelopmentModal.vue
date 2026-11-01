<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-backdrop/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="develop-reflection-title" @click.self="$emit('close')">
    <div class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-panel border border-border bg-surface-elevated shadow-overlay">
      <header class="flex items-start justify-between gap-4 border-b border-border-muted px-5 py-4">
        <div>
          <p class="type-eyebrow text-action-link">Captured thought → reflection</p>
          <h2 id="develop-reflection-title" class="mt-1 text-h2 font-semibold text-ink">Develop reflection</h2>
          <p class="mt-2 max-w-3xl text-body-sm leading-6 text-ink-secondary">Keep the original thought, develop it only as far as useful, and decide whether any mapping belongs in Practice Map.</p>
        </div>
        <button type="button" class="rounded-control p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close reflection development" @click="$emit('close')">×</button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-7">
        <div v-if="reflection.clients?.display_name || reflection.session_ref" class="rounded-control border border-border-muted bg-surface-subtle px-4 py-3">
          <p class="text-caption font-semibold text-ink">Linked context</p>
          <p class="mt-1 text-body-sm text-ink-secondary">
            <span v-if="reflection.clients?.display_name">{{ reflection.clients.display_name }}</span>
            <span v-if="reflection.clients?.display_name && reflection.session_ref"> · </span>
            <span v-if="reflection.session_ref">session-linked reflection</span>
          </p>
        </div>

        <section>
          <label for="develop-reflection-body" class="text-body-sm font-semibold text-ink">What stayed with you?</label>
          <textarea id="develop-reflection-body" v-model="body" rows="7" maxlength="20000" class="mt-2 w-full rounded-panel border border-border bg-surface p-4 text-body text-ink outline-none focus:border-state-selected focus:ring-2 focus:ring-state-selected/20"></textarea>
          <div class="mt-2 flex items-center justify-between gap-3">
            <p class="text-caption text-ink-muted">{{ body.length.toLocaleString() }} / 20,000</p>
            <p class="text-caption text-ink-muted">The captured thought remains private unless you choose otherwise.</p>
          </div>
        </section>

        <section class="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <label>
            <span class="text-body-sm font-semibold text-ink">Theme <span class="font-normal text-ink-muted">(optional)</span></span>
            <input v-model="theme" maxlength="120" class="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2 text-body-sm text-ink" placeholder="e.g. urgency, silence, rescuing" />
          </label>
          <label class="inline-flex items-center gap-2 rounded-control border border-border-muted px-3 py-2.5 text-body-sm text-ink-secondary">
            <input v-model="includedInSupervision" type="checkbox" class="h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" />
            Add to Supervision Pack
          </label>
        </section>

        <section class="border-t border-border-muted pt-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="type-eyebrow text-action-link">Optional mapping</p>
              <h3 class="mt-1 text-h3 font-semibold text-ink">What was happening in you?</h3>
              <p class="mt-1 max-w-3xl text-body-sm leading-6 text-ink-muted">Only what you save here can contribute to Practice Map. Blank fields stay out of the map.</p>
            </div>
            <button type="button" class="button-secondary" :disabled="aiLoading || body.trim().length < 50" @click="requestAI">
              {{ aiLoading ? 'Preparing suggestions…' : 'Ask Helios for suggestions' }}
            </button>
          </div>

          <div v-if="showAIConfirm" class="mt-4 rounded-panel border border-state-info/20 bg-state-info-surface/30 p-4">
            <p class="text-body-sm font-semibold text-ink">Use this reflection with Helios?</p>
            <p class="mt-1 text-caption leading-5 text-ink-muted">Helios may suggest mapping from your own reflection text. Client context can inform questions, but it must not be used to decide your inner position or motive. Suggestions are not saved automatically.</p>
            <div class="mt-3 flex gap-2">
              <button type="button" class="button-primary" @click="generateAISuggestions">Continue</button>
              <button type="button" class="button-secondary" @click="showAIConfirm=false">Cancel</button>
            </div>
          </div>

          <div v-if="aiNote" class="mt-4 rounded-control border border-border-muted bg-surface-subtle px-4 py-3">
            <p class="text-caption font-semibold text-ink">Helios suggestions applied as editable draft</p>
            <p class="mt-1 text-caption leading-5 text-ink-muted">{{ aiNote }}</p>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label v-for="field in fields" :key="field.key" class="rounded-control border border-border-muted p-4">
              <span class="text-body-sm font-semibold text-ink">{{ field.label }}</span>
              <span class="mt-1 block text-caption leading-5 text-ink-muted">{{ field.prompt }}</span>
              <textarea v-model="mapping[field.key]" rows="3" maxlength="1000" class="mt-3 w-full rounded-control border border-border bg-surface p-3 text-body-sm text-ink"></textarea>
            </label>
          </div>
        </section>

        <p v-if="error" class="text-body-sm text-state-danger" role="alert">{{ error }}</p>
      </div>

      <footer class="flex flex-col gap-3 border-t border-border-muted bg-surface-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-caption text-ink-muted">Saving marks this captured thought as a developed reflection. Mapping remains optional.</p>
        <div class="flex gap-2">
          <button type="button" class="button-secondary" :disabled="saving" @click="$emit('close')">Keep as captured</button>
          <button type="button" class="button-primary min-w-[10rem] justify-center" :disabled="saving || !body.trim()" @click="save">
            {{ saving ? 'Saving…' : 'Save developed reflection' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import { developQuickReflection, emptyReflectiveMap } from '../../lib/reflections.js'

const props=defineProps({ reflection:{type:Object,required:true} })
const emit=defineEmits(['close','saved'])

const body=ref(props.reflection.body || '')
const theme=ref(props.reflection.theme || '')
const includedInSupervision=ref(Boolean(props.reflection.included_in_supervision))
const mapping=reactive({ ...emptyReflectiveMap(), ...(props.reflection.workspace_content?.reflectiveMap || {}) })
const saving=ref(false),error=ref(''),aiLoading=ref(false),showAIConfirm=ref(false),aiNote=ref('')

const fields=[
  {key:'innerPosition',label:'Inner position',prompt:'How would you describe the response in you that became noticeable?'},
  {key:'protectiveIntention',label:'What was it trying to do?',prompt:'What might this response have been protecting, preventing or managing?'},
  {key:'trigger',label:'What brought it forward?',prompt:'What seemed to bring this response into the foreground?'},
  {key:'impact',label:'How did it affect the work?',prompt:'What happened to your attention, pace, choices or relationship?'},
  {key:'spaceCreated',label:'What created more space?',prompt:'What helped you regain curiosity, steadiness or choice?'},
  {key:'supervisionQuestion',label:'Question to carry forward',prompt:'What deserves further curiosity or a supervision conversation?'}
]

function requestAI(){
  if(body.value.trim().length<50)return
  showAIConfirm.value=true
}
async function generateAISuggestions(){
  showAIConfirm.value=false
  aiLoading.value=true
  error.value=''
  aiNote.value=''
  try{
    const response=await authenticatedFetch('/api/ai/reflect',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({reflectionId:props.reflection.id,draftBody:body.value.trim(),draftTheme:theme.value.trim()})
    })
    const result=await response.json().catch(()=>({}))
    if(!response.ok||!result?.success)throw new Error(result?.error?.message||'Helios could not prepare suggestions.')
    const suggested=result.data?.reflective_map||{}
    for(const field of fields){
      if(!mapping[field.key] && suggested[field.key]) mapping[field.key]=suggested[field.key]
    }
    if(!theme.value.trim()&&result.data?.possible_themes?.[0]?.theme)theme.value=result.data.possible_themes[0].theme
    aiNote.value=result.data?.limitations || 'Review every suggestion and clear anything that does not fit.'
  }catch(e){
    error.value=e.message||'Helios could not prepare mapping suggestions.'
  }finally{aiLoading.value=false}
}
async function save(){
  if(!body.value.trim()||saving.value)return
  saving.value=true
  error.value=''
  try{
    const updated=await developQuickReflection({
      reflectionId:props.reflection.id,
      body:body.value,
      theme:theme.value,
      mapping,
      includedInSupervision:includedInSupervision.value
    })
    emit('saved',updated)
  }catch(e){
    error.value=e.message||'This reflection could not be saved.'
  }finally{saving.value=false}
}
</script>
