<template>
  <section class="attention-workspace">
    <header>
      <div><p class="eyebrow">Today</p><h1>Your working day</h1><p>See your schedule first; use attention items to support the day.</p></div>
      <button class="refresh" :disabled="loading" @click="load">{{ loading ? 'Refreshing…' : 'Refresh work' }}</button>
    </header>

    <CalendarSchedule class="today-schedule" @select-appointment="appointment => $emit('select-appointment', appointment)" />

    <div class="attention-heading"><div><p class="eyebrow">Supporting work</p><h2>Needs attention</h2><p>These are annotations on today—not the day itself.</p></div></div>

    <p v-if="error" class="notice" role="alert">{{ error }}</p>
    <div v-else-if="loading" class="empty-card">Loading your work queue…</div>
    <div v-else-if="!items.length" class="empty-card"><div>✓</div><h2>Nothing needs attention</h2><p>Your transcript triage and active session work are up to date.</p></div>
    <div v-else class="queue">
      <article v-for="item in items" :key="item.key" class="queue-item">
        <div class="item-icon" aria-hidden="true">{{ item.icon }}</div>
        <div class="item-copy"><p class="item-type">{{ item.type }}</p><h2>{{ item.title }}</h2><p>{{ item.detail }}</p><small v-if="item.clientName">{{ item.clientName }}</small></div>
        <button class="primary" @click="act(item)">{{ item.action }} <span aria-hidden="true">›</span></button>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import CalendarSchedule from './CalendarSchedule.vue'

const props = defineProps({ clients: { type: Array, default: () => [] } })
const emit = defineEmits(['open-transcript', 'open-session', 'select-appointment'])
const transcripts = ref([]), sessions = ref([]), loading = ref(true), error = ref('')
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
  return [...transcriptItems, ...sessionItems].sort((a, b) => b.when - a.when)
})
function loadSessions() { try { sessions.value = JSON.parse(localStorage.getItem('helio_sessions') || '[]') } catch { sessions.value = [] } }
async function load() { loading.value = true; error.value = ''; loadSessions(); try { const response = await authenticatedFetch('/api/zoom/transcripts'); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to load the work queue.'); transcripts.value = data.transcripts || [] } catch (err) { error.value = err.message || 'Unable to load the work queue.' } finally { loading.value = false } }
function act(item) { if (item.kind === 'transcript') emit('open-transcript', item); else emit('open-session', item) }
onMounted(load)
</script>

<style scoped>
.attention-workspace{max-width:68rem;margin:0 auto;color:#2c3e50}.attention-workspace>header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}.eyebrow,.item-type{margin:0 0 .25rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.72rem;font-weight:750}.attention-workspace h1{font-size:1.7rem;margin:0}.attention-workspace>header p:not(.eyebrow),.attention-heading p{margin:.3rem 0;color:#64748b}.today-schedule{background:#fff;border:1px solid #dbe1e8;border-radius:.9rem;padding:1.2rem}.attention-heading{display:flex;align-items:flex-end;justify-content:space-between;margin:2rem 0 .75rem;padding-top:1.5rem;border-top:1px solid #dbe1e8}.attention-heading h2{font-size:1.2rem;margin:0}.refresh,.primary{border-radius:.6rem;padding:.65rem .85rem;font-weight:700}.refresh{border:1px solid #cbd5e1;background:#fff;color:#334155}.primary{border:1px solid #2563eb;background:#2563eb;color:white;white-space:nowrap}.primary span{font-size:1.1rem}.notice{padding:.8rem;border-radius:.65rem;background:#fef2f2;color:#b91c1c}.empty-card{min-height:14rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#fff;border:1px solid #dbe1e8;border-radius:.9rem;color:#64748b;padding:2rem}.empty-card div{display:grid;place-items:center;width:3rem;height:3rem;border-radius:50%;background:#ecfdf5;color:#047857;font-size:1.5rem;font-weight:800}.empty-card h2{color:#334155;margin:.75rem 0 .2rem}.queue{display:grid;gap:.65rem}.queue-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:1rem;background:#fff;border:1px solid #dbe1e8;border-radius:.8rem;padding:1rem 1.15rem}.queue-item:hover{border-color:#bfdbfe;box-shadow:0 3px 12px #1d4ed812}.item-icon{display:grid;place-items:center;width:2.5rem;height:2.5rem;border-radius:.65rem;background:#eff6ff;color:#1d4ed8}.item-copy h2{font-size:1rem;margin:0}.item-copy p:not(.item-type),.item-copy small{margin:.25rem 0 0;color:#64748b;line-height:1.4}.item-copy small{display:block;font-weight:700;color:#475569}@media(max-width:650px){.attention-workspace>header{align-items:stretch;flex-direction:column}.today-schedule{padding:.9rem}.queue-item{grid-template-columns:auto 1fr}.queue-item .primary{grid-column:1/-1;width:100%}.refresh{align-self:flex-start}}
</style>
