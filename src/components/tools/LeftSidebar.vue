<template>
  <aside
      class="fixed inset-y-0 left-0 flex flex-col bg-[#faf9f7] border-r border-[#e5e7eb] select-none w-64 h-full z-40 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0"
      :class="{ '-translate-x-full': !isSidebarOpen }"
  >
    <!-- Close button (mobile only) -->
    <button
        @click="$emit('close-sidebar')"
        class="absolute top-3 right-3 md:hidden text-gray-500 hover:text-gray-800"
        aria-label="Close sidebar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Therapist header -->
    <div class="h-16 flex items-center px-5 border-b border-[#e2e5ea] bg-[#fafbfc] mt-1">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-full bg-[#e2dcd4] flex items-center justify-center text-[14px] font-semibold text-[#2c3e50]">
          RO
        </div>
        <div class="flex flex-col leading-tight">
          <span class="text-[14px] font-semibold text-[#2c3e50]">Robert Ormiston</span>
          <span class="text-[12px] text-slate-500">Psychotherapist</span>
        </div>
      </div>
    </div>

    <!-- Sidebar Content -->
    <div class="flex-1 overflow-auto p-4 space-y-6">

      <!-- CLIENTS -->
      <SidebarGroup title="Clients" :defaultOpen="true">
        <div class="px-2 mb-2">
          <button
              class="w-full py-1.5 text-[13px] rounded-md bg-[#3f4754] text-white hover:bg-[#2f3540] transition"
              @click="showAddClientModal = true"
          >
            + Add Client
          </button>
        </div>

        <!-- Client List -->
        <div class="max-h-64 overflow-auto pr-1 space-y-1">
          <div
              v-for="client in clients"
              :key="client.id"
              class="relative group rounded-md"
          >
            <button
                class="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#f7f8fa] transition text-left"
                :class="{ 'bg-[#eef1f5]': selectedClient && client.id === selectedClient.id }"
                @click="select(client)"
            >
              <span
                  class="text-[14px] truncate"
                  :class="{
                  'font-semibold text-slate-800': selectedClient && client.id === selectedClient.id,
                  'text-slate-700': !selectedClient || client.id !== selectedClient.id,
                }"
              >
                {{ client.name }}
              </span>
            </button>
          </div>
        </div>

        <!-- Zoom Session Controls -->
        <div class="mt-4 border-t border-[#e4e7eb] pt-3 px-2 space-y-2">
          <div class="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
            Session Controls
          </div>
          <button
              v-if="!isInSession"
              class="w-full text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition"
              @click="$emit('join-zoom')"
          >
            Join Zoom Session
          </button>
          <button
              v-else
              class="w-full text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-white bg-[#dc2626] hover:bg-[#b91c1c] transition"
              @click="$emit('end-zoom')"
          >
            End Session
          </button>
          <button
              class="w-full text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!isInSession || isSyncing"
              @click="$emit('sync-transcript')"
          >
            <span v-if="isSyncing">Syncing…</span>
            <span v-else>Sync Transcript</span>
          </button>
        </div>
      </SidebarGroup>

      <!-- REFLECTIVE PRACTICE -->
      <SidebarGroup title="Reflective Practice" :defaultOpen="false">
        <div class="sidebar-section px-3 space-y-1.5">
          <button class="sidebar-btn" @click="$emit('open-reflection', 'new')">🧘 New Reflection</button>
          <button class="sidebar-btn" @click="$emit('open-reflection', 'past')">📘 Past Reflections</button>
          <button class="sidebar-btn" @click="$emit('open-reflection', 'map')">🗺 Therapist Map</button>
        </div>
      </SidebarGroup>

      <!-- TOOLS -->
      <SidebarGroup title="Tools" :defaultOpen="false">
        <div class="space-y-3">

          <SidebarGroup title="IFS Tools" :defaultOpen="false">
            <div class="space-y-1.5 px-3">
              <button class="sidebar-btn" @click="$emit('open-tool', { group: 'ifs', template: 'parts-map' })">
                Parts Map
              </button>
              <button class="sidebar-btn" @click="$emit('open-tool', { group: 'ifs', template: 'self-energy' })">
                Self-Energy Exercise
              </button>
            </div>
          </SidebarGroup>

          <SidebarGroup title="EMDR Tools" :defaultOpen="false">
            <div class="space-y-1.5 px-3">
              <button class="sidebar-btn" @click="$emit('open-tool', { group: 'emdr', template: 'target-log' })">
                Target Log
              </button>
              <button class="sidebar-btn" @click="$emit('open-tool', { group: 'emdr', template: 'cognitive' })">
                Cognitive Interweave
              </button>
            </div>
          </SidebarGroup>

          <SidebarGroup title="CBT Templates" :defaultOpen="false">
            <div class="space-y-1.5 px-3">
              <button
                  v-for="item in cbtItems"
                  :key="item.key"
                  class="sidebar-btn"
                  :class="{ 'bg-[#eef1f5] font-semibold': activeTemplate === item.key }"
                  @click="$emit('open-tool', { group: 'cbt', template: item.key })"
              >
                {{ item.label }}
              </button>
            </div>
          </SidebarGroup>
        </div>
      </SidebarGroup>

      <!-- EXPORT CENTRE -->
      <SidebarGroup title="Export Centre">
        <div v-if="resources.length" class="px-3 space-y-1.5">
          <div
              v-for="res in resources"
              :key="res.id"
              class="flex items-center justify-between text-[13px] py-1 border-b border-[#f1f3f5]"
          >
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                  type="checkbox"
                  class="accent-[#2563eb]"
                  v-model="res.includeInExport"
                  @change="$emit('toggle-resource-export', res.id, res.includeInExport)"
              />
              <span>{{ res.title }}</span>
            </label>
          </div>
        </div>
        <div v-else class="px-3 text-[13px] text-slate-400 italic py-2">
          No resources to export yet
        </div>
      </SidebarGroup>

      <!-- RESOURCES -->
      <SidebarGroup title="Resources">
        <div class="px-3 mb-2">
          <button class="sidebar-btn primary" @click="showAddResourceModal = true">
            + Add Resource
          </button>
        </div>
        <div v-if="resources.length" class="space-y-1.5 px-3">
          <button
              v-for="res in resources"
              :key="res.id"
              class="sidebar-btn"
              @click="openResource(res)"
          >
            {{ res.title }}
          </button>
        </div>
        <div v-else class="px-3 text-[13px] text-slate-400 italic">
          No resources added yet
        </div>
      </SidebarGroup>
    </div>

    <!-- Modals -->
    <AddClientModal
        v-if="showAddClientModal"
        @close="showAddClientModal = false"
        @submit="submitNewClient"
    />
    <AddResourceModal
        v-if="showAddResourceModal"
        @close="showAddResourceModal = false"
        @submit="submitNewResource"
    />
    <ArchiveClientModal
        v-if="showArchiveModal"
        @close="showArchiveModal = false"
        @confirm="archiveNow"
    />
    <ResourcePreviewModal
        :open="showPreviewModal"
        :resource="selectedResource"
        @close="showPreviewModal = false"
        @export="handleExportResource"
    />
  </aside>
