<template>
  <!-- Overlay for mobile -->
  <transition name="fade">
    <div
        v-if="open && !isDesktop"
        class="fixed inset-0 bg-black/40 z-40"
        @click="emit('close')"
    ></div>
  </transition>

  <!-- Panel -->
  <transition name="slide">
    <aside
        v-if="open"
        class="fixed top-0 right-0 h-full w-72 bg-white border-l border-[#d9dce1] shadow-xl z-50 flex flex-col"
        :class="{
        'w-full sm:w-80': !isDesktop,
      }"
    >
      <!-- Header -->
      <div
          class="h-14 flex items-center justify-between px-4 border-b border-[#d9dce1]"
      >
        <span class="text-[16px] font-semibold">Client context</span>
        <button
            @click="emit('close')"
            class="text-[#3f4754] hover:text-black text-sm"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-4 overflow-auto text-[14px]">
        <!-- Client summary -->
        <div
            class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white"
        >
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-[15px] font-semibold">
              <span v-if="selectedClient">{{ selectedClient.name }}</span>
              <span v-else>No client selected</span>
            </h3>
            <span
                v-if="selectedClient"
                class="text-[11px] text-slate-500"
            >
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
        <div
            class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white"
        >
          <div class="text-[15px] font-semibold mb-2">Alerts</div>
          <p v-if="!selectedClient" class="text-[13px] text-slate-600">
            No client selected.
          </p>
          <ul
              v-else
              class="space-y-1 text-[13px] text-slate-700"
          >
            <li
                v-for="alert in derivedAlerts"
                :key="alert"
                class="flex items-start gap-2"
            >
              <span class="mt-[3px] text-xs">•</span>
              <span>{{ alert }}</span>
            </li>
          </ul>
        </div>

        <!-- Tags -->
        <div
            class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white"
        >
          <div class="text-[15px] font-semibold mb-2">Tags</div>
          <p v-if="!selectedClient" class="text-[13px] text-slate-600">
            No tags to display.
          </p>
          <div
              v-else
              class="flex flex-wrap gap-2"
          >
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
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  selectedClient: Object,
  open: Boolean,
});

const emit = defineEmits(["close"]);
const isDesktop = ref(false);
const updateScreen = () => (isDesktop.value = window.innerWidth >= 768);
onMounted(() => {
  updateScreen();
  window.addEventListener("resize", updateScreen);

  // Swipe close gesture (right-to-left)
  let startX = 0;
  let currentX = 0;
  window.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX));
  window.addEventListener("touchmove", (e) => (currentX = e.touches[0].clientX));
  window.addEventListener("touchend", () => {
    const diff = currentX - startX;
    if (diff < -50 && props.open) emit("close");
    startX = currentX = 0;
  });
});

const derivedAlerts = computed(() => {
  const c = props.selectedClient;
  if (!c) return [];
  if (c.name?.startsWith("Celia"))
    return [
      "Watch for activation when exploring relationship themes.",
      "Ground before moving into deeper parts work.",
    ];
  if (c.name?.startsWith("Fabian"))
    return [
      "Psychoeducation around ADHD and overwhelm is helpful early.",
      "Monitor energy and burnout across sessions.",
    ];
  if (c.name?.startsWith("Zala"))
    return [
      "Trauma history – move slowly around early memories.",
      "Use strong resourcing before deep processing.",
    ];
  return ["No specific alerts added yet."];
});

const derivedTags = computed(() => {
  const c = props.selectedClient;
  if (!c) return [];
  if (c.name?.startsWith("Celia"))
    return ["Parts work", "Relationship stress", "Attachment"];
  if (c.name?.startsWith("Fabian")) return ["ADHD", "Overwhelm", "Shame"];
  if (c.name?.startsWith("Zala"))
    return ["Trauma history", "Nervous system", "Stabilisation"];
  return ["General", "Monitoring"];
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
