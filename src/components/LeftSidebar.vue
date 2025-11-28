<template>
  <aside
      class="hidden md:flex md:w-64 bg-white border-r border-[#d9dce1] flex-col select-none"
  >
    <!-- Therapist header -->
    <div class="h-16 flex items-center px-5 border-b border-[#e2e5ea] bg-[#fafbfc]">
      <div class="flex items-center gap-3">
        <div
            class="h-9 w-9 rounded-full bg-[#e2dcd4] flex items-center justify-center text-[14px] font-semibold text-[#2c3e50]"
        >
          RO
        </div>
        <div class="flex flex-col leading-tight">
          <span class="text-[14px] font-semibold text-[#2c3e50]">
            Robert Ormiston
          </span>
          <span class="text-[12px] text-slate-500">
            Psychotherapist
          </span>
        </div>
      </div>
    </div>

    <!-- Sidebar Content -->
    <div class="flex-1 overflow-auto p-4 space-y-6">

      <!-- NAVIGATION -->
      <SidebarGroup title="Navigation" :initiallyOpen="true">
        <div class="space-y-1.5 px-2">
          <button class="sidebar-btn">Dashboard</button>
          <button class="sidebar-btn">Calendar</button>
          <button class="sidebar-btn">Sessions</button>
          <button class="sidebar-btn">Resources</button>
        </div>
      </SidebarGroup>

      <!-- CLIENTS -->
      <SidebarGroup title="Clients" :initiallyOpen="true">
        <!-- Add Client Button -->
        <div class="px-2 mb-2">
          <button
              class="w-full py-1.5 text-[13px] rounded-md bg-[#3f4754] text-white hover:bg-[#2f3540] transition"
              @click="showAddClientModal = true"
          >
            + Add Client
          </button>
        </div>

        <!-- Client List (scrollable) -->
        <div class="max-h-64 overflow-auto pr-1 space-y-1">
          <div
              v-for="client in clients"
              :key="client.id"
              class="relative group rounded-md"
          >
            <button
                class="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#f7f8fa] transition text-left"
                :class="{
                'bg-[#eef1f5]':
                  selectedClient && client.id === selectedClient.id
              }"
                @click="select(client)"
            >
              <span
                  class="text-[14px] truncate"
                  :class="{
                  'font-semibold text-[#2c3e50]':
                    selectedClient && client.id === selectedClient.id,
                  'text-[#3f4754]':
                    !selectedClient || client.id !== selectedClient.id
                }"
              >
                {{ client.name }}
              </span>

              <!-- ⋮ menu trigger -->
              <span
                  class="opacity-0 group-hover:opacity-100 transition text-[16px] px-1"
                  @click.stop="openMenu(client)"
              >
                ⋮
              </span>
            </button>

            <!-- Action Menu -->
            <div
                v-if="menuOpenFor === client.id"
                class="absolute right-2 top-9 bg-white border border-[#d9dce1] rounded-md shadow-lg text-[13px] z-50"
            >
              <button
                  class="block w-full text-left px-3 py-2 hover:bg-[#f5f5f7]"
                  @click="confirmArchive(client)"
              >
                Archive client
              </button>
            </div>
          </div>
        </div>
      </SidebarGroup>

      <!-- ARCHIVED CLIENTS -->
      <SidebarGroup title="Archived Clients">
        <div class="max-h-48 overflow-auto pr-1 space-y-1 px-1">
          <div
              v-for="client in archivedClients"
              :key="client.id"
              class="px-3 py-2 rounded-md hover:bg-[#f7f8fa] transition cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <span class="text-[14px] text-slate-500 italic truncate">
                {{ client.name }}
              </span>

              <button
                  class="text-[12px] text-[#2563eb] hover:underline"
                  @click.stop="restoreClient(client)"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      </SidebarGroup>

      <!-- EXPORT CENTRE -->
      <SidebarGroup title="Export Centre">
        <div class="px-3 space-y-1.5">
          <button class="sidebar-btn">Export Session Summary (PDF)</button>
          <button class="sidebar-btn">Export Client Pack</button>
          <button class="sidebar-btn">Export All Data</button>
        </div>
      </SidebarGroup>

      <!-- TOOLS -->
      <SidebarGroup title="Tools">
        <div class="px-3 space-y-1.5">
          <button class="sidebar-btn">IFS Quick Tools</button>
          <button class="sidebar-btn">EMDR Tools</button>
          <button class="sidebar-btn">CBT Templates</button>
        </div>
      </SidebarGroup>

      <!-- RESOURCES -->
      <SidebarGroup title="Resources">
        <div class="px-3 space-y-1.5">
          <button class="sidebar-btn">Worksheets</button>
          <button class="sidebar-btn">Audio Exercises</button>
          <button class="sidebar-btn">Videos</button>
        </div>
      </SidebarGroup>

    </div>

    <!-- Add Client Modal -->
    <AddClientModal
        v-if="showAddClientModal"
        @close="showAddClientModal = false"
        @submit="submitNewClient"
    />

    <!-- Archive Modal -->
    <ArchiveClientModal
        v-if="showArchiveModal"
        @close="showArchiveModal = false"
        @confirm="archiveNow"
    />
  </aside>
</template>

<script setup>
import { ref } from "vue";
import SidebarGroup from "./sidebar/SidebarGroup.vue";
import AddClientModal from "./sidebar/AddClientModal.vue";
import ArchiveClientModal from "./sidebar/ArchiveClientModal.vue";

const props = defineProps({
  clients: {
    type: Array,
    default: () => [],
  },
  archivedClients: {
    type: Array,
    default: () => [],
  },
  selectedClient: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  "add-client",
  "archive-client",
  "restore-client",
  "select-client",
]);

// Modal state
const showAddClientModal = ref(false);
const showArchiveModal = ref(false);

// Temp storage for archive target
const clientToArchive = ref(null);

// Menu open state
const menuOpenFor = ref(null);

const openMenu = (client) => {
  menuOpenFor.value =
      menuOpenFor.value === client.id ? null : client.id;
};

const confirmArchive = (client) => {
  clientToArchive.value = client;
  showArchiveModal.value = true;
  menuOpenFor.value = null;
};

const archiveNow = () => {
  if (clientToArchive.value) {
    emit("archive-client", clientToArchive.value);
  }
  showArchiveModal.value = false;
  clientToArchive.value = null;
};

const submitNewClient = (data) => {
  emit("add-client", data);
  showAddClientModal.value = false;
};

const select = (client) => {
  emit("select-client", client);
  // close any open menu when you select
  menuOpenFor.value = null;
};

const restoreClient = (client) => {
  emit("restore-client", client);
};
</script>

<style scoped>
.sidebar-btn {
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 6px;
  transition: 0.15s;
  border: 1px solid transparent;
}
.sidebar-btn:hover {
  background: #f7f8fa;
  border-color: #d9dce1;
}
</style>
