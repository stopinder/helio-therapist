<template>
  <transition name="slide">
    <aside
        v-if="open"
        class="hidden md:flex md:w-72 bg-white border-l border-[#d9dce1] shadow-xl fixed right-0 top-0 flex-col"
        :style="{ height: 'calc(100% - 4rem)' }"
    >
      <!-- Header -->
      <div class="h-14 flex items-center justify-between px-4 border-b border-[#d9dce1]">
        <span class="text-[16px] font-semibold">
          Client context
        </span>
        <button @click="emit('close')" class="text-[#3f4754] hover:text-black text-sm">
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-4 overflow-auto text-[14px]">
        <!-- Client summary -->
        <div class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-[15px] font-semibold">
              <span v-if="selectedClient">
                {{ selectedClient.name }}
              </span>
              <span v-else>
                No client selected
              </span>
            </h3>
            <span v-if="selectedClient" class="text-[11px] text-slate-500">
              {{ selectedClient.lastSeen }}
            </span>
          </div>
          <p class="text-[13px] text-slate-600">
            <span v-if="selectedClient">
              {{ selectedClient.note }}
            </span>
            <span v-else>
              Select a client from the left sidebar to see quick context here.
            </span>
          </p>
        </div>

        <!-- Alerts -->
        <div class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white">
          <div class="text-[15px] font-semibold mb-2">Alerts</div>
          <p v-if="!selectedClient" class="text-[13px] text-slate-600">
            No client selected.
          </p>
          <ul v-else class="space-y-1 text-[13px] text-slate-700">
            <li v-for="alert in derivedAlerts" :key="alert" class="flex items-start gap-2">
              <span class="mt-[3px] text-xs">•</span>
              <span>{{ alert }}</span>
            </li>
          </ul>
        </div>

        <!-- Tags -->
        <div class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white">
          <div class="text-[15px] font-semibold mb-2">Tags</div>
          <p v-if="!selectedClient" class="text-[13px] text-slate-600">
            No tags to display.
          </p>
          <div v-else class="flex flex-wrap gap-2">
            <span
                v-for="tag in derivedTags"
                :key="tag"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#d9dce1] bg-[#f5f7fa] text-[11px] text-slate-700"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  selectedClient: {
    type: Object,
    default: null,
  },
  open: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["close"]);

// For now, derive some placeholder alerts/tags based on the mock client
const derivedAlerts = computed(() => {
  if (!props.selectedClient) return [];

  if (props.selectedClient.name.startsWith("Celia")) {
    return [
      "Watch for activation when exploring relationship themes.",
      "Ground before moving into deeper parts work.",
    ];
  }

  if (props.selectedClient.name.startsWith("Fabian")) {
    return [
      "Psychoeducation around ADHD and overwhelm is helpful early.",
      "Monitor energy and burnout across sessions.",
    ];
  }

  if (props.selectedClient.name.startsWith("Zala")) {
    return [
      "Trauma history – move slowly around early memories.",
      "Use strong resourcing before deep processing.",
    ];
  }

  return ["No specific alerts added yet."];
});

const derivedTags = computed(() => {
  if (!props.selectedClient) return [];

  if (props.selectedClient.name.startsWith("Celia")) {
    return ["Parts work", "Relationship stress", "Attachment"];
  }

  if (props.selectedClient.name.startsWith("Fabian")) {
    return ["ADHD", "Overwhelm", "Shame"];
  }

  if (props.selectedClient.name.startsWith("Zala")) {
    return ["Trauma history", "Nervous system", "Stabilisation"];
  }

  return ["General", "Monitoring"];
});
</script>

<style>
.slide-enter-from {
  transform: translateX(100%);
}
.slide-enter-to {
  transform: translateX(0);
}
.slide-enter-active {
  transition: 0.2s ease;
}
.slide-leave-from {
  transform: translateX(0);
}
.slide-leave-to {
  transform: translateX(100%);
}
.slide-leave-active {
  transition: 0.2s ease;
}
</style>
