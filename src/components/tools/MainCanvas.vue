<template>
  <section v-if="selectedClient" class="client-record">
    <header class="record-header">
      <div><p class="eyebrow">Client record</p><h1>{{ selectedClient.name }}</h1><span class="status">{{ selectedClient.archived ? 'Archived' : 'Active' }}</span></div>
      <button class="primary" @click="startSession">Start session</button>
    </header>

    <nav class="record-tabs" aria-label="Client record sections">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <div v-if="activeTab === 'overview'" class="overview">
      <div class="orientation-grid">
        <article><span>Next appointment</span><strong>Not scheduled</strong><small>Calendar matching will be connected later.</small></article>
        <article><span>Last session</span><strong>{{ lastSession ? formatDate(lastSession.startedAt) : 'No sessions recorded' }}</strong><small>{{ lastSession?.status === 'completed' ? 'Completed' : lastSession ? 'Draft' : 'Start a session to begin.' }}</small></article>
        <article><span>Current focus</span><strong>{{ selectedClient.note || 'Not recorded' }}</strong><small>Maintained by the therapist.</small></article>
        <article><span>Open investigations</span><strong>0</strong><small>The Investigation Engine is not enabled yet.</small></article>
      </div>
      <article class="activity-card"><div><h2>Recent sessions</h2><p>A concise history of work with this client.</p></div><button class="secondary" @click="activeTab = 'sessions'">View all sessions</button>
        <div v-if="!sessions.length" class="empty-inline">No sessions have been recorded.</div>
        <button v-for="session in sessions.slice(0,3)" :key="session.id" class="session-row" @click="openSession(session)"><span><strong>{{ formatDate(session.startedAt) }}</strong><small>{{ session.status === 'completed' ? 'Completed session' : 'Draft session' }}</small></span><span>›</span></button>
      </article>
    </div>

    <div v-else-if="activeTab === 'sessions'" class="section-card">
      <div class="section-heading"><div><h2>Sessions</h2><p>Notes remain attached to a dated session record.</p></div><button class="primary" @click="startSession">Start session</button></div>
      <div v-if="!sessions.length" class="empty-state"><div>📝</div><h3>No sessions recorded</h3><p>Start a session when you are ready to take notes.</p></div>
      <button v-for="session in sessions" :key="session.id" class="session-row" @click="openSession(session)"><span><strong>{{ formatDate(session.startedAt) }}</strong><small>{{ session.status === 'completed' ? 'Completed' : 'Draft' }}<template v-if="session.notes"> · {{ preview(session.notes) }}</template></small></span><span>Open ›</span></button>
    </div>

    <div v-else-if="activeTab === 'investigations'" class="section-card empty-state large">
      <div>🔎</div><h2>Investigations are not enabled yet</h2><p>This area will hold therapist-defined questions, linked observations, supporting and challenging evidence, and a revision history.</p><strong>No investigation will be created or changed by AI without therapist review.</strong>
    </div>

    <div v-else class="section-card">
      <div class="section-heading"><div><h2>Documents</h2><p>Uploaded reports and therapist-approved documents.</p></div></div>
      <div v-if="documentsLoading" class="empty-inline">Loading documents…</div>
      <div v-else-if="!documents.length" class="empty-state large"><div>📄</div><h2>No documents yet</h2><p>Upload a report from the practice Reports page.</p></div>
      <button v-for="document in documents" :key="document.id" class="session-row" @click="openDocument(document)"><span><strong>{{ document.title }}</strong><small>{{ document.report_date || formatDate(document.created_at) }} · {{ document.original_filename }}</small></span><span>Open ›</span></button>
    </div>

    <div v-if="editingSession" class="modal-backdrop" @click.self="closeEditor">
      <article class="session-editor" role="dialog" aria-modal="true" aria-labelledby="session-title">
        <header><div><p class="eyebrow">{{ editingSession.status === 'completed' ? 'Completed session' : 'Session draft' }}</p><h2 id="session-title">{{ formatDate(editingSession.startedAt) }}</h2></div><button class="close" @click="closeEditor" aria-label="Close">×</button></header>
        <div class="note-label"><label for="session-notes">Session notes</label><button v-if="editingSession.status !== 'completed'" class="dictate" :disabled="isDictating || transcribing" @click="toggleDictation">{{ isDictating ? 'Stop dictation' : transcribing ? 'Transcribing…' : '🎙 Dictate note' }}</button></div>
        <textarea id="session-notes" v-model="draftNotes" :disabled="editingSession.status === 'completed'" placeholder="Record the session in your own words…"></textarea>
        <aside class="ai-boundary"><strong>AI assistance</strong><p>Later, the therapist will be able to request a draft summary, actions, or possible observations here. Nothing will be added to the client record automatically.</p></aside>
        <footer><button class="secondary" @click="closeEditor">Close</button><template v-if="editingSession.status !== 'completed'"><button class="secondary" @click="saveDraft">Save draft</button><button class="primary" @click="completeSession">Complete session</button></template></footer>
      </article>
    </div>
  </section>
  <div v-else class="empty-state large"><h2>No client selected</h2><p>Choose a client from Clients to open their record.</p></div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
