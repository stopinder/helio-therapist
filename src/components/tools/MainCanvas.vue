<template>
  <section v-if="selectedClient" class="client-record">
    <header class="record-header">
      <div>
        <p class="eyebrow">Client</p>
        <h1>{{ selectedClient.name }}</h1>
        <span class="status">{{ selectedClient.archived ? 'Archived' : 'Active' }}</span>
      </div>
      <button class="primary start-session" :disabled="startingSession || sessionsLoading" @click="openSessionWorkspace">{{ startingSession ? 'Preparing Workspace…' : 'Open Session Workspace' }}</button>
    </header>

    <nav class="record-tabs" aria-label="Client workspaces">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <main v-if="activeTab === 'timeline'" class="overview">
      <article v-if="preparingFor" class="preparation-card">
        <div><p class="eyebrow">Upcoming appointment</p><h2>{{ preparingFor.summary || 'Session preparation' }}</h2><p>{{ appointmentTime(preparingFor) }}. Review the current focus and one recent clinical event before opening the session.</p><p v-if="lastMeaningfulEvent" class="preparation-carry-forward"><strong>Carry forward:</strong> {{ lastMeaningfulEvent.title }} <span>· {{ formatDate(lastMeaningfulEvent.date) }}</span></p></div>
        <div class="preparation-actions">
          <button class="primary" :disabled="startingSession" @click="openSessionWorkspace">{{ startingSession ? 'Preparing Workspace…' : 'Open Session Workspace' }}</button>
          <button 
            v-if="preparingFor.meetingLink" 
            class="secondary" 
            @click="joinVideo(preparingFor)"
          >
            Join {{ videoProviderLabel(preparingFor) }} ↗
          </button>
        </div>
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
        <div class="card-heading"><div><p class="eyebrow">Timeline</p><h2>Clinical story</h2><p class="quiet-copy">What has happened with this person. It shows clinically useful events, not an audit log.</p></div><div class="timeline-actions"><button class="secondary" @click="openPicker">Send to client</button></div></div>
        <div v-if="!timelineEvents.length" class="empty-inline">No clinical events recorded yet. Complete a session or record a clinically meaningful change.</div>
        <button v-for="event in timelineEvents" :key="event.id" class="timeline-event" @click="event.session && openSession(event.session)">
          <span class="timeline-marker" aria-hidden="true">{{ event.icon }}</span>
          <span><strong>{{ event.title }}</strong><small>{{ formatDate(event.date) }} · {{ event.detail }}</small></span><span v-if="event.session">Open ›</span>
        </button>
      </section>
    </main>

    <section v-else-if="activeTab === 'sessions'" class="section-card">
      <div class="section-heading"><div><p class="eyebrow">Sessions</p><h2>Therapeutic encounters</h2><p>Open a session to review its notes, source material and approved outputs.</p></div></div>
      <p v-if="sessionError" class="session-error" role="alert">{{ sessionError }}</p>
      <div v-if="sessionsLoading" class="empty-state"><p>Loading sessions…</p></div>
      <div v-else-if="!sessions.length" class="empty-state"><div>📝</div><h3>No sessions recorded</h3><p>Start a session when you are ready to take notes.</p></div>
      <button v-for="session in sessions" :key="session.id" class="session-row" @click="openSession(session)"><span><strong>{{ formatDate(session.startedAt) }}</strong><small>{{ sessionListMeta(session) }}</small><small v-if="session.notes">{{ preview(session.notes, 90) }}</small></span><span>Open Workspace ›</span></button>
    </section>

    <div v-if="editingSession" class="modal-backdrop" @click.self="requestCloseEditor">
      <article class="session-editor" role="dialog" aria-modal="true" aria-labelledby="session-title">
        <header><div><p class="eyebrow">{{ sessionStatusLabel(editingSession) === 'Closed' ? 'Closed session' : editingSession.status === 'completed' ? 'Session complete' : 'Active session' }}</p><h2 id="session-title">{{ formatDate(editingSession.startedAt) }}</h2></div><button class="close" @click="requestCloseEditor" aria-label="Close">×</button></header>
        <section v-if="editingSession.videoState" class="video-session" :class="{ warn: editingSession.videoState === 'unavailable' }">
          <div><p class="eyebrow">{{ videoProviderLabel(editingSession) }}</p><strong>{{ videoMeetingLabel(editingSession) }}</strong><small>{{ videoMeetingDescription(editingSession) }}</small></div>
          <button v-if="editingSession.meetingUrl" class="secondary" @click="openVideoMeeting(editingSession)">Open {{ videoProviderLabel(editingSession) }}</button>
        </section>
        <nav class="session-tabs" aria-label="Session material"><button v-for="tab in sessionTabs" :key="tab.id" :class="{ active: sessionWorkspaceTab === tab.id }" @click="sessionWorkspaceTab = tab.id">{{ tab.label }}</button></nav>
        <section v-if="sessionWorkspaceTab === 'overview'" class="session-overview"><section v-if="selectedClient.note" class="session-context"><p class="eyebrow">Current focus</p><p>{{ selectedClient.note }}</p></section><section class="session-summary-card"><p class="eyebrow">Session overview</p><h3>{{ sessionStatusLabel(editingSession) }}</h3><p>{{ sessionOverviewCopy(editingSession) }}</p><button class="secondary" @click="sessionWorkspaceTab = 'clinical-note'">Open clinical note</button></section></section>
        <section v-else-if="sessionWorkspaceTab === 'clinical-note'"><div class="note-label"><div><p class="eyebrow">Primary clinical record</p><label for="session-notes">Therapist-approved clinical note</label></div><button v-if="editingSession.status === 'in_progress'" class="dictate" :class="{ recording: isDictating }" :disabled="transcribing" @click="toggleDictation"><span class="record-dot" aria-hidden="true"></span>{{ isDictating ? 'Stop dictation' : transcribing ? 'Transcribing…' : 'Start dictation' }}</button></div><p class="note-guidance">Record the session in your own words. Review and save this note before relying on source material.</p><p v-if="editingSession.status === 'in_progress'" class="dictation-help" :class="{ recording: isDictating, error: dictationError }" role="status">{{ dictationMessage() }}</p><textarea id="session-notes" v-model="draftNotes" :disabled="editingSession.status !== 'in_progress'" placeholder="Record the session in your own words…"></textarea></section>
        <section v-else-if="sessionWorkspaceTab === 'transcript'" class="source-material"><p class="eyebrow">Source material</p><h3>Transcript</h3><p>A transcript preserves what was said. It is not the approved clinical record and is never added without your review.</p><p class="quiet-copy">No transcript is available for this session yet.</p><button class="secondary" @click="sessionWorkspaceTab = 'clinical-note'">Return to clinical note</button></section>
        <section v-else-if="sessionWorkspaceTab === 'resources-actions'"><div class="session-actions"><span>Resources and actions</span><button class="secondary" @click="openPicker">Send to client</button></div><p class="quiet-copy">Resources shared, agreed actions and follow-up tasks will appear here for this session.</p></section>
        <p v-if="sessionError" class="session-error" role="alert">{{ sessionError }}</p>
        <footer><button class="secondary" :disabled="sessionSaving" @click="requestCloseEditor">Close</button><template v-if="editingSession.status === 'in_progress'"><button class="secondary" :disabled="sessionSaving || !notesDirty" @click="saveNotes">{{ sessionSaving ? 'Saving…' : 'Save notes' }}</button><button class="primary" :disabled="sessionSaving" @click="completeSession">{{ sessionSaving ? 'Completing…' : 'End session' }}</button></template></footer>
      </article>
    </div>
    <ResourcePicker v-if="pickerOpen" :client="selectedClient" @close="pickerOpen = false" @sent="handleResourceSent" />
    <div v-if="completionLinks.length" class="modal-backdrop" @click.self="completionLinks = []"><article class="share-link" role="dialog" aria-modal="true"><p class="eyebrow">Ready to send</p><h2>Share {{ completionLinks.length === 1 ? 'this secure link' : 'these secure links' }} with {{ selectedClient.name }}</h2><p>Each link opens its assignment on mobile and expires in 30 days.</p><label v-for="item in completionLinks" :key="item.url"><strong>{{ item.title }}</strong><input readonly :value="item.url" @focus="$event.target.select()" /></label><div><button class="secondary" @click="completionLinks = []">Close</button><button class="primary" @click="copyCompletionLinks">{{ copyLabel }}</button></div></article></div>
  </section>
  <div v-else class="empty-state large"><h2>No client selected</h2><p>Choose a client from Clients to open their orientation workspace.</p></div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authenticatedFetch } from '../../lib/api.js'
