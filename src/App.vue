<template>
  <div class="flex h-screen bg-surface-canvas text-ink overflow-hidden">
    <!-- Left Sidebar: Desktop (Fixed) / Mobile (Drawer) -->
    <transition-colors duration-standard ease-out name="slide">
      <LeftSidebar
          v-if="isSidebarOpen || isDesktop"
          class="fixed md:relative z-50 md:z-40 shrink-0 w-64 bg-surface border-r border-border h-full shadow-overlay md:shadow-none"
          :selected-nav="selectedNav"
          @update:selected-nav="handleNavChange"
          :clients="clients"
          :selected-client="selectedClient"
          :is-in-session="isInSession"
          :is-syncing="isSyncing"
          :active-template="activeTemplate"
          @select-client="handleSelectClient"
          @join-zoom="joinZoom"
          @end-zoom="endZoom"
          @sync-transcript="syncTranscript"
          @open-tool="openTool"
          @open-reflection="openReflection"
          @add-client="handleAddClient"
          :resources="resources"
          @add-resource="handleAddResource"
          @close-sidebar="isSidebarOpen = false"
      />
    </transition-colors duration-standard ease-out>

    <!-- Sidebar Backdrop for Mobile -->
    <div
        v-if="!isDesktop && isSidebarOpen"
        class="fixed inset-0 bg-backdrop backdrop-blur-sm z-40 md:hidden"
        @click="isSidebarOpen = false"
    ></div>

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 min-w-0 h-full overflow-hidden w-full">
      <!-- Fixed Top Bar -->
      <header
          class="h-14 flex items-center justify-between px-4 border-b border-border bg-surface shrink-0"
      >
        <div class="flex items-center gap-2 md:gap-3 min-w-0">
          <!-- Mobile Menu Button -->
          <button
              class="md:hidden p-2 -ml-2 text-ink-secondary rounded-control interaction-control focus-visible:outline-none"
              @click="isSidebarOpen = true"
              aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div class="flex items-center gap-1 md:gap-2 type-h3 tracking-tight text-ink truncate">
            <span class="truncate">Therapist Workspace</span>
            <span v-if="isInSession" class="text-ink-subtle mx-0.5 md:mx-1 shrink-0">·</span>
              <span v-if="isInSession" class="flex items-center gap-1 type-caption text-ink-muted shrink-0">
              <span
                  class="inline-block h-2 w-2 rounded-pill"
                  :class="isInSession ? 'bg-state-success' : 'bg-state-disabled'"
              ></span>
              In session
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 md:gap-3">
          <button
              class="hidden sm:block type-body-sm px-3 py-1.5 rounded-control border border-border interaction-control focus-visible:outline-none"
              :class="showClientDrawer ? 'state-selected text-ink border-border-strong' : 'text-ink-secondary bg-surface-elevated'"
              :disabled="!selectedClient"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
              :aria-expanded="showClientDrawer"
              aria-controls="client-context-drawer"
          >
            {{ selectedClient?.name || 'No client selected' }}
          </button>
          
          <!-- Mobile client icon button -->
          <button
              class="sm:hidden h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-secondary interaction-control type-body focus-visible:outline-none"
              :class="{ 'state-selected border-border-strong': showClientDrawer }"
              :disabled="!selectedClient"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
          >
            👤
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-secondary interaction-control type-body focus-visible:outline-none"
              aria-label="Calendar"
              @click="selectedNav = 'Today'"
          >
            🗓
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-secondary interaction-control type-body focus-visible:outline-none"
              :class="{ 'state-selected font-semibold border-border-strong': selectedNav === 'Settings' }"
              @click="selectedNav = 'Settings'"
              aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      <!-- Workspace with Centre and Right Sidebar -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Flexible Centre Workspace -->
        <main
            class="flex-1 overflow-auto page-layout relative scroll-smooth bg-surface-canvas"
            @scroll="handleScroll"
        >
          <section v-if="selectedNav === 'Today'" class="today-workspace">
            <header class="today-workspace-heading">
              <div><p class="today-eyebrow type-overline">Today</p><h1 class="type-h1">Your clinical day</h1><p class="type-body">Start with the next person you need to hold in mind.</p></div>
            </header>
            <NextSessionPreparation
                :appointment="nextMatchedAppointment"
                :client="nextMatchedClient"
                @prepare="openAppointmentPreparation"
            />
            <section v-if="laterTodayAppointments.length" class="later-today" aria-labelledby="later-today-heading">
              <div class="later-today__heading">
                <h2 id="later-today-heading" class="type-h2">Later today</h2>
                <p class="type-body-sm">Your remaining appointments after the next session.</p>
              </div>
              <button
                  v-for="appointment in laterTodayAppointments"
                  :key="appointment.id"
                  class="later-today__appointment interaction-row"
                  @click="openAppointmentPreparation(appointment)"
              >
                <span>{{ appointmentTime(appointment) }}</span>
                <strong class="type-body-medium">{{ appointment.summary }}</strong>
                <span aria-hidden="true">›</span>
              </button>
            </section>
            <section class="today-calendar" aria-labelledby="today-calendar-heading">
              <div class="today-calendar__heading">
                <h2 id="today-calendar-heading" class="type-h2">Calendar</h2>
                <p class="type-body-sm">Reference and navigation for the rest of your day.</p>
              </div>
            <CalendarSchedule
                :clients="clients"
                reference-view
                @open-settings="selectedNav = 'Settings'"
                @select-appointment="openAppointmentPreparation"
                @next-appointment="nextMatchedAppointment = $event"
                @upcoming-appointments="upcomingAppointments = $event"
            />
            </section>
          </section>

          <NeedsAttention
              v-else-if="selectedNav === 'Inbox' && !queuedTranscriptId"
              :clients="clients"
              @open-settings="selectedNav = 'Settings'"
              @open-transcript="openTranscriptFromQueue"
              @open-session="openSessionFromQueue"
              @select-appointment="openAppointmentPreparation"
          />

            <ClientDirectory
                v-else-if="selectedNav === 'Clients'"
                :clients="clients"
                :selected-client="selectedClient"
                @select-client="handleSelectClient"
                @add-client="handleAddClient"
            />

            <TranscriptInbox v-else-if="selectedNav === 'Inbox'" :clients="clients" :open-transcript-id="queuedTranscriptId" />

            <Settings v-else-if="selectedNav === 'Settings'" />

          <MainCanvas ref="clientWorkspace" v-else :selected-client="selectedClient" @update-focus="handleUpdateClientFocus" />
        </main>
      </div>

    </div>

    <!-- AI Insight Drawer -->
    <AIInsightDrawer
        :open="showAIDrawer"
        :input="aiInput"
        @close="showAIDrawer = false"
        @save-insight="handleSaveInsight"
    />

    <!-- Client Context Drawer -->
    <ClientContextDrawer
        id="client-context-drawer"
        :open="showClientDrawer"
        :client="selectedClient"
        @close="showClientDrawer = false"
        @open-record="openClientRecord"
        @start-session="startClientSession"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue"
