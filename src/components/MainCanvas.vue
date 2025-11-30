<!-- src/components/MainCanvas.vue -->
<template>T
  <div class="space-y-8">
    <!-- Client / session header -->
    <div class="border border-[#d1d5db] bg-white rounded-lg p-6 shadow-sm">
      <h2 class="text-[18px] font-semibold tracking-tight text-[#2c3e50]">
        <span v-if="selectedClient">
          Session Workspace — {{ selectedClient.name }}
        </span>
        <ClientMap v-if="currentView === 'map'" :client="selectedClient" />
        <TherapistMap v-if="currentView === 'therapistMap'" />

        <span v-else>
          Session Workspace
        </span>
      </h2>
      <p class="mt-2 text-[14px] text-slate-600 leading-relaxed">
        <span v-if="selectedClient">
          {{ selectedClient.note }}
        </span>
        <span v-else>
          Select a client from the left sidebar to begin.
        </span>
      </p>
    </div>
    <CbtTemplate
        v-if="activeTool === 'cbt'"
        :session-id="activeZoomSessionId"
        @save="handleCbtSave"
    />

    <!-- Notes block -->
    <div class="border border-[#d1d5db] bg-white rounded-lg p-6 shadow-sm">
      <h3 class="text-[16px] font-semibold tracking-tight text-[#2c3e50] mb-3">
        Session Notes
      </h3>

      <p v-if="!selectedClient" class="mt-1 text-[14px] text-slate-600">
        No client selected. Choose a client from the left sidebar to start
        capturing notes.
      </p>

      <p
          v-else-if="sessionNotes.length === 0"
          class="mt-1 text-[14px] text-slate-600"
      >
        No notes yet for this client. Use the message bar below to add a note or
        instruction.
      </p>

      <ul
          v-else
          ref="listEl"
          class="mt-3 space-y-2 text-[14px] text-slate-700 max-h-64 overflow-auto pr-1"
      >
        <li
            v-for="note in sessionNotes"
            :key="note.id"
            class="border border-[#e5e7eb] rounded-md px-4 py-2 bg-[#f9fafb] text-[14px] leading-relaxed shadow-sm cursor-pointer hover:bg-[#f3f4f6] transition"
            @click="openNote(note)"
        >
          {{ note.text }}
        </li>
      </ul>
    </div>

    <!-- Structured tools block -->
    <div class="border border-[#d1d5db] bg-white rounded-lg p-6 shadow-sm">
      <h3 class="text-[16px] font-semibold tracking-tight text-[#2c3e50] mb-3">
        Structured Tools
      </h3>

      <!-- Map mode toggle -->
      <div
          class="inline-flex rounded-md border border-[#d9dce1] bg-[#f5f7fa] text-[12px] mb-4 overflow-hidden"
      >
        <button
            type="button"
            class="px-3 py-1.5 border-r border-[#d9dce1] transition"
            :class="
            activeMap === 'ifs'
              ? 'bg-white text-[#2c3e50] font-semibold'
              : 'text-slate-600 hover:bg-white/60'
          "
            @click="activeMap = 'ifs'"
        >
          IFS Map
        </button>
        <button
            type="button"
            class="px-3 py-1.5 border-r border-[#d9dce1] transition"
            :class="
            activeMap === 'emdr'
              ? 'bg-white text-[#2c3e50] font-semibold'
              : 'text-slate-600 hover:bg-white/60'
          "
            @click="activeMap = 'emdr'"
        >
          EMDR Map
        </button>
        <button
            type="button"
            class="px-3 py-1.5 transition"
            :class="
            activeMap === 'timeline'
              ? 'bg-white text-[#2c3e50] font-semibold'
              : 'text-slate-600 hover:bg-white/60'
          "
            @click="activeMap = 'timeline'"
        >
          Timeline
        </button>
      </div>

      <!-- Map content placeholder -->
      <div
          class="mt-2 border border-dashed border-[#d9dce1] rounded-lg px-4 py-4 bg-[#f9fafb] text-[14px] text-slate-700"
      >
        <!-- IFS Map -->
        <template v-if="activeMap === 'ifs'">
          <p class="mb-2">
            IFS map for
            <span v-if="selectedClient">{{ selectedClient.name }}</span>
            <span v-else>the selected client</span>.
          </p>
          <p class="text-[13px] text-slate-600 leading-relaxed">
            This area will host your IFS parts mapping: Self, protectors,
            exiles, and their relationships. In a later step, this placeholder
            will be replaced with an interactive IFS map component.
          </p>
        </template>

        <!-- EMDR Map -->
        <template v-else-if="activeMap === 'emdr'">
          <p class="mb-2">
            EMDR process view for
            <span v-if="selectedClient">{{ selectedClient.name }}</span>
            <span v-else>the selected client</span>.
          </p>
          <p class="text-[13px] text-slate-600 leading-relaxed">
            This area will represent EMDR targets, SUD/VOC tracking, resources,
            and phase-oriented progress. Later this becomes an interactive EMDR
            workflow map.
          </p>
        </template>

        <!-- Timeline Map -->
        <template v-else-if="activeMap === 'timeline'">
          <p class="mb-2">
            Timeline / pattern map for
            <span v-if="selectedClient">{{ selectedClient.name }}</span>
            <span v-else>the selected client</span>.
          </p>
          <p class="text-[13px] text-slate-600 leading-relaxed">
            This view will summarise relational patterns, key events, and
            developmental threads over time. It will be the bridge between IFS
            work, EMDR processing, and narrative understanding.
          </p>
        </template>
      </div>
    </div>

    <!-- EXPANDED NOTE OVERLAY (Canvas takeover) -->
    <transition name="canvas-fade">
      <div
          v-if="expandedNote"
          class="fixed inset-0 z-40 bg-white md:bg-white/95"
          @keydown.esc.stop.prevent="closeExpanded"
          tabindex="0"
          ref="expandedEl"
      >
        <div class="h-14 px-4 md:px-6 border-b border-[#d9dce1] bg-white flex items-center justify-between">
          <div class="text-[16px] font-semibold text-[#2c3e50]">
            Note detail
          </div>
          <div class="flex items-center gap-2">
            <button
                class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
                @click="closeExpanded"
                aria-label="Close expanded note"
            >
              Close
            </button>
          </div>
        </div>

        <div class="p-4 md:p-6 max-w-3xl mx-auto">
          <div class="border border-[#e5e7eb] rounded-lg bg-[#f9fafb] p-4 md:p-5 shadow-sm">
            <div class="text-[14px] leading-relaxed text-slate-800 whitespace-pre-wrap">
              {{ expandedNote.text }}
            </div>
          </div>

          <!-- Room for future metadata/actions specific to this note -->
          <div class="mt-4 text-[12px] text-slate-500">
            Tip: The right panel can show tags/alerts for this note as an inspector.
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import CbtToolLoader from "./tools/cbtToolLoader.vue";


