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

      <CaptureEditor v-else v-model="reflectionBody" :rows="6" :max-length="20000" placeholder="Capture what came to you…" :saving="savingReflection" :save-label="savingReflection?'Saving…':'Save reflection'" dictation-label="reflection" @save="saveReflection" />
      <p v-if="error" class="px-4 pb-3 type-metadata text-state-danger" role="alert">{{ error }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, ref } from 'vue'
import { Mic, Square } from '@lucide/vue'
import { authenticatedFetch } from '../../lib/api.js'
import { createQuickReflection } from '../../lib/reflections.js'
import { createTherapistReminder, setTherapistReminderCompleted } from '../../lib/therapistReminders.js'

defineProps({ reminders: { type: Array, default: () => [] } })
const emit=defineEmits(['close','saved','changed','reflection-saved'])
const mode=ref('reminder'),reminderBody=ref(''),reflectionBody=ref(''),savingReminder=ref(false),savingReflection=ref(false),completingId=ref(null),error=ref('')

async function saveReminder(){if(!reminderBody.value.trim()||savingReminder.value)return;savingReminder.value=true;error.value='';try{const reminder=await createTherapistReminder({body:reminderBody.value});window.dispatchEvent(new CustomEvent('helios-reminders-changed'));emit('saved',reminder);emit('close')}catch{error.value='Could not save this reminder. Please try again.'}finally{savingReminder.value=false}}
async function saveReflection(){if(!reflectionBody.value.trim()||savingReflection.value)return;savingReflection.value=true;error.value='';try{const reflection=await createQuickReflection({body:reflectionBody.value});window.dispatchEvent(new CustomEvent('helios-reflections-changed'));emit('reflection-saved',reflection);emit('close')}catch{error.value='Could not save this reflection. Please try again.'}finally{savingReflection.value=false}}
async function complete(reminder){if(!reminder?.id||completingId.value)return;completingId.value=reminder.id;error.value='';try{await setTherapistReminderCompleted({id:reminder.id,completed:true});window.dispatchEvent(new CustomEvent('helios-reminders-changed'));emit('changed')}catch{error.value='Could not complete this reminder. Please try again.'}finally{completingId.value=null}}

const CaptureEditor=defineComponent({
  name:'CaptureEditor',
  props:{modelValue:{type:String,default:''},placeholder:{type:String,default:''},rows:{type:Number,default:2},maxLength:{type:Number,default:2000},saving:Boolean,saveLabel:{type:String,default:'Save'},dictationLabel:{type:String,default:'note'}},
  emits:['update:modelValue','save'],
  setup(props,{emit}){
    const recorder=ref(null),chunks=ref([]),recording=ref(false),transcribing=ref(false),seconds=ref(0),timer=ref(null)
    const status=computed(()=>recording.value?`Recording · ${seconds.value}s`:transcribing.value?'Adding dictation…':'')
    async function parse(response){try{return await response.json()}catch{return null}}
    async function start(){error.value='';try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder.value=new MediaRecorder(stream);chunks.value=[];recorder.value.ondataavailable=e=>chunks.value.push(e.data);recorder.value.onstop=transcribe;recorder.value.start();recording.value=true;seconds.value=0;timer.value=window.setInterval(()=>seconds.value+=1,1000)}catch{error.value=`Microphone access is needed to dictate a ${props.dictationLabel}.`}}
    function stop(){if(!recorder.value)return;window.clearInterval(timer.value);recorder.value.stop();recorder.value.stream.getTracks().forEach(track=>track.stop());recording.value=false}
    async function transcribe(){const blob=new Blob(chunks.value,{type:recorder.value?.mimeType||'audio/webm'});const reader=new FileReader();reader.onloadend=async()=>{transcribing.value=true;try{const response=await authenticatedFetch('/api/ai/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:reader.result})});const data=await parse(response);if(!response.ok)throw new Error(data?.error?.message||data?.error||'The recording could not be transcribed.');if(data?.text)emit('update:modelValue',`${props.modelValue}${props.modelValue?' ':''}${data.text}`)}catch(e){error.value=e.message||'The recording could not be transcribed.'}finally{transcribing.value=false}};reader.readAsDataURL(blob)}
    onBeforeUnmount(()=>{window.clearInterval(timer.value);recorder.value?.stream?.getTracks().forEach(track=>track.stop())})
    return()=>h('div',{class:'border-t border-border-muted px-4 py-3'},[
      h('div',{class:'relative'},[
        h('textarea',{value:props.modelValue,rows:props.rows,maxlength:props.maxLength,class:'w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-2 pr-11 type-ui leading-6 text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring',placeholder:props.placeholder,disabled:props.saving||transcribing.value,onInput:e=>emit('update:modelValue',e.target.value),onKeydown:e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();emit('save')}}}),
        h('button',{type:'button',class:['absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-control transition-colors',recording.value?'bg-state-danger/10 text-state-danger':'text-ink-muted hover:bg-surface-subtle hover:text-ink'],disabled:props.saving||transcribing.value,'aria-label':recording.value?'Stop dictation':`Dictate ${props.dictationLabel}`,title:recording.value?'Stop dictation':`Dictate ${props.dictationLabel}`,onClick:()=>recording.value?stop():start()},[h(recording.value?Square:Mic,{class:'workspace-icon-sm','aria-hidden':'true'})])
      ]),
      h('div',{class:'mt-2 flex items-center justify-between gap-3'},[h('span',{class:'type-metadata text-ink-muted','aria-live':'polite'},status.value),h('button',{type:'button',class:'button-primary',disabled:!props.modelValue.trim()||props.saving||recording.value||transcribing.value,onClick:()=>emit('save')},props.saveLabel)])
    ])
  }
})
</script>
