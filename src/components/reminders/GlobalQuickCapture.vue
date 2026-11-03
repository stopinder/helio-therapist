<template>
  <div class="fixed inset-0 z-[70]" @click.self="$emit('close')">
    <section class="absolute right-4 top-[4.25rem] w-[min(26rem,calc(100vw-2rem))] rounded-panel border border-border-muted bg-surface shadow-overlay" role="dialog" aria-labelledby="quick-capture-title">
      <header class="flex items-center justify-between gap-3 border-b border-border-muted px-4 py-3">
        <div>
          <h2 id="quick-capture-title" class="type-ui font-semibold text-ink">Quick capture</h2>
          <div class="mt-2 flex gap-1" role="tablist" aria-label="Capture type">
            <button type="button" role="tab" :aria-selected="mode==='reminder'" class="rounded-control px-2.5 py-1 type-metadata font-semibold" :class="mode==='reminder'?'bg-state-selected text-ink':'text-ink-muted hover:bg-surface-subtle'" @click="mode='reminder'">Reminder</button>
            <button type="button" role="tab" :aria-selected="mode==='reflection'" class="rounded-control px-2.5 py-1 type-metadata font-semibold" :class="mode==='reflection'?'bg-state-selected text-ink':'text-ink-muted hover:bg-surface-subtle'" @click="mode='reflection'">Reflection</button>
          </div>
        </div>
        <button type="button" class="p-1.5 rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close quick capture" @click="$emit('close')">×</button>
      </header>

      <template v-if="mode==='reminder'">
        <div class="max-h-56 overflow-y-auto px-4">
          <p v-if="!reminders.length" class="py-3 type-metadata text-ink-subtle">No outstanding reminders.</p>
          <label v-for="reminder in reminders" :key="reminder.id" class="flex cursor-pointer items-start gap-3 border-b border-border-muted py-3 last:border-b-0">
            <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" :disabled="completingId===reminder.id" @change="complete(reminder)" />
            <span class="type-ui leading-5 text-ink-secondary">{{ reminder.body }}</span>
          </label>
        </div>
        <CaptureEditor v-model="reminderBody" placeholder="What do you need to remember?" :saving="savingReminder" :save-label="savingReminder?'Saving…':'Save'" dictation-label="reminder" @save="saveReminder" />
      </template>

      <template v-else>
        <div v-if="savedReflection" class="px-4 py-4">
          <div class="rounded-panel border border-state-success/20 bg-state-success-surface px-4 py-4">
            <p class="text-body-sm font-semibold text-ink">Saved to Reflect</p>
            <p class="mt-1 text-caption leading-5 text-ink-muted">This is a captured thought, not a finished reflection. You can leave it here or develop it now.</p>
            <p v-if="linkContext && context?.clientId" class="mt-2 text-caption text-ink-secondary">Linked to {{ context.clientName || 'current client' }}<span v-if="context.sessionId"> · current session</span></p>
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <button type="button" class="button-secondary" @click="$emit('close')">Done</button>
            <button type="button" class="button-primary" @click="$emit('continue-reflection', savedReflection)">Develop reflection</button>
          </div>
        </div>
        <template v-else>
          <div v-if="context?.clientId" class="border-b border-border-muted px-4 py-3">
            <label class="flex items-start gap-3">
              <input v-model="linkContext" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" />
              <span>
                <span class="block type-ui font-medium text-ink">Link to {{ context.clientName || 'current client' }}<span v-if="context.sessionId"> · current session</span></span>
                <span class="mt-0.5 block type-metadata text-ink-muted">Optional. Leave unticked for a therapist-only reflection.</span>
              </span>
            </label>
          </div>
          <CaptureEditor v-model="reflectionBody" :rows="6" :max-length="20000" placeholder="Catch the thought before you lose it…" :saving="savingReflection" :save-label="savingReflection?'Saving…':'Save to Reflect'" dictation-label="reflection" @save="saveReflection" />
        </template>
      </template>
      <p v-if="error" class="px-4 pb-3 type-metadata text-state-danger" role="alert">{{ error }}</p>
    </section>
  </div>
</template>

