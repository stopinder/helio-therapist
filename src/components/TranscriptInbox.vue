<template>
  <section class="transcript-inbox">
    <template v-if="!selected">
      <header class="page-header">
        <div><p class="eyebrow">Zoom imports</p><h1>Transcript Inbox</h1><p>Review incoming source material, then decide what needs to happen next. Nothing is analysed automatically.</p></div>
        <span v-if="errorMessage" class="type-metadata text-state-danger" role="status">Inbox unavailable</span>
      </header>

      <div v-if="transcripts.length" class="queue-controls">
        <label class="inbox-search"><span class="sr-only">Search transcripts</span><input v-model="searchQuery" class="control-field min-h-touch" type="search" placeholder="Search transcripts" /></label>
        <div class="filters" role="group" aria-label="Transcript views">
          <button v-for="filter in filters" :key="filter.id" type="button" class="min-h-touch type-ui" :class="{ active: filterMode === filter.id }" :aria-pressed="filterMode === filter.id" @click="setFilter(filter.id)">{{ filter.label }}<template v-if="filter.id === 'attention'"> · {{ actionableCount }}</template></button>
        </div>
        <button v-if="filterMode === 'attention' && matchingTranscripts.length" class="secondary clear-all" :disabled="saving || !!searchQuery" :title="searchQuery ? 'Clear your search to clear all attention items.' : ''" @click="clearAllAttention">{{ saving ? 'Clearing…' : 'Clear all' }}</button>
      </div>

      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p><p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>
      <button v-if="lastClearedBatch.length" class="undo-link" :disabled="saving" @click="undoClearAttention">Undo</button>
      <p v-if="filterMode === 'history'">Connected transcripts and items you cleared from the inbox appear here.</p>
      <div v-if="loading" class="empty-card compact">Loading transcripts…</div>
      <div v-else-if="!errorMessage && !transcripts.length" class="empty-card compact"><h2>Inbox up to date</h2><p>New Zoom transcripts will appear here when they need review.</p></div>
      <div v-else-if="visibleTranscripts.length" class="inbox-list">
        <button v-for="transcript in visibleTranscripts" :key="transcript.id" class="transcript-row" @click="openTranscript(transcript)">
          <span class="row-main">
            <span class="row-header">
              <strong>{{ rowTitle(transcript) }}</strong>
              <button class="chevron" type="button" :aria-expanded="expandedRows.has(transcript.id)" @click="toggleExpand(transcript.id, $event)">
                <span class="sr-only">{{ expandedRows.has(transcript.id) ? 'Collapse' : 'Expand' }}</span>
                <span aria-hidden="true">{{ expandedRows.has(transcript.id) ? '▾' : '▸' }}</span>
              </button>
            </span>
            <small>{{ transcriptMeta(transcript) }}<template v-if="transcript.meetingId"> · Meeting {{ transcript.meetingId }}</template></small>
          </span>
          <StatusIndicator v-if="filterMode === 'attention'" :tone="workflowTone(transcript)">{{ workflowState(transcript).label }}</StatusIndicator>
          <StatusIndicator v-else :tone="isConnected(transcript) ? 'success' : 'neutral'">{{ historyLabel(transcript) }}</StatusIndicator>
          <span v-if="expandedRows.has(transcript.id)" class="open">{{ filterMode === 'history' ? 'View' : primaryAction(transcript) }} <span aria-hidden="true">›</span></span>
        </button>
        <div v-if="hasMoreHistory" class="load-more-row"><button class="load-more" type="button" @click="historyLimit += historyPageSize">Load more</button></div>
      </div>
      <div v-else class="empty-card compact">
        <h2>{{ filterMode === 'attention' && !searchQuery ? 'Inbox up to date' : 'No matching transcripts' }}</h2>
        <p>{{ filterMode === 'attention' && !searchQuery ? 'New Zoom transcripts will appear here when they need review.' : 'Try another search term or view.' }}</p>
      </div>
    </template>

    <template v-else>
      <header class="review-header">
        <div class="header-main">
          <button class="back" @click="selected = null">‹ Transcript Inbox</button>
          <div class="title-area">
            <p class="eyebrow">Transcript review</p>
            <h1>{{ labelFor(selected) }}</h1>
            <p>{{ selected.sessionRef ? transcriptMeta(selected) : `Imported ${formatDate(selected.receivedAt)}` }} · original Zoom transcript</p>
          </div>
        </div>
      </header>
      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p><p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>
      <ol class="review-progress" aria-label="Transcript review progress"><li :class="{ complete: selected.clientId, current: !selected.clientId }"><span>{{ selected.clientId ? '✓' : '1' }}</span><div><strong>Client</strong><small>{{ selected.clientId ? clientName(selected.clientId) : 'Choose client' }}</small></div></li><li :class="{ complete: selected.sessionRef, current: selected.clientId && !selected.sessionRef }"><span>{{ selected.sessionRef ? '✓' : '2' }}</span><div><strong>Session</strong><small>{{ selected.sessionRef ? 'Linked' : 'Link or create a session' }}</small></div></li></ol>
      <section class="workflow-section client-section"><template v-if="!selected.clientId || editingClient"><div><p class="eyebrow">Client</p><h2>Client</h2><p>Select the client this original Zoom transcript belongs to. Helio will not guess.</p></div><div class="assignment-controls"><div class="flex items-center gap-2"><label for="client-select" class="sr-only">Client</label><select id="client-select" v-model="selectedClientId" class="flex-1"><option value="" disabled>Select a client…</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option></select><button type="button" class="secondary whitespace-nowrap" @click="showAddClient = true">Add new client</button></div><div class="assignment-actions"><button v-if="selected.clientId" class="secondary" :disabled="saving" @click="editingClient = false">Cancel</button><button class="primary" :disabled="saving || !selectedClientId || selectedClientId === selected.clientId" @click="saveAssignment">{{ saving ? 'Saving…' : selected.clientId ? 'Change client' : 'Assign client' }}</button></div></div></template><template v-else><div><p class="eyebrow">Client</p><h2>{{ clientName(selected.clientId) }}</h2><p>Assigned client</p></div><button class="secondary" @click="editingClient = true">Change</button></template></section>
      <section v-if="selected.clientId" id="transcript-session-step" class="workflow-section session-section">
        <template v-if="!selected.sessionRef || editingSession">
          <TranscriptSessionLinker
            :transcript="selected"
            :client-id="selected.clientId"
            :sessions="sessionsForClient"
            @linked="handleSessionLinked"
            @session-created="handleSessionCreated"
          />
          <button v-if="selected.sessionRef" class="secondary" :disabled="saving" @click="editingSession = false">Cancel</button>
        </template>
        <template v-else>
          <div>
            <p class="eyebrow">Session</p>
            <h2>{{ formatDate(linkedSessionFor(selected)?.startedAt || linkedSessionFor(selected)?.createdAt) }}</h2>
            <p>Transcript connected to this therapeutic encounter.</p>
          </div>
          <button class="secondary" @click="editingSession = true">Change session</button>
        </template>
      </section>
      <section v-if="selected.clientId && selected.sessionRef && !editingSession" class="ready-card"><div><p class="eyebrow">Connected</p><h2>Transcript connected</h2><p>{{ clientName(selected.clientId) }} · {{ formatDate(linkedSessionFor(selected)?.startedAt || linkedSessionFor(selected)?.createdAt) }}. No further inbox step is required.</p></div><div class="assignment-actions"><button class="primary" :disabled="saving" @click="openLinkedSession">Open session</button></div></section>
      <section class="raw-transcript"><header><div><h2>Original transcript</h2><p>This is the original transcript imported from Zoom. Helio has not analysed or changed it.</p></div><div class="source-actions"><button class="secondary" :aria-expanded="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide original transcript' : 'View original transcript' }}</button><button class="secondary download" @click="downloadRaw(selected)">Download .txt</button><button v-if="isEligibleForDeletion" class="secondary text-state-danger" :disabled="saving" @click="deleteTranscript">{{ saving ? 'Deleting…' : 'Delete transcript' }}</button></div></header><pre v-if="showRaw">{{ selected.text }}</pre></section>
      <section v-if="selected.attentionClearedAt && !selected.completedAt && !isConnected(selected)" class="ready-card complete-card">
        <div>
          <p class="eyebrow">Cleared from inbox</p>
          <h2>Transcript cleared from inbox</h2>
          <p>This item was hidden from Needs attention without being connected to an encounter.</p>
        </div>
        <div class="assignment-actions">
          <button class="primary" :disabled="saving" @click="restoreToAttention">Return to Needs attention</button>
        </div>
      </section>
      <AddClientModal v-if="showAddClient" :submitting="addingClient" :error="addClientError" @close="showAddClient = false" @submit="handleAddClient" />
    </template>
  </section>
