<template>
  <article v-if="appointment && client" class="next-session" data-testid="next-session-preparation">
    <div class="next-session__heading">
      <p class="eyebrow">Next client</p>
      <h2>{{ client.name }} <span>· {{ appointmentTime }}</span></h2>
    </div>

    <dl class="preparation-context">
      <div>
        <dt>Current focus</dt>
        <dd>{{ client.note || 'No current focus recorded yet.' }}</dd>
      </div>
      <div>
        <dt>Last clinically useful development</dt>
        <dd v-if="loading">Loading preparation…</dd>
        <dd v-else>{{ lastDevelopment?.summary || 'No clinically useful development recorded yet.' }}</dd>
      </div>
      <div>
        <dt>Preparation item</dt>
        <dd>{{ preparationItem }}</dd>
      </div>
    </dl>

    <button class="primary" @click="$emit('prepare', appointment)">Prepare for session</button>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const props = defineProps({
  appointment: { type: Object, default: null },
  client: { type: Object, default: null }
})
defineEmits(['prepare'])

const loading = ref(false)
const timeline = ref([])
const assignments = ref([])

const appointmentTime = computed(() => new Date(props.appointment?.start).toLocaleString(undefined, {
  weekday: 'short', hour: 'numeric', minute: '2-digit'
}))
const lastDevelopment = computed(() => timeline.value.find(event => event.event_type !== 'resource_sent') || null)
const preparationItem = computed(() => {
  const openSession = loadSessions().find(session => String(session.clientId) === String(props.client?.id)
    && (session.status === 'in_progress' || ['needs_review', 'drafts_awaiting_review'].includes(session.workflowStatus)))
  if (openSession) return openSession.status === 'in_progress' ? 'Finish the open session note.' : 'Review the outstanding session work.'

  const assignment = assignments.value.find(item => String(item.client_id) === String(props.client?.id))
  if (!assignment) return 'Nothing outstanding.'
  const title = assignment.resource_versions?.client_title || assignment.resource_versions?.resource_library_items?.title || 'Client item'
  return `${title} returned — review before the session.`
})

function loadSessions() { try { return JSON.parse(localStorage.getItem('helio_sessions') || '[]') } catch { return [] } }
async function loadPreparation() {
  if (!props.client?.id) { timeline.value = []; assignments.value = []; return }
  loading.value = true
  try {
    const [timelineResponse, assignmentResponse] = await Promise.all([
      authenticatedFetch('/api/client-timeline?clientId=' + encodeURIComponent(props.client.id)),
      authenticatedFetch('/api/resource-assignments?needsAttention=true')
    ])
    const timelineData = await timelineResponse.json().catch(() => ({}))
    const assignmentData = await assignmentResponse.json().catch(() => ({}))
    timeline.value = timelineResponse.ok ? (timelineData.events || []) : []
    assignments.value = assignmentResponse.ok ? (assignmentData.assignments || []) : []
  } catch {
    timeline.value = []
    assignments.value = []
  } finally {
    loading.value = false
  }
}

watch(() => `${props.appointment?.id || ''}:${props.client?.id || ''}`, loadPreparation, { immediate: true })
</script>

<style scoped>
.next-session{margin:0 0 1rem;padding:1.2rem;background:#f8fbff;border:1px solid #bfdbfe;border-radius:.9rem;color:#1e3a5f}.next-session__heading{display:flex;align-items:baseline;justify-content:space-between;gap:1rem}.eyebrow{margin:0 0 .25rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.7rem;font-weight:750}.next-session h2{margin:0;font-size:1.2rem}.next-session h2 span{color:#526074;font-size:.95rem;font-weight:600}.preparation-context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem;margin:1rem 0}.preparation-context div{padding:.75rem;background:#fff;border:1px solid #dbeafe;border-radius:.65rem}.preparation-context dt{font-size:.72rem;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:#64748b}.preparation-context dd{margin:.35rem 0 0;line-height:1.4;color:#334155}.primary{border:1px solid #2563eb;border-radius:.55rem;background:#2563eb;color:#fff;padding:.65rem .9rem;font-weight:700}@media(max-width:700px){.next-session__heading{align-items:flex-start;flex-direction:column;gap:.25rem}.preparation-context{grid-template-columns:1fr}.primary{width:100%}}
</style>