import { assignmentCompletionUrl, timelineEventPresentation } from '../../lib/clinicalExchange.js'
import { completeSessionRecord, createOrResumeSession, listSessions, migrateLegacySessions, saveSessionDraft } from '../../lib/sessions.js'
import { videoProviderService } from '../../lib/videoProvider.js'
import ResourcePicker from './ResourcePicker.vue'

const props = defineProps({ selectedClient: { type: Object, default: null } })
const emit = defineEmits(['update-focus'])
const router = useRouter()
const tabs = [{ id: 'timeline', label: 'Timeline' }, { id: 'sessions', label: 'Sessions' }]
const activeTab = ref('timeline')
const sessionTabs = [{ id: 'overview', label: 'Overview' }, { id: 'clinical-note', label: 'Clinical note' }, { id: 'transcript', label: 'Transcript' }, { id: 'resources-actions', label: 'Resources & actions' }]
const sessionWorkspaceTab = ref('overview')
const editingSession = ref(null)
const draftNotes = ref('')
const editingFocus = ref(false)
const draftFocus = ref('')
const allSessions = ref([])
const startingSession = ref(false)
const openSessionWorkspace = async () => {
  if (props.selectedClient) {
    startingSession.value = true
    sessionError.value = ''
    try {
      const { session } = await createOrResumeSession(props.selectedClient.id)
      router.push({
        name: 'SessionWorkspace',
        params: { clientId: props.selectedClient.id, sessionId: session.id }
      })
    } catch (error) {
      sessionError.value = error?.message || 'The session workspace could not be opened.'
    } finally {
      startingSession.value = false
    }
  }
}

