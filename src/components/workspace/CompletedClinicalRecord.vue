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
          <div class="relative">
            <textarea id="amendment-reason" v-model="draft.reason" rows="2" :disabled="dictation.busy.value" class="w-full p-3 pr-12 rounded-control border border-border bg-surface-reflection focus:ring-2 focus:ring-state-reflection-focus outline-none disabled:opacity-60" placeholder="Why is this amendment needed?" />
            <div class="absolute bottom-2 right-2"><WhisperMicButton :recording="dictationTargetKey === 'reason' && dictation.recording.value" :transcribing="dictationTargetKey === 'reason' && dictation.transcribing.value" :disabled="saving || (dictation.busy.value && dictationTargetKey !== 'reason')" label="Dictate amendment reason" @toggle="toggleDictation('reason')" /></div>
          </div>
          <p v-if="dictationTargetKey === 'reason' && dictation.error.value" class="text-caption text-state-danger" role="alert">{{ dictation.error.value }}</p>
        </div>
        <div class="space-y-2">
          <label for="amendment-content" class="text-body-sm font-bold text-ink uppercase tracking-wider">Amendment Content</label>
          <div class="relative">
            <textarea id="amendment-content" v-model="draft.content" rows="6" :disabled="dictation.busy.value" class="w-full p-3 pr-12 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link outline-none disabled:opacity-60" placeholder="Enter the correction or additional clinical context." />
            <div class="absolute bottom-2 right-2"><WhisperMicButton :recording="dictationTargetKey === 'content' && dictation.recording.value" :transcribing="dictationTargetKey === 'content' && dictation.transcribing.value" :disabled="saving || (dictation.busy.value && dictationTargetKey !== 'content')" label="Dictate amendment content" @toggle="toggleDictation('content')" /></div>
          </div>
          <p v-if="dictationTargetKey === 'content' && dictation.error.value" class="text-caption text-state-danger" role="alert">{{ dictation.error.value }}</p>
        </div>
      </div>
      <label class="mt-6 flex items-start gap-3"><input v-model="reviewConfirmed" type="checkbox" :disabled="dictation.busy.value" class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-state-focus-ring"><span class="text-body-sm text-ink">I have reviewed this amendment and confirm it should be appended to the clinical record.</span></label>
      <div v-if="saveError" class="mt-4 p-3 rounded-control bg-state-danger-surface text-state-danger text-body-sm" role="alert">{{ saveError }}</div>
      <div class="mt-8 pt-6 border-t border-border flex justify-end gap-3">
        <button type="button" class="px-inline-lg py-stack-sm bg-surface border border-border text-body-sm font-medium text-ink rounded-control disabled:opacity-50" :disabled="saving || dictation.busy.value" @click="cancelAmendment">Cancel</button>
        <button type="button" class="px-inline-lg py-stack-sm bg-action-primary text-on-action text-body-sm font-bold rounded-control disabled:opacity-50" :disabled="saving || !canApprove || dictation.busy.value" @click="approveAmendment">{{ saving ? 'Approving…' : 'Approve Amendment' }}</button>
      </div>
    </div>

    <RecordHistoryPanel :history="recordHistory" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ApprovedClinicalRecordView from './ApprovedClinicalRecordView.vue'
import ClinicalRecordMetadata from './ClinicalRecordMetadata.vue'
import NoticeBanner from './NoticeBanner.vue'
import RecordHistoryPanel from './RecordHistoryPanel.vue'
import WhisperMicButton from '../ui/WhisperMicButton.vue'
import { appendDictation, useWhisperDictation } from '../../composables/useWhisperDictation.js'
import { approveClinicalRecordAmendment, listClinicalRecordAmendments } from '../../lib/clinicalRecordAmendments.js'

const props = defineProps({ 
  session: { type: Object, required: true },
  therapistName: { type: String, default: '' }
})
const summaryFields = { presentingConcerns:'Presenting concerns', sessionThemes:'Session themes', interventionsUsed:'Interventions used', clientResponse:'Client response', riskSafeguarding:'Risk and safeguarding', progressGoals:'Progress toward goals', planNextSession:'Plan for next session' }
const amendments = ref([]), editing = ref(false), saving = ref(false), reviewConfirmed = ref(false), loadError = ref(''), saveError = ref('')
const dictationTargetKey = ref('')
const draft = reactive({ reason:'', content:'' })
const dictation = useWhisperDictation({
  onText: (text, key) => {
    if (!key || !(key in draft)) return
    draft[key] = appendDictation(draft[key], text, '\n')
  }
})
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
async function loadAmendments(){ loadError.value=''; try { amendments.value=await listClinicalRecordAmendments(props.session.id) } catch { loadError.value='Approved amendments could not be loaded. Please retry before relying on this record history.' } }
function startAmendment(){ draft.reason=''; draft.content=''; reviewConfirmed.value=false; saveError.value=''; dictation.resetError(); editing.value=true }
function cancelAmendment(){ if(saving.value || dictation.busy.value)return; editing.value=false }
function toggleDictation(key){
  if(!editing.value || saving.value)return
  if(!dictation.recording.value){
    dictationTargetKey.value=key
    dictation.resetError()
  }
  dictation.toggle(key)
}

async function approveAmendment(){ if(!canApprove.value || saving.value || dictation.busy.value)return; saving.value=true; saveError.value=''; try { const saved=await approveClinicalRecordAmendment(props.session.id,{ reason:draft.reason, content:draft.content }); amendments.value=[...amendments.value,saved].sort((a,b)=>a.sequenceNumber-b.sequenceNumber); editing.value=false } catch { saveError.value='The amendment could not be approved. Your approved clinical record has not been changed.' } finally { saving.value=false } }
function formatDateTime(value){ return value ? new Date(value).toLocaleString() : '' }
</script>
