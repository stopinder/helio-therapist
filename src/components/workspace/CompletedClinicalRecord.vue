<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto" data-testid="completed-clinical-record">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <NoticeBanner type="success" message="This approved record is read-only. Corrections must be added through an amendment." icon="🔒" />
      <ClinicalRecordMetadata :version="1" :timestamp="recordTimestamp" :author="therapistName" />
      <ApprovedClinicalRecordView :fields="summaryFields" :data="recordContent" />
      <div v-if="legacyNotes" class="mt-8 pt-8 border-t border-border">
        <h4 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-4">Legacy Session Notes</h4>
        <div class="p-4 rounded-control border border-border-muted bg-surface-muted text-body-sm text-ink whitespace-pre-wrap leading-relaxed">{{ legacyNotes }}</div>
      </div>

      <section v-for="amendment in amendments" :key="amendment.id" class="mt-8 pt-8 border-t-2 border-dashed border-border-muted">
        <h4 class="text-h3 font-semibold text-ink mb-6 flex items-center gap-2"><span class="text-action-link">⟳</span> Record Amendment {{ amendment.sequenceNumber }}</h4>
        <div class="space-y-6">
          <div><h5 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-2">Amendment Reason</h5><div class="p-4 rounded-control border border-border-muted bg-surface-reflection italic text-body-sm text-ink">{{ amendment.reason }}</div></div>
          <div><h5 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-2">Amendment Content</h5><div class="p-4 rounded-control border border-border-muted bg-surface-subtle text-body-sm text-ink leading-relaxed whitespace-pre-wrap">{{ amendment.content }}</div></div>
        </div>
        <p class="mt-6 text-caption text-ink-muted">Approved {{ formatDateTime(amendment.approvedAt) }}</p>
      </section>

      <div v-if="loadError" class="mt-6 p-3 rounded-control bg-state-danger-surface text-state-danger text-body-sm" role="alert">{{ loadError }}</div>
      <div class="mt-8 pt-6 border-t border-border flex flex-wrap gap-3">
        <button type="button" class="px-inline-lg py-stack-sm bg-action-link text-on-action text-body-sm font-medium rounded-control hover:bg-action-link-hover transition-colors shadow-sm" @click="startAmendment">Create Record Amendment</button>
      </div>
    </div>

    <div v-if="editing" class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm" data-testid="clinical-record-amendment-editor">
      <h3 class="text-h3 font-semibold text-ink mb-2">New Record Amendment</h3>
      <p class="text-body-sm text-ink-secondary mb-6">The approved record above will not be changed. This correction will be appended as a separate immutable amendment.</p>
      <div class="space-y-6">
        <div class="space-y-2">
          <label for="amendment-reason" class="text-body-sm font-bold text-ink uppercase tracking-wider">Amendment Reason</label>
          <textarea id="amendment-reason" v-model="draft.reason" rows="2" :disabled="Boolean(activeDictationKey) || Boolean(transcribingKey)" class="w-full p-3 rounded-control border border-border bg-surface-reflection focus:ring-2 focus:ring-state-reflection-focus outline-none disabled:opacity-60" placeholder="Why is this amendment needed?" />
          <div class="flex items-center justify-between gap-3">
            <p v-if="dictationErrorKey === 'reason'" class="text-caption text-state-danger" role="alert">{{ dictationError }}</p>
            <span v-else class="text-caption text-ink-muted">Dictation adds editable amendment text for you to review before approval.</span>
            <button type="button" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border border-border bg-surface text-body-sm font-medium text-ink-secondary hover:bg-surface-subtle disabled:opacity-50" :disabled="saving || (Boolean(activeDictationKey) && activeDictationKey !== 'reason') || (Boolean(transcribingKey) && transcribingKey !== 'reason')" :aria-pressed="activeDictationKey === 'reason'" @click="toggleDictation('reason')"><span aria-hidden="true">🎙️</span>{{ dictationButtonLabel('reason') }}</button>
          </div>
        </div>
        <div class="space-y-2">
          <label for="amendment-content" class="text-body-sm font-bold text-ink uppercase tracking-wider">Amendment Content</label>
          <textarea id="amendment-content" v-model="draft.content" rows="6" :disabled="Boolean(activeDictationKey) || Boolean(transcribingKey)" class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link outline-none disabled:opacity-60" placeholder="Enter the correction or additional clinical context." />
          <div class="flex items-center justify-between gap-3">
            <p v-if="dictationErrorKey === 'content'" class="text-caption text-state-danger" role="alert">{{ dictationError }}</p>
            <span v-else class="text-caption text-ink-muted">Dictation adds editable amendment text for you to review before approval.</span>
            <button type="button" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border border-border bg-surface text-body-sm font-medium text-ink-secondary hover:bg-surface-subtle disabled:opacity-50" :disabled="saving || (Boolean(activeDictationKey) && activeDictationKey !== 'content') || (Boolean(transcribingKey) && transcribingKey !== 'content')" :aria-pressed="activeDictationKey === 'content'" @click="toggleDictation('content')"><span aria-hidden="true">🎙️</span>{{ dictationButtonLabel('content') }}</button>
          </div>
        </div>
      </div>
      <label class="mt-6 flex items-start gap-3"><input v-model="reviewConfirmed" type="checkbox" :disabled="Boolean(activeDictationKey) || Boolean(transcribingKey)" class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-state-focus-ring"><span class="text-body-sm text-ink">I have reviewed this amendment and confirm it should be appended to the clinical record.</span></label>
      <div v-if="saveError" class="mt-4 p-3 rounded-control bg-state-danger-surface text-state-danger text-body-sm" role="alert">{{ saveError }}</div>
      <div class="mt-8 pt-6 border-t border-border flex justify-end gap-3">
        <button type="button" class="px-inline-lg py-stack-sm bg-surface border border-border text-body-sm font-medium text-ink rounded-control disabled:opacity-50" :disabled="saving || Boolean(activeDictationKey) || Boolean(transcribingKey)" @click="cancelAmendment">Cancel</button>
        <button type="button" class="px-inline-lg py-stack-sm bg-action-primary text-on-action text-body-sm font-bold rounded-control disabled:opacity-50" :disabled="saving || !canApprove || Boolean(activeDictationKey) || Boolean(transcribingKey)" @click="approveAmendment">{{ saving ? 'Approving…' : 'Approve Amendment' }}</button>
      </div>
    </div>

    <RecordHistoryPanel :history="recordHistory" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import ApprovedClinicalRecordView from './ApprovedClinicalRecordView.vue'