import AIInsightDrawer from "./components/AIInsightDrawer.vue"
import ClientContextDrawer from "./components/tools/ClientContextDrawer.vue"
import EMDRToolLoader from "./components/tools/EMDRToolLoader.vue"
import IFSToolLoader from "./components/tools/IFSToolLoader.vue"
import LeftSidebar from "./components/tools/LeftSidebar.vue"
import RightPanel from "./components/tools/RightPanel.vue"
import MainCanvas from "./components/tools/MainCanvas.vue"
import CbtToolLoader from "./components/tools/CBTToolLoader.vue"
import ReflectiveJournal from "./components/reflective/ReflectiveJournal.vue"
import PastReflections from "./components/reflective/PastReflections.vue"
import TherapistMap from "./components/tools/TherapistMap.vue"
import Settings from "./components/Settings.vue"
import NeedsAttention from "./components/NeedsAttention.vue"
import ClientDirectory from "./components/ClientDirectory.vue"
import TranscriptInbox from "./components/TranscriptInbox.vue"
import CalendarSchedule from "./components/CalendarSchedule.vue"
import NextSessionPreparation from "./components/NextSessionPreparation.vue"
import { supabase } from "./lib/supabase.js"

// --- State ---
const isSidebarOpen = ref(true)
const isRightPanelOpen = ref(true)
const isDesktop = ref(true)
const isInSession = ref(false)
const isSyncing = ref(false)
const activeView = ref("main")
const selectedNav = ref("Today")
const queuedTranscriptId = ref(null)
const nextMatchedAppointment = ref(null)
const upcomingAppointments = ref([])
const activeTool = ref(null)
const activeTemplate = ref(null)
const reflectionMode = ref("new")

