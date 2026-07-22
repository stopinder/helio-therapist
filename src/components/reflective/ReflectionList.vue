<template>
  <div>
    <h3 class="text-h2 font-semibold mb-4 text-ink">
      Past Reflections
    </h3>

    <div v-if="!reflections.length" class="text-body text-ink-muted italic">
      No reflections recorded yet.
    </div>

    <div
        v-else
        class="space-y-3 max-h-[480px] overflow-auto pr-1"
    >
      <div
          v-for="reflection in reflections"
          :key="reflection.id"
          class="bg-surface-elevated border border-border-muted rounded-control  p-4 hover:shadow transition-colors duration-standard ease-out cursor-pointer"
          @click="$emit('open', reflection)"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="text-body font-semibold text-ink">
            Reflection — {{ formatDate(reflection.date) }}
          </div>
        </div>

        <div class="text-body text-ink-secondary leading-relaxed line-clamp-3">
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
