<template>
  <div class="fixed inset-0 z-[70]" @click.self="$emit('close')">
    <section class="absolute right-4 top-[4.25rem] w-[min(24rem,calc(100vw-2rem))] rounded-panel border border-border-muted bg-surface shadow-overlay" role="dialog" aria-labelledby="quick-capture-title">
      <header class="flex items-start justify-between gap-3 border-b border-border-muted px-4 py-3">
        <div><h2 id="quick-capture-title" class="type-ui font-semibold text-ink">My reminders</h2><p class="type-metadata text-ink-muted mt-0.5">Private to you, not part of a client record.</p></div>
        <button type="button" class="p-1.5 rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close quick capture" @click="$emit('close')">×</button>
      </header>
      <div class="max-h-56 overflow-y-auto px-4">
        <p v-if="!reminders.length" class="py-3 type-metadata text-ink-subtle">No outstanding reminders.</p>
        <label v-for="reminder in reminders" :key="reminder.id" class="flex items-start gap-3 border-b border-border-muted py-3 last:border-b-0 cursor-pointer"><input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" :disabled="completingId === reminder.id" @change="complete(reminder)" /><span class="type-ui text-ink-secondary leading-5">{{ reminder.body }}</span></label>
      </div>
      <div class="border-t border-border-muted px-4 py-3">
        <div class="relative">
          <textarea ref="editor" v-model="body" rows="2" maxlength="2000" autofocus class="w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-2 pr-11 type-ui text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring" placeholder="What do you need to remember?" :disabled="saving || isTranscribing" @keydown.meta.enter.prevent="save" @keydown.ctrl.enter.prevent="save" />
          <button type="button" class="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-control transition-colors" :class="isRecording ? 'bg-state-danger/10 text-state-danger' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink'" :disabled="saving || isTranscribing" :aria-label="isRecording ? 'Stop dictation' : 'Dictate reminder'" :title="isRecording ? 'Stop dictation' : 'Dictate reminder'" @click="isRecording ? stopRecording() : startRecording()"><Square v-if="isRecording" class="workspace-icon-sm" aria-hidden="true"/><Mic v-else class="workspace-icon-sm" aria-hidden="true"/></button>
        </div>
        <div class="mt-2 flex items-center justify-between gap-3"><span class="type-metadata text-ink-muted" aria-live="polite">{{ dictationStatus }}</span><button type="button" class="button-primary" :disabled="!canSave || saving || isRecording || isTranscribing" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button></div>
        <p v-if="error" class="mt-2 type-metadata text-state-danger" role="alert">{{ error }}</p>
      </div>
    </section>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Mic, Square } from '@lucide/vue'
import { authenticatedFetch } from '../../lib/api.js'
import { createTherapistReminder, setTherapistReminderCompleted } from '../../lib/therapistReminders.js'
defineProps({ reminders: { type: Array, default: () => [] } })
const emit=defineEmits(['close','saved','changed']);const body=ref(''),editor=ref(null),saving=ref(false),completingId=ref(null),error=ref('');const recorder=ref(null),audioChunks=ref([]),isRecording=ref(false),isTranscribing=ref(false),seconds=ref(0),timer=ref(null);const canSave=computed(()=>body.value.trim().length>0);const dictationStatus=computed(()=>isRecording.value?`Recording · ${seconds.value}s`:isTranscribing.value?'Adding dictation…':'')
async function save(){if(!canSave.value||saving.value)return;saving.value=true;error.value='';try{const reminder=await createTherapistReminder({body:body.value});window.dispatchEvent(new CustomEvent('helios-reminders-changed'));emit('saved',reminder);emit('close')}catch{error.value='Could not save this reminder. Please try again.'}finally{saving.value=false}}
async function complete(reminder){if(!reminder?.id||completingId.value)return;completingId.value=reminder.id;error.value='';try{await setTherapistReminderCompleted({id:reminder.id,completed:true});window.dispatchEvent(new CustomEvent('helios-reminders-changed'));emit('changed')}catch{error.value='Could not complete this reminder. Please try again.'}finally{completingId.value=null}}
async function safeParseJson(response){const contentType=response.headers.get('content-type')||'';if(!contentType.includes('application/json'))return null;try{return await response.json()}catch{return null}}
async function startRecording(){error.value='';try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder.value=new MediaRecorder(stream);audioChunks.value=[];recorder.value.ondataavailable=e=>audioChunks.value.push(e.data);recorder.value.onstop=transcribe;recorder.value.start();isRecording.value=true;seconds.value=0;timer.value=window.setInterval(()=>seconds.value+=1,1000)}catch{error.value='Microphone access is needed to dictate a reminder.'}}
function stopRecording(){if(!recorder.value)return;window.clearInterval(timer.value);recorder.value.stop();recorder.value.stream.getTracks().forEach(track=>track.stop());isRecording.value=false}
async function transcribe(){const blob=new Blob(audioChunks.value,{type:recorder.value?.mimeType||'audio/webm'});const reader=new FileReader();reader.onloadend=async()=>{isTranscribing.value=true;try{const response=await authenticatedFetch('/api/ai/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:reader.result})});const data=await safeParseJson(response);if(!response.ok)throw new Error(data?.error?.message||data?.error||'The recording could not be transcribed.');if(data?.text){body.value=`${body.value}${body.value?' ':''}${data.text}`;editor.value?.focus()}}catch(e){error.value=e.message||'The recording could not be transcribed.'}finally{isTranscribing.value=false}};reader.readAsDataURL(blob)}
onBeforeUnmount(()=>{window.clearInterval(timer.value);recorder.value?.stream?.getTracks().forEach(track=>track.stop())})
</script>
