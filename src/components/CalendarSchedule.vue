<template>
  <section class="calendar-shell">
    <div class="calendar-heading">
      <div>
        <h1>{{ heading }}</h1>
        <p>{{ rangeLabel }} <span v-if="syncLabel" class="sync-status" :class="syncState">· {{ syncLabel }}</span></p>
      </div>
      <div class="view-switcher" aria-label="Calendar view">
        <button v-for="option in views" :key="option.id" :class="{ active: view === option.id }" @click="setView(option.id)">
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="calendar-toolbar">
      <button class="nav-button" @click="move(-1)" aria-label="Previous date">‹</button>
      <button class="today-button" @click="goToday">Today</button>
      <button class="nav-button" @click="move(1)" aria-label="Next date">›</button>
      <input v-model="dateInput" type="date" class="date-input" aria-label="Choose date" @change="chooseDate" />
    </div>

    <div v-if="loading" class="calendar-state">
      <div class="spinner"></div><p>{{ hasLoadedOnce ? 'Syncing your calendar…' : 'Opening your workspace…' }}</p>
    </div>
    <div v-else-if="error" class="calendar-state error-state">
      <div class="state-icon">{{ requiresGoogleAction ? '📅' : '⚠️' }}</div><h2>{{ requiresGoogleReconnect ? 'Google Calendar needs your permission again' : requiresGoogleConnection ? 'Connect Google Calendar' : 'Calendar unavailable' }}</h2><p>{{ requiresGoogleAction ? (requiresGoogleReconnect ? 'Reconnect once to restore your schedule.' : 'Connect once to show your schedule.') : error }}</p>
      <div class="state-actions"><button v-if="requiresGoogleAction" @click="reconnectGoogle">{{ requiresGoogleReconnect ? 'Reconnect' : 'Connect' }}</button><button v-else @click="loadEvents">Try again</button></div>
    </div>
    <div v-else-if="requiresGoogleAction" class="service-notice" role="status"><span>{{ requiresGoogleReconnect ? 'Google Calendar needs your permission again.' : 'Connect Google Calendar to show your schedule.' }}</span><button @click="reconnectGoogle">{{ requiresGoogleReconnect ? 'Reconnect' : 'Connect' }}</button></div>
    <div v-else-if="view === 'month'" class="month-view">
      <div v-for="name in weekdayNames" :key="name" class="weekday-name">{{ name }}</div>
      <button v-for="day in monthDays" :key="day.key" class="month-day" :class="{ muted: !day.currentMonth, today: day.isToday, selected: sameDay(day.date, selectedDate) }" @click="selectMonthDay(day.date)">
        <span class="day-number">{{ day.date.getDate() }}</span>
        <span v-for="event in day.events.slice(0, 3)" :key="event.id" class="event-chip" @click.stop="selectEvent(event, $event.currentTarget)">{{ event.summary }}</span>
        <span v-if="day.events.length > 3" class="more-events">+{{ day.events.length - 3 }} more</span>
      </button>
    </div>
    <div v-else-if="view === 'week'" class="week-view">
      <section v-for="day in visibleDays" :key="day.key" class="week-day" :class="{ today: day.isToday }">
        <button class="week-day-heading" @click="openDay(day.date)"><span>{{ shortWeekday(day.date) }}</span><strong>{{ day.date.getDate() }}</strong></button>
        <p v-if="!day.events.length" class="no-events">No events</p>
        <button v-for="event in day.events" :key="event.id" class="week-event" @click="selectEvent(event, $event.currentTarget)"><span>{{ eventTime(event) }}</span>{{ event.summary }}</button>
      </section>
    </div>
    <div v-else class="agenda-view">
      <div v-if="!groupedEvents.length" class="calendar-state empty-state"><div class="state-icon">📅</div><h2>Your schedule is clear</h2><p>No events found for this {{ view === 'day' ? 'day' : 'period' }}.</p></div>
      <section v-for="group in groupedEvents" :key="group.key" class="agenda-day">
        <h2>{{ group.label }}</h2>
        <button v-for="event in group.events" :key="event.id" class="agenda-event" @click="selectEvent(event, $event.currentTarget)">
          <span class="event-time">{{ eventTime(event) }}</span><span class="event-copy"><strong>{{ event.summary }}</strong><small>{{ eventRange(event) }}</small><small v-if="appointmentStatus(event)" class="appointment-status">{{ appointmentStatus(event) }}</small></span><span aria-hidden="true">›</span>
        </button>
      </section>
    </div>

    <article v-if="selectedEvent" ref="eventPopover" class="event-popover" :style="eventPopoverStyle" role="dialog" aria-modal="false" aria-labelledby="event-title" data-testid="helio-event-popover">
      <header class="event-popover-header"><div><p class="event-eyebrow">{{ selectedEvent.provider || 'Calendar' }}</p><h2 id="event-title">{{ selectedEvent.summary }}</h2></div><button class="close-button" @click="closeEventPopover" aria-label="Close event details">×</button></header>
      <dl class="event-details"><div><dt>When</dt><dd>{{ fullEventDate(selectedEvent) }}</dd></div><div v-if="selectedEvent.location"><dt>Where</dt><dd>{{ selectedEvent.location }}</dd></div></dl>
      <p v-if="selectedEvent.description" class="event-description">{{ selectedEvent.description }}</p>
      <footer class="event-actions"><button v-if="matchedClient(selectedEvent)" class="open-client-action" @click="openClientWorkspace(selectedEvent)">Open client workspace</button><a v-if="selectedEvent.link" :href="selectedEvent.link" target="_blank" rel="noopener">Open in Google Calendar ↗</a><a v-if="selectedEvent.meetingLink" class="primary-event-action" :href="selectedEvent.meetingLink" target="_blank" rel="noopener">Join video call ↗</a></footer>
    </article>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const props = defineProps({ clients: { type: Array, default: () => [] } })