<script setup>
import { defineComponent, h, ref } from 'vue'
import { Send } from '@lucide/vue'
import { appendDictation, useWhisperDictation } from '../../composables/useWhisperDictation.js'
import WhisperMicButton from '../ui/WhisperMicButton.vue'
import { createQuickReflection } from '../../lib/reflections.js'
import { createTherapistReminder, setTherapistReminderCompleted } from '../../lib/therapistReminders.js'

const props=defineProps({
  reminders: { type: Array, default: () => [] },
  context: { type: Object, default: null },
  initialMode: { type: String, default: 'reminder' }
})
const emit=defineEmits(['close','saved','changed','reflection-saved','continue-reflection'])
const mode=ref(props.initialMode==='reflection'?'reflection':'reminder'),reminderBody=ref(''),reflectionBody=ref(''),savingReminder=ref(false),savingReflection=ref(false),completingId=ref(null),error=ref(''),savedReflection=ref(null),linkContext=ref(false)

async function saveReminder(){if(!reminderBody.value.trim()||savingReminder.value)return;savingReminder.value=true;error.value='';try{const reminder=await createTherapistReminder({body:reminderBody.value});window.dispatchEvent(new CustomEvent('helios-reminders-changed'));emit('saved',reminder);emit('close')}catch{error.value='Could not save this reminder. Please try again.'}finally{savingReminder.value=false}}
async function saveReflection(){
  if(!reflectionBody.value.trim()||savingReflection.value)return
  savingReflection.value=true
  error.value=''
  try{
    const reflection=await createQuickReflection({
      body:reflectionBody.value,
      clientId:linkContext.value?props.context?.clientId||null:null,
      sessionId:linkContext.value?props.context?.sessionId||null:null
    })
    savedReflection.value=reflection
    reflectionBody.value=''
    window.dispatchEvent(new CustomEvent('helios-reflections-changed',{detail:{reflectionId:reflection.id}}))
    emit('reflection-saved',reflection)
  }catch{
    error.value='Could not save this reflection. Please try again.'
  }finally{savingReflection.value=false}
}
async function complete(reminder){if(!reminder?.id||completingId.value)return;completingId.value=reminder.id;error.value='';try{await setTherapistReminderCompleted({id:reminder.id,completed:true});window.dispatchEvent(new CustomEvent('helios-reminders-changed'));emit('changed')}catch{error.value='Could not complete this reminder. Please try again.'}finally{completingId.value=null}}

const CaptureEditor=defineComponent({
  name:'CaptureEditor',
  props:{modelValue:{type:String,default:''},placeholder:{type:String,default:''},rows:{type:Number,default:2},maxLength:{type:Number,default:2000},saving:Boolean,saveLabel:{type:String,default:'Save'},dictationLabel:{type:String,default:'note'}},
  emits:['update:modelValue','save'],
  setup(props,{emit}){
    const dictation=useWhisperDictation({
      onText:text=>emit('update:modelValue',appendDictation(props.modelValue,text).slice(0,props.maxLength))
    })
    return()=>h('div',{class:'border-t border-border-muted px-4 py-3'},[
      h('div',{class:'relative'},[
        h('textarea',{value:props.modelValue,rows:props.rows,maxlength:props.maxLength,class:'w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-2 pr-20 type-ui leading-6 text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring',placeholder:props.placeholder,disabled:props.saving,onInput:e=>emit('update:modelValue',e.target.value),onKeydown:e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();emit('save')}}}),
        h('div',{class:'absolute bottom-2 right-2 flex items-center gap-1'},[
          h(WhisperMicButton,{recording:dictation.recording.value,transcribing:dictation.transcribing.value,disabled:props.saving,label:`Dictate ${props.dictationLabel}`,onToggle:()=>dictation.toggle()}),
          h('button',{type:'button',class:'inline-flex h-8 w-8 items-center justify-center rounded-full bg-action-primary text-on-action shadow-sm transition-colors hover:bg-action-primary-hover disabled:opacity-40',disabled:!props.modelValue.trim()||props.saving||dictation.busy.value,'aria-label':props.saveLabel,title:props.saveLabel,onClick:()=>emit('save')},[
            h(Send,{class:'h-4 w-4','aria-hidden':'true'})
          ])
        ])
      ]),
      dictation.error.value?h('p',{class:'mt-1 px-1 type-metadata text-state-danger',role:'alert'},dictation.error.value):null
    ])
  }
})
</script>
