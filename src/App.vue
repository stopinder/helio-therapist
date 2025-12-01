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
        <!-- Left: hamburger + title -->
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


          <!-- Session status indicator -->
          <div class="flex items-center gap-2 text-[18px] font-semibold tracking-tight text-[#2c3e50]">
            <span>Therapist Workspace</span>
            <span class="text-slate-400 mx-1">·</span>
            <span
                class="flex items-center gap-1 text-[13px] font-normal text-slate-500"
            >
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

          <!-- Calendar icon -->
          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              aria-label="Calendar"
          >
            🗓
          </button>

          <!-- Settings icon -->
          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
              aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      <!-- Central Canvas -->
      <main class="flex-1 overflow-auto p-4 md:p-6">
        <MainCanvas
            v-if="activeView === 'main'"
            :selected-client="selectedClient"
            :session-notes="filteredNotes"
        />
        <CbtToolLoader
            v-else-if="activeView === 'cbt'"
            :template="activeTemplate"
            v-on:close="activeView = 'main'"
        />

        <ReflectiveCanvas
            v-else-if="activeView === 'reflection'"
            :mode="reflectionMode"
        />
        <IFSToolLoader
            v-else-if="activeView === 'ifs'"
            :template="activeTemplate"
            v-on:close="activeView = 'main'"
        />
        <EMDRToolLoader
            v-else-if="activeView === 'emdr'"
            :template="activeTemplate"
            v-on:close="activeView = 'main'"
        />

      </main>

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
  </div>
</template>

<script setup>
import EMDRToolLoader from "./components/tools/EMDRToolLoader.vue"

import IFSToolLoader from "./components/tools/IFSToolLoader.vue"

import { ref, computed, onMounted, watch } from "vue";

import LeftSidebar from "./components/tools/LeftSidebar.vue";
import RightPanel from "./components/tools/RightPanel.vue";
import MessageBar from "./components/tools/MessageBar.vue";
import MainCanvas from "./components/tools/MainCanvas.vue";
import CbtToolLoader from "./components/tools/CBTToolLoader.vue";

// Temporary placeholder component for Reflective Practice
const ReflectiveCanvas = {
  props: ["mode"],
  template: `
    <div class="max-w-3xl mx-auto text-slate-700">
      <h2 class="text-2xl font-semibold mb-4">Reflective Practice</h2>
      <p class="mb-3 text-[15px] leading-relaxed">
        This is your space for reflection and professional self-work. You can write reflections,
        review previous entries, or view your Therapist Map.
      </p>
      <div class="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm">
        <textarea
          placeholder="Begin reflecting here..."
          class="w-full h-48 border border-[#d9dce1] rounded-md p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        ></textarea>
      </div>
    </div>
  `,
};

const isSidebarOpen = ref(false);
const isRightPanelOpen = ref(false);
const isDesktop = ref(false);

// Zoom + Session states
const isInSession = ref(false);
const isSyncing = ref(false);

// Active view modes
const activeView = ref("main"); // 'main' | 'cbt' | 'reflection'
const activeTool = ref(null);
const activeTemplate = ref(null);
const reflectionMode = ref("new");

// Load clients from localStorage, or use the default if nothing is saved yet
const clients = ref(
    JSON.parse(localStorage.getItem("helio_clients")) || [
      { id: 1, name: "Celia R.", note: "Parts work / relationship stress", archived: false },
    ]
);
// Whenever clients change, save them to localStorage
watch(
    clients,
    (newClients) => {
      localStorage.setItem("helio_clients", JSON.stringify(newClients));
    },
    { deep: true }
);
// Load resources from localStorage or use defaults
const resources = ref(
    JSON.parse(localStorage.getItem("helio_resources")) || [
      { id: 1, title: "Safe Calm Place (Audio)", type: "audio", url: "" },
      { id: 2, title: "Sensing Exercise (PDF)", type: "pdf", url: "" },
    ]
);
const handleAddResource = (newResourceData) => {
  const newResource = {
    id: Date.now(),
    title: newResourceData.title?.trim() || "Untitled Resource",
    type: newResourceData.type || "link",
    url: newResourceData.url || "",
    includeInExport: false,           // 👈 NEW: starts unselected for export
    createdAt: new Date().toISOString(), // (optional) helps with “Added today”
  };
  resources.value.push(newResource);
};

const toggleResourceExport = (resourceId, include) => {
  const item = resources.value.find(r => r.id === resourceId);
  if (item) item.includeInExport = include;
};


// Auto-save resources when changed
watch(
    resources,
    (newResources) => {
      localStorage.setItem("helio_resources", JSON.stringify(newResources));
    },
    { deep: true }
);


const archivedClients = ref([]);
const selectedClient = ref(clients.value[0]);

const sessionNotes = ref([]);

const handleSelectClient = (client) => {
  selectedClient.value = client;
  activeView.value = "main";
  if (!isDesktop.value) isSidebarOpen.value = false;
};
const handleAddClient = (newClientData) => {
  const newClient = {
    id: Date.now(),
    name: newClientData.name?.trim() || "Unnamed Client",
    note: newClientData.note || "",
    archived: false,
  };
  clients.value.push(newClient);
  selectedClient.value = newClient;
  activeView.value = "main";
};


// Sidebar event handlers
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



const openReflection = (mode) => {
  reflectionMode.value = mode;
  activeView.value = "reflection";
};

const joinZoom = () => {
  isInSession.value = true;
};
const endZoom = () => {
  isInSession.value = false;
};
const syncTranscript = async () => {
  if (!isInSession.value) return;
  isSyncing.value = true;
  try {
    // Placeholder for transcript sync logic
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    isSyncing.value = false;
  }
};

const handleMessageSubmit = (text) => {
  const value = text.trim();
  if (!value) return;
  sessionNotes.value.push({
    id: Date.now() + Math.random(),
    clientId: selectedClient.value?.id ?? null,
    text: value,
  });
};

const filteredNotes = computed(() =>
    selectedClient.value
        ? sessionNotes.value.filter((n) => n.clientId === selectedClient.value.id)
        : []
);

const toggleRightPanel = () => (isRightPanelOpen.value = !isRightPanelOpen.value);
const showClientMap = () => (activeView.value = "main");

const updateScreen = () => (isDesktop.value = window.innerWidth >= 768);
onMounted(() => {
  updateScreen();
  window.addEventListener("resize", updateScreen);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
