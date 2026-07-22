<template>
  <section v-if="selectedClient" class="client-record">
    <header class="record-header">
      <div>
        <p class="eyebrow">Client</p>
        <h1>{{ selectedClient.name }}</h1>
        <span class="status">{{ selectedClient.archived ? 'Archived' : 'Active' }}</span>
      </div>
      <button class="primary start-session" :disabled="startingSession" @click="startSession">{{ startingSession ? 'Preparing Zoom…' : 'Start session' }}</button>
    </header>

    <nav class="record-tabs" aria-label="Client workspaces">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <main v-if="activeTab === 'timeline'" class="overview">
      <article v-if="preparingFor" class="preparation-card">
        <div><p class="eyebrow">Upcoming appointment</p><h2>{{ preparingFor.summary || 'Session preparation' }}</h2><p>{{ appointmentTime(preparingFor) }}. Review the current focus and recent timeline before opening the session.</p></div>
        <button class="primary" :disabled="startingSession" @click="startSession">{{ startingSession ? 'Preparing Zoom…' : 'Start session' }}</button>
      </article>
      <article class="focus-card">
        <div class="card-heading">
          <div><p class="eyebrow">Therapist-maintained</p><h2>Current focus</h2></div>
          <button v-if="!editingFocus" class="text-action" @click="beginEditFocus">Edit</button>
        </div>
        <template v-if="editingFocus">
          <label class="sr-only" for="current-focus">Current focus</label>
          <textarea id="current-focus" v-model="draftFocus" placeholder="Record the therapeutic focus, goals and context to keep in view…"></textarea>
          <div class="inline-actions"><button class="secondary" @click="cancelFocusEdit">Cancel</button><button class="primary" @click="saveFocus">Save focus</button></div>
        </template>
        <p v-else-if="selectedClient.note" class="focus-copy">{{ selectedClient.note }}</p>
        <p v-else class="quiet-copy">No current focus recorded yet.</p>
      </article>

      <section class="timeline-card">
        <div class="card-heading"><div><p class="eyebrow">Timeline</p><h2>Clinical story</h2><p class="quiet-copy">What has happened with this person. It shows clinically useful events, not an audit log.</p></div><div class="timeline-actions"><button class="secondary" @click="openPicker('Send resource')">Send resource</button><button class="secondary" @click="openPicker('Assign outcome measure')">Assign outcome measure</button><button class="secondary" @click="openPicker('Request questionnaire')">Request questionnaire</button><button class="secondary" @click="openPicker('Share document')">Share document</button></div></div>
        <div v-if="!timelineEvents.length" class="empty-inline">No activity recorded yet. Start a session when you are ready.</div>
        <button v-for="event in timelineEvents" :key="event.id" class="timeline-event" @click="event.session && openSession(event.session)">
          <span class="timeline-marker" aria-hidden="true">{{ event.icon }}</span>
          <span><strong>{{ event.title }}</strong><small>{{ formatDate(event.date) }} · {{ event.detail }}</small></span><span v-if="event.session">Open ›</span>
        </button>
      </section>
    </main>

    <section v-else-if="activeTab === 'sessions'" class="section-card">
      <div class="section-heading"><div><p class="eyebrow">Sessions</p><h2>Therapeutic encounters</h2><p>Open a session to review its notes, source material and approved outputs.</p></div></div>
      <div v-if="!sessions.length" class="empty-state"><div>📝</div><h3>No sessions recorded</h3><p>Start a session when you are ready to take notes.</p></div>
      <button v-for="session in sessions" :key="session.id" class="session-row" @click="openSession(session)"><span><strong>{{ formatDate(session.startedAt) }}</strong><small>{{ sessionStateLabel(session) }}<template v-if="session.notes"> · {{ preview(session.notes, 90) }}</template></small></span><span>Open ›</span></button>
    </section>

    <div v-if="editingSession" class="modal-backdrop" @click.self="closeEditor">
      <article class="session-editor" role="dialog" aria-modal="true" aria-labelledby="session-title">
        <header><div><p class="eyebrow">{{ sessionStatusLabel(editingSession) === 'Closed' ? 'Closed session' : 'Session workspace' }}</p><h2 id="session-title">{{ formatDate(editingSession.startedAt) }}</h2></div><button class="close" @click="closeEditor" aria-label="Close">×</button></header>
        <section v-if="editingSession.zoomState" class="zoom-session" :class="{ warn: editingSession.zoomState === 'unavailable' }">
          <div><p class="eyebrow">Zoom</p><strong>{{ zoomMeetingLabel(editingSession) }}</strong><small>{{ zoomMeetingDescription(editingSession) }}</small></div>
          <button v-if="editingSession.zoomStartUrl" class="secondary" @click="openZoomMeeting(editingSession)">Open Zoom</button>
        </section>
        <div class="note-label"><label for="session-notes">Therapist notes</label><button v-if="editingSession.status !== 'closed'" class="dictate" :class="{ recording: isDictating }" :disabled="transcribing" @click="toggleDictation"><span class="record-dot" aria-hidden="true"></span>{{ isDictating ? 'Stop dictation' : transcribing ? 'Transcribing…' : 'Start dictation' }}</button></div>
        <div class="session-actions"><span>Client actions</span><button class="secondary" @click="openPicker('Send resource')">Send resource</button><button class="secondary" @click="openPicker('Assign outcome measure')">Assign outcome measure</button><button class="secondary" @click="openPicker('Request questionnaire')">Request questionnaire</button><button class="secondary" @click="openPicker('Share document')">Share document</button></div>
        <p v-if="editingSession.status !== 'closed'" class="dictation-help" :class="{ recording: isDictating, error: dictationError }" role="status">{{ dictationMessage() }}</p>
        <textarea id="session-notes" v-model="draftNotes" :disabled="editingSession.status === 'closed'" placeholder="Record the session in your own words…"></textarea>
        <aside class="ai-boundary"><strong>Session review boundary</strong><p>AI-supported pattern recognition is session-specific and provisional. It requires therapist review and never becomes part of the clinical record automatically.</p></aside>
        <footer><button class="secondary" @click="closeEditor">Close</button><template v-if="editingSession.status !== 'closed'"><button class="secondary" @click="saveNotes">Save notes</button><button v-if="editingSession.status !== 'completed'" class="primary" @click="completeSession">End session</button><button v-else class="primary" @click="closeSession">Close session</button></template></footer>
      </article>
    </div>
    <ResourcePicker v-if="pickerOpen" :client="selectedClient" :heading="pickerHeading" @close="pickerOpen = false" @sent="handleResourceSent" />
    <div v-if="completionLinks.length" class="modal-backdrop" @click.self="completionLinks = []"><article class="share-link" role="dialog" aria-modal="true"><p class="eyebrow">Ready to send</p><h2>Share {{ completionLinks.length === 1 ? 'this secure link' : 'these secure links' }} with {{ selectedClient.name }}</h2><p>Each link opens its assignment on mobile and expires in 30 days.</p><label v-for="item in completionLinks" :key="item.url"><strong>{{ item.title }}</strong><input readonly :value="item.url" @focus="$event.target.select()" /></label><div><button class="secondary" @click="completionLinks = []">Close</button><button class="primary" @click="copyCompletionLinks">{{ copyLabel }}</button></div></article></div>
  </section>
  <div v-else class="empty-state large"><h2>No client selected</h2><p>Choose a client from Clients to open their orientation workspace.</p></div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import { assignmentCompletionUrl, timelineEventPresentation } from '../../lib/clinicalExchange.js'