</template>

<script setup>
import ResourcePreviewModal from "../sidebar/ResourcePreviewModal.vue"
import SidebarGroup from "../sidebar/SidebarGroup.vue"
import AddClientModal from "../sidebar/AddClientModal.vue"
import AddResourceModal from "../sidebar/AddResourceModal.vue"
import ArchiveClientModal from "../sidebar/ArchiveClientModal.vue"
import { ref } from "vue"

const props = defineProps({
  clients: Array,
  archivedClients: Array,
  selectedClient: Object,
  resources: Array,
  isSidebarOpen: { type: Boolean, default: true },
  activeTemplate: String,
  isInSession: Boolean,
  isSyncing: Boolean
})

const emit = defineEmits([
  "add-client",
  "add-resource",
  "archive-client",
  "restore-client",
  "select-client",
  "close-sidebar",
  "open-tool",
  "join-zoom",
  "end-zoom",
  "sync-transcript",
  "open-reflection"
])

const cbtItems = [
  { key: "thought", label: "Thought Record" },
  { key: "behavioural", label: "Behavioural Activation" },
  { key: "core", label: "Core Belief Worksheet" },
  { key: "problem", label: "Problem Solving" },
  { key: "exposure", label: "Exposure Hierarchy" }
]

const showAddClientModal = ref(false)
const showAddResourceModal = ref(false)
const showArchiveModal = ref(false)
const clientToArchive = ref(null)
const menuOpenFor = ref(null)
const showPreviewModal = ref(false)
const selectedResource = ref(null)

const select = (client) => {
  emit("select-client", client)
  menuOpenFor.value = null
}
const submitNewClient = (data) => {
  emit("add-client", data)
  showAddClientModal.value = false
}
const submitNewResource = (data) => {
  emit("add-resource", data)
  showAddResourceModal.value = false
}
const confirmArchive = (client) => {
  clientToArchive.value = client
  showArchiveModal.value = true
  menuOpenFor.value = null
}
const archiveNow = () => {
  if (clientToArchive.value) emit("archive-client", clientToArchive.value)
  showArchiveModal.value = false
  clientToArchive.value = null
}
const openResource = (res) => {
  selectedResource.value = res
  showPreviewModal.value = true
}
const handleExportResource = (res) => {
  alert(`Exporting resource: ${res.title}`)
}
</script>

