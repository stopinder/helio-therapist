<template>
  <section class="transcript-inbox">
    <template v-if="!selected">
      <header class="page-header">
        <div>
          <p class="eyebrow">Zoom imports</p>
          <h1>Transcript Inbox</h1>
          <p>Turn each Zoom transcript into a reviewed draft, or complete it without AI. Nothing is analysed automatically.</p>
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
        <button class="back" @click="closeTranscript">‹ Transcript Inbox</button>
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
        <li :class="{ complete: selected.completedAt, current: selected.sessionRef && !selected.completedAt }">
          <span>{{ selected.completedAt ? '✓' : '3' }}</span><div><strong>Prepare</strong><small>{{ preparationProgress }}</small></div>
        </li>
      </ol>

      <section class="workflow-section">
        <template v-if="!selected.clientId || editingClient">
          <div><p class="eyebrow">Step 1</p><h2>Choose the client</h2><p>Select who this transcript belongs to. Helio will not guess.</p></div>
          <div class="assignment-controls">
            <label for="client-select">Client</label>
            <select id="client-select" v-model="selectedClientId">
              <option value="" disabled>Select a client…</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
            <p v-if="!clients.length" class="field-help">Add a client first, then return here.</p>
            <div class="assignment-actions">
              <button v-if="selected.clientId" class="secondary" :disabled="busy" @click="editingClient = false">Cancel</button>
              <button class="primary" :disabled="busy || !selectedClientId || selectedClientId === selected.clientId" @click="saveAssignment">
                {{ saving ? 'Saving…' : selected.clientId ? 'Change client' : 'Assign client' }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div><p class="eyebrow">Step 1 · Complete</p><h2>{{ clientName(selected.clientId) }}</h2><p>Assigned client</p></div>
          <button v-if="!outputs.length" class="secondary" :disabled="busy" @click="editingClient = true">Change</button>
          <span v-else class="locked-context">Locked after draft creation</span>
        </template>
      </section>

      <section v-if="selected.clientId" class="workflow-section">
        <template v-if="!selected.sessionRef || editingSession">
          <div><p class="eyebrow">Step 2</p><h2>Link the session</h2><p>Choose the therapeutic encounter this source belongs to.</p></div>
          <div class="assignment-controls">
            <label for="session-select">Session</label>
            <select id="session-select" v-model="selectedSessionRef">
              <option value="" disabled>Select a session…</option>
              <option v-for="session in sessionsForClient" :key="session.id" :value="String(session.id)">{{ sessionOptionLabel(session) }}</option>
            </select>
            <p v-if="!sessionsForClient.length" class="field-help">No session exists yet. Create one from this transcript.</p>
            <div class="assignment-actions">
              <button class="secondary" :disabled="busy" @click="createSessionFromTranscript">{{ saving ? 'Creating…' : 'Create session' }}</button>
              <button v-if="selected.sessionRef" class="secondary" :disabled="busy" @click="editingSession = false">Cancel</button>
              <button class="primary" :disabled="busy || !selectedSessionRef || selectedSessionRef === selected.sessionRef" @click="saveSessionLink">
                {{ saving ? 'Saving…' : selected.sessionRef ? 'Change session' : 'Link session' }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div><p class="eyebrow">Step 2 · Complete</p><h2>Session linked</h2><p>The draft and its source will stay attached to this encounter.</p></div>
          <button v-if="!outputs.length" class="secondary" :disabled="busy" @click="editingSession = true">Change</button>
          <span v-else class="locked-context">Locked after draft creation</span>
        </template>
      </section>

      <section v-if="selected.clientId && selected.sessionRef" class="draft-workspace">
        <div class="draft-heading">
          <div>
            <p class="eyebrow">Step 3</p>
            <h2>What would you like Helio to prepare?</h2>
            <p>Choose one lens. Helio creates an editable draft here; it is not part of the clinical record until you approve it.</p>
          </div>
          <span class="boundary-badge">Therapist approval required</span>
        </div>

        <div class="lens-grid" role="radiogroup" aria-label="Clinical lens">
          <button
            v-for="lens in lensOptions"
            :key="lens.id"
            class="lens-card"
            :class="{ selected: selectedLens === lens.id }"
            role="radio"
            :aria-checked="selectedLens === lens.id"
            :disabled="busy"
            @click="selectedLens = lens.id"
          >
            <strong>{{ lens.label }}</strong>
            <small>{{ lens.description }}</small>
          </button>
        </div>

        <div v-if="!activeOutput" class="generate-row">
          <button class="primary generate" :disabled="busy || !selectedLens" @click="generateDraft">
            {{ generating ? 'Preparing draft…' : selectedLens ? `Generate ${lensLabel(selectedLens)}` : 'Choose a lens' }}
          </button>
          <button class="text-action" :disabled="busy" @click="completeWithoutDraft">Complete without an AI draft</button>
        </div>

        <div v-else class="output-editor">
          <header>
            <div>
              <p class="eyebrow">{{ activeOutput.status === 'approved' ? 'Approved session artifact' : activeOutput.status === 'superseded' ? 'Historical version · read only' : 'AI-generated draft · review required' }}</p>
              <h3>{{ activeOutput.lensLabel }} <span>Version {{ activeOutput.version }}</span></h3>
            </div>
            <label v-if="availableOutputs.length > 1">
              <span>Version</span>
              <select v-model="activeOutputId">
                <option v-for="output in availableOutputs" :key="output.id" :value="output.id">
                  {{ output.lensLabel }} v{{ output.version }} · {{ outputStatusLabel(output.status) }}
                </option>
              </select>
            </label>
          </header>
          <div class="approval-boundary">
            {{ activeOutput.status === 'approved'
              ? 'Approved by the therapist and attached to the linked session. The original transcript remains separate.'
              : activeOutput.status === 'superseded'
                ? 'This version was superseded by a later draft or approval and is retained as read-only history.'
                : 'Check every statement. Edit or remove anything unsupported before approval.' }}
          </div>
          <textarea
            v-if="activeOutput.status === 'draft'"
            v-model="draftContent"
            aria-label="Editable clinical draft"
            spellcheck="true"
          ></textarea>
          <pre v-else>{{ activeOutput.content }}</pre>
          <div class="output-actions">
            <button class="secondary" :disabled="busy" @click="generateDraft">{{ generating ? 'Preparing…' : 'Regenerate new version' }}</button>
            <template v-if="activeOutput.status === 'draft'">
              <button class="secondary" :disabled="busy || !draftDirty" @click="saveDraft">{{ savingOutput ? 'Saving…' : 'Save draft' }}</button>
              <button class="primary" :disabled="busy || !draftContent.trim()" @click="approveDraft">{{ savingOutput ? 'Approving…' : 'Approve and attach to session' }}</button>
            </template>
            <button v-else class="primary" @click="openLinkedSession">
              View {{ activeOutput.lensLabel }} in session
            </button>
          </div>
        </div>

        <details class="source-handling">
          <summary>Original transcript handling</summary>
          <fieldset>
            <legend>After review</legend>
            <label><input v-model="sourceRetention" type="radio" value="keep_until_review" /> Keep the original source</label>
            <label><input v-model="sourceRetention" type="radio" value="delete_after_approved_output" /> Mark it for deletion after an approved output</label>
          </fieldset>
          <p>This setting records your intention only. Helio will not silently delete clinical source material.</p>
        </details>
      </section>

      <section v-if="selected.completedAt && !activeOutput" class="ready-card complete-card">
        <div><p class="eyebrow">Complete</p><h2>Completed without an AI draft</h2><p>The transcript remains linked to the session as source material.</p></div>
        <button class="secondary" @click="openLinkedSession">View session</button>
      </section>

      <section class="raw-transcript">
        <header>
          <div><p class="eyebrow">Source material</p><h2>Original transcript</h2><p>Imported from Zoom and unchanged by Helio.</p></div>
          <div class="source-actions">
            <button class="secondary" :aria-expanded="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide transcript' : 'View transcript' }}</button>
            <button class="secondary" @click="downloadRaw(selected)">Download .txt</button>
          </div>
        </header>
        <pre v-if="showRaw">{{ selected.text }}</pre>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { createSessionFromTranscript as createTranscriptSession, listSessions } from '../lib/sessions.js'

const props = defineProps({
  clients: { type: Array, default: () => [] },
  openTranscriptId: { type: [String, Number], default: null }
})
const emit = defineEmits(['open-session', 'route-transcript'])

const lensOptions = [
  { id: 'clinical_summary', label: 'Clinical summary', description: 'A concise account of focus, interventions, response, and next steps.' },
  { id: 'draft_note', label: 'Draft clinical note', description: 'A structured note ready for careful therapist editing.' },
  { id: 'cbt', label: 'CBT formulation', description: 'Situations, thoughts, emotions, behaviours, and possible maintaining cycles.' },
  { id: 'ifs', label: 'IFS reflection', description: 'Tentative parts, protective intentions, polarities, and Self-led qualities.' },
  { id: 'emdr', label: 'EMDR review', description: 'Phase, targets, resourcing, processing, closure, and explicit measures.' }
]
const filters = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' }
]

const transcripts = ref([])
const selected = ref(null)
const selectedClientId = ref('')
const selectedSessionRef = ref('')
const selectedLens = ref('')
const sourceRetention = ref('keep_until_review')
const editingClient = ref(false)
const editingSession = ref(false)
const searchQuery = ref('')
const filterMode = ref('attention')
const showRaw = ref(false)
const loading = ref(true)
const saving = ref(false)
const generating = ref(false)
const savingOutput = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const sessionRecords = ref([])
const outputs = ref([])
const activeOutputId = ref('')
const draftContent = ref('')

const busy = computed(() => saving.value || generating.value || savingOutput.value)
const availableOutputs = computed(() => outputs.value.filter(output => ['draft', 'approved', 'superseded'].includes(output.status)))
const activeOutput = computed(() => availableOutputs.value.find(output => output.id === activeOutputId.value) || availableOutputs.value[0] || null)
const draftDirty = computed(() => activeOutput.value?.status === 'draft' && draftContent.value !== activeOutput.value.content)
const preparationProgress = computed(() => {
  if (selected.value?.completedAt) return 'Complete'
  if (activeOutput.value?.status === 'draft') return 'Draft needs approval'
  return 'Choose a clinical lens'
})
const actionableCount = computed(() => transcripts.value.filter(item => workflowState(item).id !== 'complete').length)
const actionableSummary = computed(() => `${actionableCount.value} need${actionableCount.value === 1 ? 's' : ''} attention`)
const sessionsForClient = computed(() => sessionRecords.value
  .filter(session => String(session.clientId) === String(selected.value?.clientId))
  .sort((a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0)))
const filteredTranscripts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return transcripts.value.filter(item => {
    const state = workflowState(item)
    if (filterMode.value === 'attention' && state.id === 'complete') return false
    if (filterMode.value === 'completed' && state.id !== 'complete') return false
    if (!query) return true
    return labelFor(item).toLowerCase().includes(query)
      || clientName(item.clientId).toLowerCase().includes(query)
      || state.label.toLowerCase().includes(query)
      || formatDate(item.receivedAt).toLowerCase().includes(query)
  })
})

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function labelFor(transcript) { return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript' }
function lensLabel(id) { return lensOptions.find(lens => lens.id === id)?.label || 'draft' }
function outputStatusLabel(status) { return ({ draft: 'Draft', approved: 'Approved', superseded: 'Superseded' })[status] || status }
function workflowState(transcript) {
  if (!transcript?.clientId || transcript.status === 'unassigned') return { id: 'needs-client', label: 'Needs client' }
  if (!transcript.sessionRef) return { id: 'needs-session', label: 'Needs session' }
  if (transcript.completedAt) return { id: 'complete', label: 'Complete' }
  if (transcript.latestOutputStatus === 'draft') return { id: 'draft-review', label: 'Draft needs approval' }
  if (transcript.latestOutputStatus === 'failed') return { id: 'generation-failed', label: 'Generation needs retry' }
  return { id: 'needs-review', label: 'Choose draft' }
}
function primaryAction(transcript) {
  return ({
    'needs-client': 'Assign client',
    'needs-session': 'Link session',
    'needs-review': 'Prepare draft',
    'draft-review': 'Review draft',
    'generation-failed': 'Retry draft',
    complete: 'View'
  })[workflowState(transcript).id]
}
function clientName(clientId) { return props.clients.find(client => client.id === clientId)?.name || '' }
function sessionOptionLabel(session) {
  const state = ({ planned: 'Planned', in_progress: 'In progress', completed: 'Completed', closed: 'Closed' })[session.status] || 'Completed'
  return `${formatDate(session.startedAt || session.createdAt)} · ${state}`
}
async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || data.error || 'The request could not be completed.')
  return data
}
async function loadSessionRecords() {
  try {
    sessionRecords.value = await listSessions()
  } catch (error) {
    errorMessage.value = error?.message || 'Unable to load sessions.'
    sessionRecords.value = []
  }
}
function replaceTranscript(transcript) {
  const index = transcripts.value.findIndex(item => item.id === transcript.id)
  const merged = index >= 0 ? { ...transcripts.value[index], ...transcript } : transcript
  if (index >= 0) transcripts.value[index] = merged
  selected.value = merged
}
async function loadOutputs() {
  outputs.value = []
  activeOutputId.value = ''
  draftContent.value = ''
  if (!selected.value?.id) return
  const response = await authenticatedFetch(`/api/ai/transcript-output?transcriptId=${encodeURIComponent(selected.value.id)}`)
  const data = await readJson(response)
  outputs.value = data.outputs || []
  const preferred = outputs.value.find(output => output.status === 'draft')
    || outputs.value.find(output => output.status === 'approved')
  if (preferred) {
    activeOutputId.value = preferred.id
    selectedLens.value = outputs.value[0]?.status === 'failed' ? outputs.value[0].lens : preferred.lens
  } else if (outputs.value[0]?.status === 'failed') {
    selectedLens.value = outputs.value[0].lens
  }
}
async function openTranscript(transcript) {
  selected.value = transcript
  selectedClientId.value = transcript.clientId || ''
  const linkedSession = sessionRecords.value.find(session =>
    String(session.id) === String(transcript.sessionRef)
    || String(session.legacyRef || '') === String(transcript.sessionRef)
  )
  selectedSessionRef.value = linkedSession?.id || transcript.sessionRef || ''
  selectedLens.value = transcript.requestedLens || ''
  sourceRetention.value = transcript.sourceRetention || 'keep_until_review'
  errorMessage.value = ''
  successMessage.value = ''
  showRaw.value = false
  emit('route-transcript', transcript.id)
  await Promise.all([loadSessionRecords(), loadOutputs()])
}
function closeTranscript() {
  selected.value = null
  outputs.value = []
  activeOutputId.value = ''
  emit('route-transcript', null)
}
async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts')
    const data = await readJson(response)
    transcripts.value = data.transcripts || []
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load transcripts.'
  } finally {
    loading.value = false
  }
}
async function patchTranscript(body, fallbackMessage) {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.value.id, ...body })
    })
    const data = await readJson(response)
    replaceTranscript(data.transcript)
    return data.transcript
  } catch (error) {
    errorMessage.value = error.message || fallbackMessage
    return null
  } finally {
    saving.value = false
  }
}
async function saveAssignment() {
  const transcript = await patchTranscript({ clientId: selectedClientId.value }, 'Unable to save the client assignment.')
  if (transcript) {
    selectedSessionRef.value = ''
    editingClient.value = false
    outputs.value = []
    successMessage.value = `Assigned to ${clientName(transcript.clientId)}. Link the session next.`
  }
}
async function saveSessionLink() {
  const transcript = await patchTranscript({ sessionRef: selectedSessionRef.value }, 'Unable to link this session.')
  if (transcript) {
    editingSession.value = false
    outputs.value = []
    successMessage.value = 'Session linked. Choose the draft you want Helio to prepare.'
  }
}
async function createSessionFromTranscript() {
  if (!selected.value?.clientId) return
  saving.value = true
  errorMessage.value = ''
  try {
    const newSession = await createTranscriptSession(selected.value.clientId, selected.value.receivedAt)
    sessionRecords.value = [newSession, ...sessionRecords.value.filter(session => session.id !== newSession.id)]
    selectedSessionRef.value = String(newSession.id)
    await saveSessionLink()
  } catch (error) {
    errorMessage.value = error?.message || 'Unable to create a session from this transcript.'
  } finally {
    saving.value = false
  }
}
async function generateDraft() {
  if (!selectedLens.value || generating.value) return
  generating.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/ai/transcript-output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcriptId: selected.value.id,
        lens: selectedLens.value,
        sourceRetention: sourceRetention.value
      })
    })
    const data = await readJson(response)
    outputs.value = [
      data.output,
      ...outputs.value
        .filter(output => output.id !== data.output.id)
        .map(output => output.lens === data.output.lens && output.status === 'draft'
          ? { ...output, status: 'superseded' }
          : output)
    ]
    activeOutputId.value = data.output.id
    selected.value.requestedLens = selectedLens.value
    selected.value.reviewChoicesSavedAt = selected.value.reviewChoicesSavedAt || new Date().toISOString()
    selected.value.completedAt = null
    selected.value.latestOutputStatus = 'draft'
    successMessage.value = 'Draft prepared. Review and edit it before approval.'
  } catch (error) {
    errorMessage.value = error.message || 'The draft could not be prepared. The original transcript was not changed.'
  } finally {
    generating.value = false
  }
}
async function updateDraft(action) {
  if (!activeOutput.value) return
  savingOutput.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/ai/transcript-output', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outputId: activeOutput.value.id,
        action,
        content: draftContent.value,
        sourceRetention: sourceRetention.value
      })
    })
    const data = await readJson(response)
    outputs.value = outputs.value.map(output => output.id === data.output.id ? data.output : output)
    activeOutputId.value = data.output.id
    if (action === 'approve') {
      outputs.value = outputs.value.map(output =>
        output.id !== data.output.id && output.lens === data.output.lens && output.status === 'approved'
          ? { ...output, status: 'superseded' }
          : output
      )
      selected.value.completedAt = new Date().toISOString()
      selected.value.latestOutputStatus = 'approved'
      successMessage.value = `${data.output.lensLabel} approved and attached. Open the session to see the full output.`
    } else {
      successMessage.value = 'Draft saved.'
    }
  } catch (error) {
    errorMessage.value = error.message || 'The draft could not be saved.'
  } finally {
    savingOutput.value = false
  }
}
async function saveDraft() { await updateDraft('save') }
async function approveDraft() {
  const confirmed = window.confirm('Approve this reviewed draft and attach it to the linked session? It will be clearly labelled as an approved AI-derived artifact.')
  if (confirmed) await updateDraft('approve')
}
async function completeWithoutDraft() {
  const transcript = await patchTranscript({
    requestedLens: null,
    sourceRetention: sourceRetention.value,
    reviewChoicesSaved: true,
    markComplete: true
  }, 'Unable to complete this transcript.')
  if (transcript) successMessage.value = 'Transcript review completed without an AI draft.'
}
function openLinkedSession() {
  if (!selected.value?.sessionRef) return
  emit('open-session', {
    sessionId: selected.value.sessionRef,
    clientId: selected.value.clientId,
    tab: activeOutput.value?.status === 'approved' ? 'transcript' : 'overview',
    outputId: activeOutput.value?.status === 'approved' ? activeOutput.value.id : null
  })
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
  if (transcript) await openTranscript(transcript)
}