const props = defineProps({
  selectedClient: {
    type: Object,
    default: null,
  },
  sessionNotes: {
    type: Array,
    default: () => [],
  },
});

// Emits so the parent can sync inspector (RightPanel) later.
const emit = defineEmits(["focus-change"]);

const activeMap = ref("ifs");

// Expanded note state
const expandedNoteId = ref(null);
const expandedNote = ref(null);

// Refs for scroll preservation and focus management
const listEl = ref(null);
const expandedEl = ref(null);
let savedScrollTop = 0;

const openNote = async (note) => {
  // Save list scroll
  if (listEl.value) savedScrollTop = listEl.value.scrollTop;

  expandedNoteId.value = note.id;
  expandedNote.value = note;

  // Notify parent (inspector can switch to this item)
  emit("focus-change", { type: "note", id: note.id });

  await nextTick();
  // Focus expanded container for Esc handling
  expandedEl.value?.focus();
  // Lock body scroll on mobile
  document.documentElement.style.overflow = "hidden";
};

const closeExpanded = () => {
  expandedNoteId.value = null;
  expandedNote.value = null;

  // Restore list scroll
  if (listEl.value) listEl.value.scrollTop = savedScrollTop;

  // Notify parent that focus cleared
  emit("focus-change", null);

  // Unlock body scroll
  document.documentElement.style.overflow = "";
};

// Keep expandedNote in sync if notes array updates
watch(
    () => props.sessionNotes,
    () => {
      if (expandedNoteId.value) {
        expandedNote.value =
            props.sessionNotes.find((n) => n.id === expandedNoteId.value) || null;
        if (!expandedNote.value) {
          // Note removed: close view
          closeExpanded();
        }
      }
    },
    { deep: true }
);

// Cleanup on unmount
onBeforeUnmount(() => {
  document.documentElement.style.overflow = "";
});

// Small quality-of-life: close on browser back nav in future (optional)
// onMounted(() => { /* hook popstate if desired */ });
</script>

<style scoped>
.canvas-fade-enter-active,
.canvas-fade-leave-active {
  transition: opacity 0.2s ease;
}
.canvas-fade-enter-from,
.canvas-fade-leave-to {
  opacity: 0;
}
</style>
