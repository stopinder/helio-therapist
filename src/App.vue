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
              class="sm:hidden h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              :class="{ 'bg-[#f5f7fa] border-slate-400': showClientDrawer }"
              :disabled="!selectedClient"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
          >
            👤
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              aria-label="Calendar"
              @click="selectedNav = 'Today'"
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
          <CalendarSchedule v-if="selectedNav === 'Today'" @open-settings="selectedNav = 'Settings'" />

            <ClientDirectory
                v-else-if="selectedNav === 'Clients'"
                :clients="clients"
                :selected-client="selectedClient"
                @select-client="handleSelectClient"
                @add-client="handleAddClient"
            />

            <TranscriptInbox v-else-if="selectedNav === 'Transcripts'" :clients="clients" />

            <ReportsWorkspace v-else-if="selectedNav === 'Reports'" :clients="clients" />

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
import CalendarSchedule from "./components/CalendarSchedule.vue"
import ClientDirectory from "./components/ClientDirectory.vue"
import ReportsWorkspace from "./components/ReportsWorkspace.vue"
import TranscriptInbox from "./components/TranscriptInbox.vue"
import { supabase } from "./lib/supabase.js"

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

const openClientRecord = () => {
  selectedNav.value = "Client Workspace"
  activeView.value = "main"
  showClientDrawer.value = false
}

const startClientSession = () => {
  if (!selectedClient.value) return

  // When the client workspace is already open, invoke the shared action
  // synchronously so Zoom can open without a browser popup warning.
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
</style>
