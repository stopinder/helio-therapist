<template>
  <div class="flex h-screen bg-[#f5f7fa] text-[#2c3e50] overflow-hidden">
    <!-- Left Sidebar (hidden on mobile, visible from md up) -->
    <LeftSidebar
        class="shrink-0"
        :clients="clients"
        :selected-client="selectedClient"
        @select-client="handleSelectClient"
    />

    <!-- Main area -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Top header -->
      <header
          class="h-14 flex items-center justify-between px-4 md:px-6 border-b border-[#d9dce1] bg-white shadow-sm"
      >
        <!-- Left: Title -->
        <div class="flex items-center gap-2">
          <div class="text-[18px] font-semibold tracking-tight text-[#2c3e50]">
            Therapist Workspace
          </div>
        </div>

        <!-- Right: Button group -->
        <div class="flex items-center gap-3">
          <!-- Toggle right panel -->
          <button
              class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
              @click="toggleRightPanel"
          >
            Client context
          </button>

          <!-- Calendar icon -->
          <button
              class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition text-[15px]"
          >
            🗓
          </button>

          <!-- Settings icon -->
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
      <footer class="border-t border-[#d9dce1] bg-white shadow-inner px-4 md:px-6 py-3 md:py-4">
        <MessageBar @submit="handleMessageSubmit" />
      </footer>
    </div>

    <!-- Right slide-in panel (hidden on mobile) -->
    <RightPanel
        :selected-client="selectedClient"
        :open="isRightPanelOpen"
        @close="isRightPanelOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

import LeftSidebar from "./components/LeftSidebar.vue";
import RightPanel from "./components/RightPanel.vue";
import MessageBar from "./components/MessageBar.vue";
import MainCanvas from "./components/MainCanvas.vue";

// ACTIVE CLIENTS
const clients = ref([
  {
    id: 1,
    name: "Celia R.",
    email: "",
    note: "Parts work / relationship stress",
    archived: false,
  },
]);

// ARCHIVED CLIENTS
const archivedClients = ref([]);

// ADD CLIENT
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

// ARCHIVE CLIENT (soft delete)
const archiveClient = (client) => {
  clients.value = clients.value.filter((c) => c.id !== client.id);
  client.archived = true;
  archivedClients.value.push(client);

  if (selectedClient.value?.id === client.id) {
    selectedClient.value = null;
  }
};

// RESTORE CLIENT
const restoreClient = (client) => {
  archivedClients.value = archivedClients.value.filter(
      (c) => c.id !== client.id
  );
  client.archived = false;
  clients.value.push(client);
};


const selectedClient = ref(clients[0]);

// Right panel open state
const isRightPanelOpen = ref(true);

const toggleRightPanel = () => {
  isRightPanelOpen.value = !isRightPanelOpen.value;
};

// Simple in-memory notes, associated with clients
// shape: { id, clientId, text }
const sessionNotes = ref([]);

// Select a client from the sidebar
const handleSelectClient = (client) => {
  selectedClient.value = client;
};

// Handle input from the message bar
const handleMessageSubmit = (text) => {
  const value = text.trim();
  if (!value) return;

  sessionNotes.value.push({
    id: Date.now() + Math.random(), // simple unique-ish id
    clientId: selectedClient.value ? selectedClient.value.id : null,
    text: value,
  });
};

// Only show notes for the currently selected client
const filteredNotes = computed(() => {
  if (!selectedClient.value) return [];
  return sessionNotes.value.filter(
      (note) => note.clientId === selectedClient.value.id,
  );
});
</script>
