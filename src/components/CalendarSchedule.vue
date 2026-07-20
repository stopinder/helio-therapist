<template>
  <section class="today-workspace">
    <header class="page-header">
      <div>
        <p class="eyebrow">Therapist workspace</p>
        <h1>{{ heading }}</h1>
        <p>{{ subheading }}</p>
      </div>
      <div v-if="view === 'attention'" :class="['attention-count', { quiet: actionableItems.length === 0 }]">
        {{ actionableItems.length ? attentionSummary : 'Inbox up to date' }}
      </div>
    </header>

    <nav class="view-switcher" aria-label="Today view">
      <button v-for="option in views" :key="option.id" :class="{ active: view === option.id }" @click="setView(option.id)">
        {{ option.label }}
      </button>
    </nav>

    <template v-if="view === 'attention'">
      <section class="attention-toolbar">
        <label class="search-field">
          <span>Search attention</span>
          <input v-model="attentionSearch" placeholder="Search by client, meeting or status" />
        </label>
        <div class="attention-filters" aria-label="Attention filter">
          <button v-for="filter in attentionFilters" :key="filter.id" :class="{ active: attentionFilter === filter.id }" @click="attentionFilter = filter.id">
            {{ filter.label }}
          </button>
        </div>
      </section>

      <p v-if="attentionError" class="notice error">{{ attentionError }}</p>
      <div v-else-if="attentionLoading" class="empty-card">Checking current workflow…</div>
      <div v-else-if="filteredAttentionItems.length" class="attention-list">
        <article v-for="item in filteredAttentionItems" :key="item.key" class="attention-row">
          <div class="row-source">{{ item.source }}</div>
          <div class="row-main">
            <h2>{{ item.title }}</h2>
            <p>{{ item.clientName || 'No client assigned' }}<span v-if="item.date"> · {{ formatAttentionDate(item.date) }}</span></p>
          </div>
          <span :class="['workflow-badge', item.kind]">{{ item.state }}</span>
          <button class="primary action-button" @click="$emit('open-attention-item', item)">{{ item.action }}</button>
        </article>
      </div>
      <section v-else class="empty-card">
        <div class="empty-icon">✓</div>
        <h2>{{ attentionFilter === 'attention' ? 'You’re up to date' : 'No matching items' }}</h2>
        <p>{{ attentionFilter === 'attention' ? 'There is no clinical workflow waiting for your attention.' : 'Try another search term or filter.' }}</p>
      </section>
    </template>

    <template v-else>
      <section class="calendar-toolbar">
        <div class="date-controls">
          <button class="icon-button" @click="move(-1)" aria-label="Previous period">‹</button>
          <button class="today-button" @click="goToday">Today</button>
          <button class="icon-button" @click="move(1)" aria-label="Next period">›</button>
        </div>
        <label class="date-input"><span class="sr-only">Selected date</span><input type="date" v-model="dateInput" /></label>
      </section>

      <p v-if="calendarError" class="notice error">{{ calendarError }} <button class="text-button" @click="$emit('open-settings')">Go to Settings</button></p>
      <div v-else-if="calendarLoading" class="empty-card">Loading calendar…</div>
      <section v-else-if="view === 'day'" class="day-view">
        <div v-if="eventsForSelectedDay.length" class="event-list">
          <button v-for="event in eventsForSelectedDay" :key="event.id" class="calendar-event" @click="openEvent(event)">
            <time>{{ event.timeLabel }}</time><span><strong>{{ event.title }}</strong><small>{{ event.source }}</small></span>
          </button>
        </div>
        <div v-else class="empty-card"><div class="empty-icon">□</div><h2>Your schedule is clear</h2><p>No events found for this day.</p></div>
      </section>

      <section v-else-if="view === 'week'" class="week-grid">
        <article v-for="day in visibleDays" :key="day.key" class="week-day">
          <header><span>{{ day.weekday }}</span><strong>{{ day.day }}</strong></header>
          <button v-for="event in eventsForDay(day.date)" :key="event.id" class="mini-event" @click="openEvent(event)">{{ event.timeLabel }} · {{ event.title }}</button>
          <p v-if="!eventsForDay(day.date).length">No events</p>
        </article>
      </section>

      <section v-else class="month-grid">
        <article v-for="day in monthDays" :key="day.key" :class="{ outside: !day.inMonth, today: day.key === dateKey(new Date()) }">
          <header>{{ day.day }}</header>
          <button v-for="event in eventsForDay(day.date).slice(0, 3)" :key="event.id" class="mini-event" @click="openEvent(event)">{{ event.title }}</button>
          <small v-if="eventsForDay(day.date).length > 3">+{{ eventsForDay(day.date).length - 3 }} more</small>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const props = defineProps({ clients: { type: Array, default: () => [] } })
