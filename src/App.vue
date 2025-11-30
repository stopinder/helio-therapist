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
          @select-client="handleSelectClient"
          @close-sidebar="isSidebarOpen = false"
          @open-tool="openTool"
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

          <div class="text-[18px] font-semibold tracking-tight text-[#2c3e50]">
            Therapist Workspace
          </div>
        </div>

        <!-- Right: controls -->
        <div class="flex items-center gap-3">
          <!-- Zoom controls (compact) -->
          <div class="flex items-center gap-2">
            <button
                v-if="!isInSession"
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition"
                @click="joinZoom"
            >
              Join Zoom
            </button>
            <button
                v-else
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-white bg-[#dc2626] hover:bg-[#b91c1c] transition"
                @click="endZoom"
            >
              End Session
            </button>
            <button
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
                @click="enterReflectionMode"
            >
              🧘 Reflective Practice
            </button>

            <button
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!isInSession || isSyncing"
                @click="syncTranscript"
            >
              <span v-if="isSyncing">Syncing…</span>
              <span v-else>Sync transcript</span>
            </button>
          </div>

          <!-- Client context (Right panel toggle) -->
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
        <!-- Show CBT templates dynamically -->
        <CbtToolLoader
            v-if="activeTool === 'cbt'"
            :template="activeTemplate"
            :session-id="activeZoomSessionId"
            @save="handleCbtSave"
        />

        <!-- Default view -->
        <MainCanvas
            v-else
            :selected-client="selectedClient"
            :session-notes="filteredNotes"
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
import { ref, computed, onMounted } from "vue";
import LeftSidebar from "./components/LeftSidebar.vue";
import RightPanel from "./components/RightPanel.vue";
import MessageBar from "./components/MessageBar.vue";
import MainCanvas from "./components/MainCanvas.vue";
import CBTToolLoader from "./components/tools/cbtToolLoader.vue";



const reflectionMode = ref(false);
const enterReflectionMode = () => {
  reflectionMode.value = true;
};

const isSidebarOpen = ref(false);
const isRightPanelOpen = ref(false);
const isDesktop = ref(false);
const showClientMap = (client) => {
  selectedClient.value = client;
};

const activeTool = ref(null);
const activeTemplate = ref(null);

const openTool = (payload) => {
  if (typeof payload === "object") {
    activeTool.value = payload.group;
    activeTemplate.value = payload.template;
  } else {
    activeTool.value = payload;
    activeTemplate.value = null;
  }
};

// NEW: Zoom state
const isInSession = ref(false);
const isSyncing = ref(false);
const activeZoomSessionId = ref(null);

// Screen/breakpoint tracking
const updateScreen = () => (isDesktop.value = window.innerWidth >= 768);

// Lifecycle
onMounted(() => {
  updateScreen();
  window.addEventListener("resize", updateScreen);
});

// --- CLIENT DATA ---
const clients = ref([
  { id: 1, name: "Celia R.", note: "Parts work / relationship stress", archived: false },
]);
const archivedClients = ref([]);
const selectedClient = ref(clients.value[0]);

const handleSelectClient = (client) => {
  selectedClient.value = client;
  if (!isDesktop.value) isSidebarOpen.value = false;
};

const sessionNotes = ref([]);
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

// Right panel toggle
const toggleRightPanel = () => (isRightPanelOpen.value = !isRightPanelOpen.value);

// Zoom handlers (placeholder)
const joinZoom = () => {
  isInSession.value = true;
  activeZoomSessionId.value = "zoom-123"; // temporary placeholder
};
const endZoom = () => {
  isInSession.value = false;
  activeZoomSessionId.value = null;
};
const syncTranscript = async () => {
  if (!isInSession.value) return;
  isSyncing.value = true;
  try {
    // TODO: backend sync later
  } finally {
    isSyncing.value = false;
  }
};

// CBT save handler
const handleCbtSave = (payload) => {
  console.log("CBT save:", payload);
};
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
