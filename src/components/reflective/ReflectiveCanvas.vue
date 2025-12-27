<template>
  <div class="max-w-4xl mx-auto text-slate-700">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">Reflective Practice</h2>
      <p class="text-[15px] text-slate-600">
        This private workspace is for your own professional reflection.
      </p>
    </div>

    <!-- Mode switch -->
    <div class="flex gap-2 mb-6">
      <button
          v-for="view in views"
          :key="view.key"
          class="px-3 py-1.5 rounded-md text-[14px] border border-[#d9dce1] transition"
          :class="view.key === mode
          ? 'bg-[#2563eb] text-white border-[#2563eb]'
          : 'bg-white hover:bg-[#f0f2f5] text-[#3f4754]'"
          @click="$emit('switch-mode', view.key)"
      >
        {{ view.label }}
      </button>
    </div>

    <!-- Conditional view area -->
    <div>
      <ReflectionEditor
          v-if="mode === 'new'"
          @save="saveReflection"
      />

      <ReflectionList
          v-else-if="mode === 'past'"
          :reflections="reflections"
          @open="openReflection"
      />

      <TherapistMap v-else-if="mode === 'map'" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import ReflectionEditor from "./ReflectionEditor.vue";
import ReflectionList from "./ReflectionList.vue";
import TherapistMap from "../tools/TherapistMap.vue";

const props = defineProps({
  mode: { type: String, default: "new" },
});

const emit = defineEmits(["switch-mode"]);

const views = [
  { key: "new", label: "🧘 New Reflection" },
  { key: "past", label: "📘 Past Reflections" },
  { key: "map", label: "🗺 Therapist Map" },
];

// mock state for reflections
const reflections = ref([]);

const saveReflection = (entry) => {
  reflections.value.push({
    id: Date.now(),
    date: new Date().toLocaleString(),
    text: entry,
  });
};

const openReflection = (reflection) => {
  alert("Open reflection: " + reflection.text);
};

// Future: onMounted() will fetch reflections from API
onMounted(() => {
  reflections.value = [
    {
      id: 1,
      date: "2025-11-27",
      text: "Session debrief with Celia — noticed countertransference of frustration.",
    },
    {
      id: 2,
      date: "2025-11-28",
      text: "Reflected on my Self-energy before EMDR — grounding effective.",
    },
  ];
});
</script>