const joinVideo = (appointment) => {
  videoProviderService.openMeeting({
    videoProvider: appointment?.videoProvider || 'custom',
    meetingUrl: appointment?.meetingLink
  })
}

const videoProviderLabel = (appointment) => {
  return videoProviderService.getProviderLabel(appointment?.videoProvider || 'custom')
}
const sessionsLoading = ref(false)
const sessionSaving = ref(false)
const sessionError = ref('')
const clinicalTimelineEvents = ref([])
const pickerOpen = ref(false)
const completionLinks = ref([])
const copyLabel = ref('Copy link')
const isDictating = ref(false)
const transcribing = ref(false)
const dictationError = ref('')
const preparingFor = ref(null)
let recorder = null
let chunks = []
let recordingStream = null

const sessions = computed(() => allSessions.value.filter(item => String(item.clientId) === String(props.selectedClient?.id)).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)))
const notesDirty = computed(() => Boolean(
  editingSession.value?.status === 'in_progress'
  && draftNotes.value !== (editingSession.value?.notes || '')
))
const timelineEvents = computed(() => clinicalTimelineEvents.value.map(event => ({
  id: `clinical-${event.id}`,
  date: event.occurred_at,
  session: event.session_id ? sessions.value.find(session => String(session.id) === String(event.session_id)) : null,
  icon: timelineIcon(event.event_type),
  title: event.summary,
  detail: timelineDetail(event.event_type)
})).sort((a, b) => new Date(b.date) - new Date(a.date)))
const lastMeaningfulEvent = computed(() => timelineEvents.value[0] || null)

