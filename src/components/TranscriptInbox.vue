<template>
  <section class="transcript-inbox">
    <header class="page-header">
      <div>
        <p class="eyebrow">Zoom imports</p>
        <h1>Transcript Inbox</h1>
        <p>Review a transcript, assign it to the right client, then choose what to do next. Nothing is analysed automatically.</p>
      </div>
      <span class="count">{{ unassignedCount }} unassigned</span>
    </header>

    <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>

    <div class="inbox-layout">
      <aside class="transcript-list" aria-label="Imported transcripts">
        <div v-if="loading" class="empty">Loading transcripts…</div>
        <div v-else-if="!transcripts.length" class="empty">
          <div>📝</div>
          <strong>No imported transcripts yet</strong>
          <p>When Zoom finishes a cloud transcript, it will appear here ready for your review.</p>
        </div>
        <button
          v-for="transcript in transcripts"
          :key="transcript.id"
          class="transcript-row"
          :class="{ active: selected?.id === transcript.id }"
          @click="selected = transcript"
        >
          <span class="row-top"><strong>{{ labelFor(transcript) }}</strong><span :class="['status', transcript.status]">{{ transcript.status === 'unassigned' ? 'Needs client' : 'Assigned' }}</span></span>
          <small>{{ formatDate(transcript.receivedAt) }} · {{ transcript.format }}</small>
        </button>
      </aside>

      <article class="transcript-detail">
        <template v-if="selected">
          <header class="detail-header">
            <div>
              <p class="eyebrow">Raw source</p>
              <h2>{{ labelFor(selected) }}</h2>
              <p>{{ formatDate(selected.receivedAt) }} · Zoom cloud transcript</p>
            </div>
            <button class="secondary" @click="downloadRaw(selected)">Download raw text</button>
          </header>

          <section class="assignment">
            <div>
              <h3>Client assignment</h3>
              <p>Assign only after you have checked the transcript. Helio never guesses the client.</p>
            </div>
            <div class="assignment-actions">
              <select v-model="selectedClientId" aria-label="Assign transcript to client">
                <option value="">Leave unassigned</option>
                <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
              </select>
              <button class="primary" :disabled="saving || selectedClientId === (selected.clientId || '')" @click="saveAssignment">
                {{ saving ? 'Saving…' : 'Save assignment' }}
              </button>
            </div>
          </section>

          <section class="raw-transcript">
            <h3>Transcript</h3>
            <p>This is the original Zoom text. You can review or download it; it is not altered by Helio.</p>
            <pre>{{ selected.text }}</pre>
          </section>

          <section class="next-step">
            <h3>Next step</h3>
            <p>After assignment, this is where therapist-requested actions will appear: draft session note, CBT observations, supervision reflection, or report input.</p>
            <span>AI actions are coming next; nothing will be saved to the clinical record without your review.</span>
          </section>
        </template>

        <div v-else class="empty detail-empty">
          <div>←</div>
          <strong>Select an imported transcript</strong>
          <p>Its original text and client assignment will appear here.</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

defineProps({ clients: { type: Array, default: () => [] } })

const transcripts = ref([])
const selected = ref(null)
const selectedClientId = ref('')
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const unassignedCount = computed(() => transcripts.value.filter(item => item.status === 'unassigned').length)

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function labelFor(transcript) {
  return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to load transcripts.')
    transcripts.value = data.transcripts || []
    selected.value = transcripts.value[0] || null
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load transcripts.'
  } finally {
    loading.value = false
  }
}

async function saveAssignment() {
  if (!selected.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.value.id, clientId: selectedClientId.value || null })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to save the client assignment.')
    const index = transcripts.value.findIndex(item => item.id === data.transcript.id)
    transcripts.value[index] = data.transcript
    selected.value = data.transcript
    successMessage.value = data.transcript.clientId ? 'Client assignment saved.' : 'Transcript left unassigned.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save the client assignment.'
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

