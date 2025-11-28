<template>
  <div class="space-y-8">
    <!-- Client / session header -->
    <div class="border border-[#d1d5db] bg-white rounded-lg p-6 shadow-sm">
      <h2 class="text-[18px] font-semibold tracking-tight text-[#2c3e50]">
        <span v-if="selectedClient">
          Session Workspace — {{ selectedClient.name }}
        </span>
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
          class="mt-3 space-y-2 text-[14px] text-slate-700 max-h-64 overflow-auto"
      >
        <li
            v-for="note in sessionNotes"
            :key="note.id"
            class="border border-[#e5e7eb] rounded-md px-4 py-2 bg-[#f9fafb] text-[14px] leading-relaxed shadow-sm"
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
      <div class="inline-flex rounded-md border border-[#d9dce1] bg-[#f5f7fa] text-[12px] mb-4 overflow-hidden">
        <button
            type="button"
            class="px-3 py-1.5 border-r border-[#d9dce1] transition"
            :class="activeMap === 'ifs'
            ? 'bg-white text-[#2c3e50] font-semibold'
            : 'text-slate-600 hover:bg-white/60'"
            @click="activeMap = 'ifs'"
        >
          IFS Map
        </button>
        <button
            type="button"
            class="px-3 py-1.5 border-r border-[#d9dce1] transition"
            :class="activeMap === 'emdr'
            ? 'bg-white text-[#2c3e50] font-semibold'
            : 'text-slate-600 hover:bg-white/60'"
            @click="activeMap = 'emdr'"
        >
          EMDR Map
        </button>
        <button
            type="button"
            class="px-3 py-1.5 transition"
            :class="activeMap === 'timeline'
            ? 'bg-white text-[#2c3e50] font-semibold'
            : 'text-slate-600 hover:bg-white/60'"
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
  </div>
</template>

<script setup>
import { ref } from "vue";

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

// Which structured tool/map is active in the UI
const activeMap = ref("ifs");
</script>
