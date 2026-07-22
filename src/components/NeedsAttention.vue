<template>
  <section class="attention-workspace">
    <header>
      <div><p class="eyebrow">Inbox</p><h1>Needs attention</h1><p>Work that needs a clinical decision or a finishing step.</p></div>
      <button class="refresh" :disabled="loading" @click="load">{{ loading ? 'Refreshing…' : 'Refresh work' }}</button>
    </header>

    <p v-if="error" class="notice" role="alert">{{ error }}</p>
    <div v-else-if="loading" class="empty-card">Loading your work queue…</div>
    <div v-else-if="!items.length" class="empty-card"><div>✓</div><h2>Inbox up to date</h2><p>There is nothing waiting for review or completion.</p></div>
    <div v-else class="queue">
      <article v-for="item in items" :key="item.key" class="queue-item">
        <div class="item-icon" aria-hidden="true">{{ item.icon }}</div>
        <div class="item-copy"><p class="item-type">{{ item.type }}</p><h2>{{ item.title }}</h2><p>{{ item.detail }}</p><small v-if="item.clientName">{{ item.clientName }}</small></div>
        <button class="primary" @click="act(item)">{{ item.action }} <span aria-hidden="true">›</span></button>
      </article>
    </div>
    <div v-if="reviewing" class="review-backdrop" @click.self="closeReview"><article class="review-dialog" role="dialog" aria-modal="true"><p class="eyebrow">Review client response</p><h2>{{ reviewing.resource_versions?.client_title || 'Outcome measure' }}</h2><p v-if="reviewing.therapist_instruction" class="instruction"><strong>Instruction:</strong> {{ reviewing.therapist_instruction }}</p><template v-if="measureResult"><p class="score"><strong>Calculated total:</strong> {{ measureResult.scores?.total }}</p><p class="quiet">This score organises the submitted answers. It is not a diagnosis or a clinical conclusion.</p></template><ol v-if="response?.structured_answers" class="answers"><li v-for="(question, index) in phq9Items" :key="index"><strong>{{ question }}</strong><span>{{ answerLabel(response.structured_answers[`q${index + 1}`]) }}</span></li></ol><p v-else class="quiet">No structured response is available.</p><p v-if="reviewError" class="notice">{{ reviewError }}</p><footer><button class="refresh" @click="closeReview">Close</button><button class="primary" :disabled="reviewSaving" @click="markReviewed">{{ reviewSaving ? 'Saving…' : 'Mark reviewed' }}</button></footer></article></div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { phq9Choices, phq9Items } from '../lib/phq9.js'