import ClinicalRecordMetadata from './ClinicalRecordMetadata.vue'
import NoticeBanner from './NoticeBanner.vue'
import RecordHistoryPanel from './RecordHistoryPanel.vue'
import { authenticatedFetch } from '../../lib/api.js'
import { approveClinicalRecordAmendment, listClinicalRecordAmendments } from '../../lib/clinicalRecordAmendments.js'

const props = defineProps({ 
  session: { type: Object, required: true },
  therapistName: { type: String, default: '' }
})
const summaryFields = { presentingConcerns:'Presenting concerns', sessionThemes:'Session themes', interventionsUsed:'Interventions used', clientResponse:'Client response', riskSafeguarding:'Risk and safeguarding', progressGoals:'Progress toward goals', planNextSession:'Plan for next session' }
const amendments = ref([]), editing = ref(false), saving = ref(false), reviewConfirmed = ref(false), loadError = ref(''), saveError = ref('')
const activeDictationKey = ref(''), transcribingKey = ref(''), dictationErrorKey = ref(''), dictationError = ref('')
const draft = reactive({ reason:'', content:'' })
let recorder = null, stream = null, chunks = []
const recordTimestamp = computed(() => props.session.completedAt ? new Date(props.session.completedAt).toLocaleString() : '')
const parsedNotes = computed(() => { try { const value=JSON.parse(props.session.notes || ''); return value && typeof value === 'object' ? value : null } catch { return null } })
const recordContent = computed(() => { const value={ ...(parsedNotes.value || {}) }; delete value.legacyNotes; return value })
const legacyNotes = computed(() => parsedNotes.value?.legacyNotes || (!parsedNotes.value ? props.session.notes || '' : ''))
const canApprove = computed(() => reviewConfirmed.value && draft.reason.trim() && draft.content.trim())
const recordHistory = computed(() => [
  { title:'Version 1', status:'approved_record', statusLabel:'Approved', author:props.therapistName || 'Therapist', approvedDate:recordTimestamp.value },
  ...amendments.value.map(item => ({ title:`Amendment ${item.sequenceNumber}`, status:'amendment_approved', statusLabel:'Approved', author:props.therapistName || 'Therapist', approvedDate:formatDateTime(item.approvedAt), reason:item.reason }))
])

