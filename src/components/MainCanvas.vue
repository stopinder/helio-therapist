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
      <p class="mt-2 text-[14px] text-slate-600">
        IFS, CBT maps, and other structured tools for
        <span v-if="selectedClient">
          {{ selectedClient.name }}
        </span>
        <span v-else>
          the selected client
        </span>
        will be loaded here in future steps.
      </p>
    </div>
  </div>
</template>

<script setup>
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
</script>