async function loadDurableSessions() {
  sessionsLoading.value = true
  sessionError.value = ''
  try {
    await migrateLegacySessions()
    allSessions.value = await listSessions()
  } catch (error) {
    sessionError.value = error?.message || 'Sessions could not be loaded.'
  } finally {
    sessionsLoading.value = false
  }
}
function replaceSession(updated) {
  const index = allSessions.value.findIndex(session => session.id === updated.id)
  if (index >= 0) allSessions.value[index] = updated
  else allSessions.value.unshift(updated)
  if (editingSession.value?.id === updated.id) editingSession.value = updated
}
async function startSession() {
  if (!props.selectedClient || startingSession.value) return
  sessionError.value = ''
  startingSession.value = true
  let session
  let resumed
  try {
    const result = await createOrResumeSession(props.selectedClient.id)
    session = result.session
    resumed = result.resumed
    replaceSession(session)
    openSession(session)
    if (resumed) return
  } catch (error) {
    sessionError.value = error?.message || 'The session could not be started.'
    return
  } finally {
    if (resumed || !session) startingSession.value = false
  }
  let videoWindow = null
  try { videoWindow = window.open('', '_blank'); if (videoWindow) videoWindow.opener = null } catch {}
  try {
    const response = await authenticatedFetch('/api/video/start-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: String(session.clientId), sessionRef: String(session.id) }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'The video consultation could not be prepared for this session.')
    session = await saveSessionDraft(session, draftNotes.value, { state: 'ready', meetingId: data.meetingId, error: '' })
    session.meetingUrl = data.startUrl
    replaceSession(session)
    if (videoWindow) videoWindow.location.replace(data.startUrl); else openVideoMeeting(session)
  } catch (error) {
    if (videoWindow && !videoWindow.closed) videoWindow.close()
    const message = error?.message || 'The video session could not be opened. You can continue with your notes and try joining again from the header.'
    try {
      session = await saveSessionDraft(session, draftNotes.value, { state: 'unavailable', error: message })
      replaceSession(session)
    } catch {
      session.videoState = 'unavailable'
      session.videoError = message
      replaceSession(session)
    }
  } finally { startingSession.value = false }
}
defineExpose({ startSession })
function openVideoMeeting(session) {
  videoProviderService.openMeeting(session)
}
function videoMeetingLabel(session) { 
  const provider = videoProviderLabel(session)
  if (session.videoState === 'preparing') return `Preparing your ${provider} meeting…`; 
  if (session.videoState === 'ready') return `${provider} meeting ready`; 
  return `${provider} was not opened` 
}
function videoMeetingDescription(session) { 
  const provider = videoProviderLabel(session)
  if (session.videoState === 'preparing') return `Helio is creating a ${provider} meeting and linking it to this session.`; 
  if (session.videoState === 'ready') return `${provider} opens separately with its full meeting controls. Helio will use this link to route the transcript back to this session.`; 
  return session.videoError || `You can continue taking therapist notes. Reconnect your ${provider} account in Settings before the next session.` 
}
function openSession(session) { editingSession.value = session; draftNotes.value = session.notes || ''; sessionWorkspaceTab.value = 'overview'; activeTab.value = 'sessions' }
function openPicker() { pickerOpen.value = true }
async function handleResourceSent({ assignments, clientAccessTokens }) { pickerOpen.value = false; completionLinks.value = assignments.map((assignment, index) => ({ title: assignment.sent_snapshot?.title || 'Resource', url: assignmentCompletionUrl(clientAccessTokens[index]) })); await loadClinicalTimeline() }
async function copyCompletionLinks() { try { await navigator.clipboard.writeText(completionLinks.value.map(item => `${item.title}: ${item.url}`).join('\n')); copyLabel.value = 'Copied'; setTimeout(() => { copyLabel.value = 'Copy links' }, 1600) } catch { copyLabel.value = 'Select and copy' } }
async function saveNotes() {
  if (!editingSession.value || sessionSaving.value) return
  sessionSaving.value = true
  sessionError.value = ''
  try {
    const saved = await saveSessionDraft(editingSession.value, draftNotes.value)
    replaceSession(saved)
  } catch (error) {
    sessionError.value = error?.message || 'The session note could not be saved.'
  } finally {
    sessionSaving.value = false
  }
}
async function completeSession() {
  if (!editingSession.value || sessionSaving.value) return
  sessionSaving.value = true
  sessionError.value = ''
  try {
    const completed = await completeSessionRecord(editingSession.value, draftNotes.value)
    replaceSession(completed)
    await loadClinicalTimeline()
    closeEditor()
  } catch (error) {
    sessionError.value = error?.message || 'The session could not be completed.'
  } finally {
    sessionSaving.value = false
  }
}
function closeEditor() { stopRecording(); editingSession.value = null; draftNotes.value = ''; dictationError.value = '' }
function requestCloseEditor() {
  if (notesDirty.value && !window.confirm('Discard the unsaved changes to this session note?')) return
  closeEditor()
}
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
function sessionStatusLabel(session) { return ({ draft: 'In progress', planned: 'Planned', in_progress: 'In progress', completed: 'Completed', closed: 'Completed' })[session?.status] || 'Completed' }
function workflowStatusLabel(status) { return ({ awaiting_transcript: 'Awaiting transcript', transcript_received: 'Transcript received', needs_review: 'Needs review', review_choices_saved: 'Review choices saved', drafts_awaiting_review: 'Drafts awaiting review', approved: 'Approved', no_further_action: 'No further action' })[status] || 'No further action' }
function sessionProgressLabel(session) { const workflow = workflowStatusLabel(session?.workflowStatus); return workflow === 'No further action' ? sessionStatusLabel(session) : sessionStatusLabel(session) + ' · ' + workflow }
function sessionDurationLabel(session) { if (!session?.endedAt || !session?.startedAt) return ''; const minutes = Math.max(1, Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000)); return minutes + ' min' }
function sessionListMeta(session) { return [sessionDurationLabel(session), sessionStatusLabel(session), noteIndicator(session), session?.workflowStatus && session.workflowStatus !== 'no_further_action' ? workflowStatusLabel(session.workflowStatus) : ''].filter(Boolean).join(' · ') }
function sessionOverviewCopy(session) { return session.notes ? 'A clinical note has been started for this encounter. Review it before opening source material.' : 'Use the clinical note to create the therapist-approved record for this encounter.' }
function noteIndicator(session) { if (!session?.notes) return ''; return session.notesStatus === 'draft' && session.status === 'in_progress' ? 'Therapist notes: Draft' : 'Therapist notes: Saved' }
async function handleOpenSession(event) {
  const sessionId = String(event.detail?.sessionId || '')
  if (!sessionId) return
  if (!allSessions.value.length) await loadDurableSessions()
  const session = allSessions.value.find(item =>
    (String(item.id) === sessionId || String(item.legacyRef || '') === sessionId)
    && String(item.clientId) === String(props.selectedClient?.id)
  )
  if (session) openSession(session)
}
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
watch(() => props.selectedClient?.id, () => { activeTab.value = 'timeline'; preparingFor.value = null; closeEditor(); cancelFocusEdit(); clinicalTimelineEvents.value = []; loadClinicalTimeline(); loadDurableSessions() }, { immediate: true })
onMounted(() => { window.addEventListener('helio:open-session', handleOpenSession); window.addEventListener('helio:prepare-session', handlePrepareSession) })
onUnmounted(() => { window.removeEventListener('helio:open-session', handleOpenSession); window.removeEventListener('helio:prepare-session', handlePrepareSession) })
</script>

