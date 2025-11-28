<template>
  <div class="flex h-screen bg-[#f5f7fa] text-[#2c3e50]">
    <!-- Left Sidebar -->
    <LeftSidebar
        class="shrink-0"
        :clients="clients"
        :selected-client="selectedClient"
        @select-client="handleSelectClient"
    />

    <!-- Main area -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Top header -->
      <header class="h-14 flex items-center justify-between px-6 border-b border-[#d9dce1] bg-white shadow-sm">
        <div class="text-[17px] font-semibold">
          Therapist Workspace
        </div>
        <div class="flex items-center gap-4">
          <!-- Toggle right panel -->
          <button
              class="text-[13px] px-3 py-1 rounded border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa]"
              @click="toggleRightPanel"
          >
            Client context
          </button>
          <button class="text-[#3f4754] hover:text-black">🗓</button>
          <button class="text-[#3f4754] hover:text-black">⚙️</button>
        </div>
      </header>

      <!-- Central canvas area -->
      <main class="flex-1 overflow-auto p-6">
        <MainCanvas
            :selected-client="selectedClient"
            :session-notes="filteredNotes"
        />
      </main>

      <!-- Message bar -->
      <footer class="border-t border-[#d9dce1] bg-white shadow-inner px-6 py-4">
        <MessageBar @submit="handleMessageSubmit" />
      </footer>
    </div>

    <!-- Right slide-in panel -->
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

// Mock clients – centralised here
const clients = [
  {
    id: 1,
    name: "Celia R.",
    lastSeen: "Today",
    note: "Parts work / relationship stress",
  },
  {
    id: 2,
    name: "Fabian L.",
    lastSeen: "Tomorrow",
    note: "ADHD, overwhelm, shame",
  },
  {
    id: 3,
    name: "Zala K.",
    lastSeen: "This week",
    note: "Trauma history, nervous system work",
  },
];

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

