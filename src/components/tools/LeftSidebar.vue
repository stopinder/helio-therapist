<template>
  <aside
      class="flex flex-col bg-sidebar border-r border-border-muted select-none w-64 h-full z-40"
  >
    <!-- Therapist header -->
    <div class="h-16 flex items-center justify-between px-5 border-b border-border-muted bg-surface-subtle mt-1 shrink-0">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-pill bg-avatar flex items-center justify-center text-body font-semibold text-ink">
          RO
        </div>
        <div class="flex flex-col leading-tight">
          <span class="text-body font-semibold text-ink">Robert Ormiston</span>
          <span class="text-caption text-ink-muted">Psychotherapist</span>
        </div>
      </div>
      <!-- Close Button for Mobile -->
      <button
          class="md:hidden p-2 text-ink-subtle hover:text-ink-secondary transition-colors duration-standard ease-out"
          @click="$emit('close-sidebar')"
          aria-label="Close menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Sidebar Content -->
    <div class="flex-1 overflow-auto p-stack-lg space-y-stack-xl">
      <nav class="space-y-stack-xs">
        <button
            v-for="item in navItems"
            :key="item"
            @click="$emit('update:selected-nav', item)"
            class="w-full flex items-center px-inline-md py-stack-sm rounded-control transition-colors duration-standard ease-out text-left text-body"
            :class="selectedNav === item ? 'bg-state-selected font-semibold text-ink' : 'text-ink-secondary hover:bg-surface-subtle'"
        >
          {{ item }}
        </button>
      </nav>

      <div v-if="false && selectedNav === 'Clients'" class="pt-4 border-t border-border-muted space-y-6">
        <!-- CLIENTS -->
        <SidebarGroup title="Clients" :defaultOpen="true">
          <div class="px-2 mb-2">
            <button
                class="w-full py-1.5 text-body-sm rounded-control bg-action-primary text-on-action hover:bg-action-primary-hover transition-colors duration-standard ease-out"
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
                class="relative group rounded-control"
            >
              <button
                  class="w-full flex items-center justify-between px-3 py-2 rounded-control hover:bg-surface-subtle transition-colors duration-standard ease-out text-left"
                  :class="{ 'bg-state-selected': selectedClient && client.id === selectedClient.id }"
                  @click="select(client)"
              >
                <span
                    class="text-body truncate"
                    :class="{
                    'font-semibold text-ink': selectedClient && client.id === selectedClient.id,
                    'text-ink-secondary': !selectedClient || client.id !== selectedClient.id,
                  }"
                >
                  {{ client.name }}
                </span>
              </button>
            </div>
          </div>

          <!-- Zoom Session Controls -->
          <div class="mt-4 border-t border-border-muted pt-3 px-2 space-y-2">
            <div class="text-caption font-semibold text-ink-secondary uppercase tracking-wide">
              Session Controls
            </div>
            <button
                v-if="!isInSession"
                class="w-full text-body-sm px-3 py-1.5 rounded-control border border-border text-on-action bg-action-link hover:bg-action-link-hover transition-colors duration-standard ease-out"
                @click="$emit('join-zoom')"
            >
              Join Zoom Session
            </button>
            <button
                v-else
                class="w-full text-body-sm px-3 py-1.5 rounded-control border border-border text-on-action bg-state-danger hover:bg-state-danger transition-colors duration-standard ease-out"
                @click="$emit('end-zoom')"
            >
              End Session
            </button>
            <button
                class="w-full text-body-sm px-3 py-1.5 rounded-control border border-border text-ink-secondary bg-surface-elevated hover:bg-surface-subtle transition-colors duration-standard ease-out disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      <!-- TOOLS -->
      <SidebarGroup v-if="false" title="Tools" :defaultOpen="false">
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
                  :class="{ 'bg-state-selected font-semibold': activeTemplate === item.key }"
                  @click="$emit('open-tool', { group: 'cbt', template: item.key })"
              >
                {{ item.label }}
              </button>
            </div>
          </SidebarGroup>
        </div>
      </SidebarGroup>

      <!-- EXPORT CENTRE -->
      <SidebarGroup v-if="false" title="Export Centre">
        <div v-if="resources.length" class="px-3 space-y-1.5">
          <div
              v-for="res in resources"
              :key="res.id"
              class="flex items-center justify-between text-body-sm py-1 border-b border-border-muted"
          >
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                  type="checkbox"
                  class="accent-[var(--action-link)]"
                  v-model="res.includeInExport"
                  @change="$emit('toggle-resource-export', res.id, res.includeInExport)"
              />
              <span>{{ res.title }}</span>
            </label>
          </div>
        </div>
        <div v-else class="px-3 text-body-sm text-ink-subtle italic py-2">
          No resources to export yet
        </div>
      </SidebarGroup>

      <!-- RESOURCES -->
      <SidebarGroup v-if="false" title="Resources">
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
        <div v-else class="px-3 text-body-sm text-ink-subtle italic">
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
  isSyncing: Boolean,
  selectedNav: String
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
  "open-reflection",
  "update:selected-nav"
])

const navItems = ["Today", "Clients", "Inbox", "Reflections", "Settings"]

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
