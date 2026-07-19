<template>
  <section class="transcript-inbox">
    <template v-if="!selected">
      <header class="page-header">
        <div>
          <p class="eyebrow">Zoom imports</p>
          <h1>Transcript Inbox</h1>
          <p>Review each imported transcript and attach it to the right client. Nothing is analysed automatically.</p>
        </div>
        <span class="count">{{ unassignedCount }} need{{ unassignedCount === 1 ? 's' : '' }} client</span>
      </header>
      <label v-if="transcripts.length" class="inbox-search">
        <span>Search transcripts</span>
        <input v-model="searchQuery" type="search" placeholder="Meeting number or status…" />
      </label>

      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>

      <div v-if="loading" class="empty-card">Loading transcripts…</div>
      <div v-else-if="!transcripts.length" class="empty-card">
        <div>📝</div>
        <h2>No imported transcripts yet</h2>
        <p>When Zoom finishes a cloud transcript, it will appear here ready for your review.</p>
      </div>
      <div v-else-if="filteredTranscripts.length" class="inbox-list">
        <button v-for="transcript in filteredTranscripts" :key="transcript.id" class="transcript-row" @click="openTranscript(transcript)">
          <span class="meeting-icon">📝</span>
          <span class="row-main">
            <strong>{{ labelFor(transcript) }}</strong>
            <small>{{ formatDate(transcript.receivedAt) }} · Zoom cloud transcript</small>
          </span>
          <span :class="['status', transcript.status]">{{ transcript.status === 'unassigned' ? 'Needs client' : 'Assigned' }}</span>
          <span class="open">Review ›</span>
        </button>
      </div>
      <div v-else class="empty-card compact"><h2>No matching transcripts</h2><p>Try another search term.</p></div>
    </template>

    <template v-else>
      <header class="review-header">
        <button class="back" @click="selected = null">‹ Transcript Inbox</button>
        <div>
          <p class="eyebrow">Review transcript</p>
          <h1>{{ labelFor(selected) }}</h1>
          <p>{{ formatDate(selected.receivedAt) }} · original Zoom transcript</p>
        </div>
      </header>

      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
      <p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>

      <section class="assignment-card">
        <div>
          <p class="eyebrow">First step</p>
          <h2>Assign this transcript to a client</h2>
          <p>Helio will not guess. Search for and select the client after checking the meeting.</p>
        </div>
        <div class="assignment-controls">
          <label for="client-select">Client</label>
          <select id="client-select" v-model="selectedClientId" @change="clientSearch = clientName(selectedClientId)">
            <option value="" disabled>Select a client…</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
          </select>
          <p v-if="!clients.length" class="field-help">Add a client first, then return here to assign this transcript.</p>
          <div class="assignment-actions">
            <button class="secondary" :disabled="saving || selected.status === 'unassigned'" @click="clearAssignment">Leave unassigned</button>
            <button class="primary" :disabled="saving || !selectedClientId || selectedClientId === selected.clientId" @click="saveAssignment">
              {{ saving ? 'Assigning…' : 'Assign transcript' }}
            </button>
          </div>
        </div>
      </section>

      <section class="raw-transcript">
        <header>
          <div><h2>Original transcript</h2><p>This is the raw source from Zoom. Helio has not changed it.</p></div>
          <div class="source-actions">
            <button class="secondary" :aria-expanded="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide original transcript' : 'View original transcript' }}</button>
            <button class="secondary download" @click="downloadRaw(selected)">Download .txt</button>
          </div>
        </header>
        <pre v-if="showRaw">{{ selected.text }}</pre>
      </section>

      <section v-if="selected.clientId" class="review-choices">
        <div>
          <p class="eyebrow">Next step</p>
          <h2>Choose what you want to create</h2>
          <p>This records your choice only. Helio will not analyse the source or delete it automatically.</p>
        </div>
        <label for="clinical-output">Clinical output</label>
        <select id="clinical-output" v-model="selectedLens">
          <option value="">Choose later</option>
          <option value="clinical_summary">Clinical summary</option>
          <option value="draft_note">Draft clinical note</option>
          <option value="cbt">CBT reflection</option>
          <option value="supervision_reflection">Supervision reflection</option>
        </select>
        <fieldset>
          <legend>Source retention</legend>
          <label><input v-model="sourceRetention" type="radio" value="keep_until_review" /> Keep the original source until I review it</label>
          <label><input v-model="sourceRetention" type="radio" value="delete_after_approved_output" /> Mark for deletion after I approve an output</label>
        </fieldset>
        <button class="primary save-choices" :disabled="saving" @click="saveReviewChoices">
          {{ saving ? 'Saving…' : 'Save review choices' }}
        </button>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const props = defineProps({ clients: { type: Array, default: () => [] } })
