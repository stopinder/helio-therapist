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
        <div
            class="h-9 w-9 rounded-full bg-[#e2dcd4] flex items-center justify-center text-[14px] font-semibold text-[#2c3e50]"
        >
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
        <div class="sidebar-section">
          <div class="sidebar-section-title">Reflective Practice</div>
          <div class="px-3 space-y-1.5">
            <button class="sidebar-btn" @click="$emit('open-reflection', 'new')">🧘 New Reflection</button>
            <button class="sidebar-btn" @click="$emit('open-reflection', 'past')">📘 Past Reflections</button>
            <button class="sidebar-btn" @click="$emit('open-reflection', 'map')">🗺 Therapist Map</button>
          </div>
        </div>
      </SidebarGroup>


      <!-- TOOLS -->
      <SidebarGroup title="Tools" :defaultOpen="false">
        <div class="space-y-3">

          <!-- IFS -->
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

          <!-- EMDR -->
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

          <!-- CBT -->
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
                  @change="emit('toggle-resource-export', res.id, res.includeInExport)"
              />
              <span>{{ res.title }}</span>
            </label>
          </div>

          <!-- buttons under the list -->
          <div class="flex justify-end gap-2 pt-2 border-t border-[#e5e7eb]">
            <button
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] hover:bg-[#f5f7fa] transition"
                @click="exportAll"
            >
              Export All
            </button>
            <button
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-red-600 hover:bg-[#f5f7fa] transition"
                @click="clearAllExports"
            >
              Clear All
            </button>
          </div>
        </div>

        <div v-else class="px-3 text-[13px] text-slate-400 italic py-2">
          No resources to export yet
        </div>
      </SidebarGroup>



      <!-- RESOURCES -->
      <SidebarGroup title="Resources">
        <div class="sidebar-section">
          <div class="sidebar-section-title">Resources</div>

          <div class="px-3 mb-2">
            <button
                class="sidebar-btn primary"
                @click="showAddResourceModal = true"
            >
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
        </div>
      </SidebarGroup>




    </div>

    <!-- Add Client Modal -->
    <AddClientModal
        v-if="showAddClientModal"
        @close="showAddClientModal = false"
        @submit="submitNewClient"
    />

    <!-- Add Resource Modal -->
    <AddResourceModal
        v-if="showAddResourceModal"
        @close="showAddResourceModal = false"
        @submit="submitNewResource"
    />

    <!-- Archive Modal -->
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
import logoImage from "../../assets/chrysalis-logo.png";


import ResourcePreviewModal from "../sidebar/ResourcePreviewModal.vue";

import { ref } from "vue";
import SidebarGroup from "../sidebar/SidebarGroup.vue";
import AddClientModal from "../sidebar/AddClientModal.vue";
import AddResourceModal from "../sidebar/AddResourceModal.vue";
import ArchiveClientModal from "../sidebar/ArchiveClientModal.vue";
import { jsPDF } from "jspdf";

const props = defineProps({
  clients: Array,
  archivedClients: Array,
  selectedClient: Object,
  resources: Array, // 👈 new prop
  isSidebarOpen: { type: Boolean, default: true },
  activeTemplate: String,
  isInSession: Boolean,
  isSyncing: Boolean
});

const emit = defineEmits([
  "add-client",
  "add-resource", // 👈 new event
  "archive-client",
  "restore-client",
  "select-client",
  "close-sidebar",
  "open-tool",
  "join-zoom",
  "end-zoom",
  "sync-transcript",
  "open-reflection"

]);

const cbtItems = [
  { key: "thought", label: "Thought Record" },
  { key: "behavioural", label: "Behavioural Activation" },
  { key: "core", label: "Core Belief Worksheet" },
  { key: "problem", label: "Problem Solving" },
  { key: "exposure", label: "Exposure Hierarchy" }
];

const showAddClientModal = ref(false);
const showAddResourceModal = ref(false);
const showArchiveModal = ref(false);
const clientToArchive = ref(null);
const menuOpenFor = ref(null);

const openMenu = (client) => {
  menuOpenFor.value = menuOpenFor.value === client.id ? null : client.id;
};
const confirmArchive = (client) => {
  clientToArchive.value = client;
  showArchiveModal.value = true;
  menuOpenFor.value = null;
};
const archiveNow = () => {
  if (clientToArchive.value) emit("archive-client", clientToArchive.value);
  showArchiveModal.value = false;
  clientToArchive.value = null;
};
const submitNewClient = (data) => {
  emit("add-client", data);
  showAddClientModal.value = false;
};
const submitNewResource = (data) => {
  emit("add-resource", data);
  showAddResourceModal.value = false;
};
const select = (client) => {
  emit("select-client", client);
  menuOpenFor.value = null;
};
const showPreviewModal = ref(false);
const selectedResource = ref(null);

const openResource = (res) => {
  selectedResource.value = res;
  showPreviewModal.value = true;
};

const getIcon = (type) => {
  switch (type) {
    case "audio":
      return "🎧";
    case "video":
      return "🎥";
    case "pdf":
      return "📄";
    case "link":
    default:
      return "🔗";
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case "audio":
      return "Audio file";
    case "video":
      return "Video file";
    case "pdf":
      return "PDF document";
    case "link":
    default:
      return "External link";
  }
};
const formatDate = (iso) => {
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 1) return "Added today";
  if (diff < 2) return "Added yesterday";
  if (diff < 7) return `Added ${Math.floor(diff)} days ago`;
  return `Added on ${date.toLocaleDateString()}`;
};
const handleExportResource = (res) => {
  alert(`Exporting resource: ${res.title}`);
  // Later, this can bundle into PDF/ZIP via Export Centre
};
const exportAll = () => {
  const selected = props.resources.filter(r => r.includeInExport);
  if (!selected.length) {
    alert("No resources selected for export.");
    return;
  }

  const doc = new jsPDF();
  const downloadSelectedResources = () => {
    const selected = props.resources?.filter(r => r.selected && r.url);
    if (!selected?.length) {
      alert("No resources selected for download.");
      return;
    }

    selected.forEach((res, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = res.url;
        link.download = res.title || `resource-${index + 1}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.click();
      }, index * 300); // gentle stagger for browser stability
    });
  };


  // === HEADER (your current header + logo stays as-is if you already have it) ===
  // If you have addImage above, keep it. Otherwise ignore.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
      "Clinical EMDR-Informed IFS Psychotherapy and Counselling",
      20, 20,
      { maxWidth: 170 }
  );

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Chrysalis Therapy Services", 20, 30);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Therapist: Robert Ormiston", 20, 38);

  const date = new Date().toLocaleDateString();
  doc.text(`Date: ${date}`, 20, 44);

  doc.setDrawColor(180);
  doc.line(20, 48, 190, 48);

  // === MAIN SECTION ===
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.text(`Selected Resources (${selected.length})`, 20, 58);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 68;

  selected.forEach((r, index) => {
    const typeLabel =
        r.type === "audio" ? "Audio file" :
            r.type === "video" ? "Video file" :
                r.type === "pdf"   ? "PDF document" : "Link";

    const line = `${index + 1}. ${r.title} — ${typeLabel}`;
    doc.text(line, 25, y);
    y += 8;

    // New page if near bottom
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  // === FOOTER CONTACT + PAGE NUMBERS ON EVERY PAGE ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // contact info (left)
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("emdrifs@robormiston.com", 20, 290);

    // page number (right)
    doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: "right" });

    // light line above footer
    doc.setDrawColor(220);
    doc.line(20, 285, 190, 285);
  }

  // Save file
  doc.save(`chrysalis-resources-${new Date().toISOString().slice(0, 10)}.pdf`);
};





const clearAllExports = () => {
  props.resources.forEach(r => (r.includeInExport = false));
};





</script>