const props = defineProps({ selectedClient: { type: Object, default: null } })
const tabs = [{id:'overview',label:'Overview'},{id:'sessions',label:'Sessions'},{id:'investigations',label:'Investigations'},{id:'documents',label:'Documents'}]
const activeTab = ref('overview'), editingSession = ref(null), draftNotes = ref(''), allSessions = ref(loadSessions())
const documents=ref([]),documentsLoading=ref(false)
const isDictating=ref(false),transcribing=ref(false); let recorder=null, chunks=[]
const sessions = computed(() => allSessions.value.filter(item => item.clientId === props.selectedClient?.id).sort((a,b) => new Date(b.startedAt)-new Date(a.startedAt)))
const lastSession = computed(() => sessions.value[0] || null)
function loadSessions(){try{return JSON.parse(localStorage.getItem('helio_sessions')||'[]')}catch{return []}}
function persist(){localStorage.setItem('helio_sessions',JSON.stringify(allSessions.value))}
function startSession(){const session={id:Date.now(),clientId:props.selectedClient.id,startedAt:new Date().toISOString(),status:'draft',notes:''};allSessions.value.push(session);persist();openSession(session)}
function openSession(session){editingSession.value=session;draftNotes.value=session.notes||'';activeTab.value='sessions'}
function saveDraft(){editingSession.value.notes=draftNotes.value;editingSession.value.updatedAt=new Date().toISOString();persist();closeEditor()}
function completeSession(){editingSession.value.notes=draftNotes.value;editingSession.value.status='completed';editingSession.value.completedAt=new Date().toISOString();persist();closeEditor()}
function closeEditor(){editingSession.value=null;draftNotes.value=''}
async function toggleDictation(){if(isDictating.value){recorder?.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());isDictating.value=false;transcribing.value=true;try{const blob=new Blob(chunks,{type:recorder.mimeType});const audio=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});const response=await authenticatedFetch('/api/ai/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio})});const data=await response.json();if(!response.ok)throw new Error(data.error);draftNotes.value=`${draftNotes.value}${draftNotes.value?'\\n\\n':''}${data.text}`.trim()}catch(error){alert(error.message||'Unable to transcribe this note')}finally{transcribing.value=false}};recorder.start();isDictating.value=true}catch(error){alert('Microphone access is needed to dictate a note.')}}
function formatDate(value){return new Date(value).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
function preview(value){return value.length>70?`${value.slice(0,70)}…`:value}
async function loadDocuments(){if(!props.selectedClient)return;documentsLoading.value=true;try{const response=await authenticatedFetch(`/api/documents?clientRef=${encodeURIComponent(props.selectedClient.id)}`);const data=await response.json();documents.value=response.ok?(data.documents||[]):[]}finally{documentsLoading.value=false}}
async function openDocument(document){const response=await authenticatedFetch(`/api/documents?download=${encodeURIComponent(document.id)}`);const data=await response.json();if(response.ok&&data.url)window.open(data.url,'_blank','noopener')}
watch(()=>props.selectedClient?.id,()=>{activeTab.value='overview';closeEditor();documents.value=[]})
watch(activeTab,value=>{if(value==='documents')loadDocuments()})
</script>

<style scoped>
.client-record{max-width:68rem;margin:0 auto;color:#2c3e50}.record-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:white;border:1px solid #dbe1e8;border-radius:.9rem;padding:1.2rem 1.4rem}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.7rem;font-weight:750;margin:0 0 .2rem}.record-header h1{display:inline;font-size:1.6rem;margin:0}.status{display:inline-block;margin-left:.65rem;background:#ecfdf5;color:#047857;border-radius:999px;padding:.2rem .5rem;font-size:.7rem;font-weight:700}.primary,.secondary{border-radius:.55rem;padding:.6rem .9rem;font-weight:650}.primary{border:1px solid #2563eb;background:#2563eb;color:white}.secondary{border:1px solid #d7dde6;background:white;color:#334155}.record-tabs{display:flex;gap:.25rem;border-bottom:1px solid #dbe1e8;margin:1rem 0}.record-tabs button{border:0;background:transparent;padding:.7rem .9rem;color:#64748b;font-weight:650;border-bottom:2px solid transparent}.record-tabs button.active{color:#1d4ed8;border-color:#2563eb}.orientation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.orientation-grid article,.activity-card,.section-card{background:white;border:1px solid #dbe1e8;border-radius:.8rem;padding:1.1rem}.orientation-grid span{display:block;color:#64748b;font-size:.75rem;text-transform:uppercase;font-weight:700}.orientation-grid strong{display:block;margin:.4rem 0;color:#334155}.orientation-grid small{color:#8491a3}.activity-card{margin-top:.8rem}.activity-card>div:first-child,.section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.activity-card h2,.section-heading h2{margin:0;font-size:1.05rem}.activity-card p,.section-heading p{margin:.2rem 0 1rem;color:#64748b;font-size:.85rem}.session-row{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;border-top:1px solid #edf0f4;background:white;padding:.8rem .2rem;text-align:left;color:#334155}.session-row span:first-child{display:flex;flex-direction:column}.session-row small{color:#64748b;margin-top:.15rem}.empty-inline{border-top:1px solid #edf0f4;padding:1rem 0;color:#8491a3}.empty-state{text-align:center;color:#64748b;padding:2rem}.empty-state div{font-size:2rem}.empty-state h2,.empty-state h3{color:#334155;margin:.5rem}.empty-state p{max-width:38rem;margin:.4rem auto;line-height:1.55}.empty-state strong{display:block;color:#475569;margin-top:1rem}.large{min-height:24rem;display:flex;flex-direction:column;justify-content:center;align-items:center}.modal-backdrop{position:fixed;inset:0;z-index:80;background:#0f172a66;display:flex;align-items:center;justify-content:center;padding:1rem}.session-editor{width:min(46rem,100%);max-height:90vh;overflow:auto;background:white;border-radius:1rem;padding:1.3rem;box-shadow:0 20px 60px #0004}.session-editor header{display:flex;justify-content:space-between}.session-editor h2{margin:.1rem 0 1rem}.close{border:0;background:transparent;font-size:1.7rem;color:#64748b}.session-editor label{display:block;font-weight:700;margin-bottom:.4rem}.session-editor textarea{width:100%;min-height:15rem;resize:vertical;border:1px solid #cfd7e2;border-radius:.65rem;padding:.8rem;outline:none}.session-editor textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.ai-boundary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:.65rem;padding:.8rem;margin-top:.8rem}.ai-boundary strong{font-size:.8rem}.ai-boundary p{font-size:.78rem;color:#64748b;margin:.25rem 0}.session-editor footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}@media(max-width:700px){.record-header{align-items:flex-start}.record-header h1{font-size:1.35rem}.record-tabs{overflow:auto}.record-tabs button{padding:.65rem .7rem;white-space:nowrap}.orientation-grid{grid-template-columns:1fr}.activity-card>div:first-child,.section-heading{flex-direction:column}.modal-backdrop{padding:0;align-items:flex-end}.session-editor{border-radius:1rem 1rem 0 0;max-height:94vh}.session-editor footer{flex-wrap:wrap}.session-editor footer button{flex:1}}
</style>
