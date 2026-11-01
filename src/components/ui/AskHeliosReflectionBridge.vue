<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-backdrop/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ask-reflect-bridge-title" @click.self="$emit('cancel')">
    <div class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-panel border border-border bg-surface-elevated shadow-overlay">
      <header class="flex items-start justify-between gap-4 border-b border-border-muted px-5 py-4">
        <div>
          <p class="type-eyebrow text-action-link">Ask Helios → Reflect</p>
          <h2 id="ask-reflect-bridge-title" class="mt-1 text-h2 font-semibold text-ink">Review before saving</h2>
          <p class="mt-2 max-w-3xl text-body-sm leading-6 text-ink-secondary">Helios has prepared a provisional reflection from your conversation. Only the fields you include below will be saved. Practice Map will use mapping only after you explicitly include and save it.</p>
        </div>
        <button type="button" class="rounded-control p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close reflection review" @click="$emit('cancel')"><X class="h-5 w-5" /></button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div class="rounded-control border border-border-muted bg-surface-subtle px-4 py-3">
          <p class="text-caption font-semibold text-ink">Therapist authorship remains the boundary</p>
          <p class="mt-1 text-caption leading-5 text-ink-muted">Clear or untick anything that does not fit. Check the wording for client identifiers before saving. Blank or excluded mapping fields do not enter Practice Map.</p>
        </div>

        <section class="mt-6" aria-labelledby="reflection-draft-heading">
          <div class="mb-4">
            <h3 id="reflection-draft-heading" class="text-h3 font-semibold text-ink">Reflection</h3>
            <p class="mt-1 text-body-sm text-ink-muted">At least one reflection field must be included to save.</p>
          </div>

          <label class="mb-5 block rounded-control border border-border-muted p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="text-body-sm font-semibold text-ink">Theme <span class="font-normal text-ink-muted">(optional)</span></span>
              <input v-model="themeIncluded" type="checkbox" class="h-4 w-4" :disabled="saving" />
            </div>
            <input v-model="theme" type="text" maxlength="120" class="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2 text-body-sm text-ink" placeholder="Optional theme you want to carry into Reflect" :disabled="saving || !themeIncluded" />
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <article v-for="field in reflectionFields" :key="field.key" class="rounded-control border border-border-muted p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <label :for="'ask-reflection-' + field.key" class="text-body-sm font-semibold text-ink">{{ field.label }}</label>
                  <p class="mt-1 text-caption leading-5 text-ink-muted">{{ field.prompt }}</p>
                </div>
                <label class="inline-flex shrink-0 items-center gap-2 text-caption text-ink-secondary">
                  <input v-model="reflectionState[field.key].include" type="checkbox" class="h-4 w-4" :disabled="saving" />
                  Include
                </label>
              </div>
              <textarea :id="'ask-reflection-' + field.key" v-model="reflectionState[field.key].value" rows="3" maxlength="1400" class="mt-3 w-full rounded-control border border-border bg-surface p-3 text-body-sm text-ink disabled:opacity-50" :disabled="saving || !reflectionState[field.key].include"></textarea>
            </article>
          </div>
        </section>

        <section class="mt-8 border-t border-border-muted pt-6" aria-labelledby="mapping-draft-heading">
          <div class="mb-4">
            <p class="type-eyebrow text-action-link">Optional mapping</p>
            <h3 id="mapping-draft-heading" class="mt-1 text-h3 font-semibold text-ink">What was happening in you?</h3>
            <p class="mt-1 max-w-3xl text-body-sm leading-6 text-ink-muted">These are suggestions, not classifications. If the conversation did not clearly contain first-person evidence for a field, leave it excluded or blank.</p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <article v-for="field in mapFields" :key="field.key" class="rounded-control border border-border-muted bg-surface-muted/40 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <label :for="'ask-map-' + field.key" class="text-body-sm font-semibold text-ink">{{ field.label }}</label>
                  <p class="mt-1 text-caption leading-5 text-ink-muted">{{ field.prompt }}</p>
                </div>
                <label class="inline-flex shrink-0 items-center gap-2 text-caption text-ink-secondary">
                  <input v-model="mapState[field.key].include" type="checkbox" class="h-4 w-4" :disabled="saving" />
                  Include
                </label>
              </div>
              <textarea :id="'ask-map-' + field.key" v-model="mapState[field.key].value" rows="3" maxlength="1000" class="mt-3 w-full rounded-control border border-border bg-surface p-3 text-body-sm text-ink disabled:opacity-50" :disabled="saving || !mapState[field.key].include"></textarea>
            </article>
          </div>
        </section>

        <div v-if="draft.limitations" class="mt-6 rounded-control border border-border-muted bg-surface-subtle px-4 py-3">
          <p class="text-caption font-semibold text-ink">What Helios left uncertain</p>
          <p class="mt-1 text-caption leading-5 text-ink-muted">{{ draft.limitations }}</p>
        </div>

        <p v-if="error" class="mt-5 text-body-sm text-state-danger" role="alert">{{ error }}</p>
      </div>

      <footer class="flex flex-col gap-3 border-t border-border-muted bg-surface-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-caption text-ink-muted">Saving creates a private reflection. It does not write to a client Clinical Record or supervision report.</p>
        <div class="flex gap-2">
          <button type="button" class="button-secondary" :disabled="saving" @click="$emit('cancel')">Cancel</button>
          <button type="button" class="button-primary min-w-[10rem] justify-center" :disabled="saving || !canSave" @click="emitSave">{{ saving ? 'Saving…' : 'Save to Reflect' }}</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { X } from '@lucide/vue'