watch(activeOutput, output => {
  draftContent.value = output?.content || ''
  if (output?.lens) selectedLens.value = output.lens
})
watch(() => props.openTranscriptId, openQueuedTranscript)
onMounted(async () => {
  await Promise.all([load(), loadSessionRecords()])
  await openQueuedTranscript(props.openTranscriptId)
})
</script>

<style scoped>
.transcript-inbox{max-width:68rem;margin:0 auto;color:var(--text-primary)}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.eyebrow{margin:0 0 .25rem;color:var(--text-muted);text-transform:uppercase;font-size:.72rem;font-weight:700;letter-spacing:.08em}.page-header h1,.review-header h1{margin:0;font-size:1.75rem}.page-header p:not(.eyebrow),.review-header p:not(.eyebrow){margin:.3rem 0 0;color:var(--text-muted);line-height:1.5}.count{white-space:nowrap;border-radius:999px;padding:.4rem .65rem;background:var(--state-warning-surface);color:var(--state-warning);font-size:.8rem;font-weight:700}.count.quiet{background:var(--state-success-surface);color:var(--state-success)}.queue-controls{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin:0 0 1rem}.inbox-search{display:block;flex:1;max-width:32rem}.inbox-search span,.assignment-controls label{display:block;font-size:.8rem;font-weight:700;margin-bottom:.35rem}.inbox-search input,.assignment-controls select,.output-editor select{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:.6rem;padding:.68rem .75rem;font-size:.95rem;color:var(--text-secondary);background:var(--surface-elevated)}.filters{display:flex;gap:.4rem;flex-wrap:wrap}.filters button{border:1px solid var(--border);background:var(--surface-elevated);border-radius:999px;padding:.45rem .65rem;color:var(--text-secondary);font-weight:700;font-size:.8rem}.filters button.active{border-color:var(--action-link);background:var(--state-selected);color:var(--action-link-hover)}.notice{margin:0 0 1rem;padding:.75rem;border-radius:.6rem}.notice.error{background:var(--state-danger-surface);color:var(--state-danger)}.notice.success{background:var(--state-success-surface);color:var(--state-success)}.empty-card{min-height:18rem;display:flex;flex-direction:column;justify-content:center;align-items:center;background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.85rem;padding:2rem;text-align:center;color:var(--text-muted)}.empty-card.compact{min-height:10rem}.empty-card div{font-size:2rem}.empty-card h2{color:var(--text-secondary);margin:.5rem}.empty-card p{max-width:30rem;line-height:1.5}.inbox-list{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.85rem;overflow:hidden}.transcript-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:1rem;width:100%;border:0;border-bottom:1px solid var(--border-muted);background:var(--surface-elevated);padding:1rem 1.2rem;text-align:left;color:var(--text-secondary)}.transcript-row:last-child{border-bottom:0}.transcript-row:hover{background:var(--state-selected)}.meeting-icon{font-size:1.25rem}.row-main{display:flex;min-width:0;flex-direction:column;gap:.2rem}.row-main small{color:var(--text-muted)}.row-main .assigned-client{color:var(--text-secondary);font-weight:600}.status{font-size:.72rem;font-weight:700;padding:.25rem .5rem;border-radius:999px;white-space:nowrap}.status.needs-client{background:var(--state-warning-surface);color:var(--state-warning)}.status.needs-session,.status.needs-review{background:var(--state-selected);color:var(--action-link-hover)}.status.draft-review{background:var(--state-warning-surface);color:var(--state-warning)}.status.generation-failed{background:var(--state-danger-surface);color:var(--state-danger)}.status.complete{background:var(--state-success-surface);color:var(--state-success)}.open{color:var(--action-link);font-weight:600;white-space:nowrap}.review-header{margin-bottom:1rem}.review-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem;list-style:none;padding:0;margin:0 0 1rem}.review-progress li{display:flex;gap:.55rem;align-items:center;padding:.65rem .75rem;border:1px solid var(--border-muted);border-radius:.65rem;background:var(--surface-elevated);color:var(--text-muted)}.review-progress li>span{display:grid;place-items:center;width:1.45rem;height:1.45rem;border-radius:50%;background:var(--border-muted);color:var(--text-secondary);font-size:.75rem;font-weight:700}.review-progress strong,.review-progress small{display:block}.review-progress small{font-size:.73rem;margin-top:.12rem}.review-progress .complete{border-color:var(--state-success);background:var(--state-success-surface);color:var(--state-success)}.review-progress .complete>span{background:var(--state-success);color:var(--surface-elevated)}.review-progress .current{border-color:var(--state-selected);background:var(--state-selected);color:var(--action-link-hover)}.review-progress .current>span{background:var(--action-link);color:var(--surface-elevated)}.back{border:0;background:transparent;padding:0 0 .8rem;color:var(--action-link);font-weight:700;font-size:.9rem}.workflow-section,.raw-transcript,.draft-workspace,.ready-card{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.85rem;padding:1.25rem;margin-bottom:1rem}.workflow-section{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,24rem);gap:1.5rem;align-items:center}.workflow-section>button{justify-self:end}.locked-context{justify-self:end;color:var(--text-muted);font-size:.75rem;font-weight:700}.workflow-section h2,.raw-transcript h2,.ready-card h2,.draft-workspace h2{font-size:1.15rem;margin:.1rem 0}.workflow-section p:not(.eyebrow),.raw-transcript p,.ready-card p,.draft-workspace p:not(.eyebrow){color:var(--text-muted);line-height:1.45;margin:.35rem 0}.field-help{font-size:.78rem;color:var(--state-warning);margin:.35rem 0 0}.assignment-actions,.output-actions{display:flex;gap:.6rem;margin-top:.75rem;flex-wrap:wrap}.primary,.secondary{padding:.65rem .8rem;border-radius:.6rem;font-weight:700}.primary{border:1px solid var(--action-link);background:var(--action-link);color:var(--text-on-action)}.primary:disabled,.secondary:disabled,.text-action:disabled,.lens-card:disabled{opacity:.55;cursor:not-allowed}.secondary{border:1px solid var(--border);background:var(--surface-elevated);color:var(--text-secondary)}.text-action{border:0;background:transparent;color:var(--action-link);font-weight:700;padding:.65rem}.draft-workspace{border-color:var(--state-selected);background:var(--surface-muted)}.draft-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.boundary-badge{white-space:nowrap;border-radius:999px;padding:.35rem .55rem;background:var(--state-warning-surface);color:var(--state-warning);font-size:.72rem;font-weight:700}.lens-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.55rem;margin:1rem 0}.lens-card{min-height:7rem;border:1px solid var(--border);border-radius:.7rem;background:var(--surface-elevated);padding:.8rem;text-align:left;color:var(--text-secondary)}.lens-card strong,.lens-card small{display:block}.lens-card small{color:var(--text-muted);line-height:1.35;margin-top:.35rem}.lens-card.selected{border:2px solid var(--action-link);background:var(--state-selected);padding:calc(.8rem - 1px)}.generate-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}.generate{min-width:14rem}.output-editor{margin-top:1rem;padding:1rem;background:var(--surface-elevated);border:1px solid var(--border);border-radius:.75rem}.output-editor header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.output-editor h3{margin:.1rem 0 .75rem}.output-editor h3 span{font-size:.72rem;color:var(--text-muted);font-weight:600}.output-editor header label{min-width:12rem;font-size:.75rem;font-weight:700}.approval-boundary{padding:.75rem;border-radius:.6rem;background:var(--state-warning-surface);color:var(--state-warning);font-size:.82rem;line-height:1.4}.output-editor textarea{box-sizing:border-box;width:100%;min-height:24rem;margin-top:.8rem;padding:1rem;border:1px solid var(--border);border-radius:.65rem;background:var(--surface-elevated);font:inherit;line-height:1.6;resize:vertical}.output-editor pre,.raw-transcript pre{margin:.8rem 0 0;max-height:32rem;overflow:auto;white-space:pre-wrap;word-break:break-word;border-radius:.6rem;background:var(--surface-muted);padding:1rem;color:var(--text-secondary);font:inherit;line-height:1.6}.source-handling{margin-top:1rem;border-top:1px solid var(--border-muted);padding-top:.85rem}.source-handling summary{cursor:pointer;color:var(--text-secondary);font-weight:700}.source-handling fieldset{display:grid;gap:.5rem;margin:.75rem 0 0;padding:.75rem;border:1px solid var(--border-muted);border-radius:.6rem}.source-handling p{font-size:.78rem}.raw-transcript header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.source-actions{display:flex;gap:.6rem;flex-wrap:wrap}.raw-transcript pre{font:.86rem/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}.ready-card{display:flex;align-items:center;justify-content:space-between;gap:1rem}.complete-card{border-color:var(--state-success);background:var(--state-success-surface)}@media(max-width:900px){.lens-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.page-header,.queue-controls,.raw-transcript header,.ready-card,.draft-heading,.output-editor header{flex-direction:column;align-items:stretch}.transcript-row{grid-template-columns:auto minmax(0,1fr);gap:.55rem}.status{justify-self:start}.open{grid-column:2}.workflow-section{grid-template-columns:1fr}.workflow-section>button,.locked-context{justify-self:start}.review-progress{grid-template-columns:1fr}.assignment-actions,.output-actions,.generate-row{flex-direction:column}.assignment-actions button,.output-actions button,.generate-row button{width:100%}.source-actions,.source-actions button{width:100%}.lens-grid{grid-template-columns:1fr}.lens-card{min-height:auto}.boundary-badge{white-space:normal}.output-editor textarea{min-height:18rem}}
</style>