import ResourcePicker from './ResourcePicker.vue'

const props = defineProps({ selectedClient: { type: Object, default: null } })
const emit = defineEmits(['update-focus'])
const tabs = [{ id: 'timeline', label: 'Timeline' }, { id: 'sessions', label: 'Sessions' }]
const activeTab = ref('timeline')
const editingSession = ref(null)
const draftNotes = ref('')
const editingFocus = ref(false)
const draftFocus = ref('')
const allSessions = ref(loadSessions())
const startingSession = ref(false)
const clinicalTimelineEvents = ref([])
const pickerOpen = ref(false)
const pickerHeading = ref('Send to client')
const completionLinks = ref([])
const copyLabel = ref('Copy link')
const isDictating = ref(false)
const transcribing = ref(false)
const dictationError = ref('')
const preparingFor = ref(null)
let recorder = null
let chunks = []
let recordingStream = null

const sessions = computed(() => allSessions.value.filter(item => item.clientId === props.selectedClient?.id).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)))
const completedSessions = computed(() => sessions.value.filter(session => ['completed', 'closed'].includes(session.status)))
// No AI approval state exists in this pass; keep the Continuity entry point hidden until it does.
const approvedSessions = computed(() => [])
const lastCompletedSession = computed(() => completedSessions.value[0] || null)
const timelineEvents = computed(() => [...sessions.value.map(session => ({
  id: `session-${session.id}`, date: session.closedAt || session.completedAt || session.updatedAt || session.startedAt, session, icon: '◷',
  title: session.status === 'in_progress' ? 'Session in progress' : 'Session recorded',
  detail: sessionProgressLabel(session) + (session.notes ? ' · Therapist notes saved' : '')
})), ...clinicalTimelineEvents.value.map(event => ({
  id: `clinical-${event.id}`, date: event.occurred_at, icon: timelineIcon(event.event_type), title: event.summary, detail: timelineDetail(event.event_type)
}))].sort((a, b) => new Date(b.date) - new Date(a.date)))