watch(selected, value => { selectedClientId.value = value?.clientId || '' })

onMounted(load)
</script>

<style scoped>
.transcript-inbox{max-width:76rem;margin:0 auto;color:#2c3e50}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.eyebrow{margin:0 0 .25rem;color:#64748b;text-transform:uppercase;font-size:.72rem;font-weight:750;letter-spacing:.08em}.page-header h1{margin:0;font-size:1.7rem}.page-header p:not(.eyebrow){margin:.3rem 0 0;color:#64748b;max-width:45rem;line-height:1.5}.count{white-space:nowrap;border-radius:999px;padding:.4rem .65rem;background:#fff7ed;color:#9a3412;font-size:.8rem;font-weight:700}.notice{margin:.75rem 0;padding:.75rem;border-radius:.6rem}.notice.error{background:#fef2f2;color:#b91c1c}.notice.success{background:#ecfdf5;color:#047857}.inbox-layout{display:grid;grid-template-columns:minmax(15rem,22rem) minmax(0,1fr);gap:1rem;min-height:34rem}.transcript-list,.transcript-detail{background:#fff;border:1px solid #dbe1e8;border-radius:.85rem;overflow:hidden}.transcript-list{align-self:start}.transcript-row{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #edf0f4;background:#fff;padding:.9rem;cursor:pointer;color:#334155}.transcript-row:hover,.transcript-row.active{background:#eff6ff}.row-top{display:flex;justify-content:space-between;gap:.5rem;align-items:center}.transcript-row small{display:block;color:#64748b;margin-top:.3rem}.status{font-size:.68rem;font-weight:700;padding:.18rem .4rem;border-radius:999px}.status.unassigned{background:#fff7ed;color:#9a3412}.status.ready{background:#ecfdf5;color:#047857}.detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.2rem;border-bottom:1px solid #e5eaf0}.detail-header h2,.detail-header p{margin:.15rem 0}.detail-header p:not(.eyebrow){color:#64748b;font-size:.85rem}.assignment,.raw-transcript,.next-step{margin:1rem;padding:1rem;border:1px solid #e2e8f0;border-radius:.7rem}.assignment{display:flex;justify-content:space-between;gap:1rem;align-items:center}.assignment h3,.raw-transcript h3,.next-step h3{margin:0}.assignment p,.raw-transcript p,.next-step p{color:#64748b;font-size:.84rem;line-height:1.45;margin:.3rem 0}.assignment-actions{display:flex;gap:.5rem}.assignment-actions select{max-width:15rem;border:1px solid #cbd5e1;border-radius:.55rem;padding:.55rem;background:white}.primary,.secondary{padding:.55rem .75rem;border-radius:.55rem;font-weight:650;white-space:nowrap}.primary{border:1px solid #2563eb;background:#2563eb;color:white}.primary:disabled{opacity:.6}.secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.raw-transcript pre{white-space:pre-wrap;word-break:break-word;max-height:24rem;overflow:auto;border-radius:.55rem;background:#f8fafc;padding:.85rem;color:#334155;font: .85rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}.next-step{background:#f8fafc}.next-step span{font-size:.78rem;color:#475569}.empty{padding:1.5rem;text-align:center;color:#64748b}.empty div{font-size:2rem}.empty strong{display:block;color:#334155;margin:.35rem}.empty p{font-size:.85rem;line-height:1.45}.detail-empty{min-height:30rem;display:flex;flex-direction:column;align-items:center;justify-content:center}@media(max-width:760px){.page-header{flex-direction:column}.inbox-layout{grid-template-columns:1fr}.transcript-list{max-height:16rem;overflow:auto}.assignment{align-items:flex-start;flex-direction:column}.assignment-actions{width:100%;flex-direction:column}.assignment-actions select,.assignment-actions button{max-width:none;width:100%}.detail-header{flex-direction:column}.secondary{width:100%}}
</style>
