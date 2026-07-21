<template>
  <section class="transcript-inbox">
    <template v-if="!selected">
      <header class="page-header">
        <div>
          <p class="eyebrow">Zoom imports</p>
          <h1>Transcript Inbox</h1>
          <p>Review incoming source material, then decide what needs to happen next. Nothing is analysed automatically.</p>
        </div>
        <span v-if="errorMessage" class="count unavailable">Inbox unavailable</span>
        <span v-else-if="actionableCount" class="count">{{ actionableSummary }}</span>
        <span v-else class="count quiet">Inbox up to date</span>
      </header>

      <div v-if="transcripts.length" class="queue-controls">
        <label class="inbox-search">
          <span>Search transcripts</span>
          <input v-model="searchQuery" type="search" placeholder="Search by client, meeting or status" />
        </label>
        <div class="filters" aria-label="Transcript filters">
          <button v-for="filter in filters" :key="filter.id" :class="{ active: filterMode === filter.id }" @click="filterMode = filter.id">{{ filter.label }}</button>
        </div>
      </div>

      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
      <div v-if="loading" class="empty-card">Loading transcripts…</div>
      <div v-else-if="!errorMessage && !transcripts.length" class="empty-card">
        <div>📝</div>
        <h2>Inbox up to date</h2>
        <p>New Zoom transcripts will appear here when they need review.</p>
      </div>
      <div v-else-if="filteredTranscripts.length" class="inbox-list">
        <button v-for="transcript in filteredTranscripts" :key="transcript.id" class="transcript-row" @click="openTranscript(transcript)">
          <span class="meeting-icon">📝</span>
          <span class="row-main">
            <strong>{{ labelFor(transcript) }}</strong>
            <small>{{ formatDate(transcript.receivedAt) }} · Zoom cloud transcript</small>
            <small v-if="transcript.clientId && clientName(transcript.clientId)" class="assigned-client">Assigned client · {{ clientName(transcript.clientId) }}</small>
          </span>
          <span :class="['status', workflowState(transcript).id]">{{ workflowState(transcript).label }}</span>
          <span class="open">{{ primaryAction(transcript) }} ›</span>
        </button>
      </div>
      <div v-else class="empty-card compact">
        <h2>{{ filterMode === 'attention' ? 'Inbox up to date' : 'No matching transcripts' }}</h2>
        <p>{{ filterMode === 'attention' ? 'New Zoom transcripts will appear here when they need review.' : 'Try another search term or filter.' }}</p>
      </div>
    </template>

    <template v-else>
      <header class="review-header">
        <button class="back" @click="selected = null">‹ Transcript Inbox</button>
        <div>
          <p class="eyebrow">Transcript review</p>
          <h1>{{ labelFor(selected) }}</h1>
          <p>{{ formatDate(selected.receivedAt) }} · original Zoom transcript</p>
        </div>
      </header>

      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
      <p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>

      <ol class="review-progress" aria-label="Transcript review progress">
        <li :class="{ complete: selected.clientId, current: !selected.clientId }">
          <span>{{ selected.clientId ? '✓' : '1' }}</span><div><strong>Client</strong><small>{{ selected.clientId ? clientName(selected.clientId) : 'Choose client' }}</small></div>
        </li>
        <li :class="{ complete: selected.sessionRef, current: selected.clientId && !selected.sessionRef }">
          <span>{{ selected.sessionRef ? '✓' : '2' }}</span><div><strong>Session</strong><small>{{ selected.sessionRef ? 'Linked' : 'Link or create a session' }}</small></div>
        </li>
        <li :class="{ complete: selected.reviewChoicesSavedAt, current: selected.sessionRef && !selected.reviewChoicesSavedAt }">
          <span>{{ selected.reviewChoicesSavedAt ? '✓' : '3' }}</span><div><strong>Review choices</strong><small>{{ selected.reviewChoicesSavedAt ? 'Saved' : 'Choose output and retention' }}</small></div>
        </li>
      </ol>

      <section class="workflow-section client-section">
        <template v-if="!selected.clientId || editingClient">
          <div>
            <p class="eyebrow">Client</p>
            <h2>Client</h2>
            <p>Select the client this original Zoom transcript belongs to. Helio will not guess.</p>
          </div>
          <div class="assignment-controls">
            <label for="client-select">Client</label>
            <select id="client-select" v-model="selectedClientId">
              <option value="" disabled>Select a client…</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
            <p v-if="!clients.length" class="field-help">Add a client first, then return here to assign this transcript.</p>
            <div class="assignment-actions">
              <button v-if="selected.clientId" class="secondary" :disabled="saving" @click="editingClient = false">Cancel</button>
              <button class="primary" :disabled="saving || !selectedClientId || selectedClientId === selected.clientId" @click="saveAssignment">
                {{ saving ? 'Saving…' : selected.clientId ? 'Change client' : 'Assign client' }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div><p class="eyebrow">Client</p><h2>{{ clientName(selected.clientId) }}</h2><p>Assigned client</p></div>
          <button class="secondary" @click="editingClient = true">Change</button>
        </template>
      </section>

      <section v-if="selected.clientId" class="workflow-section session-section">
        <template v-if="!selected.sessionRef || editingSession">
          <div>
            <p class="eyebrow">Session</p>
            <h2>Session</h2>
            <p>Link this transcript to an existing session or create a new one.</p>
          </div>
          <div class="assignment-controls">
            <label for="session-select">Session</label>
            <select id="session-select" v-model="selectedSessionRef">
              <option value="" disabled>Select a session…</option>
              <option v-for="session in sessionsForClient" :key="session.id" :value="String(session.id)">{{ sessionOptionLabel(session) }}</option>
            </select>
            <p v-if="!sessionsForClient.length" class="field-help">No sessions for this client yet. Create one from this transcript when you are ready.</p>
            <div class="assignment-actions">
              <button class="secondary" :disabled="saving" @click="createSessionFromTranscript">{{ saving ? 'Creating…' : 'Create session' }}</button>
              <button v-if="selected.sessionRef" class="secondary" :disabled="saving" @click="editingSession = false">Cancel</button>
              <button class="primary" :disabled="saving || !selectedSessionRef || selectedSessionRef === selected.sessionRef" @click="saveSessionLink">
                {{ saving ? 'Saving…' : selected.sessionRef ? 'Change session' : 'Link session' }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div><p class="eyebrow">Session</p><h2>Linked session</h2><p>This transcript is linked to one therapeutic encounter.</p></div>
          <button class="secondary" @click="editingSession = true">Change</button>
        </template>
      </section>

      <section class="raw-transcript">
        <header>
          <div><h2>Original transcript</h2><p>This is the original transcript imported from Zoom. Helio has not analysed or changed it.</p></div>
          <div class="source-actions">
            <button class="secondary" :aria-expanded="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide original transcript' : 'View original transcript' }}</button>
            <button class="secondary download" @click="downloadRaw(selected)">Download .txt</button>
          </div>
        </header>
        <pre v-if="showRaw">{{ selected.text }}</pre>
      </section>

      <section v-if="selected.clientId && selected.sessionRef && (!selected.reviewChoicesSavedAt || editingChoices)" class="review-choices">
        <div>
          <p class="eyebrow">Review choices</p>
          <h2>Review choices</h2>
          <p>Choose what, if anything, should be requested later and how the original source should be retained. This does not start analysis.</p>
        </div>
        <label for="clinical-output">Requested output</label>
        <select id="clinical-output" v-model="selectedLens">
          <option value="">No output requested</option>
          <option value="clinical_summary">Clinical summary</option>
          <option value="draft_note">Draft clinical note</option>
          <option value="cbt">CBT reflection</option>
        </select>
        <fieldset>
          <legend>Source retention</legend>
          <label><input v-model="sourceRetention" type="radio" value="keep_until_review" /> Keep the original source until I review it</label>
          <label><input v-model="sourceRetention" type="radio" value="delete_after_approved_output" /> Mark for deletion after I approve an output</label>
        </fieldset>
        <div class="assignment-actions">
          <button v-if="selected.reviewChoicesSavedAt" class="secondary" :disabled="saving" @click="editingChoices = false">Cancel</button>
          <button class="primary save-choices" :disabled="saving" @click="saveReviewChoices">
            {{ saving ? 'Saving…' : selected.reviewChoicesSavedAt ? 'Update review choices' : 'Save review choices' }}
          </button>
        </div>
      </section>

      <section v-if="selected.reviewChoicesSavedAt && !editingChoices && !selected.completedAt" class="ready-card">
        <div>
          <p class="eyebrow">Review choices</p>
          <h2>Review choices saved</h2>
          <p>The transcript has been triaged. Continue any clinical work in the linked session.</p>
        </div>
        <div class="assignment-actions">
          <button class="secondary" @click="editingChoices = true">Change choices</button>
          <button class="primary" :disabled="saving" @click="openLinkedSession">Open session</button>
        </div>
      </section>

      <section v-if="selected.completedAt" class="ready-card complete-card">
        <div><p class="eyebrow">Complete</p><h2>No transcript action remains</h2><p>This item is retained for search and in the linked session record.</p></div>
        <button class="secondary" @click="openLinkedSession">View session</button>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const props = defineProps({ clients: { type: Array, default: () => [] }, openTranscriptId: { type: [String, Number], default: null } })
const transcripts = ref([])
const selected = ref(null)
const selectedClientId = ref('')
const selectedSessionRef = ref('')
const selectedLens = ref('')
const sourceRetention = ref('keep_until_review')
const editingClient = ref(false)
const editingSession = ref(false)
const editingChoices = ref(false)
const searchQuery = ref('')
const filterMode = ref('attention')
const showRaw = ref(false)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const localSessions = ref([])

const filters = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' }
]

const actionableCount = computed(() => transcripts.value.filter(item => workflowState(item).id !== 'complete').length)
const actionableSummary = computed(() => `${actionableCount.value} need${actionableCount.value === 1 ? 's' : ''} attention`)
const sessionsForClient = computed(() => localSessions.value
  .filter(session => String(session.clientId) === String(selected.value?.clientId))
  .sort((a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0)))

const filteredTranscripts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return transcripts.value.filter(item => {
    const state = workflowState(item)
    if (filterMode.value === 'attention' && state.id === 'complete') return false
    if (filterMode.value === 'completed' && state.id !== 'complete') return false
    if (!query) return true
    return labelFor(item).toLowerCase().includes(query) ||
      clientName(item.clientId).toLowerCase().includes(query) ||
      state.label.toLowerCase().includes(query) ||
      formatDate(item.receivedAt).toLowerCase().includes(query)
  })
})

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function labelFor(transcript) { return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript' }
function workflowState(transcript) {
  if (!transcript?.clientId || transcript.status === 'unassigned') return { id: 'needs-client', label: 'Needs client' }
  if (!transcript.sessionRef) return { id: 'needs-session', label: 'Needs session' }
  if (!transcript.reviewChoicesSavedAt) return { id: 'needs-review', label: 'Needs review' }
  if (transcript.completedAt) return { id: 'complete', label: 'Complete' }
  return { id: 'review-saved', label: 'Review choices saved' }
}
function primaryAction(transcript) {
  return ({ 'needs-client': 'Assign client', 'needs-session': 'Link session', 'needs-review': 'Review transcript', 'review-saved': 'Open session', complete: 'View' })[workflowState(transcript).id]
}
function clientName(clientId) { return props.clients.find(client => client.id === clientId)?.name || '' }
function sessionOptionLabel(session) {
  const state = ({ planned: 'Planned', in_progress: 'In progress', completed: 'Completed', closed: 'Closed' })[session.status] || 'Completed'
  return `${formatDate(session.startedAt || session.createdAt)} · ${state}`
}
function loadLocalSessions() {
  try { localSessions.value = JSON.parse(localStorage.getItem('helio_sessions') || '[]') } catch { localSessions.value = [] }
}
function persistLocalSessions() { localStorage.setItem('helio_sessions', JSON.stringify(localSessions.value)) }
function replaceTranscript(transcript) {
  const index = transcripts.value.findIndex(item => item.id === transcript.id)
  if (index >= 0) transcripts.value[index] = transcript
  selected.value = transcript
}
function openTranscript(transcript) {
  selected.value = transcript
  selectedClientId.value = transcript.clientId || ''
  selectedSessionRef.value = transcript.sessionRef || ''
  selectedLens.value = transcript.requestedLens || ''
  sourceRetention.value = transcript.sourceRetention || 'keep_until_review'
  errorMessage.value = ''
  successMessage.value = ''
  showRaw.value = false
  loadLocalSessions()
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
  } finally { loading.value = false }
}
async function patchTranscript(body, fallbackMessage) {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.value.id, ...body })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || fallbackMessage)
    replaceTranscript(data.transcript)
    return data.transcript
  } catch (error) {
    errorMessage.value = error.message || fallbackMessage
    return null
  } finally { saving.value = false }
}
async function saveAssignment() {
  const transcript = await patchTranscript({ clientId: selectedClientId.value }, 'Unable to save the client assignment.')
  if (transcript) {
    selectedSessionRef.value = ''
    editingClient.value = false
    successMessage.value = `Assigned to ${clientName(transcript.clientId)}. Link the session next.`
  }
}
async function clearAssignment() {
  const transcript = await patchTranscript({ clientId: null }, 'Unable to clear the client assignment.')
  if (transcript) {
    selectedClientId.value = ''
    selectedSessionRef.value = ''
    successMessage.value = 'Transcript left unassigned.'
  }
}
async function saveSessionLink() {
  const transcript = await patchTranscript({ sessionRef: selectedSessionRef.value }, 'Unable to link this session.')
  if (transcript) {
    editingSession.value = false
    successMessage.value = 'Session linked. Review transcript handling next.'
  }
}
async function createSessionFromTranscript() {
  if (!selected.value?.clientId) return
  const newSession = {
    id: `zoom-${selected.value.meetingId || selected.value.id}-${Date.now()}`,
    clientId: selected.value.clientId,
    startedAt: selected.value.receivedAt,
    createdAt: new Date().toISOString(),
    status: 'completed',
    workflowStatus: 'needs_review',
    notes: '',
    notesStatus: 'saved',
    createdFromTranscript: true
  }
  localSessions.value = [newSession, ...localSessions.value]
  persistLocalSessions()
  selectedSessionRef.value = String(newSession.id)
  await saveSessionLink()
}
async function saveReviewChoices() {
  const transcript = await patchTranscript({
    requestedLens: selectedLens.value || null,
    sourceRetention: sourceRetention.value,
    reviewChoicesSaved: true
  }, 'Unable to save review choices.')
  if (transcript) {
    editingChoices.value = false
    successMessage.value = 'Review choices saved. No analysis has started.'
  }
}
async function markComplete() {
  const transcript = await patchTranscript({ markComplete: true }, 'Unable to complete this transcript.')
  if (transcript) successMessage.value = 'Transcript review is complete.'
}
async function openLinkedSession() {
  if (!selected.value?.sessionRef) return
  if (selected.value.reviewChoicesSavedAt && !selected.value.completedAt) {
    const completed = await patchTranscript({ markComplete: true }, 'Unable to complete transcript triage.')
    if (!completed) return
  }
  window.dispatchEvent(new CustomEvent('helio:open-session', { detail: { sessionId: selected.value.sessionRef, clientId: selected.value.clientId } }))
  selected.value = null
}
function downloadRaw(transcript) {
  const blob = new Blob([transcript.text], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `helio-zoom-transcript-${transcript.meetingId || transcript.id}.txt`
  link.click()
  URL.revokeObjectURL(link.href)
}
async function openQueuedTranscript(id) {
  if (!id) return
  if (!transcripts.value.length) await load()
  const transcript = transcripts.value.find(item => String(item.id) === String(id))
  if (transcript) openTranscript(transcript)
}
watch(() => props.openTranscriptId, openQueuedTranscript)
onMounted(async () => { await load(); loadLocalSessions(); openQueuedTranscript(props.openTranscriptId) })
</script>

<style scoped>
.transcript-inbox{max-width:68rem;margin:0 auto;color:#2c3e50}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.eyebrow{margin:0 0 .25rem;color:#64748b;text-transform:uppercase;font-size:.72rem;font-weight:750;letter-spacing:.08em}.page-header h1,.review-header h1{margin:0;font-size:1.75rem}.page-header p:not(.eyebrow),.review-header p:not(.eyebrow){margin:.3rem 0 0;color:#64748b;line-height:1.5}.count{white-space:nowrap;border-radius:999px;padding:.4rem .65rem;background:#fff7ed;color:#9a3412;font-size:.8rem;font-weight:700}.count.quiet{background:#ecfdf5;color:#047857}.queue-controls{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin:0 0 1rem}.inbox-search{display:block;flex:1;max-width:32rem}.inbox-search span,.assignment-controls label{display:block;font-size:.8rem;font-weight:750;margin-bottom:.35rem}.inbox-search input,.assignment-controls select,.review-choices select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:.6rem;padding:.68rem .75rem;font-size:.95rem;color:#334155;background:white}.filters{display:flex;gap:.4rem;flex-wrap:wrap}.filters button{border:1px solid #cbd5e1;background:white;border-radius:999px;padding:.45rem .65rem;color:#475569;font-weight:700;font-size:.8rem}.filters button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.notice{margin:0 0 1rem;padding:.75rem;border-radius:.6rem}.notice.error{background:#fef2f2;color:#b91c1c}.notice.success{background:#ecfdf5;color:#047857}.empty-card{min-height:18rem;display:flex;flex-direction:column;justify-content:center;align-items:center;background:white;border:1px solid #dbe1e8;border-radius:.85rem;padding:2rem;text-align:center;color:#64748b}.empty-card.compact{min-height:10rem}.empty-card div{font-size:2rem}.empty-card h2{color:#334155;margin:.5rem}.empty-card p{max-width:30rem;line-height:1.5}.inbox-list{background:white;border:1px solid #dbe1e8;border-radius:.85rem;overflow:hidden}.transcript-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:1rem;width:100%;border:0;border-bottom:1px solid #edf0f4;background:white;padding:1rem 1.2rem;text-align:left;color:#334155}.transcript-row:last-child{border-bottom:0}.transcript-row:hover{background:#eff6ff}.meeting-icon{font-size:1.25rem}.row-main{display:flex;min-width:0;flex-direction:column;gap:.2rem}.row-main small{color:#64748b}.row-main .assigned-client{color:#475569;font-weight:650}.status{font-size:.72rem;font-weight:700;padding:.25rem .5rem;border-radius:999px;white-space:nowrap}.status.needs-client{background:#fff7ed;color:#9a3412}.status.needs-session,.status.needs-review{background:#eff6ff;color:#1d4ed8}.status.review-saved{background:#fef3c7;color:#92400e}.status.complete{background:#ecfdf5;color:#047857}.open{color:#2563eb;font-weight:650;white-space:nowrap}.review-header{margin-bottom:1rem}.review-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem;list-style:none;padding:0;margin:0 0 1rem}.review-progress li{display:flex;gap:.55rem;align-items:center;padding:.65rem .75rem;border:1px solid #dbe1e8;border-radius:.65rem;background:#fff;color:#64748b}.review-progress li>span{display:grid;place-items:center;width:1.45rem;height:1.45rem;border-radius:50%;background:#e2e8f0;color:#475569;font-size:.75rem;font-weight:800}.review-progress strong,.review-progress small{display:block}.review-progress small{font-size:.73rem;margin-top:.12rem}.review-progress .complete{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.review-progress .complete>span{background:#16a34a;color:#fff}.review-progress .current{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}.review-progress .current>span{background:#2563eb;color:#fff}.back{border:0;background:transparent;padding:0 0 .8rem;color:#2563eb;font-weight:700;font-size:.9rem}.workflow-section,.raw-transcript,.review-choices,.ready-card{background:white;border:1px solid #dbe1e8;border-radius:.85rem;padding:1.25rem;margin-bottom:1rem}.workflow-section{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,24rem);gap:1.5rem;align-items:center;background:#f8fbff;border-color:#bfdbfe}.workflow-section>button{justify-self:end}.workflow-section h2,.raw-transcript h2,.ready-card h2,.review-choices h2{font-size:1.15rem;margin:.1rem 0}.workflow-section p:not(.eyebrow),.raw-transcript p,.ready-card p,.review-choices p:not(.eyebrow){color:#64748b;line-height:1.45;margin:.35rem 0}.field-help{font-size:.78rem;color:#9a3412;margin:.35rem 0 0}.assignment-actions{display:flex;gap:.6rem;margin-top:.75rem;flex-wrap:wrap}.primary,.secondary{padding:.65rem .8rem;border-radius:.6rem;font-weight:700}.primary{border:1px solid #2563eb;background:#2563eb;color:white}.primary:disabled,.secondary:disabled{opacity:.55;cursor:not-allowed}.secondary{border:1px solid #cbd5e1;background:white;color:#334155}.raw-transcript header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.source-actions{display:flex;gap:.6rem;flex-wrap:wrap}.raw-transcript pre{margin:1rem 0 0;max-height:28rem;overflow:auto;white-space:pre-wrap;word-break:break-word;border-radius:.6rem;background:#f8fafc;padding:1rem;color:#334155;font:.86rem/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}.review-choices{display:grid;gap:.8rem;background:#f8fbff;border-color:#bfdbfe}.review-choices>label,.review-choices legend{font-size:.8rem;font-weight:750}.review-choices fieldset{margin:0;padding:.8rem;border:1px solid #dbe1e8;border-radius:.6rem;display:grid;gap:.55rem}.review-choices fieldset label{color:#475569;font-size:.9rem}.review-choices input{accent-color:#2563eb}.save-choices{justify-self:start}.ready-card{display:flex;align-items:center;justify-content:space-between;gap:1rem}.complete-card{border-color:#bbf7d0;background:#f0fdf4}@media(max-width:700px){.page-header,.queue-controls,.raw-transcript header,.ready-card{flex-direction:column;align-items:stretch}.transcript-row{grid-template-columns:auto minmax(0,1fr);gap:.55rem}.status{justify-self:start}.open{grid-column:2}.workflow-section{grid-template-columns:1fr}.workflow-section>button{justify-self:start}.review-progress{grid-template-columns:1fr}.assignment-actions{flex-direction:column}.assignment-actions button,.save-choices{width:100%}.source-actions,.source-actions button{width:100%}}
</style>
