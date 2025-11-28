<template>
  <div class="flex h-screen bg-[#f5f7fa] text-[#2c3e50] overflow-hidden relative">
    <!-- Mobile overlay background -->
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
          class="fixed md:static top-0 left-0 h-full w-64 bg-white shadow-md z-40 md:z-auto shrink-0"
          :clients="clients"
          :selected-client="selectedClient"
          @select-client="handleSelectClient"
      />
    </transition>

    <!-- Main area -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Top header -->
      <header
          class="h-14 flex items-center justify-between px-4 md:px-6 border-b border-[#d9dce1] bg-white shadow-sm"
      >
        <div class="flex items-center gap-3">
          <!-- Hamburger (mobile only) -->
          <button
              class="md:hidden text-[20px] font-semibold text-[#2c3e50]"
              @click="isSidebarOpen = !isSidebarOpen"
          >
            ☰
          </button>
          <div class="text-[18px] font-semibold tracking-tight text-[#2c3e50]">
            Therapist Workspace
          </div>
        </div>

        <!-- Right: Button group -->
        <div class="flex items-center gap-3">
          <button
              class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
              @click="toggleRightPanel"
          >
            Client context
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
          >
            🗓
          </button>

          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
          >
            ⚙️
          </button>
        </div>
      </header>

      <!-- Central canvas area -->
      <main class="flex-1 overflow-auto p-4 md:p-6">
        <MainCanvas
            :selected-client="selectedClient"
            :session-notes="filteredNotes"
        />
      </main>

      <!-- Message bar -->
      <footer
          class="border-t border-[#d9dce1] bg-white shadow-inner px-4 md:px-6 py-3 md:py-4"
      >
        <MessageBar @submit="handleMessageSubmit" />
      </footer>
    </div>

    <!-- Right slide-in panel (toggleable on all screens) -->
    <RightPanel
        :selected-client="selectedClient"
        :open="isRightPanelOpen"
        @close="isRightPanelOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import LeftSidebar from "./components/LeftSidebar.vue";
import RightPanel from "./components/RightPanel.vue";
import MessageBar from "./components/MessageBar.vue";
import MainCanvas from "./components/MainCanvas.vue";

// Layout state
const isSidebarOpen = ref(false);
const isRightPanelOpen = ref(true);
const isDesktop = ref(false);

const updateScreen = () => {
  isDesktop.value = window.innerWidth >= 768;
};
onMounted(() => {
  updateScreen();
  window.addEventListener("resize", updateScreen);
});
let startX = 0;
let currentX = 0;

const handleTouchStart = (e) => {
  startX = e.touches[0].clientX;
};
const handleTouchMove = (e) => {
  currentX = e.touches[0].clientX;
};
const handleTouchEnd = () => {
  const diff = currentX - startX;
  if (startX < 30 && diff > 50) {
    // Swipe right from left edge
    isSidebarOpen.value = true;
  } else if (diff < -50 && isSidebarOpen.value) {
    // Swipe left to close
    isSidebarOpen.value = false;
  }
  startX = 0;
  currentX = 0;
};

onMounted(() => {
  window.addEventListener("touchstart", handleTouchStart);
  window.addEventListener("touchmove", handleTouchMove);
  window.addEventListener("touchend", handleTouchEnd);
});

// Clients
const clients = ref([
  {
    id: 1,
    name: "Celia R.",
    email: "",
    note: "Parts work / relationship stress",
    archived: false,
  },
]);

const archivedClients = ref([]);
const selectedClient = ref(clients.value[0]);

const addClient = (data) => {
  const newClient = {
    id: Date.now(),
    name: data.name,
    email: data.email,
    note: data.note,
    archived: false,
  };
  clients.value.push(newClient);
  selectedClient.value = newClient;
};

const archiveClient = (client) => {
  clients.value = clients.value.filter((c) => c.id !== client.id);
  client.archived = true;
  archivedClients.value.push(client);
  if (selectedClient.value?.id === client.id) selectedClient.value = null;
};

const restoreClient = (client) => {
  archivedClients.value = archivedClients.value.filter(
      (c) => c.id !== client.id
  );
  client.archived = false;
  clients.value.push(client);
};

const handleSelectClient = (client) => {
  selectedClient.value = client;
  if (!isDesktop.value) isSidebarOpen.value = false; // auto-close on mobile
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

const filteredNotes = computed(() => {
  if (!selectedClient.value) return [];
  return sessionNotes.value.filter(
      (note) => note.clientId === selectedClient.value.id
  );
});

const toggleRightPanel = () => {
  isRightPanelOpen.value = !isRightPanelOpen.value;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
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
