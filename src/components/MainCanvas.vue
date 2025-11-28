<template>
  <div class="space-y-6">
    <!-- Client / session header -->
    <div class="border border-[#d9dce1] bg-white rounded-md p-6 shadow-sm">
      <h2 class="text-[17px] font-semibold">
        <span v-if="selectedClient">
          Session workspace – {{ selectedClient.name }}
        </span>
        <span v-else>
          Session workspace
        </span>
      </h2>
      <p class="mt-2 text-[14px] text-slate-600">
        <span v-if="selectedClient">
          {{ selectedClient.note }}
        </span>
        <span v-else>
          Select a client from the left sidebar to begin working.
        </span>
      </p>
    </div>

    <!-- Notes block -->
    <div class="border border-[#d9dce1] bg-white rounded-md p-6 shadow-sm">
      <h3 class="text-[15px] font-semibold mb-2">Session Notes</h3>

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
            class="border border-[#e2e5eb] rounded-md px-3 py-2 bg-[#f9fafb]"
        >
          {{ note.text }}
        </li>
      </ul>
    </div>

    <!-- Structured tools block -->
    <div class="border border-[#d9dce1] bg-white rounded-md p-6 shadow-sm">
      <h3 class="text-[15px] font-semibold mb-2">Structured Tools</h3>
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