// --- AI Drawer ---
const showAIDrawer = ref(false)
const showClientDrawer = ref(false)
const aiInput = ref(null)
const feedbackMessage = ref("")

const handleGenerateInsight = (data) => {
  aiInput.value = data
  showAIDrawer.value = true
}

// --- Clients ---
const clients = ref([])
const nextMatchedClient = computed(() => {
  return matchedClientForAppointment(nextMatchedAppointment.value)
})
const matchedClientForAppointment = (appointment) => {
  const summary = String(appointment?.summary || '').trim().toLowerCase()
  const matches = clients.value.filter(client => {
    const name = String(client.name || '').trim().toLowerCase()
    return name && (summary === name || summary.includes(name))
  })
  return matches.length === 1 ? matches[0] : null
}
const laterTodayAppointments = computed(() => {
  const nextId = nextMatchedAppointment.value?.id
  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(24, 0, 0, 0)
  return upcomingAppointments.value
    .filter(appointment => !appointment.allDay
      && appointment.id !== nextId
      && new Date(appointment.start).getTime() > now.getTime()
      && new Date(appointment.start).getTime() < endOfToday.getTime()
      && matchedClientForAppointment(appointment))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
})
const appointmentTime = (appointment) => new Date(appointment.start).toLocaleTimeString(undefined, {
  hour: 'numeric', minute: '2-digit'
})
watch(clients, (newClients) => {
  localStorage.setItem("helio_clients", JSON.stringify(newClients))
}, { deep: true })

const loadClients = async () => {
  if (!supabase) return
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
  if (error) { console.error('Unable to load clients:', error.message); return }
  clients.value = (data || []).map(client => ({ ...client, name: client.display_name, note: client.current_focus }))
  const storedId = JSON.parse(localStorage.getItem("helio_selectedClient") || "null")?.id
  selectedClient.value = clients.value.find(client => client.id === storedId) || clients.value[0] || null
}

const handleAddClient = async (newClientData) => {
  const name = newClientData?.name?.trim() || "New Client"
  const note = newClientData?.note || ""
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) { feedbackMessage.value = "Please sign in again"; return }
  const { data, error } = await supabase.from('clients').insert({ user_id: auth.user.id, display_name: name, reference: newClientData?.email || null, current_focus: note }).select().single()
  if (error) { feedbackMessage.value = `Unable to add client: ${error.message}`; return }
  const newClient = { ...data, name: data.display_name, note: data.current_focus }
  clients.value.push(newClient)
  selectedClient.value = newClient
  localStorage.setItem("helio_selectedClient", JSON.stringify(newClient))
  feedbackMessage.value = "✅ Client added"
  setTimeout(() => (feedbackMessage.value = ""), 2000)
}

async function handleUpdateClientFocus(note) {
  if (!selectedClient.value || !supabase) return
  const { data, error } = await supabase
    .from('clients')
    .update({ current_focus: note || null })
    .eq('id', selectedClient.value.id)
    .select()
    .single()
  if (error) { feedbackMessage.value = `Unable to save focus: ${error.message}`; return }
  const updated = { ...data, name: data.display_name, note: data.current_focus }
  clients.value = clients.value.map(client => client.id === updated.id ? updated : client)
  selectedClient.value = updated
  localStorage.setItem("helio_selectedClient", JSON.stringify(updated))
  feedbackMessage.value = "Current focus saved"
  setTimeout(() => (feedbackMessage.value = ""), 2000)
}

// --- Resources ---
const resources = ref(
    JSON.parse(localStorage.getItem("helio_resources")) || [
      { id: 1, title: "Safe Calm Place (Audio)", type: "audio", url: "" },
      { id: 2, title: "Sensing Exercise (PDF)", type: "pdf", url: "" },
    ]
)
watch(resources, (newResources) => {
  localStorage.setItem("helio_resources", JSON.stringify(newResources))
}, { deep: true })