const props = defineProps({ clients: { type: Array, default: () => [] } })
const emit = defineEmits(['open-settings', 'open-transcript', 'open-session', 'select-appointment'])
const transcripts = ref([]), sessions = ref([]), assignments = ref([]), loading = ref(true), error = ref('')
const reviewing = ref(null), reviewSaving = ref(false), reviewError = ref('')
const response = computed(() => reviewing.value?.client_resource_responses?.[0] || null)
const measureResult = computed(() => reviewing.value?.outcome_measure_results?.[0] || null)
const answerLabel = value => phq9Choices.find(([id]) => id === String(value))?.[1] || 'Not answered'
const clientName = id => props.clients.find(client => String(client.id) === String(id))?.name || ''
function transcriptAction(transcript) {
  if (!transcript.clientId || transcript.status === 'unassigned') return { title: 'Assign a client to a Zoom transcript', detail: 'This source transcript needs a client before it can be linked to a session.', action: 'Assign client' }
  if (!transcript.sessionRef) return { title: 'Link a Zoom transcript to a session', detail: 'The transcript is assigned but still needs its therapeutic encounter.', action: 'Link session' }
  if (!transcript.reviewChoicesSavedAt) return { title: 'Review transcript handling', detail: 'Choose any requested output and source-retention preference. No analysis has started.', action: 'Review transcript' }
  return null
}
const items = computed(() => {
  const transcriptItems = transcripts.value.map(transcript => {
    const next = transcriptAction(transcript); if (!next) return null
    return { key: `transcript-${transcript.id}`, kind: 'transcript', transcriptId: transcript.id, clientId: transcript.clientId, clientName: clientName(transcript.clientId), type: 'Transcript', icon: '📝', ...next, when: new Date(transcript.receivedAt || 0).getTime() }
  }).filter(Boolean)
  const sessionItems = sessions.value.filter(session => session.status === 'in_progress' || ['needs_review', 'drafts_awaiting_review'].includes(session.workflowStatus)).map(session => ({
    key: `session-${session.id}`, kind: 'session', sessionId: session.id, clientId: session.clientId, clientName: clientName(session.clientId), type: session.status === 'in_progress' ? 'Session' : 'Session review', icon: '◷',
    title: session.status === 'in_progress' ? 'Return to an open session' : 'Review session work', detail: session.status === 'in_progress' ? 'Therapist notes are still open for this session.' : 'This session has a review step waiting in the client workspace.', action: session.status === 'in_progress' ? 'Open session' : 'Review session', when: new Date(session.updatedAt || session.startedAt || 0).getTime()
  }))
  const assignmentItems = assignments.value.map(assignment => {
    const title = assignment.resource_versions?.client_title || assignment.resource_versions?.resource_library_items?.title || 'Client item'
    const isMeasure = assignment.resource_versions?.resource_library_items?.resource_kind === 'outcome_measure'
    return { key: `assignment-${assignment.id}`, kind: 'assignment', assignmentId: assignment.id, clientId: assignment.client_id, clientName: clientName(assignment.client_id), type: isMeasure ? 'Outcome measure' : 'Client return', icon: isMeasure ? '✓' : '↩', title: `${title} ${assignment.status === 'completed' ? 'completed' : 'returned'} — review`, detail: 'Review it in the clinical context, then mark it reviewed.', action: 'Mark reviewed', when: new Date(assignment.completed_at || assignment.sent_at || 0).getTime() }
  })
  return [...transcriptItems, ...sessionItems, ...assignmentItems].sort((a, b) => b.when - a.when)
})
function loadSessions() { try { sessions.value = JSON.parse(localStorage.getItem('helio_sessions') || '[]') } catch { sessions.value = [] } }
async function load() { loading.value = true; error.value = ''; loadSessions(); try { const [transcriptResponse, assignmentResponse] = await Promise.all([authenticatedFetch('/api/zoom/transcripts'), authenticatedFetch('/api/resource-assignments?needsAttention=true')]); const transcriptData = await transcriptResponse.json().catch(() => ({})); const assignmentData = await assignmentResponse.json().catch(() => ({})); if (!transcriptResponse.ok) throw new Error(transcriptData.error || 'Unable to load the work queue.'); if (!assignmentResponse.ok) throw new Error(assignmentData.error || 'Unable to load client review work.'); transcripts.value = transcriptData.transcripts || []; assignments.value = assignmentData.assignments || [] } catch (err) { error.value = err.message || 'Unable to load the work queue.' } finally { loading.value = false } }
async function act(item) { if (item.kind === 'transcript') emit('open-transcript', item); else if (item.kind === 'session') emit('open-session', item); else { reviewError.value = ''; try { const result = await authenticatedFetch('/api/resource-assignments?assignmentId=' + encodeURIComponent(item.assignmentId)); const data = await result.json().catch(() => ({})); if (!result.ok) throw new Error(data.error || 'Unable to open this response.'); reviewing.value = data.assignment } catch (cause) { error.value = cause.message } } }
function closeReview() { reviewing.value = null; reviewError.value = '' }
async function markReviewed() { reviewSaving.value = true; reviewError.value = ''; try { const result = await authenticatedFetch('/api/resource-assignments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentId: reviewing.value.id, action: 'mark_reviewed' }) }); const data = await result.json().catch(() => ({})); if (!result.ok) throw new Error(data.error || 'Unable to mark this item reviewed.'); closeReview(); await load() } catch (cause) { reviewError.value = cause.message } finally { reviewSaving.value = false } }
onMounted(load)
</script>

<style scoped>
.attention-workspace{max-width:68rem;margin:0 auto;color:#2c3e50}.attention-workspace>header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}.eyebrow,.item-type{margin:0 0 .25rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.72rem;font-weight:750}.attention-workspace h1{font-size:1.7rem;margin:0}.attention-workspace>header p:not(.eyebrow){margin:.3rem 0;color:#64748b}.refresh,.primary{border-radius:.6rem;padding:.65rem .85rem;font-weight:700}.refresh{border:1px solid #cbd5e1;background:#fff;color:#334155}.primary{border:1px solid #2563eb;background:#2563eb;color:white;white-space:nowrap}.primary span{font-size:1.1rem}.notice{padding:.8rem;border-radius:.65rem;background:#fef2f2;color:#b91c1c}.empty-card{min-height:14rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#fff;border:1px solid #dbe1e8;border-radius:.9rem;color:#64748b;padding:2rem}.empty-card div{display:grid;place-items:center;width:3rem;height:3rem;border-radius:50%;background:#ecfdf5;color:#047857;font-size:1.5rem;font-weight:800}.empty-card h2{color:#334155;margin:.75rem 0 .2rem}.queue{display:grid;gap:.65rem}.queue-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:1rem;background:#fff;border:1px solid #dbe1e8;border-radius:.8rem;padding:1rem 1.15rem}.queue-item:hover{border-color:#bfdbfe;box-shadow:0 3px 12px #1d4ed812}.item-icon{display:grid;place-items:center;width:2.5rem;height:2.5rem;border-radius:.65rem;background:#eff6ff;color:#1d4ed8}.item-copy h2{font-size:1rem;margin:0}.item-copy p:not(.item-type),.item-copy small{margin:.25rem 0 0;color:#64748b;line-height:1.4}.item-copy small{display:block;font-weight:700;color:#475569}@media(max-width:650px){.attention-workspace>header{align-items:stretch;flex-direction:column}.queue-item{grid-template-columns:auto 1fr}.queue-item .primary{grid-column:1/-1;width:100%}.refresh{align-self:flex-start}}
.review-backdrop{position:fixed;inset:0;z-index:90;background:#0f172a66;display:flex;align-items:center;justify-content:center;padding:1rem}.review-dialog{width:min(42rem,100%);max-height:90vh;overflow:auto;background:white;border-radius:1rem;padding:1.3rem}.review-dialog h2{margin:.15rem 0 .7rem}.instruction,.score{padding:.75rem;border:1px solid #dbeafe;background:#f8fbff;border-radius:.6rem}.quiet{color:#64748b;line-height:1.45}.answers{padding-left:1.2rem}.answers li{padding:.75rem .1rem;border-bottom:1px solid #e7ebf0}.answers strong,.answers span{display:block}.answers span{margin-top:.25rem;color:#475569}.review-dialog footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}
</style>