defineEmits(['open-settings', 'open-attention-item'])

const views = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'attention', label: 'Needs attention' }
]
const attentionFilters = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' }
]
const savedView = localStorage.getItem('helio_calendar_view')
const view = ref(['day', 'week', 'month', 'attention'].includes(savedView) ? savedView : 'attention')
const selectedDate = ref(new Date())
const dateInput = ref(toInputDate(selectedDate.value))
const events = ref([])
const calendarLoading = ref(false)
const calendarError = ref('')
const attentionLoading = ref(false)
const attentionError = ref('')
const transcripts = ref([])
const reports = ref([])
const localSessions = ref([])
const attentionSearch = ref('')
const attentionFilter = ref('attention')

const heading = computed(() => view.value === 'attention' ? 'Needs attention' : view.value === 'day' ? 'Today’s schedule' : view.value === 'week' ? 'Weekly schedule' : 'Monthly schedule')
const subheading = computed(() => view.value === 'attention' ? 'Only real clinical workflow that needs your decision. Nothing is analysed automatically.' : dateRangeLabel())
const eventsForSelectedDay = computed(() => eventsForDay(selectedDate.value))
const actionableItems = computed(() => attentionItems.value.filter(item => item.actionable))
const attentionSummary = computed(() => `${actionableItems.value.length} need${actionableItems.value.length === 1 ? 's' : ''} attention`)
const attentionItems = computed(() => [
  ...transcripts.value.map(transcriptAttentionItem),
  ...sessionAttentionItems(),
  ...reports.value.map(reportAttentionItem)
].filter(Boolean))
const filteredAttentionItems = computed(() => {
  const query = attentionSearch.value.trim().toLowerCase()
  return attentionItems.value.filter(item => {
    if (attentionFilter.value === 'attention' && !item.actionable) return false
    if (attentionFilter.value === 'completed' && item.actionable) return false
    if (!query) return true
    return [item.title, item.clientName, item.state, item.source, item.meetingId].filter(Boolean).join(' ').toLowerCase().includes(query)
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})
const visibleDays = computed(() => {
  const start = startOfWeek(selectedDate.value)
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    return { date, key: dateKey(date), weekday: date.toLocaleDateString(undefined, { weekday: 'short' }), day: date.getDate() }
  })
})
const monthDays = computed(() => {
  const first = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    return { date, key: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === selectedDate.value.getMonth() }
  })
})

