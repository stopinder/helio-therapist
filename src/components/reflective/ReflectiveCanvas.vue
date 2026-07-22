<template>
  <div class="max-w-4xl mx-auto text-ink-secondary">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-h1 font-semibold mb-2">Reflective Practice</h2>
      <p class="text-body text-ink-secondary">
        This private workspace is for your own professional reflection.
      </p>
    </div>

    <!-- Mode switch -->
    <div class="flex gap-2 mb-6">
      <button
          v-for="view in views"
          :key="view.key"
          class="px-3 py-1.5 rounded-control text-body border border-border transition-colors duration-standard ease-out"
          :class="view.key === mode
          ? 'bg-action-link text-on-action border-action-link'
          : 'bg-surface-elevated hover:bg-surface-subtle text-ink-secondary'"
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