</template>
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authenticatedFetch } from '../lib/api.js'
import { createClient } from '../lib/clients.js'
import { listSessions } from '../lib/sessions.js'
import AddClientModal from './sidebar/AddClientModal.vue'
import StatusIndicator from './ui/StatusIndicator.vue'
import TranscriptSessionLinker from './TranscriptSessionLinker.vue'
const props = defineProps({ clients: { type: Array, default: () => [] }, openTranscriptId: { type: [String, Number], default: null } })
const emit = defineEmits(['client-added'])
const router = useRouter()
const transcripts = ref([]), selected = ref(null), selectedClientId = ref('')
const editingClient = ref(false), editingSession = ref(false), searchQuery = ref(''), filterMode = ref('attention'), showRaw = ref(false), expandedRows = ref(new Set())
const loading = ref(true), saving = ref(false), errorMessage = ref(''), successMessage = ref(''), sessionRecords = ref([])
const showAddClient = ref(false), addingClient = ref(false), addClientError = ref('')
const lastClearedBatch = ref([])
const historyPageSize = 20
const historyLimit = ref(historyPageSize)
const isEligibleForDeletion = computed(() => {
  if (!selected.value) return false;
  return selected.value.status === 'unassigned' &&
    !selected.value.clientId &&
    !selected.value.sessionRef &&
    !selected.value.reviewChoicesSavedAt &&
    !selected.value.completedAt;
});
const filters = [{ id: 'attention', label: 'Needs attention' }, { id: 'history', label: 'History' }]
const actionableCount = computed(() => transcripts.value.filter(needsTranscriptAttention).length)
const sessionsForClient = computed(() => sessionRecords.value.filter(session => String(session.clientId) === String(selected.value?.clientId)).sort((a,b)=>new Date(b.startedAt||b.createdAt||0)-new Date(a.startedAt||a.createdAt||0)))
const matchingTranscripts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return transcripts.value.filter(item => {
    if (filterMode.value === 'attention' && !needsTranscriptAttention(item)) return false;
    if (filterMode.value === 'history' && needsTranscriptAttention(item)) return false;
    if (!query) return true;
    return labelFor(item).toLowerCase().includes(query) || rowTitle(item).toLowerCase().includes(query) || clientName(item.clientId).toLowerCase().includes(query) || workflowState(item).label.toLowerCase().includes(query) || formatDate(item.receivedAt).toLowerCase().includes(query)
  }).sort((a,b)=>new Date(b.receivedAt||0)-new Date(a.receivedAt||0))
})
const visibleTranscripts = computed(() => filterMode.value === 'history' ? matchingTranscripts.value.slice(0, historyLimit.value) : matchingTranscripts.value)
const hasMoreHistory = computed(() => filterMode.value === 'history' && visibleTranscripts.value.length < matchingTranscripts.value.length)
function setFilter(id){ filterMode.value=id; historyLimit.value=historyPageSize }
function formatDate(value){ return value ? new Date(value).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Linked session' }
function labelFor(transcript){ return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript' }
function rowTitle(transcript){ return clientName(transcript.clientId) || transcript.sourceTitle || labelFor(transcript) }
function isConnected(transcript){ return Boolean(transcript?.clientId && transcript?.sessionRef) }
function needsTranscriptAttention(transcript){ return Boolean(!transcript?.completedAt && !transcript?.attentionClearedAt && !isConnected(transcript)) }
function linkedSessionFor(transcript){ return sessionRecords.value.find(session=>String(session.id)===String(transcript?.sessionRef)||String(session.legacyRef||'')===String(transcript?.sessionRef)) || null }
function transcriptMeta(transcript){ const encounter=linkedSessionFor(transcript); return encounter ? `Session ${formatDate(encounter.startedAt || encounter.createdAt)} · Imported ${formatDate(transcript.receivedAt)}` : `Imported ${formatDate(transcript.receivedAt)}` }
function historyLabel(transcript){ return isConnected(transcript) ? 'Connected' : (transcript.completedAt ? 'Completed' : 'Cleared from inbox') }
function workflowState(transcript){ if(!transcript?.clientId||transcript.status==='unassigned')return{id:'needs-client',label:'Needs client'};if(!transcript.sessionRef)return{id:'needs-session',label:'Needs session'};return{id:'connected',label:'Connected'} }
function workflowTone(transcript){ return ({'needs-client':'warning','needs-session':'neutral','connected':'success'})[workflowState(transcript).id] || 'neutral' }
function primaryAction(transcript){ return ({'needs-client':'Assign client','needs-session':'Link session','connected':'View'})[workflowState(transcript).id] }
function clientName(clientId){ return props.clients.find(client=>client.id===clientId)?.name||'' }
async function loadSessionRecords(){ try{sessionRecords.value=await listSessions()}catch(error){errorMessage.value=error?.message||'Unable to load sessions.';sessionRecords.value=[]} }
async function clearAllAttention() {
  if (saving.value || searchQuery.value || !matchingTranscripts.value.length) return;
  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  lastClearedBatch.value = [];
  const idsToClear = matchingTranscripts.value.map(t => t.id);
  
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-attention', ids: idsToClear })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to clear transcripts.');
    
    const cleared = data.transcripts || [];
    cleared.forEach(replaceTranscriptInList);
    lastClearedBatch.value = cleared;
    successMessage.value = `${cleared.length} item${cleared.length === 1 ? '' : 's'} cleared from Needs attention.`;
  } catch (error) {
    errorMessage.value = error.message || 'Unable to clear transcripts.';
  } finally {
    saving.value = false;
  }
}
function isRestoredTranscript(transcript, id) {
  return transcript && typeof transcript === 'object' && !Array.isArray(transcript) &&
    transcript.id === id && transcript.attentionClearedAt === null && transcript.completedAt === null &&
    typeof transcript.updatedAt === 'string' && Number.isFinite(Date.parse(transcript.updatedAt)) &&
    typeof transcript.text === 'string' && typeof transcript.status === 'string' &&
    ['clientId', 'sessionRef', 'reviewChoicesSavedAt'].every(key =>
      transcript[key] === null || typeof transcript[key] === 'string');
}
async function undoClearAttention() {
  if (saving.value || !lastClearedBatch.value.length) return;
  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  const batch = [...lastClearedBatch.value];

  try {
    const results = await Promise.allSettled(batch.map(async t => {
      const response = await authenticatedFetch('/api/zoom/transcripts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, restoreAttention: true, expectedUpdatedAt: t.updatedAt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to restore transcript.');
      if (!isRestoredTranscript(data?.transcript, t.id)) throw new Error('Invalid restoration response.');
      replaceTranscriptInList(data.transcript);
    }));
    // Retain the original versions for retries, including stale-write conflicts.
    lastClearedBatch.value = batch.filter((_, index) => results[index].status === 'rejected');
    if (lastClearedBatch.value.length) {
      errorMessage.value = 'Unable to undo some items. Retry Undo for the remaining items.';
    } else {
      successMessage.value = 'Clearing undone.';
    }
  } finally {
    saving.value = false;
  }
}
async function restoreToAttention() {
  if (saving.value || !selected.value?.attentionClearedAt || selected.value.completedAt || isConnected(selected.value)) return;
  const transcript = await patchTranscript({ restoreAttention: true }, 'Unable to restore this transcript.');
  if (transcript) {
    successMessage.value = 'Restored to Needs attention.';
  }
}
function replaceTranscriptInList(transcript) {
  const index = transcripts.value.findIndex(item => item.id === transcript.id);
  if (index >= 0) transcripts.value[index] = transcript;
  if (selected.value?.id === transcript.id) selected.value = transcript;
}
function replaceTranscript(transcript){replaceTranscriptInList(transcript)}
function toggleExpand(id, event) {
  event.stopPropagation();
  if (expandedRows.value.has(id)) expandedRows.value.delete(id);
  else expandedRows.value.add(id);
}
function openTranscript(transcript){
  selected.value=transcript;
  selectedClientId.value=transcript.clientId||'';
  editingClient.value=false;
  editingSession.value=false;
  errorMessage.value='';
  successMessage.value='';
  showRaw.value=false;
  loadSessionRecords();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function load(){loading.value=true;errorMessage.value='';try{const response=await authenticatedFetch('/api/zoom/transcripts');const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to load transcripts.');transcripts.value=data.transcripts||[]}catch(error){errorMessage.value=error.message||'Unable to load transcripts.'}finally{loading.value=false}}
async function patchTranscript(body,fallbackMessage){saving.value=true;errorMessage.value='';successMessage.value='';try{const response=await authenticatedFetch('/api/zoom/transcripts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.value.id,expectedUpdatedAt:selected.value.updatedAt,...body})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||fallbackMessage);if(body.restoreAttention && !isRestoredTranscript(data?.transcript,selected.value.id))throw new Error(fallbackMessage);replaceTranscript(data.transcript);return data.transcript}catch(error){errorMessage.value=error.message||fallbackMessage;return null}finally{saving.value=false}}
async function saveAssignment(){const transcript=await patchTranscript({clientId:selectedClientId.value},'Unable to save the client assignment.');if(transcript){editingClient.value=false;successMessage.value=`Assigned to ${clientName(transcript.clientId)}. Now choose the session.`;await nextTick();document.getElementById('transcript-session-step')?.scrollIntoView({behavior:'smooth',block:'center'})}}
function handleSessionCreated(session){sessionRecords.value=[session,...sessionRecords.value.filter(item=>item.id!==session.id)]}
async function handleSessionLinked(transcript){replaceTranscript(transcript);editingSession.value=false;successMessage.value=`Transcript connected to ${clientName(transcript.clientId)}. No further inbox step is required.`;await nextTick();document.querySelector('.ready-card')?.scrollIntoView({behavior:'smooth',block:'center'})}
async function deleteTranscript(){if(!selected.value)return;if(!window.confirm('Delete this unassigned transcript? This permanently removes the imported source from Helios.'))return;saving.value=true;errorMessage.value='';successMessage.value='';try{const response=await authenticatedFetch('/api/zoom/transcripts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.value.id})});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Unable to delete transcript.')}transcripts.value=transcripts.value.filter(item=>item.id!==selected.value.id);selected.value=null;successMessage.value='Transcript deleted.'}catch(error){errorMessage.value=error.message||'Unable to delete transcript.'}finally{saving.value=false}}
async function handleAddClient(payload) {
  addingClient.value = true;
  addClientError.value = '';
  try {
    const newClient = await createClient(payload);
    emit('client-added', newClient);
    selectedClientId.value = newClient.id;
    showAddClient.value = false;
    await saveAssignment();
  } catch (err) {
    addClientError.value = err.message || 'Failed to create client.';
  } finally {
    addingClient.value = false;
  }
}
async function openLinkedSession(){if(!selected.value?.sessionRef)return;await router.push({name:'SessionWorkspace',params:{clientId:selected.value.clientId,sessionId:selected.value.sessionRef}})}
function downloadRaw(transcript){const blob=new Blob([transcript.text],{type:'text/plain;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`helio-zoom-transcript-${transcript.meetingId||transcript.id}.txt`;link.click();URL.revokeObjectURL(link.href)}
async function openQueuedTranscript(id){if(!id)return;if(!transcripts.value.length)await load();const transcript=transcripts.value.find(item=>String(item.id)===String(id));if(transcript)openTranscript(transcript)}
watch(()=>props.openTranscriptId,openQueuedTranscript);watch(searchQuery,()=>{historyLimit.value=historyPageSize});onMounted(async()=>{await Promise.all([load(),loadSessionRecords()]);openQueuedTranscript(props.openTranscriptId)})
</script>
<style scoped>
.transcript-inbox { max-width: 680px; margin: 0 auto; padding: 2rem 1.5rem; }
.review-progress { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 2rem 0; padding: 0; list-style: none; }
.review-progress li { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--helio-gray-50); border-radius: 8px; border: 1px solid var(--helio-gray-200); opacity: 0.6; }
.review-progress li.current { opacity: 1; border-color: var(--helio-action-primary); background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.review-progress li.complete { opacity: 1; border-color: var(--helio-gray-200); background: white; }
.review-progress span { width: 24px; height: 24px; border-radius: 50%; background: var(--helio-gray-200); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; }
.review-progress li.current span { background: var(--helio-action-primary); color: white; }
.review-progress li.complete span { background: var(--helio-state-success); color: white; }
.review-progress div { display: flex; flex-direction: column; line-height: 1.2; }
.review-progress small { color: var(--helio-gray-600); margin-top: 0.25rem; font-size: 0.8125rem; }

.workflow-section { margin-bottom: 2rem; padding: 2rem; background: white; border: 1px solid var(--helio-gray-200); border-radius: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; }
.workflow-section > div { flex: 1; }
.workflow-section h2 { margin: 0.5rem 0; font-size: 1.25rem; }
.assignment-controls { flex: 1.5; display: flex; flex-direction: column; gap: 1rem; }
.assignment-actions { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; }

.field-group { display: flex; flex-direction: column; gap: 0.5rem; }
.field-group label { font-size: 0.875rem; font-weight: 500; color: var(--helio-gray-700); }

.queue-controls { display: flex; gap: 1rem; margin: 2rem 0; align-items: center; }
.inbox-search { flex: 1; }
.filters { display: flex; gap: 0.5rem; }
.filters button { border: none; background: none; color: var(--helio-gray-600); cursor: pointer; padding: 0.5rem 0.75rem; border-radius: 20px; transition: all 0.2s; }
.filters button.active { background: var(--helio-gray-100); color: var(--helio-gray-900); font-weight: 600; }
.clear-all { margin-left: auto; }

.inbox-list { display: flex; flex-direction: column; gap: 0.5rem; }
.transcript-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; background: white; border: 1px solid var(--helio-gray-200); border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; }
.transcript-row:hover { border-color: var(--helio-action-primary); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.row-main { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.row-header { display: flex; align-items: center; gap: 0.5rem; }
.chevron { background: none; border: none; padding: 0.25rem; color: var(--helio-gray-400); cursor: pointer; font-size: 1.125rem; }
.transcript-row .open { color: var(--helio-action-primary); font-weight: 600; font-size: 0.875rem; margin-left: 1rem; }

.review-header { margin-bottom: 2rem; }
.header-main { display: flex; flex-direction: column; gap: 1.5rem; }
.back { background: none; border: none; color: var(--helio-action-primary); font-weight: 600; cursor: pointer; padding: 0; text-align: left; width: fit-content; }
.title-area h1 { margin: 0.25rem 0; }

.ready-card { background: var(--helio-state-success-bg, #f0fdf4); border: 1px solid var(--helio-state-success, #22c55e); padding: 2rem; border-radius: 12px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
.complete-card { background: var(--helio-gray-50); border-color: var(--helio-gray-200); }

.raw-transcript { margin: 2rem 0; border: 1px solid var(--helio-gray-200); border-radius: 12px; overflow: hidden; }
.raw-transcript header { padding: 1.5rem 2rem; background: var(--helio-gray-50); border-bottom: 1px solid var(--helio-gray-200); display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; }
.raw-transcript pre { padding: 2rem; background: white; margin: 0; font-family: monospace; white-space: pre-wrap; font-size: 0.875rem; line-height: 1.6; max-height: 400px; overflow-y: auto; }
.source-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }

.review-choices { margin-top: 2rem; padding: 2rem; background: white; border: 1px solid var(--helio-gray-200); border-radius: 12px; }
.review-choices select { width: 100%; margin: 0.5rem 0 1.5rem; }
.review-choices fieldset { border: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
.review-choices fieldset label { display: flex; align-items: center; gap: 0.75rem; font-weight: normal; cursor: pointer; }

.undo-link { background: none; border: none; color: var(--helio-action-primary); font-weight: 600; cursor: pointer; padding: 0.5rem 0; margin-bottom: 1rem; display: block; }
.load-more-row { display: flex; justify-content: center; padding: 1rem; }
.load-more { background: none; border: 1px solid var(--helio-gray-200); padding: 0.5rem 1.5rem; border-radius: 20px; color: var(--helio-gray-600); cursor: pointer; transition: all 0.2s; }
.load-more:hover { border-color: var(--helio-gray-400); color: var(--helio-gray-900); }

@media (max-width: 640px) {
  .workflow-section { flex-direction: column; gap: 1.5rem; padding: 1.5rem; }
  .assignment-controls { width: 100%; }
  .ready-card { flex-direction: column; gap: 1.5rem; align-items: flex-start; }
  .raw-transcript header { flex-direction: column; gap: 1rem; padding: 1.5rem; }
  .source-actions { justify-content: flex-start; }
}
</style>