<style scoped>
.client-record{max-width:68rem;margin:0 auto;color:var(--text-primary)}.record-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.9rem;padding:1.2rem 1.4rem}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);font-size:.7rem;font-weight:700;margin:0 0 .25rem}.record-header h1{display:inline;font-size:1.6rem;margin:0}.status{display:inline-block;margin-left:.65rem;background:var(--state-success-surface);color:var(--state-success);border-radius:999px;padding:.2rem .5rem;font-size:.7rem;font-weight:700}.primary,.secondary,.text-action{border-radius:.55rem;padding:.6rem .9rem;font-weight:600}.primary{border:1px solid var(--action-link);background:var(--action-link);color:var(--surface-elevated)}.secondary{border:1px solid var(--border);background:var(--surface-elevated);color:var(--text-secondary)}.start-session{padding:.75rem 1rem}.text-action{border:0;background:transparent;color:var(--action-link);padding:.25rem .1rem}.record-tabs{display:flex;gap:.25rem;border-bottom:1px solid var(--border-muted);margin:1rem 0}.session-tabs{display:flex;gap:.25rem;overflow:auto;border-bottom:1px solid var(--border-muted);margin:1rem 0}.session-tabs button{border:0;background:transparent;padding:.6rem .7rem;color:var(--text-muted);font-weight:600;border-bottom:2px solid transparent;white-space:nowrap}.session-tabs button.active{color:var(--action-link-hover);border-color:var(--action-link)}.record-tabs button{border:0;background:transparent;padding:.7rem .9rem;color:var(--text-muted);font-weight:600;border-bottom:2px solid transparent}.record-tabs button.active{color:var(--action-link-hover);border-color:var(--action-link)}.focus-card,.latest-card,.appointment-card,.recent-card,.section-card{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.8rem;padding:1.2rem}.card-heading,.section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.card-heading h2,.section-heading h2{margin:0;font-size:1.15rem}.focus-copy,.summary-copy{white-space:pre-wrap;line-height:1.6;margin:.85rem 0 0}.quiet-copy{color:var(--text-muted);margin:.75rem 0 0}.focus-card textarea,.session-editor textarea{width:100%;min-height:7rem;resize:vertical;border:1px solid var(--border);border-radius:.65rem;padding:.8rem;outline:none}.focus-card textarea:focus,.session-editor textarea:focus{border-color:var(--border-strong);box-shadow:0 0 0 3px var(--state-selected)}.inline-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.7rem}.overview-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(14rem,.8fr);gap:.8rem;margin-top:.8rem}.session-status{color:var(--state-success);font-size:.8rem;font-weight:700;margin:.75rem 0 .3rem}.appointment-card h2{font-size:1rem;margin:.45rem 0;color:var(--text-secondary)}.continuity-link{margin-top:.8rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;width:100%;text-align:left;background:var(--surface-muted);border:1px solid var(--state-selected);border-radius:.8rem;padding:1rem;color:var(--text-primary)}.continuity-link span:first-child{display:flex;flex-direction:column}.continuity-link small{color:var(--text-muted);margin-top:.2rem}.recent-card{margin-top:.8rem}.section-heading p{margin:.25rem 0 1rem;color:var(--text-muted);font-size:.85rem}.session-row{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;border-top:1px solid var(--border-muted);background:var(--surface-elevated);padding:.85rem .2rem;text-align:left;color:var(--text-secondary)}.session-row span:first-child{display:flex;flex-direction:column}.session-row small{color:var(--text-muted);margin-top:.15rem}.empty-inline{border-top:1px solid var(--border-muted);padding:1rem 0;color:var(--text-muted)}.empty-state{text-align:center;color:var(--text-muted);padding:2.2rem}.empty-state div{font-size:2rem}.empty-state h2,.empty-state h3{color:var(--text-secondary);margin:.5rem}.empty-state p{max-width:38rem;margin:.4rem auto;line-height:1.55}.large{min-height:24rem;display:flex;flex-direction:column;justify-content:center;align-items:center}.modal-backdrop{position:fixed;inset:0;z-index:80;background:var(--surface-backdrop);display:flex;align-items:center;justify-content:center;padding:1rem}.session-editor{width:min(46rem,100%);max-height:90vh;overflow:auto;background:var(--surface-elevated);border-radius:1rem;padding:1.3rem;box-shadow:0 20px 60px rgb(24 32 28 / 0.12)}.session-editor header{display:flex;justify-content:space-between}.session-editor h2{margin:.1rem 0 1rem}.close{border:0;background:transparent;font-size:1.7rem;color:var(--text-muted)}.session-editor label{display:block;font-weight:700;margin-bottom:.4rem}.session-editor textarea{min-height:15rem}.session-overview,.source-material,.session-summary-card{padding:.95rem;background:var(--surface-muted);border:1px solid var(--border-muted);border-radius:.7rem}.session-summary-card h3,.source-material h3{margin:.15rem 0 .45rem}.session-summary-card p,.source-material p{line-height:1.5;color:var(--text-secondary)}.note-guidance{margin:.3rem 0 .7rem;color:var(--text-muted);font-size:.85rem}.ai-boundary{background:var(--surface-muted);border:1px solid var(--border-muted);border-radius:.65rem;padding:.8rem;margin-top:.8rem}.ai-boundary strong{font-size:.8rem}.ai-boundary p{font-size:.78rem;color:var(--text-muted);margin:.25rem 0}.session-editor footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}.note-label{display:flex;align-items:center;justify-content:space-between;gap:1rem}.dictate{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.75rem;padding:.7rem 1rem;border:1px solid var(--state-danger);border-radius:.65rem;background:var(--state-danger);color:var(--surface-elevated);font-weight:700;box-shadow:0 1px 2px rgb(24 32 28 / 0.05)}.dictate:disabled{opacity:.65;cursor:wait}.dictate.recording{background:var(--state-danger);border-color:var(--state-danger)}.record-dot{width:.75rem;height:.75rem;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 transparent}.dictate.recording .record-dot{animation:pulse 1.25s infinite}.dictation-help{margin:.45rem 0 .7rem;font-size:.78rem;color:var(--text-muted);line-height:1.4}.dictation-help.recording,.dictation-help.error{color:var(--state-danger);font-weight:600}@keyframes pulse{50%{box-shadow:0 0 0 .45rem transparent}}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:700px){.record-header{align-items:flex-start}.record-header h1{font-size:1.35rem}.record-tabs{overflow:auto}.record-tabs button{padding:.65rem .7rem;white-space:nowrap}.overview-grid{grid-template-columns:1fr}.card-heading,.section-heading{flex-direction:column}.modal-backdrop{padding:0;align-items:flex-end}.session-editor{border-radius:1rem 1rem 0 0;max-height:94vh}.session-editor footer{flex-wrap:wrap}.session-editor footer button{flex:1}.note-label{align-items:flex-start;flex-direction:column}.dictate{width:100%}}
.timeline-card{margin-top:.8rem;background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.8rem;padding:1.2rem}.timeline-event{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.75rem;width:100%;border:0;border-top:1px solid var(--border-muted);background:var(--surface-elevated);padding:.9rem 0;text-align:left;color:var(--text-secondary)}.timeline-event:hover{background:var(--surface-muted)}.timeline-event span:nth-child(2){display:flex;flex-direction:column}.timeline-event small{color:var(--text-muted);margin-top:.15rem}.timeline-marker{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:var(--state-selected);color:var(--action-link-hover)}
.timeline-actions,.session-actions{display:flex;flex-wrap:wrap;gap:.45rem}.timeline-actions{justify-content:flex-end}.timeline-actions .secondary,.session-actions .secondary{font-size:.78rem;padding:.5rem .65rem}.session-actions{align-items:center;margin:.8rem 0;padding:.7rem 0;border-top:1px solid var(--border-muted);border-bottom:1px solid var(--border-muted)}.session-actions span{width:100%;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:var(--text-muted)}
.video-session{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:0 0 1rem;padding:.9rem 1rem;border:1px solid var(--state-selected);border-radius:.7rem;background:var(--surface-muted)}.video-session.warn{border-color:var(--state-danger);background:var(--state-danger-surface)}.video-session strong,.video-session small{display:block}.video-session small{margin-top:.25rem;color:var(--text-muted);font-size:.8rem;line-height:1.4}.video-session.warn small{color:var(--state-danger)}.video-session .secondary{flex:0 0 auto;white-space:nowrap}@media(max-width:700px){.video-session{align-items:stretch;flex-direction:column}.video-session .secondary{width:100%}}
.preparation-card{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.8rem;padding:1.1rem 1.2rem;background:var(--surface-muted);border:1px solid var(--border-muted);border-radius:.8rem}.preparation-card h2{font-size:1.05rem;margin:.2rem 0}.preparation-card p:last-child{margin:.35rem 0 0;color:var(--text-muted);line-height:1.45}@media(max-width:700px){.preparation-card{flex-direction:column;align-items:stretch}.preparation-card .primary{width:100%}}
.share-link{width:min(35rem,100%);background:var(--surface-elevated);border-radius:1rem;padding:1.3rem}.share-link h2{margin:.2rem 0 .5rem}.share-link p{color:var(--text-muted);line-height:1.5}.share-link label{display:block;margin:.75rem 0;color:var(--text-secondary);font-size:.85rem}.share-link label strong{display:block;margin-bottom:.35rem}.share-link input{box-sizing:border-box;width:100%;padding:.75rem;border:1px solid var(--border);border-radius:.6rem;font:inherit}.share-link div{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}
.session-context{background:var(--surface-muted);border:1px solid var(--border-muted);border-radius:.65rem;padding:.8rem;margin:0 0 .85rem}.session-context p:last-child{white-space:pre-wrap;color:var(--text-secondary);line-height:1.5;margin:.25rem 0 0}.preparation-carry-forward{padding-top:.55rem;border-top:1px solid var(--state-selected)}.preparation-carry-forward span{color:var(--text-muted)}
.session-error{margin:.75rem 0;color:var(--state-danger);font-size:.85rem;font-weight:600}