onMounted(loadAmendments)
onBeforeUnmount(stopDictation)
async function loadAmendments(){ loadError.value=''; try { amendments.value=await listClinicalRecordAmendments(props.session.id) } catch { loadError.value='Approved amendments could not be loaded. Please retry before relying on this record history.' } }
function startAmendment(){ draft.reason=''; draft.content=''; reviewConfirmed.value=false; saveError.value=''; dictationErrorKey.value=''; dictationError.value=''; editing.value=true }
function cancelAmendment(){ if(saving.value || activeDictationKey.value || transcribingKey.value)return; editing.value=false }
function dictationButtonLabel(key){ if(transcribingKey.value===key)return'Transcribing…'; if(activeDictationKey.value===key)return'Stop recording'; return'Dictate' }
async function toggleDictation(key){
  if(!editing.value || saving.value)return
  if(activeDictationKey.value===key){ recorder?.stop(); return }
  if(activeDictationKey.value || transcribingKey.value)return
  dictationErrorKey.value=''; dictationError.value=''
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true}); chunks=[]; recorder=new MediaRecorder(stream)
    recorder.ondataavailable=event=>{ if(event.data.size>0)chunks.push(event.data) }
    recorder.onstop=()=>processDictation(key)
    recorder.start(); activeDictationKey.value=key
  }catch{
    dictationErrorKey.value=key; dictationError.value='Microphone access was not available. You can continue by typing.'
  }
}
async function processDictation(key){
  activeDictationKey.value=''; stream?.getTracks().forEach(track=>track.stop())
  const blob=new Blob(chunks,{type:recorder?.mimeType||'audio/webm'}); if(!blob.size)return
  transcribingKey.value=key; dictationErrorKey.value=''; dictationError.value=''
  try{
    const audio=await blobToDataUrl(blob)
    const response=await authenticatedFetch('/api/ai/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio})})
    const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error(payload?.error?.message||'Dictation could not be transcribed.')
    const text=String(payload?.text||'').trim(); if(text)draft[key]=[draft[key].trim(),text].filter(Boolean).join(draft[key].trim()?'\n':'')
  }catch(error){
    dictationErrorKey.value=key; dictationError.value=error.message||'The recording could not be transcribed. Your audio was not saved.'
  }finally{ transcribingKey.value='' }
}
function blobToDataUrl(blob){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(blob) }) }
function stopDictation(){ if(recorder?.state && recorder.state!=='inactive')recorder.stop(); stream?.getTracks().forEach(track=>track.stop()) }
async function approveAmendment(){ if(!canApprove.value || saving.value || activeDictationKey.value || transcribingKey.value)return; saving.value=true; saveError.value=''; try { const saved=await approveClinicalRecordAmendment(props.session.id,{ reason:draft.reason, content:draft.content }); amendments.value=[...amendments.value,saved].sort((a,b)=>a.sequenceNumber-b.sequenceNumber); editing.value=false } catch { saveError.value='The amendment could not be approved. Your approved clinical record has not been changed.' } finally { saving.value=false } }
function formatDateTime(value){ return value ? new Date(value).toLocaleString() : '' }
</script>