function transcriptState(transcript) {
  if (!transcript?.clientId || transcript.status === 'unassigned') return { state: 'Needs client', action: 'Assign client', actionable: true, kind: 'needs-client' }
  if (!transcript.sessionRef) return { state: 'Needs session', action: 'Link session', actionable: true, kind: 'needs-session' }
  if (!transcript.reviewChoicesSavedAt) return { state: 'Needs review', action: 'Review transcript', actionable: true, kind: 'needs-review' }
  return { state: transcript.completedAt ? 'Complete' : 'Review choices saved', action: transcript.completedAt ? 'View' : 'Open session', actionable: false, kind: 'complete' }
}
function transcriptAttentionItem(transcript) {
  const flow = transcriptState(transcript)
  return {
    key: `transcript-${transcript.id}`, id: transcript.id, source: 'Transcript', meetingId: transcript.meetingId,
    title: transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript',
    clientName: clientName(transcript.clientId), clientId: transcript.clientId, date: transcript.receivedAt,
    ...flow
  }
}
function sessionAttentionItems() {
  return localSessions.value.flatMap(session => {
    const base = { clientId: session.clientId, clientName: clientName(session.clientId), date: session.startedAt || session.createdAt, source: 'Session', id: session.id }
    const items = []
    if (session.status === 'in_progress') items.push({ ...base, key: `session-progress-${session.id}`, title: 'Session in progress', state: 'In progress', action: 'Resume session', actionable: true, kind: 'in-progress' })
    if (session.status === 'completed' && session.notesStatus === 'draft' && String(session.notes || '').trim()) items.push({ ...base, key: `session-notes-${session.id}`, title: 'Therapist notes need review', state: 'Notes draft', action: 'Open session', actionable: true, kind: 'needs-review' })
    const outputs = Array.isArray(session.outputs) ? session.outputs : []
    outputs.filter(output => output?.status === 'draft').forEach((output, index) => items.push({ ...base, key: `session-output-${session.id}-${index}`, title: `${output.title || output.type || 'Clinical output'} draft needs review`, state: 'Drafts awaiting review', action: 'Review drafts', actionable: true, kind: 'needs-review' }))
    if (!items.length && session.status === 'closed') items.push({ ...base, key: `session-closed-${session.id}`, title: 'Session closed', state: 'No further action', action: 'View', actionable: false, kind: 'complete' })
    return items
  })
}
function reportAttentionItem(report) {
  const status = String(report.status || '').toLowerCase()
  const needsReview = status === 'review'
  const complete = ['completed', 'archived'].includes(status)
  if (!needsReview && !complete) return null
  return {
    key: `report-${report.id}`, id: report.id, source: 'Report', title: report.title || 'Report',
    clientName: report.client_name || clientName(report.clientRef || report.client_ref), clientId: report.clientRef || report.client_ref,
    date: report.updated_at || report.updatedAt || report.report_date,
    state: needsReview ? 'Ready for review' : 'Complete', action: needsReview ? 'Review report' : 'View',
    actionable: needsReview, kind: needsReview ? 'needs-review' : 'complete'
  }
}
function clientName(clientId) { return props.clients.find(client => String(client.id) === String(clientId))?.name || '' }
function loadLocalSessions() { try { localSessions.value = JSON.parse(localStorage.getItem('helio_sessions') || '[]') } catch { localSessions.value = [] } }
async function loadAttention() {
  attentionLoading.value = true; attentionError.value = ''; loadLocalSessions()
  try {
    const [transcriptResponse, reportResponse] = await Promise.all([
      authenticatedFetch('/api/zoom/transcripts'),
      authenticatedFetch('/api/documents')
    ])
    const [transcriptData, reportData] = await Promise.all([transcriptResponse.json().catch(() => ({})), reportResponse.json().catch(() => ({}))])
    if (!transcriptResponse.ok) throw new Error(transcriptData.error || 'Unable to load transcripts.')
    transcripts.value = transcriptData.transcripts || []
    reports.value = reportResponse.ok ? (reportData.documents || []) : []
  } catch (error) { attentionError.value = error.message || 'Unable to load current workflow.' }
  finally { attentionLoading.value = false }
}
async function loadCalendarEvents() {
  calendarLoading.value = true; calendarError.value = ''
  try {
    const response = await authenticatedFetch(`/api/google/events?start=${encodeURIComponent(rangeStart())}&end=${encodeURIComponent(rangeEnd())}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Calendar unavailable')
    events.value = (data.events || []).map(event => ({
      id: event.id, title: event.summary || 'Untitled event', source: 'Google Calendar',
      start: event.start?.dateTime || event.start?.date, end: event.end?.dateTime || event.end?.date, htmlLink: event.htmlLink,
      timeLabel: event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All day'
    }))
  } catch (error) { calendarError.value = error.message || 'Calendar unavailable' }
  finally { calendarLoading.value = false }
}
function setView(nextView) { view.value = nextView; localStorage.setItem('helio_calendar_view', nextView) }
function goToday() { selectedDate.value = new Date(); dateInput.value = toInputDate(selectedDate.value) }
function move(direction) {
  const next = new Date(selectedDate.value)
  if (view.value === 'day') next.setDate(next.getDate() + direction)
  else if (view.value === 'week') next.setDate(next.getDate() + (direction * 7))
  else next.setMonth(next.getMonth() + direction)
  selectedDate.value = next; dateInput.value = toInputDate(next)
}
function openEvent(event) { window.open(event.htmlLink || undefined, '_blank', 'noopener') }
function eventsForDay(date) { const key = dateKey(date); return events.value.filter(event => event.start && dateKey(new Date(event.start)) === key) }
function rangeStart() { const start = view.value === 'month' ? new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1) : view.value === 'week' ? startOfWeek(selectedDate.value) : selectedDate.value; return start.toISOString() }
function rangeEnd() { const end = new Date(rangeStart()); if (view.value === 'month') end.setMonth(end.getMonth() + 1); else if (view.value === 'week') end.setDate(end.getDate() + 7); else end.setDate(end.getDate() + 1); return end.toISOString() }
function dateRangeLabel() { return view.value === 'week' ? `${visibleDays.value[0]?.date.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${visibleDays.value[6]?.date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}` : selectedDate.value.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}) }
function startOfWeek(date) { const value = new Date(date); const day = value.getDay() || 7; value.setHours(0,0,0,0); value.setDate(value.getDate() - day + 1); return value }
function addDays(date, count) { const value = new Date(date); value.setDate(value.getDate() + count); return value }
function dateKey(date) { const value = new Date(date); return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}` }
function toInputDate(date) { return dateKey(date) }
function formatAttentionDate(value) { return new Date(value).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) }

watch(dateInput, value => { if (value) selectedDate.value = new Date(value + 'T12:00:00') })
watch(view, nextView => { if (nextView === 'attention') loadAttention(); else loadCalendarEvents() })
watch(selectedDate, () => { if (view.value !== 'attention') loadCalendarEvents() })
onMounted(() => { if (view.value === 'attention') loadAttention(); else loadCalendarEvents() })
</script>

<style scoped>
.today-workspace{max-width:76rem;margin:0 auto;color:#2c3e50}.page-header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1rem}.eyebrow{margin:0 0 .35rem;color:#64748b;text-transform:uppercase;letter-spacing:.09em;font-size:.72rem;font-weight:750}.page-header h1{margin:0;font-size:2rem;line-height:1.1}.page-header p:not(.eyebrow){margin:.45rem 0 0;color:#64748b;max-width:50rem;line-height:1.5}.attention-count{white-space:nowrap;border-radius:999px;background:#fff7ed;color:#9a3412;padding:.55rem .8rem;font-weight:750}.attention-count.quiet{background:#ecfdf5;color:#047857}.view-switcher{display:flex;gap:.3rem;background:#eaf0f6;padding:.3rem;border-radius:.75rem;width:max-content;max-width:100%;overflow:auto;margin:1rem 0}.view-switcher button,.attention-filters button{border:0;background:transparent;color:#53657d;padding:.55rem .75rem;border-radius:.55rem;font-weight:700;white-space:nowrap}.view-switcher button.active{background:white;color:#1d4ed8;box-shadow:0 1px 3px #0001}.attention-toolbar{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin:1.1rem 0}.search-field{flex:1;max-width:34rem}.search-field span{display:block;font-weight:700;font-size:.82rem;margin-bottom:.35rem}.search-field input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:.65rem;padding:.7rem .8rem;background:white;font:inherit;color:#1e293b}.attention-filters{display:flex;gap:.35rem}.attention-filters button{border:1px solid #cbd5e1;background:white;color:#475569}.attention-filters button.active{color:#1d4ed8;border-color:#2563eb}.attention-list{display:grid;gap:.55rem}.attention-row{display:grid;grid-template-columns:5.5rem minmax(0,1fr) auto auto;align-items:center;gap:1rem;background:#fff;border:1px solid #dbe1e8;border-radius:.75rem;padding:.85rem 1rem}.row-source{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:750}.row-main h2{font-size:1rem;margin:0}.row-main p{margin:.22rem 0 0;color:#64748b;font-size:.88rem}.workflow-badge{border-radius:999px;padding:.3rem .55rem;font-size:.75rem;font-weight:750;white-space:nowrap;background:#eff6ff;color:#1d4ed8}.workflow-badge.needs-client{background:#fff7ed;color:#9a3412}.workflow-badge.complete{background:#ecfdf5;color:#047857}.primary,.secondary,.icon-button,.today-button{font:inherit;cursor:pointer}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:.55rem;padding:.55rem .75rem;font-weight:750}.action-button{white-space:nowrap}.empty-card{background:#fff;border:1px dashed #cbd5e1;border-radius:.8rem;text-align:center;padding:3rem 1rem;color:#64748b}.empty-card h2{margin:.6rem 0 .35rem;color:#334155}.empty-card p{margin:0}.empty-icon{display:inline-grid;place-items:center;border-radius:50%;width:2.3rem;height:2.3rem;background:#ecfdf5;color:#047857;font-size:1.25rem;font-weight:800}.notice{padding:.85rem 1rem;border-radius:.7rem}.notice.error{background:#fff1f2;color:#be123c}.text-button{border:0;background:transparent;color:inherit;text-decoration:underline;font:inherit;cursor:pointer}.calendar-toolbar{display:flex;justify-content:space-between;align-items:center;margin:1rem 0}.date-controls{display:flex;gap:.45rem}.icon-button,.today-button{border:1px solid #cbd5e1;background:white;border-radius:.6rem;padding:.55rem .85rem;color:#334155}.date-input input{border:1px solid #cbd5e1;border-radius:.6rem;padding:.55rem .7rem;background:white;font:inherit}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.event-list{display:grid;gap:.55rem}.calendar-event{display:flex;text-align:left;gap:1rem;border:1px solid #dbe1e8;background:#fff;border-radius:.75rem;padding:.9rem;cursor:pointer;color:#2c3e50}.calendar-event time{font-weight:750;color:#1d4ed8;min-width:4.5rem}.calendar-event strong,.calendar-event small{display:block}.calendar-event small{margin-top:.2rem;color:#64748b}.week-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:#fff;border:1px solid #dbe1e8;border-radius:.8rem;overflow:hidden}.week-day{min-height:16rem;padding:.75rem;border-right:1px solid #e2e8f0}.week-day:last-child{border-right:0}.week-day header{display:flex;flex-direction:column;color:#64748b}.week-day header strong{font-size:1.25rem;color:#334155}.week-day p{font-size:.82rem;color:#94a3b8}.mini-event{display:block;width:100%;text-align:left;border:0;background:#eff6ff;color:#1d4ed8;border-radius:.35rem;padding:.35rem;margin-top:.45rem;font-size:.75rem;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:#fff;border:1px solid #dbe1e8;border-radius:.8rem;overflow:hidden}.month-grid article{min-height:7.5rem;padding:.55rem;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.month-grid article.outside{background:#f8fafc;color:#94a3b8}.month-grid article.today header{color:#1d4ed8;font-weight:800}.month-grid small{color:#64748b;font-size:.72rem}@media(max-width:760px){.page-header,.attention-toolbar,.calendar-toolbar{align-items:stretch;flex-direction:column}.attention-count{align-self:flex-start}.attention-row{grid-template-columns:1fr;gap:.45rem}.row-source{display:none}.action-button{justify-self:start}.attention-filters{overflow:auto}.week-grid,.month-grid{overflow:auto;grid-template-columns:repeat(7,9rem)}.week-day{min-height:12rem}.month-grid{min-width:63rem}}
</style>
