<template>
  <div class="flex h-screen bg-[#f5f7fa] text-[#2c3e50] overflow-hidden relative">
    <!-- Dim overlay for focus on mobile -->
    <transition name="fade">
      <div
          v-if="isSidebarOpen && !isDesktop"
          class="fixed inset-0 bg-black/40 z-30"
          @click="isSidebarOpen = false"
      ></div>
    </transition>

    <!-- Left Sidebar -->
    <transition name="slide">
      <LeftSidebar
          v-if="isSidebarOpen || isDesktop"
          class="z-40 shrink-0 w-64 bg-white border-r border-[#d9dce1] h-full"
          :clients="clients"
          :selected-client="selectedClient"
          :is-sidebar-open="isSidebarOpen"
          :is-in-session="isInSession"
          :is-syncing="isSyncing"
          :active-template="activeTemplate"
          @select-client="handleSelectClient"
          @close-sidebar="isSidebarOpen = false"
          @join-zoom="joinZoom"
          @end-zoom="endZoom"
          @sync-transcript="syncTranscript"
          @open-tool="openTool"
          @open-reflection="openReflection"
          @add-client="handleAddClient"
          :resources="resources"
          @add-resource="handleAddResource"
      />
    </transition>

    <!-- Main Area -->
    <div
        class="flex flex-col flex-1 overflow-hidden transform transition-transform duration-300 ease-in-out"
        :class="{ 'translate-x-64': isSidebarOpen && !isDesktop }"
    >
      <!-- Header -->
      <header
          class="h-14 flex items-center justify-between px-4 md:px-6 border-b border-[#d9dce1] bg-white shadow-sm"
      >
        <div class="flex items-center gap-3">
          <button
              class="md:hidden text-[20px] font-semibold text-[#2c3e50]"
              @click="isSidebarOpen = !isSidebarOpen"
              aria-label="Toggle left sidebar"
          >
            ☰
          </button>
        </div>

        <div class="flex flex-col">
          <div class="flex items-center gap-2 text-[18px] font-semibold tracking-tight text-[#2c3e50]">
            <span>Therapist Workspace</span>
            <span class="text-slate-400 mx-1">·</span>
            <span class="flex items-center gap-1 text-[13px] font-normal text-slate-500">
              <span
                  class="inline-block h-2 w-2 rounded-full"
                  :class="isInSession ? 'bg-green-500' : 'bg-slate-400'"
              ></span>
              {{ isInSession ? 'In Session' : 'Offline' }}
            </span>
          </div>
        </div>

        <!-- Right: controls -->
        <div class="flex items-center gap-3">
          <button
              class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
              @click="toggleRightPanel"
          >
            Client context
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              aria-label="Calendar"
          >
            🗓
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      <!-- Central Canvas -->
      <main
          class="flex-1 overflow-auto p-4 md:p-6 relative scroll-smooth bg-[#f5f7fa]"
          @scroll="handleScroll"
      >
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
      </main>

      <!-- Inline feedback -->
      <transition name="fade">
        <div
            v-if="feedbackMessage"
            class="absolute bottom-16 right-6 text-[13px] text-green-600 bg-white/80 border border-[#d9dce1] px-3 py-1 rounded-md shadow-sm transition-opacity"
        >
          {{ feedbackMessage }}
        </div>
      </transition>

      <!-- Message Bar -->
      <footer class="border-t border-[#d9dce1] bg-white shadow-inner px-4 md:px-6 py-3 md:py-4">
        <MessageBar @submit="handleMessageSubmit" />
      </footer>
    </div>

    <!-- Right slide-in panel -->
    <RightPanel
        :selected-client="selectedClient"
        :open="isRightPanelOpen"
        @close="isRightPanelOpen = false"
        @view-map="showClientMap"
    />

    <!-- AI Insight Drawer -->
    <AIInsightDrawer
        :open="showAIDrawer"
        :input="aiInput"
        @close="showAIDrawer = false"
        @save-insight="handleSaveInsight"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue"
import AIInsightDrawer from "./components/AIInsightDrawer.vue"
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

// --- State ---
const isSidebarOpen = ref(false)
const isRightPanelOpen = ref(false)
const isDesktop = ref(false)
const isInSession = ref(false)
const isSyncing = ref(false)
const activeView = ref("main")
const activeTool = ref(null)
const activeTemplate = ref(null)
const reflectionMode = ref("new")

// --- AI Drawer ---
const showAIDrawer = ref(false)
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
  if (!isDesktop.value) isSidebarOpen.value = false
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

const updateScreen = () => (isDesktop.value = window.innerWidth >= 768)
onMounted(() => {
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
