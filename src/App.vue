<template>
  <div class="flex h-screen bg-[#f5f7fa] text-[#2c3e50] overflow-hidden">
    <!-- Left Sidebar: Desktop (Fixed) / Mobile (Drawer) -->
    <transition name="slide">
      <LeftSidebar
          v-if="isSidebarOpen || isDesktop"
          class="fixed md:relative z-50 md:z-40 shrink-0 w-64 bg-white border-r border-[#d9dce1] h-full shadow-xl md:shadow-none"
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
    </transition>

    <!-- Sidebar Backdrop for Mobile -->
    <div
        v-if="!isDesktop && isSidebarOpen"
        class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        @click="isSidebarOpen = false"
    ></div>

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 min-w-0 h-full overflow-hidden w-full">
      <!-- Fixed Top Bar -->
      <header
          class="h-14 flex items-center justify-between px-4 border-b border-[#d9dce1] bg-white shadow-sm shrink-0"
      >
        <div class="flex items-center gap-2 md:gap-3 min-w-0">
          <!-- Mobile Menu Button -->
          <button
              class="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
              @click="isSidebarOpen = true"
              aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div class="flex items-center gap-1 md:gap-2 text-[16px] md:text-[18px] font-semibold tracking-tight text-[#2c3e50] truncate">
            <span class="truncate">Therapist Workspace</span>
            <span class="text-slate-400 mx-0.5 md:mx-1 shrink-0">·</span>
            <span class="flex items-center gap-1 text-[12px] md:text-[13px] font-normal text-slate-500 shrink-0">
              <span
                  class="inline-block h-2 w-2 rounded-full"
                  :class="isInSession ? 'bg-green-500' : 'bg-slate-400'"
              ></span>
              {{ isInSession ? 'In Session' : 'Offline' }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 md:gap-3">
          <button
              class="hidden sm:block text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] transition"
              :class="showClientDrawer ? 'bg-[#f5f7fa] text-black border-slate-400' : 'text-[#3f4754] bg-white hover:bg-[#f5f7fa]'"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
              :aria-expanded="showClientDrawer"
              aria-controls="client-context-drawer"
          >
            Client
          </button>
          
          <!-- Mobile client icon button -->
          <button
              class="sm:hidden h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              :class="{ 'bg-[#f5f7fa] border-slate-400': showClientDrawer }"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
          >
            👤
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              aria-label="Calendar"
          >
            🗓
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              :class="{ 'bg-[#eef1f5] font-semibold border-slate-400': selectedNav === 'Settings' }"
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
            class="flex-1 overflow-auto p-4 md:p-6 relative scroll-smooth bg-[#f5f7fa]"
            @scroll="handleScroll"
        >
          <div v-if="selectedNav === 'Today'" class="h-full flex flex-col">
            <h1 class="text-2xl font-bold mb-6 text-[#2c3e50]">Today’s Schedule</h1>
            
            <div v-if="calendarLoading" class="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p class="text-sm">Fetching your schedule...</p>
            </div>

            <div v-else-if="calendarError" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-xl border border-red-100">
              <div class="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 class="text-lg font-semibold text-red-900 mb-2">Calendar Sync Issue</h3>
              <p class="text-red-700 mb-6 max-w-md">{{ calendarError }}</p>
              <button 
                @click="selectedNav = 'Settings'" 
                class="px-6 py-2 bg-white border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-100 transition shadow-sm"
              >
                Reconnect Google Calendar
              </button>
            </div>

            <div v-else-if="events.length === 0" class="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-12 text-center bg-white">
              <div class="text-4xl mb-4 opacity-20">📅</div>
              <h3 class="text-lg font-medium text-slate-600 mb-1">Your schedule is clear</h3>
              <p class="text-slate-400 text-sm">No events found for today in your primary calendar.</p>
            </div>

            <div v-else class="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              <div 
                v-for="event in events" 
                :key="event.id"
                class="group bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex items-center justify-between gap-4"
              >
                <div class="flex items-center gap-4 min-w-0">
                  <div class="flex-shrink-0 w-12 text-center">
                    <div class="text-[11px] font-bold text-blue-600 uppercase tracking-tighter">{{ formatTime(event.start).period }}</div>
                    <div class="text-[16px] font-black text-slate-800 leading-none">{{ formatTime(event.start).time }}</div>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-[15px] font-semibold text-slate-800 truncate">{{ event.summary }}</h3>
                    <p class="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span class="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                      {{ formatEventTimeRange(event) }}
                    </p>
                  </div>
                </div>
                <a 
                  v-if="event.link" 
                  :href="event.link" 
                  target="_blank" 
                  class="flex-shrink-0 p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                  title="View in Google Calendar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

            <div v-else-if="selectedNav === 'Reports'" class="h-full flex flex-col items-center justify-center text-slate-400">
              <h1 class="text-2xl font-bold mb-6 text-[#2c3e50]">Reports</h1>
              <p>Reports content goes here</p>
            </div>

            <Settings v-else-if="selectedNav === 'Settings'" />

          <template v-else>
            <!-- Persistent Client Header -->
            <div
                v-if="selectedClient"
                class="sticky top-0 z-20 mb-4 rounded-md px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 shadow-sm backdrop-blur-sm border-2 transition-all duration-300"
                :class="isInSession
                ? 'border-[#2563eb] bg-[#eaf1ff]'
                : 'border-[#d9dce1] bg-white'"
                :style="{ opacity: headerOpacity }"
            >
              <div
                  class="text-[17px] font-semibold transition-colors duration-300"
                  :class="isInSession ? 'text-[#2563eb]' : 'text-[#2c3e50]'"
              >
                {{ selectedClient.name }}
                <span
                    class="ml-2 text-[13px] font-normal transition-colors duration-300"
                    :class="isInSession ? 'text-[#3b82f6]' : 'text-slate-500'"
                >
                  {{ sessionDate }}
                </span>
              </div>
              <div class="text-[13px] text-slate-500">{{ activeViewLabel }}</div>
            </div>

            <!-- View switching -->
            <MainCanvas
                v-if="activeView === 'main'"
                :selected-client="selectedClient"
                :session-notes="filteredNotes"
            />

            <CbtToolLoader
                v-else-if="activeView === 'cbt'"
                :template="activeTemplate"
                @generate-insight="handleGenerateInsight"
                @close="activeView = 'main'"
            />

            <ReflectiveJournal
                v-else-if="activeView === 'reflection'"
                :clients="clients"
                :selected-client="selectedClient"
                @save="handleSaveReflection"
                @generate-insight="handleGenerateInsight"
                @close="activeView = 'main'"
            />

            <PastReflections
                v-else-if="activeView === 'past-reflections'"
                :reflections="reflections"
                :clients="clients"
                @delete="handleDeleteReflection"
                @archive="handleArchiveReflection"
                @close="activeView = 'main'"
            />

            <IFSToolLoader
                v-else-if="activeView === 'ifs'"
                :template="activeTemplate"
                @close="activeView = 'main'"
                @generate-insight="handleGenerateInsight"
            />

            <EMDRToolLoader
                v-else-if="activeView === 'emdr'"
                :template="activeTemplate"
                @close="activeView = 'main'"
                @generate-insight="handleGenerateInsight"
            />

            <TherapistMap
                v-else-if="activeView === 'therapist-map'"
                class="w-full h-[calc(100vh-7rem)] relative"
            />
          </template>
        </main>
      </div>

      <!-- Message Bar (only if not in Today or Settings view or per requirement) -->
      <footer v-if="selectedNav !== 'Today' && selectedNav !== 'Settings'" class="border-t border-[#d9dce1] bg-white shadow-inner px-4 md:px-6 py-3 md:py-4">
        <MessageBar @submit="handleMessageSubmit" />
      </footer>
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
import MessageBar from "./components/tools/MessageBar.vue"
import MainCanvas from "./components/tools/MainCanvas.vue"
import CbtToolLoader from "./components/tools/CBTToolLoader.vue"
import ReflectiveJournal from "./components/reflective/ReflectiveJournal.vue"
import PastReflections from "./components/reflective/PastReflections.vue"
import TherapistMap from "./components/tools/TherapistMap.vue"
import Settings from "./components/Settings.vue"

// --- State ---
const isSidebarOpen = ref(true)
const isRightPanelOpen = ref(true)
const isDesktop = ref(true)
const isInSession = ref(false)
const isSyncing = ref(false)
const activeView = ref("main")
const selectedNav = ref("Today")
const activeTool = ref(null)
const activeTemplate = ref(null)
const reflectionMode = ref("new")

// --- Google Calendar ---
const events = ref([])
const calendarLoading = ref(false)
const calendarError = ref(null)

const fetchCalendarEvents = async () => {
  calendarLoading.value = true
  calendarError.value = null
  try {
    const response = await fetch('/api/google/events')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch events')
    }
    events.value = data.events
  } catch (err) {
    console.error('Calendar fetch error:', err)
    calendarError.value = err.message
  } finally {
    calendarLoading.value = false
  }
}