function loadSessions() { try { return JSON.parse(localStorage.getItem('helio_sessions') || '[]') } catch { return [] } }
function persist() { localStorage.setItem('helio_sessions', JSON.stringify(allSessions.value)) }
async function startSession() {
  if (!props.selectedClient || startingSession.value) return
  const session = { id: String(Date.now()), clientId: props.selectedClient.id, startedAt: new Date().toISOString(), status: 'in_progress', workflowStatus: 'no_further_action', notes: '', notesStatus: 'draft', zoomState: 'preparing', zoomMeetingId: null, zoomStartUrl: null, zoomError: '' }
  allSessions.value.push(session); persist(); openSession(session)
  let zoomWindow = null
  try { zoomWindow = window.open('', '_blank'); if (zoomWindow) zoomWindow.opener = null } catch {}
  startingSession.value = true
  try {
    const response = await authenticatedFetch('/api/zoom/start-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: String(session.clientId), sessionRef: String(session.id) }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Zoom could not prepare a meeting for this session.')
    session.zoomState = 'ready'; session.zoomMeetingId = data.meetingId; session.zoomStartUrl = data.startUrl; session.zoomError = ''; persist()
    if (zoomWindow) zoomWindow.location.replace(data.startUrl); else openZoomMeeting(session)
  } catch (error) {
    if (zoomWindow && !zoomWindow.closed) zoomWindow.close()
    session.zoomState = 'unavailable'; session.zoomError = error?.message || 'Zoom could not be opened. You can continue with your notes and try Zoom again from Settings.'; persist()
  } finally { startingSession.value = false }
}
defineExpose({ startSession })
function openZoomMeeting(session) {
  if (!session?.zoomStartUrl) return
  const popup = window.open(session.zoomStartUrl, '_blank')
  if (popup) popup.opener = null
  else { session.zoomError = 'Your browser blocked Zoom. Allow pop-ups, then select Open Zoom.'; persist() }
}
function zoomMeetingLabel(session) { if (session.zoomState === 'preparing') return 'Preparing your Zoom meeting…'; if (session.zoomState === 'ready') return 'Zoom meeting ready'; return 'Zoom was not opened' }
function zoomMeetingDescription(session) { if (session.zoomState === 'preparing') return 'Helio is creating a Zoom meeting and linking it to this session.'; if (session.zoomState === 'ready') return 'Zoom opens separately with its full meeting controls. Helio will use this link to route the transcript back to this session.'; return session.zoomError || 'You can continue taking therapist notes. Reconnect Zoom in Settings before the next session.' }
function openSession(session) { editingSession.value = session; draftNotes.value = session.notes || ''; activeTab.value = 'sessions' }
function openPicker(heading) { pickerHeading.value = heading; pickerOpen.value = true }
async function handleResourceSent({ assignments, clientAccessTokens }) { pickerOpen.value = false; completionLinks.value = assignments.map((assignment, index) => ({ title: assignment.sent_snapshot?.title || 'Resource', url: assignmentCompletionUrl(clientAccessTokens[index]) })); await loadClinicalTimeline() }
async function copyCompletionLinks() { try { await navigator.clipboard.writeText(completionLinks.value.map(item => `${item.title}: ${item.url}`).join('\n')); copyLabel.value = 'Copied'; setTimeout(() => { copyLabel.value = 'Copy links' }, 1600) } catch { copyLabel.value = 'Select and copy' } }
function saveNotes() { editingSession.value.notes = draftNotes.value; editingSession.value.notesStatus = 'saved'; editingSession.value.updatedAt = new Date().toISOString(); persist() }
function completeSession() { saveNotes(); editingSession.value.status = 'completed'; editingSession.value.workflowStatus = editingSession.value.zoomMeetingId ? 'awaiting_transcript' : 'no_further_action'; editingSession.value.completedAt = new Date().toISOString(); persist(); closeEditor() }
function closeSession() { saveNotes(); editingSession.value.status = 'closed'; editingSession.value.workflowStatus = editingSession.value.zoomMeetingId ? 'awaiting_transcript' : 'no_further_action'; editingSession.value.closedAt = new Date().toISOString(); persist(); closeEditor() }
function closeEditor() { stopRecording(); editingSession.value = null; draftNotes.value = ''; dictationError.value = '' }
function beginEditFocus() { draftFocus.value = props.selectedClient?.note || ''; editingFocus.value = true }
function cancelFocusEdit() { editingFocus.value = false; draftFocus.value = '' }
function saveFocus() { emit('update-focus', draftFocus.value.trim()); editingFocus.value = false }
function stopRecording() { if (recorder?.state === 'recording') recorder.stop(); else recordingStream?.getTracks().forEach(track => track.stop()) }
function dictationMessage() { if (dictationError.value) return dictationError.value; if (isDictating.value) return 'Recording. Select Stop dictation when you have finished.'; if (transcribing.value) return 'Transcribing your recording. Audio is discarded immediately after this request.'; return 'Optional: dictate a note, then review and edit the transcript before saving. Audio is not retained.' }
function microphoneError(error) { if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Microphone access was blocked. Allow microphone access in your browser settings, then try again.'; if (error?.name === 'NotFoundError') return 'No microphone was found. Connect one, then try again.'; if (error?.name === 'NotReadableError') return 'Your microphone is in use by another application. Close it, then try again.'; return 'We could not start the microphone. Please try again.' }
async function audioDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The recording could not be prepared for transcription.')); reader.readAsDataURL(blob) }) }
async function toggleDictation() {
  if (isDictating.value) { recorder?.stop(); return }
  dictationError.value = ''
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { dictationError.value = 'Dictation is not supported by this browser. Please use a current version of Chrome, Edge, Firefox, or Safari.'; return }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunks = []
    recorder = new MediaRecorder(recordingStream)
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    recorder.onerror = () => { dictationError.value = 'Recording stopped unexpectedly. Please try again.' }
    recorder.onstop = async () => {
      const stream = recordingStream
      recordingStream = null
      stream?.getTracks().forEach(track => track.stop())
      isDictating.value = false
      const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
      chunks = []
      recorder = null
      if (!blob.size) { dictationError.value = 'No audio was captured. Please try again.'; return }
      transcribing.value = true
      try {
        const response = await authenticatedFetch('/api/ai/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: await audioDataUrl(blob) }) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'The recording could not be transcribed.')
        const text = String(data.text || '').trim()
        if (!text) throw new Error('No speech was detected. Please try again or type the note.')
        draftNotes.value = (draftNotes.value + (draftNotes.value ? '\n\n' : '') + text).trim()
      } catch (error) { dictationError.value = error.message || 'The recording could not be transcribed. Please try again.' } finally { transcribing.value = false }
    }
    recorder.start()
    isDictating.value = true
  } catch (error) {
    recordingStream?.getTracks().forEach(track => track.stop())
    recordingStream = null
    recorder = null
    dictationError.value = microphoneError(error)
  }
}
function sessionStatusLabel(session) { return ({ draft: 'In progress', planned: 'Planned', in_progress: 'In progress', completed: 'Completed', closed: 'Closed' })[session?.status] || 'Completed' }
function workflowStatusLabel(status) { return ({ awaiting_transcript: 'Awaiting transcript', transcript_received: 'Transcript received', needs_review: 'Needs review', review_choices_saved: 'Review choices saved', drafts_awaiting_review: 'Drafts awaiting review', approved: 'Approved', no_further_action: 'No further action' })[status] || 'No further action' }
function sessionProgressLabel(session) { const workflow = workflowStatusLabel(session?.workflowStatus); return workflow === 'No further action' ? sessionStatusLabel(session) : sessionStatusLabel(session) + ' · ' + workflow }
function noteIndicator(session) { if (!session?.notes) return ''; return session.notesStatus === 'draft' && session.status === 'in_progress' ? 'Therapist notes: Draft' : 'Therapist notes: Saved' }
function handleOpenSession(event) { const sessionId = String(event.detail?.sessionId || ''); if (!sessionId) return; allSessions.value = loadSessions(); const session = allSessions.value.find(item => String(item.id) === sessionId && item.clientId === props.selectedClient?.id); if (session) openSession(session) }
function handlePrepareSession(event) {
  if (String(event.detail?.clientId) !== String(props.selectedClient?.id)) return
  preparingFor.value = event.detail.appointment || null
  activeTab.value = 'timeline'
}
function appointmentTime(appointment) { return new Date(appointment?.start).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' }) }
function formatDate(value) { return new Date(value).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }
function preview(value, length = 90) { return value.length > length ? value.slice(0, length) + '…' : value }
function timelineIcon(type) { return timelineEventPresentation(type).icon }
function timelineDetail(type) { return timelineEventPresentation(type).detail }
async function loadClinicalTimeline() { if (!props.selectedClient?.id) return; try { const response = await authenticatedFetch('/api/client-timeline?clientId=' + encodeURIComponent(props.selectedClient.id)); const data = await response.json().catch(() => ({})); clinicalTimelineEvents.value = response.ok ? (data.events || []) : [] } catch { clinicalTimelineEvents.value = [] } }
watch(() => props.selectedClient?.id, () => { activeTab.value = 'timeline'; preparingFor.value = null; closeEditor(); cancelFocusEdit(); clinicalTimelineEvents.value = []; loadClinicalTimeline() }, { immediate: true })
onMounted(() => { window.addEventListener('helio:open-session', handleOpenSession); window.addEventListener('helio:prepare-session', handlePrepareSession) })
onUnmounted(() => { window.removeEventListener('helio:open-session', handleOpenSession); window.removeEventListener('helio:prepare-session', handlePrepareSession) })
</script>

<style scoped>
.client-record{max-width:68rem;margin:0 auto;color:#2c3e50}.record-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:#fff;border:1px solid #dbe1e8;border-radius:.9rem;padding:1.2rem 1.4rem}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.7rem;font-weight:750;margin:0 0 .25rem}.record-header h1{display:inline;font-size:1.6rem;margin:0}.status{display:inline-block;margin-left:.65rem;background:#ecfdf5;color:#047857;border-radius:999px;padding:.2rem .5rem;font-size:.7rem;font-weight:700}.primary,.secondary,.text-action{border-radius:.55rem;padding:.6rem .9rem;font-weight:650}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.secondary{border:1px solid #d7dde6;background:#fff;color:#334155}.start-session{padding:.75rem 1rem}.text-action{border:0;background:transparent;color:#2563eb;padding:.25rem .1rem}.record-tabs{display:flex;gap:.25rem;border-bottom:1px solid #dbe1e8;margin:1rem 0}.record-tabs button{border:0;background:transparent;padding:.7rem .9rem;color:#64748b;font-weight:650;border-bottom:2px solid transparent}.record-tabs button.active{color:#1d4ed8;border-color:#2563eb}.focus-card,.latest-card,.appointment-card,.recent-card,.section-card{background:#fff;border:1px solid #dbe1e8;border-radius:.8rem;padding:1.2rem}.card-heading,.section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.card-heading h2,.section-heading h2{margin:0;font-size:1.15rem}.focus-copy,.summary-copy{white-space:pre-wrap;line-height:1.6;margin:.85rem 0 0}.quiet-copy{color:#8491a3;margin:.75rem 0 0}.focus-card textarea,.session-editor textarea{width:100%;min-height:7rem;resize:vertical;border:1px solid #cfd7e2;border-radius:.65rem;padding:.8rem;outline:none}.focus-card textarea:focus,.session-editor textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.inline-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.7rem}.overview-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(14rem,.8fr);gap:.8rem;margin-top:.8rem}.session-status{color:#047857;font-size:.8rem;font-weight:700;margin:.75rem 0 .3rem}.appointment-card h2{font-size:1rem;margin:.45rem 0;color:#475569}.continuity-link{margin-top:.8rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;width:100%;text-align:left;background:#f8fbff;border:1px solid #bfdbfe;border-radius:.8rem;padding:1rem;color:#1e3a5f}.continuity-link span:first-child{display:flex;flex-direction:column}.continuity-link small{color:#64748b;margin-top:.2rem}.recent-card{margin-top:.8rem}.section-heading p{margin:.25rem 0 1rem;color:#64748b;font-size:.85rem}.session-row{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;border-top:1px solid #edf0f4;background:#fff;padding:.85rem .2rem;text-align:left;color:#334155}.session-row span:first-child{display:flex;flex-direction:column}.session-row small{color:#64748b;margin-top:.15rem}.empty-inline{border-top:1px solid #edf0f4;padding:1rem 0;color:#8491a3}.empty-state{text-align:center;color:#64748b;padding:2.2rem}.empty-state div{font-size:2rem}.empty-state h2,.empty-state h3{color:#334155;margin:.5rem}.empty-state p{max-width:38rem;margin:.4rem auto;line-height:1.55}.large{min-height:24rem;display:flex;flex-direction:column;justify-content:center;align-items:center}.modal-backdrop{position:fixed;inset:0;z-index:80;background:#0f172a66;display:flex;align-items:center;justify-content:center;padding:1rem}.session-editor{width:min(46rem,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:1rem;padding:1.3rem;box-shadow:0 20px 60px #0004}.session-editor header{display:flex;justify-content:space-between}.session-editor h2{margin:.1rem 0 1rem}.close{border:0;background:transparent;font-size:1.7rem;color:#64748b}.session-editor label{display:block;font-weight:700;margin-bottom:.4rem}.session-editor textarea{min-height:15rem}.ai-boundary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:.65rem;padding:.8rem;margin-top:.8rem}.ai-boundary strong{font-size:.8rem}.ai-boundary p{font-size:.78rem;color:#64748b;margin:.25rem 0}.session-editor footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}.note-label{display:flex;align-items:center;justify-content:space-between;gap:1rem}.dictate{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.75rem;padding:.7rem 1rem;border:1px solid #b91c1c;border-radius:.65rem;background:#dc2626;color:#fff;font-weight:750;box-shadow:0 1px 2px #0002}.dictate:disabled{opacity:.65;cursor:wait}.dictate.recording{background:#7f1d1d;border-color:#7f1d1d}.record-dot{width:.75rem;height:.75rem;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 #fff8}.dictate.recording .record-dot{animation:pulse 1.25s infinite}.dictation-help{margin:.45rem 0 .7rem;font-size:.78rem;color:#64748b;line-height:1.4}.dictation-help.recording,.dictation-help.error{color:#b91c1c;font-weight:650}@keyframes pulse{50%{box-shadow:0 0 0 .45rem #fff0}}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:700px){.record-header{align-items:flex-start}.record-header h1{font-size:1.35rem}.record-tabs{overflow:auto}.record-tabs button{padding:.65rem .7rem;white-space:nowrap}.overview-grid{grid-template-columns:1fr}.card-heading,.section-heading{flex-direction:column}.modal-backdrop{padding:0;align-items:flex-end}.session-editor{border-radius:1rem 1rem 0 0;max-height:94vh}.session-editor footer{flex-wrap:wrap}.session-editor footer button{flex:1}.note-label{align-items:flex-start;flex-direction:column}.dictate{width:100%}}
.timeline-card{margin-top:.8rem;background:#fff;border:1px solid #dbe1e8;border-radius:.8rem;padding:1.2rem}.timeline-event{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.75rem;width:100%;border:0;border-top:1px solid #edf0f4;background:#fff;padding:.9rem 0;text-align:left;color:#334155}.timeline-event:hover{background:#f8fbff}.timeline-event span:nth-child(2){display:flex;flex-direction:column}.timeline-event small{color:#64748b;margin-top:.15rem}.timeline-marker{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:#eff6ff;color:#1d4ed8}
.timeline-actions,.session-actions{display:flex;flex-wrap:wrap;gap:.45rem}.timeline-actions{justify-content:flex-end}.timeline-actions .secondary,.session-actions .secondary{font-size:.78rem;padding:.5rem .65rem}.session-actions{align-items:center;margin:.8rem 0;padding:.7rem 0;border-top:1px solid #edf0f4;border-bottom:1px solid #edf0f4}.session-actions span{width:100%;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;font-weight:750;color:#64748b}
.zoom-session{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:0 0 1rem;padding:.9rem 1rem;border:1px solid #bfdbfe;border-radius:.7rem;background:#f8fbff}.zoom-session.warn{border-color:#fecaca;background:#fff7f7}.zoom-session strong,.zoom-session small{display:block}.zoom-session small{margin-top:.25rem;color:#64748b;font-size:.8rem;line-height:1.4}.zoom-session.warn small{color:#991b1b}.zoom-session .secondary{flex:0 0 auto;white-space:nowrap}@media(max-width:700px){.zoom-session{align-items:stretch;flex-direction:column}.zoom-session .secondary{width:100%}}
.preparation-card{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.8rem;padding:1.1rem 1.2rem;background:#f8fbff;border:1px solid #bfdbfe;border-radius:.8rem}.preparation-card h2{font-size:1.05rem;margin:.2rem 0}.preparation-card p:last-child{margin:.35rem 0 0;color:#64748b;line-height:1.45}@media(max-width:700px){.preparation-card{flex-direction:column;align-items:stretch}.preparation-card .primary{width:100%}}
.share-link{width:min(35rem,100%);background:#fff;border-radius:1rem;padding:1.3rem}.share-link h2{margin:.2rem 0 .5rem}.share-link p{color:#64748b;line-height:1.5}.share-link label{display:block;margin:.75rem 0;color:#334155;font-size:.85rem}.share-link label strong{display:block;margin-bottom:.35rem}.share-link input{box-sizing:border-box;width:100%;padding:.75rem;border:1px solid #cfd7e2;border-radius:.6rem;font:inherit}.share-link div{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}
</style>