const handleAddResource = (newResourceData) => {
  const newResource = {
    id: Date.now(),
    title: newResourceData.title?.trim() || "Untitled Resource",
    type: newResourceData.type || "link",
    url: newResourceData.url || "",
    includeInExport: false,
    createdAt: new Date().toISOString(),
  }
  resources.value.push(newResource)
}

// --- Reflections ---
const reflections = ref(
    JSON.parse(localStorage.getItem("helio_reflections")) || []
)
watch(reflections, (newVal) => {
  localStorage.setItem("helio_reflections", JSON.stringify(newVal))
}, { deep: true })

const handleSaveReflection = (entry) => {
  if (!entry?.text?.trim()) return // ignore empty
  const newReflection = {
    id: Date.now(),
    ...entry,
    date: new Date().toISOString(),
  }
  reflections.value.push(newReflection)
  feedbackMessage.value = "✅ Reflection saved"
  setTimeout(() => (feedbackMessage.value = ""), 3000)
}

const handleArchiveReflection = (id, value) => {
  const r = reflections.value.find(x => x.id === id)
  if (r) r.archived = !!value
}

const handleSaveInsight = ({ clientId, text }) => {
  if (!clientId || !text) return
  const now = new Date().toISOString()
  let reflection = reflections.value
      .filter(r => r.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

  if (!reflection) {
    reflection = {
      id: Date.now(),
      clientId,
      title: "New Reflection",
      text: "",
      createdAt: now,
      updatedAt: now,
      aiSummary: text
    }
    reflections.value.push(reflection)
  } else {
    reflection.aiSummary = text
    reflection.updatedAt = now
  }

  feedbackMessage.value = "✅ Insight saved to reflection"
  setTimeout(() => (feedbackMessage.value = ""), 3000)
}

// --- Reflection management ---
const handleDeleteReflection = (id) => {
  reflections.value = reflections.value.filter(x => x.id !== id)
}
const handleExportAllReflections = () => {
  alert("Exporting all reflections... (PDF export coming soon)")
}

// --- View management ---
const openReflection = (mode) => {
  reflectionMode.value = mode
  if (mode === "new") activeView.value = "reflection"
  else if (mode === "past") activeView.value = "past-reflections"
  else if (mode === "map") activeView.value = "therapist-map"
}

const storedClient = JSON.parse(localStorage.getItem("helio_selectedClient") || "null")
const selectedClient = ref(clients.value.find(client => client.id === storedClient?.id) || null)
const clientWorkspace = ref(null)

const handleSelectClient = (client) => {
  selectedClient.value = client
  localStorage.setItem("helio_selectedClient", JSON.stringify(client))
  activeView.value = "main"
  selectedNav.value = "Client Workspace"
  showClientDrawer.value = true
  isSidebarOpen.value = false
}

const openTranscriptFromQueue = (item) => {
  queuedTranscriptId.value = item.transcriptId
  selectedNav.value = 'Inbox'
}

const openSessionFromQueue = async (item) => {
  const client = clients.value.find(candidate => String(candidate.id) === String(item.clientId))
  if (!client) return
  handleSelectClient(client)
  await nextTick()
  window.dispatchEvent(new CustomEvent('helio:open-session', { detail: { sessionId: item.sessionId, clientId: item.clientId } }))
}

const openAppointmentPreparation = async (appointment) => {
  // Calendar providers do not yet supply a durable Helio client ID. Until they do,
  // match only an unambiguous client name and leave other events in the calendar.
  const summary = String(appointment?.summary || '').trim().toLowerCase()
  const matches = clients.value.filter(client => {
    const name = String(client.name || '').trim().toLowerCase()
    return name && (summary === name || summary.includes(name))
  })
  if (matches.length !== 1) return
  handleSelectClient(matches[0])
  await nextTick()
  window.dispatchEvent(new CustomEvent('helio:prepare-session', {
    detail: { clientId: matches[0].id, appointment }
  }))
}

const openClientRecord = () => {
  selectedNav.value = "Client Workspace"
  activeView.value = "main"
  showClientDrawer.value = false
}

const startClientSession = () => {
  if (!selectedClient.value) return

  // Preserve the browser's user gesture when the record is already open,
  // so Zoom is not treated as an unsolicited pop-up.
  if (selectedNav.value === "Client Workspace" && clientWorkspace.value) {
    showClientDrawer.value = false
    clientWorkspace.value.startSession()
    return
  }

  openClientRecord()
  nextTick(() => clientWorkspace.value?.startSession())
}

const handleNavChange = (nav) => {
  selectedNav.value = nav
  if (nav !== 'Inbox') queuedTranscriptId.value = null
  isSidebarOpen.value = false
}

const openTool = (payload) => {
  if (payload.group === "cbt") {
    activeTool.value = "cbt"
    activeTemplate.value = payload.template
    activeView.value = "cbt"
  } else if (payload.group === "ifs") {
    activeTool.value = "ifs"
    activeTemplate.value = payload.template
    activeView.value = "ifs"
  } else if (payload.group === "emdr") {
    activeTool.value = "emdr"
    activeTemplate.value = payload.template
    activeView.value = "emdr"
  } else {
    activeView.value = "main"
  }
}

const joinZoom = () => (isInSession.value = true)
const endZoom = () => (isInSession.value = false)

const syncTranscript = async () => {
  if (!isInSession.value) return
  isSyncing.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  } finally {
    isSyncing.value = false
  }
}