const formatTime = (dateStr) => {
  const date = new Date(dateStr)
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return {
    time: `${hours}:${minutes.toString().padStart(2, '0')}`,
    period
  }
}

const formatEventTimeRange = (event) => {
  const start = formatTime(event.start)
  const end = formatTime(event.end)
  return `${start.time}${start.period} – ${end.time}${end.period}`
}

watch(selectedNav, (newNav) => {
  if (newNav === 'Today') {
    fetchCalendarEvents()
  }
})

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
const clients = ref(
    JSON.parse(localStorage.getItem("helio_clients")) || [
      { id: 1, name: "Celia R.", note: "Parts work / relationship stress", archived: false },
    ]
)
watch(clients, (newClients) => {
  localStorage.setItem("helio_clients", JSON.stringify(newClients))
}, { deep: true })

const handleAddClient = (newClientData) => {
  const name = newClientData?.name?.trim() || "New Client"
  const note = newClientData?.note || ""
  const newClient = { id: Date.now(), name, note, archived: false }
  clients.value.push(newClient)
  selectedClient.value = newClient
  feedbackMessage.value = "✅ Client added"
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

const selectedClient = ref(clients.value[0])
const sessionNotes = ref([])

const handleSelectClient = (client) => {
  selectedClient.value = client
  localStorage.setItem("helio_selectedClient", JSON.stringify(client))
  activeView.value = "main"
  isSidebarOpen.value = false
}

const handleNavChange = (nav) => {
  selectedNav.value = nav
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

const handleMessageSubmit = (text) => {
  const value = text.trim()
  if (!value) return
  sessionNotes.value.push({
    id: Date.now() + Math.random(),
    clientId: selectedClient.value?.id ?? null,
    text: value,
  })
}

const filteredNotes = computed(() =>
    selectedClient.value
        ? sessionNotes.value.filter((n) => n.clientId === selectedClient.value.id)
        : []
)

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
  updateScreen()
  window.addEventListener("resize", updateScreen)
  window.addEventListener("tool-saved", () => {
    isRightPanelOpen.value = false
    nextTick(() => { isRightPanelOpen.value = true })
  })
  
  if (selectedNav.value === 'Today') {
    fetchCalendarEvents()
  }
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
</style>