/* The record stays a continuous working surface; panels mark real tasks only. */
.record-header,.focus-card,.latest-card,.appointment-card,.recent-card,.section-card,.timeline-card{background:var(--surface);border-color:var(--border-muted);box-shadow:none}.record-tabs{border-color:var(--border-muted)}.secondary{background:var(--surface-elevated);border-color:var(--border);}.secondary:hover{background:var(--surface-subtle);border-color:var(--border-strong)}.primary:focus-visible,.secondary:focus-visible,.text-action:focus-visible{outline:2px solid var(--action-link);outline-offset:2px}.focus-card textarea,.session-editor textarea{background:var(--surface-elevated);border-color:var(--border)}.focus-card textarea:focus,.session-editor textarea:focus{border-color:var(--border-strong);box-shadow:0 0 0 3px var(--state-selected)}.continuity-link,.session-context{background:var(--surface-muted);border-color:var(--border-muted)}.session-row,.timeline-event{background:transparent;border-color:var(--border-muted)}.timeline-event:hover{background:var(--surface-subtle)}.timeline-marker{background:var(--surface-muted)}.session-actions,.empty-inline{border-color:var(--border-muted)}.modal-backdrop{background:rgb(24 32 28 / .28)}.session-editor,.share-link{background:var(--surface-overlay);border:1px solid var(--border);box-shadow:var(--shadow-overlay)}.ai-boundary{background:var(--surface-muted);border-color:var(--border-muted)}
</style>