const activeViewLabel = computed(() => {
  switch (activeView.value) {
    case "cbt": return "CBT Tool"
    case "ifs": return "IFS Tool"
    case "emdr": return "EMDR Tool"
    case "reflection": return "Reflection"
    case "past-reflections": return "Past Reflections"
    case "therapist-map": return "Therapist Map"
    default: return "Session Notes"
  }
})

const headerOpacity = ref(1)
function handleScroll(e) {
  const scrollY = e.target.scrollTop
  headerOpacity.value = scrollY > 10 ? 0.85 : 1
}

const sessionDate = computed(() =>
    new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
)

const toggleRightPanel = () => (isRightPanelOpen.value = !isRightPanelOpen.value)
const showClientMap = () => (activeView.value = "main")

const updateScreen = () => {
  isDesktop.value = window.innerWidth >= 768
  if (isDesktop.value) {
    isSidebarOpen.value = true
  } else if (!isDesktop.value && isSidebarOpen.value) {
    // If we were desktop and resize to mobile, close sidebar by default
    // but only if it was open. Actually, just closing it is safer.
    isSidebarOpen.value = false
  }
}
onMounted(() => {
  loadClients()
  updateScreen()
  window.addEventListener("resize", updateScreen)
  window.addEventListener("tool-saved", () => {
    isRightPanelOpen.value = false
    nextTick(() => { isRightPanelOpen.value = true })
  })
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.slide-enter-active, .slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(-100%);
}
.today-workspace{max-width:68rem;margin:0 auto;color:var(--text-primary)}.today-workspace-heading{margin-bottom:var(--space-stack-xl)}.today-workspace-heading h1{margin:0}.today-workspace-heading p:not(.today-eyebrow){margin:var(--space-stack-xs) 0 0;color:var(--text-muted)}.today-eyebrow{margin:0 0 var(--space-stack-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)}.later-today,.today-calendar{margin-top:var(--space-stack-2xl)}.later-today__heading,.today-calendar__heading{margin-bottom:var(--space-stack-md)}.later-today h2,.today-calendar h2{margin:0;color:var(--text-secondary)}.later-today p,.today-calendar p{margin:var(--space-stack-xs) 0 0;color:var(--text-muted)}.later-today__appointment{width:100%;display:grid;grid-template-columns:5rem 1fr auto;align-items:center;gap:var(--space-inline-md);text-align:left;background:var(--surface);border:1px solid var(--border-muted);border-radius:.7rem;padding:var(--space-stack-md) var(--space-stack-lg);margin-bottom:var(--space-stack-xs);color:var(--text-secondary)}.later-today__appointment:hover{background:var(--surface-subtle);border-color:var(--border)}.later-today__appointment:focus-visible{outline:2px solid var(--action-link);outline-offset:2px}.later-today__appointment>span:first-child{font-weight:700;color:var(--action-link)}.today-calendar{padding-top:var(--space-stack-xs);border-top:1px solid var(--border-muted)}@media(max-width:700px){.later-today__appointment{grid-template-columns:4.5rem 1fr auto}}
</style>