const transcripts = ref([])
const selected = ref(null)
const clientSearch = ref('')
const selectedClientId = ref('')
const selectedLens = ref('')
const sourceRetention = ref('keep_until_review')
const searchQuery = ref('')
const showRaw = ref(false)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const unassignedCount = computed(() => transcripts.value.filter(item => item.status === 'unassigned').length)
const filteredTranscripts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return transcripts.value
  return transcripts.value.filter(item =>
    labelFor(item).toLowerCase().includes(query) ||
    item.status.toLowerCase().includes(query) ||
    formatDate(item.receivedAt).toLowerCase().includes(query)
  )
})

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function labelFor(transcript) {
  return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript'
}
function clientName(clientId) {
  return props.clients.find(client => client.id === clientId)?.name || ''
}
function openTranscript(transcript) {
  selected.value = transcript
  selectedClientId.value = transcript.clientId || ''
  selectedLens.value = transcript.requestedLens || ''
  sourceRetention.value = transcript.sourceRetention || 'keep_until_review'
  clientSearch.value = clientName(transcript.clientId)
  errorMessage.value = ''
  successMessage.value = ''
  showRaw.value = false
}
async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to load transcripts.')
    transcripts.value = data.transcripts || []
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load transcripts.'
  } finally {
    loading.value = false
  }
}
async function updateAssignment(clientId) {
  if (!selected.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.value.id, clientId })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to save the client assignment.')
    const index = transcripts.value.findIndex(item => item.id === data.transcript.id)
    transcripts.value[index] = data.transcript
    selected.value = data.transcript
    selectedClientId.value = data.transcript.clientId || ''
    clientSearch.value = clientName(data.transcript.clientId)
    successMessage.value = data.transcript.clientId ? `Assigned to ${clientSearch.value}.` : 'Transcript left unassigned.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save the client assignment.'
  } finally {
    saving.value = false
  }
}
function saveAssignment() { updateAssignment(selectedClientId.value) }
function clearAssignment() { updateAssignment(null) }
async function saveReviewChoices() {
  if (!selected.value?.clientId) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.value.id,
        clientId: selected.value.clientId,
        requestedLens: selectedLens.value || null,
        sourceRetention: sourceRetention.value
      })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to save review choices.')
    const index = transcripts.value.findIndex(item => item.id === data.transcript.id)
    transcripts.value[index] = data.transcript
    selected.value = data.transcript
    successMessage.value = 'Review choices saved. No analysis has started.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save review choices.'
  } finally {
    saving.value = false
  }
}
function downloadRaw(transcript) {
  const blob = new Blob([transcript.text], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `helio-zoom-transcript-${transcript.meetingId || transcript.id}.txt`
  link.click()
  URL.revokeObjectURL(link.href)
}
watch(() => props.clients, () => { if (selected.value?.clientId) clientSearch.value = clientName(selected.value.clientId) }, { deep: true })
onMounted(load)
</script>

<style scoped>
.transcript-inbox{max-width:68rem;margin:0 auto;color:#2c3e50}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.75rem}.eyebrow{margin:0 0 .25rem;color:#64748b;text-transform:uppercase;font-size:.72rem;font-weight:750;letter-spacing:.08em}.page-header h1,.review-header h1{margin:0;font-size:1.75rem}.page-header p:not(.eyebrow),.review-header p:not(.eyebrow){margin:.3rem 0 0;color:#64748b;line-height:1.5}.count{white-space:nowrap;border-radius:999px;padding:.4rem .65rem;background:#fff7ed;color:#9a3412;font-size:.8rem;font-weight:700}.notice{margin:0 0 1rem;padding:.75rem;border-radius:.6rem}.notice.error{background:#fef2f2;color:#b91c1c}.notice.success{background:#ecfdf5;color:#047857}.empty-card{min-height:22rem;display:flex;flex-direction:column;justify-content:center;align-items:center;background:white;border:1px solid #dbe1e8;border-radius:.85rem;padding:2rem;text-align:center;color:#64748b}.empty-card.compact{min-height:10rem}.empty-card div{font-size:2rem}.empty-card h2{color:#334155;margin:.5rem}.empty-card p{max-width:30rem;line-height:1.5}.inbox-list{background:white;border:1px solid #dbe1e8;border-radius:.85rem;overflow:hidden}.transcript-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:1rem;width:100%;border:0;border-bottom:1px solid #edf0f4;background:white;padding:1rem 1.2rem;text-align:left;color:#334155}.transcript-row:last-child{border-bottom:0}.transcript-row:hover{background:#eff6ff}.meeting-icon{font-size:1.25rem}.row-main{display:flex;min-width:0;flex-direction:column;gap:.2rem}.row-main strong{font-size:1rem}.row-main small{color:#64748b}.status{font-size:.72rem;font-weight:700;padding:.25rem .5rem;border-radius:999px;white-space:nowrap}.status.unassigned{background:#fff7ed;color:#9a3412}.status.ready{background:#ecfdf5;color:#047857}.open{color:#2563eb;font-weight:650;white-space:nowrap}.review-header{margin-bottom:1rem}.back{border:0;background:transparent;padding:0 0 .8rem;color:#2563eb;font-weight:700;font-size:.9rem}.assignment-card,.raw-transcript,.review-choices{background:white;border:1px solid #dbe1e8;border-radius:.85rem;padding:1.25rem;margin-bottom:1rem}.assignment-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,24rem);gap:1.5rem;align-items:center;border-color:#bfdbfe;background:#f8fbff}.assignment-card h2,.raw-transcript h2,.ready-card h2{font-size:1.15rem;margin:.1rem 0}.assignment-card p:not(.eyebrow),.raw-transcript p,.ready-card p{color:#64748b;line-height:1.45;margin:.35rem 0}.assignment-controls label{display:block;font-size:.8rem;font-weight:750;margin-bottom:.35rem}.assignment-controls select{width:100%;box-sizing:border-box;border:1px solid #94a3b8;border-radius:.6rem;background:white;padding:.7rem .8rem;color:#334155;font-size:1rem}.assignment-controls select:focus{outline:3px solid #bfdbfe;border-color:#2563eb}.field-help{font-size:.78rem;color:#9a3412;margin:.35rem 0 0}.assignment-actions{display:flex;gap:.6rem;margin-top:.75rem}.primary,.secondary{padding:.65rem .8rem;border-radius:.6rem;font-weight:700}.primary{border:1px solid #2563eb;background:#2563eb;color:white}.primary:disabled,.secondary:disabled{opacity:.55;cursor:not-allowed}.secondary{border:1px solid #cbd5e1;background:white;color:#334155}.raw-transcript header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.source-actions{display:flex;gap:.6rem;flex-wrap:wrap}.inbox-search{display:block;max-width:32rem;margin:0 0 1rem}.inbox-search span{display:block;font-size:.8rem;font-weight:700;margin-bottom:.35rem}.inbox-search input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:.6rem;padding:.65rem .75rem;font-size:.95rem;color:#334155;background:white}.inbox-search input:focus{outline:3px solid #bfdbfe;border-color:#2563eb}.download{white-space:nowrap}.raw-transcript pre{margin:1rem 0 0;max-height:28rem;overflow:auto;white-space:pre-wrap;word-break:break-word;border-radius:.6rem;background:#f8fafc;padding:1rem;color:#334155;font:.86rem/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}.review-choices{display:grid;gap:.8rem;background:#f8fbff;border-color:#bfdbfe}.review-choices h2{font-size:1.15rem;margin:.1rem 0}.review-choices p:not(.eyebrow){color:#64748b;line-height:1.45;margin:.35rem 0}.review-choices>label,.review-choices legend{font-size:.8rem;font-weight:750}.review-choices select{width:100%;max-width:28rem;box-sizing:border-box;border:1px solid #94a3b8;border-radius:.6rem;background:white;padding:.7rem .8rem;color:#334155;font-size:1rem}.review-choices fieldset{margin:0;padding:.8rem;border:1px solid #dbe1e8;border-radius:.6rem;display:grid;gap:.55rem}.review-choices fieldset label{color:#475569;font-size:.9rem}.review-choices input{accent-color:#2563eb}.save-choices{justify-self:start}@media(max-width:700px){.page-header{flex-direction:column}.transcript-row{grid-template-columns:auto minmax(0,1fr);gap:.55rem}.status{justify-self:start}.open{grid-column:2}.assignment-card{grid-template-columns:1fr}.assignment-actions{flex-direction:column}.assignment-actions button{width:100%}.raw-transcript header{flex-direction:column}.save-choices{width:100%}.source-actions,.download{width:100%}.source-actions button{flex:1}.review-header h1{font-size:1.45rem}}
</style>
