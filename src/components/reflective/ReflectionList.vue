<template>
  <div>
    <h3 class="text-xl font-semibold mb-4 text-[#2c3e50]">
      Past Reflections
    </h3>

    <div v-if="!reflections.length" class="text-[14px] text-slate-500 italic">
      No reflections recorded yet.
    </div>

    <div
        v-else
        class="space-y-3 max-h-[480px] overflow-auto pr-1"
    >
      <div
          v-for="reflection in reflections"
          :key="reflection.id"
          class="bg-white border border-[#e5e7eb] rounded-md shadow-sm p-4 hover:shadow transition cursor-pointer"
          @click="$emit('open', reflection)"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="text-[14px] font-semibold text-[#2c3e50]">
            Reflection — {{ formatDate(reflection.date) }}
          </div>
        </div>

        <div class="text-[14px] text-slate-600 leading-relaxed line-clamp-3">
          {{ reflection.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  reflections: { type: Array, default: () => [] },
});

const emit = defineEmits(["open"]);

const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
};
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