const props=defineProps({
  draft:{type:Object,required:true},
  saving:Boolean,
  error:{type:String,default:''}
})
const emit=defineEmits(['save','cancel'])

const reflectionFields=[
  {key:'stoodOut',label:'What stood out?',prompt:'The moment, shift or interaction you want to retain.'},
  {key:'emotionalResponse',label:'What did you notice in yourself?',prompt:'Feelings, bodily responses, impulses or changes in attention.'},
  {key:'countertransference',label:'What might the relationship have been evoking?',prompt:'A possibility to consider rather than a conclusion.'},
  {key:'uncertainties',label:'What remains uncertain?',prompt:'Questions, tension, stuckness or something you may have missed.'},
  {key:'supervisionQuestions',label:'What would be useful to take to supervision?',prompt:'Keep the question open enough to explore with another person.'},
  {key:'nextSession',label:'What do you want to remember next time?',prompt:'A light-touch intention rather than a prescription.'}
]
const mapFields=[
  {key:'innerPosition',label:'Inner position',prompt:'How would you describe the response in you that became noticeable?'},
  {key:'protectiveIntention',label:'What was it trying to do?',prompt:'What might this response have been protecting, preventing or managing?'},
  {key:'trigger',label:'What brought it forward?',prompt:'The situation, interaction or feeling that preceded it.'},
  {key:'impact',label:'How did it affect the work?',prompt:'What happened to your attention, pace, choices or the therapeutic relationship?'},
  {key:'spaceCreated',label:'What created more space?',prompt:'What helped you become less driven by the response and more able to choose?'},
  {key:'supervisionQuestion',label:'Question to carry forward',prompt:'What deserves curiosity rather than a private conclusion?'}
]

const reflectionState=reactive(Object.fromEntries(reflectionFields.map(field=>[field.key,{value:'',include:false}])))
const mapState=reactive(Object.fromEntries(mapFields.map(field=>[field.key,{value:'',include:false}])))
const theme=ref('')
const themeIncluded=ref(false)

watch(()=>props.draft, value=>{
  theme.value=String(value?.theme||'')
  themeIncluded.value=Boolean(theme.value.trim())
  for(const field of reflectionFields){
    const text=String(value?.reflection?.[field.key]||'')
    reflectionState[field.key].value=text
    reflectionState[field.key].include=Boolean(text.trim())
  }
  for(const field of mapFields){
    const text=String(value?.reflectiveMap?.[field.key]||'')
    mapState[field.key].value=text
    mapState[field.key].include=Boolean(text.trim())
  }
},{immediate:true,deep:true})

const canSave=computed(()=>reflectionFields.some(field=>reflectionState[field.key].include&&reflectionState[field.key].value.trim().length>=3))

function emitSave(){
  if(!canSave.value)return
  const reflection=Object.fromEntries(reflectionFields.map(field=>[field.key,reflectionState[field.key].include?reflectionState[field.key].value.trim():'']))
  const reflectiveMap=Object.fromEntries(mapFields.map(field=>[field.key,mapState[field.key].include?mapState[field.key].value.trim():'']))
  emit('save',{
    theme:themeIncluded.value?theme.value.trim():'',
    reflection,
    reflectiveMap,
    sourceConversationId:props.draft.conversationId
  })
}
</script>