const emit = defineEmits(['open-settings', 'select-appointment'])
const views = [{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }]
const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const savedView = localStorage.getItem('helio_calendar_view')
const view = ref(['day', 'week', 'month'].includes(savedView) ? savedView : 'day')
const selectedDate = ref(new Date())
const dateInput = ref(toInputDate(selectedDate.value))
const events = ref([]), loading = ref(false), error = ref(''), selectedEvent = ref(null)
const eventPopover = ref(null)
const eventPopoverStyle = ref({})
const hasLoadedOnce = ref(false)
const googleService = ref({ state: 'checking', lastSyncedAt: null })
const automaticRetries = ref(0)
let retryTimer = null

function startDay(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function addDays(date, count) { const d = new Date(date); d.setDate(d.getDate() + count); return d }
function startWeek(date) { const d = startDay(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d }
function startMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1) }
function endMonth(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 1) }
function toInputDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
function sameDay(a,b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate() }
function eventDate(event) { return new Date(event.start) }
function eventsFor(date) { return events.value.filter(event => sameDay(eventDate(event), date)) }

const requestRange = computed(() => {
  if (view.value === 'day') return [startDay(selectedDate.value), addDays(startDay(selectedDate.value), 1)]
  if (view.value === 'week') { const start = startWeek(selectedDate.value); return [start, addDays(start, 7)] }
  if (view.value === 'month') return [startMonth(selectedDate.value), endMonth(selectedDate.value)]
  return [startDay(selectedDate.value), addDays(startDay(selectedDate.value), 1)]
})
const heading = computed(() => ({day:"Day’s Schedule",week:'Weekly Schedule',month:'Monthly Schedule'}[view.value]))
const rangeLabel = computed(() => {
  const [start,end] = requestRange.value; const final = addDays(end,-1)
  if (view.value === 'day') return start.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})
  if (view.value === 'month') return start.toLocaleDateString(undefined,{month:'long',year:'numeric'})
  return `${start.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${final.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`
})
const visibleDays = computed(() => { const start=requestRange.value[0]; return Array.from({length:7},(_,i)=>makeDay(addDays(start,i))) })
const monthDays = computed(() => { const first=startWeek(startMonth(selectedDate.value)); return Array.from({length:42},(_,i)=>{const day=makeDay(addDays(first,i)); day.currentMonth=day.date.getMonth()===selectedDate.value.getMonth(); return day}) })
const groupedEvents = computed(() => {
  const map=new Map(); for(const event of events.value){const d=eventDate(event); const key=toInputDate(d); if(!map.has(key)) map.set(key,{key,label:d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}),events:[]}); map.get(key).events.push(event)} return [...map.values()]
})
const requiresGoogleReconnect = computed(() => googleService.value.state === 'reauth_required')
const requiresGoogleConnection = computed(() => googleService.value.state === 'not_connected')
const requiresGoogleAction = computed(() => requiresGoogleReconnect.value || requiresGoogleConnection.value)
const syncState = computed(() => googleService.value.state)
const syncLabel = computed(() => {
  if (loading.value) return 'Syncing…'
  if (googleService.value.state === 'synced') return formatSyncTime(googleService.value.lastSyncedAt)
  if (googleService.value.state === 'reauth_required') return 'Google permission needed'
  if (googleService.value.state === 'not_connected') return 'Google Calendar not connected'
  if (googleService.value.state === 'unavailable') return 'Waiting to reconnect'
  return ''
})
function makeDay(date){return {key:toInputDate(date),date,events:eventsFor(date),isToday:sameDay(date,new Date())}}
function formatSyncTime(value) {
  if (!value) return 'Synced'
  const date = new Date(value)
  const elapsed = Date.now() - date.getTime()
  if (elapsed >= 0 && elapsed < 60 * 1000) return 'Synced just now'
  if (elapsed >= 0 && elapsed < 60 * 60 * 1000) return `Synced ${Math.floor(elapsed / 60000)}m ago`
  return `Last synced ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}
function shortWeekday(date){return date.toLocaleDateString(undefined,{weekday:'short'})}
function eventTime(event){if(event.allDay)return 'All day'; return new Date(event.start).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
function eventRange(event){if(event.allDay)return 'All day'; return `${eventTime(event)} – ${new Date(event.end).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`}
function fullEventDate(event){const d=new Date(event.start); return `${d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}, ${eventRange(event)}`}
function setView(next){view.value=next; localStorage.setItem('helio_calendar_view',next)}
function chooseDate(){const [y,m,d]=dateInput.value.split('-').map(Number); selectedDate.value=new Date(y,m-1,d)}
function goToday(){selectedDate.value=new Date()}
function move(direction){const amount={day:1,week:7,month:0}[view.value]; const d=new Date(selectedDate.value); if(view.value==='month')d.setMonth(d.getMonth()+direction); else d.setDate(d.getDate()+amount*direction); selectedDate.value=d}
function openDay(date){selectedDate.value=new Date(date); setView('day')}
function selectMonthDay(date){selectedDate.value=new Date(date); if(window.innerWidth<768)setView('day')}
function selectEvent(event, trigger) {
  selectedEvent.value = event
  nextTick(() => positionEventPopover(trigger))
}
function matchedClient(event) {
  const summary = String(event?.summary || '').trim().toLocaleLowerCase()
  const matches = props.clients.filter(client => {
    const name = String(client.name || '').trim().toLocaleLowerCase()
    return name && (summary === name || summary.includes(name))
  })
  return matches.length === 1 ? matches[0] : null
}
function appointmentStatus(event) {
  const client = matchedClient(event)
  if (!client) return ''
  try {
    const sessions = JSON.parse(localStorage.getItem('helio_sessions') || '[]')
    const session = sessions.find(candidate => String(candidate.clientId) === String(client.id) && (candidate.status === 'in_progress' || ['needs_review', 'drafts_awaiting_review'].includes(candidate.workflowStatus)))
    if (!session) return 'Session scheduled'
    return session.status === 'in_progress' ? 'Notes incomplete' : 'Session review waiting'
  } catch { return '' }
}
function openClientWorkspace(event) {
  emit('select-appointment', event)
  closeEventPopover()
}
function closeEventPopover() { selectedEvent.value = null; eventPopoverStyle.value = {} }
function positionEventPopover(trigger) {
  if (!trigger || !eventPopover.value) return
  const source = trigger.getBoundingClientRect()
  const popover = eventPopover.value.getBoundingClientRect()
  const gap = 10
  const left = Math.min(Math.max(12, source.left), window.innerWidth - popover.width - 12)
  const preferredTop = source.bottom + gap
  const top = preferredTop + popover.height <= window.innerHeight - 12 ? preferredTop : Math.max(12, source.top - popover.height - gap)
  eventPopoverStyle.value = { left: `${left}px`, top: `${top}px` }
}
function onDocumentPointerDown(event) { if (selectedEvent.value && !eventPopover.value?.contains(event.target)) closeEventPopover() }
function onKeyDown(event) { if (event.key === 'Escape') closeEventPopover() }

async function loadEvents(){
  loading.value=true; error.value=''
  try {
    const [start,end]=requestRange.value
    const params=new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString()})
    const response=await authenticatedFetch(`/api/calendar/events?${params}`)
    const data=await response.json().catch(() => ({}))
    if (!response.ok) {
      googleService.value = data.code === 'GOOGLE_REAUTH_REQUIRED' || data.code === 'GOOGLE_CONNECTION_REQUIRED'
        ? { state: data.code === 'GOOGLE_REAUTH_REQUIRED' ? 'reauth_required' : 'not_connected' }
        : { state: 'unavailable' }
      throw new Error(data.details||data.error||'Failed to fetch calendar events')
    }
    events.value=data.events||[]
    googleService.value = data.google || { state: 'not_connected' }
    automaticRetries.value = 0
  }
  catch(err){
    console.error('Calendar fetch error:',err)
    error.value=err.message
    // A short retry absorbs momentary network/provider failures without making
    // the therapist diagnose a synchronisation problem. Auth failures never retry.
    if (googleService.value.state === 'unavailable' && !retryTimer && automaticRetries.value < 1) {
      automaticRetries.value += 1
      retryTimer = window.setTimeout(() => { retryTimer = null; loadEvents() }, 3000)
    }
  }
  finally{loading.value=false;hasLoadedOnce.value=true}
}
async function reconnectGoogle() {
  try {
    const response = await authenticatedFetch('/api/google/authorize', { method: 'POST' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.url) throw new Error(data.error || 'Unable to reconnect Google Calendar')
    window.location.assign(data.url)
  } catch (cause) {
    error.value = cause.message || 'Unable to reconnect Google Calendar'
  }
}
watch(selectedDate,()=>{dateInput.value=toInputDate(selectedDate.value); loadEvents()})
watch(view,loadEvents)
onMounted(() => { loadEvents(); window.addEventListener('online', loadEvents); document.addEventListener('pointerdown', onDocumentPointerDown); window.addEventListener('keydown', onKeyDown) })
onUnmounted(() => { if (retryTimer) window.clearTimeout(retryTimer); window.removeEventListener('online', loadEvents); document.removeEventListener('pointerdown', onDocumentPointerDown); window.removeEventListener('keydown', onKeyDown) })
</script>

<style scoped>
.calendar-shell{min-height:100%;display:flex;flex-direction:column;gap:1rem;color:#2c3e50}.calendar-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.calendar-heading h1{font-size:1.6rem;font-weight:750;margin:0}.calendar-heading p{color:#64748b;margin:.25rem 0 0}.sync-status{font-size:.78rem}.sync-status.synced{color:#047857}.sync-status.reauth_required,.sync-status.not_connected{color:#b45309}.sync-status.unavailable{color:#64748b}.view-switcher{display:flex;padding:.25rem;background:#e9eef5;border-radius:.7rem;overflow:auto}.view-switcher button{padding:.5rem .8rem;border:0;background:transparent;border-radius:.5rem;color:#526074;font-weight:600}.view-switcher button.active{background:white;color:#1d4ed8;box-shadow:0 1px 3px #0002}.calendar-toolbar{display:flex;align-items:center;gap:.5rem}.calendar-toolbar button,.date-input{height:2.4rem;border:1px solid #d6dce5;background:white;border-radius:.55rem;padding:0 .8rem;color:#334155}.nav-button{font-size:1.4rem}.date-input{margin-left:auto}.calendar-state{min-height:22rem;flex:1;border:2px dashed #d9dee7;border-radius:1rem;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;color:#64748b}.calendar-state h2{font-size:1.2rem;color:#475569;margin:.5rem}.spinner{width:2rem;height:2rem;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:spin 1s linear infinite}.error-state{border-color:#fecaca;background:#fff7f7}.state-icon{font-size:2rem}.state-actions{display:flex;gap:.5rem;margin-top:1rem}.state-actions button,.service-notice button{padding:.55rem .85rem;background:white;border:1px solid #fecaca;border-radius:.5rem;color:#b91c1c}.service-notice{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem;background:#fffbeb;border:1px solid #fde68a;border-radius:.7rem;color:#92400e}.service-notice button{border-color:#fbbf24;color:#92400e}.agenda-view{display:flex;flex-direction:column;gap:1rem}.agenda-day h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin:.25rem 0 .5rem}.agenda-event{width:100%;display:grid;grid-template-columns:5rem 1fr auto;align-items:center;gap:1rem;text-align:left;background:white;border:1px solid #e2e8f0;padding:1rem;border-radius:.75rem;margin-bottom:.5rem}.agenda-event:hover,.week-event:hover{border-color:#93c5fd;box-shadow:0 2px 8px #1d4ed815}.event-time{font-weight:700;color:#2563eb}.event-copy{display:flex;flex-direction:column;min-width:0}.event-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.event-copy small{color:#64748b;margin-top:.2rem}.week-view{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:white;border:1px solid #e2e8f0;border-radius:.8rem;overflow:hidden;min-height:30rem}.week-day{padding:.5rem;border-right:1px solid #e2e8f0}.week-day:last-child{border:0}.week-day.today{background:#eff6ff}.week-day-heading{width:100%;border:0;background:transparent;display:flex;flex-direction:column;align-items:center;color:#64748b;padding:.4rem}.week-day-heading strong{font-size:1.2rem;color:#334155}.week-event{width:100%;text-align:left;background:#eaf2ff;border:1px solid #dbeafe;color:#1e3a8a;border-radius:.4rem;padding:.45rem;margin:.25rem 0;font-size:.75rem;overflow:hidden}.week-event span{display:block;font-weight:700;margin-bottom:.15rem}.no-events{text-align:center;color:#a0aec0;font-size:.7rem}.month-view{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:white;border:1px solid #e2e8f0;border-radius:.8rem;overflow:hidden}.weekday-name{text-align:center;padding:.6rem;font-size:.75rem;font-weight:700;color:#64748b;background:#f8fafc}.month-day{min-height:7rem;background:white;border:0;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:.4rem;text-align:left;overflow:hidden}.month-day:nth-child(7n){border-right:0}.month-day.muted{background:#f8fafc;color:#94a3b8}.month-day.today .day-number{background:#2563eb;color:white}.month-day.selected{box-shadow:inset 0 0 0 2px #93c5fd}.day-number{display:inline-flex;width:1.6rem;height:1.6rem;align-items:center;justify-content:center;border-radius:50%;font-size:.8rem}.event-chip{display:block;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#eef4ff;color:#1e40af;border-radius:.25rem;padding:.2rem .3rem;margin:.18rem 0;font-size:.68rem}.more-events{font-size:.65rem;color:#64748b}.modal-backdrop{position:fixed;inset:0;background:#0f172a66;z-index:80;display:flex;align-items:center;justify-content:center;padding:1rem}.event-modal{position:relative;background:white;border-radius:1rem;padding:1.5rem;width:min(30rem,100%);box-shadow:0 20px 60px #0004}.close-button{position:absolute;right:1rem;top:.75rem;border:0;background:transparent;font-size:1.7rem;color:#64748b}.event-eyebrow{font-size:.75rem;color:#2563eb;text-transform:uppercase;font-weight:700}.event-modal h2{font-size:1.35rem;margin:.3rem 2rem 1rem 0}.event-modal dl div{margin:.8rem 0}.event-modal dt{font-size:.75rem;color:#64748b}.event-modal dd{margin:.15rem 0}.event-description{white-space:pre-wrap;color:#475569}.event-modal a{display:inline-block;margin-top:1rem;color:#2563eb;font-weight:600}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:767px){.calendar-heading{flex-direction:column}.view-switcher{width:100%}.view-switcher button{flex:1}.date-input{margin-left:0;min-width:0;flex:1}.week-view{display:flex;flex-direction:column;border:0;background:transparent}.week-day{border:1px solid #e2e8f0!important;border-radius:.7rem;background:white;margin-bottom:.6rem}.week-day-heading{flex-direction:row;justify-content:space-between}.month-day{min-height:4.6rem;padding:.2rem}.weekday-name{padding:.4rem .1rem;font-size:.65rem}.event-chip{height:.35rem;padding:0;color:transparent}.more-events{display:none}.agenda-event{grid-template-columns:4.2rem 1fr auto;padding:.85rem}.event-modal{align-self:flex-end;border-radius:1rem 1rem 0 0}.modal-backdrop{padding:0;align-items:flex-end}}
.event-popover{position:fixed;z-index:80;width:min(22rem,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:white;border:1px solid #cbd5e1;border-radius:.85rem;padding:1rem;box-shadow:0 14px 35px #0f172a2b}.event-popover-header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}.event-popover .close-button{position:static;flex:0 0 auto;border:0;background:transparent;font-size:1.6rem;line-height:1;color:#64748b;padding:0}.event-popover .event-eyebrow{font-size:.7rem;letter-spacing:.07em;margin:0}.event-popover h2{font-size:1.05rem;line-height:1.35;margin:.25rem 0 0;color:#1e293b}.event-details{margin:.9rem 0}.event-details div{margin:.55rem 0}.event-details dt{font-size:.72rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.05em}.event-details dd{margin:.16rem 0;color:#334155;line-height:1.4}.event-popover .event-description{border-top:1px solid #e2e8f0;padding-top:.8rem;margin:.8rem 0;line-height:1.45;font-size:.9rem}.event-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem}.event-actions a{display:inline-flex;align-items:center;min-height:2.25rem;padding:.45rem .65rem;border:1px solid #bfdbfe;border-radius:.5rem;color:#1d4ed8;font-size:.85rem;font-weight:700;text-decoration:none}.event-actions .primary-event-action{background:#2563eb;border-color:#2563eb;color:#fff}@media(max-width:767px){.event-popover{left:12px!important;right:12px;top:auto!important;bottom:12px}}
.event-copy .appointment-status{color:#475569;font-weight:650}.event-actions .open-client-action{display:inline-flex;align-items:center;min-height:2.25rem;padding:.45rem .65rem;border:1px solid #bfdbfe;border-radius:.5rem;color:#1d4ed8;font-size:.85rem;font-weight:700;text-decoration:none;background:#fff}
</style>
