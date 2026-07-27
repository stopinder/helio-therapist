<template>
  <div class="flex gap-inline-md group relative">
    <!-- Icon/Timeline Line -->
    <div class="flex flex-col items-center">
      <div 
        class="w-8 h-8 rounded-pill flex items-center justify-center shrink-0 z-10 border transition-all duration-200"
        :class="typeClasses.icon"
      >
        <span class="text-lg">{{ typeClasses.emoji }}</span>
      </div>
      <div v-if="!isLast" class="w-0.5 h-full bg-border-muted -mt-1 group-last:hidden"></div>
    </div>

    <!-- Content -->
    <div class="flex-1 pb-stack-lg">
      <div class="flex justify-between items-start mb-1">
        <h4 class="text-body-sm font-bold text-ink">{{ type }}</h4>
        <span class="text-caption font-medium text-ink-subtle uppercase tracking-wider">{{ date }}</span>
      </div>
      <div class="p-inline-md bg-surface-elevated border border-border-muted rounded-control shadow-sm group-hover:border-action-link transition-colors duration-200">
        <p class="text-body-sm text-ink-secondary">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isLast: {
    type: Boolean,
    default: false
  }
});

const typeClasses = computed(() => {
  const t = props.type.toLowerCase();
  if (t.includes('session')) {
    return { emoji: '👤', icon: 'bg-action-link-surface text-action-link border-action-link/20' };
  } else if (t.includes('summary')) {
    return { emoji: '📋', icon: 'bg-state-success-surface text-state-success border-state-success/20' };
  } else if (t.includes('document') || t.includes('amended')) {
    return { emoji: '📄', icon: 'bg-surface-subtle text-ink-secondary border-border' };
  } else if (t.includes('supervision')) {
    return { emoji: '✨', icon: 'bg-state-danger-surface text-state-danger border-state-danger/20' };
  } else if (t.includes('measure')) {
    return { emoji: '📊', icon: 'bg-state-warning-surface text-state-warning border-state-warning/20' };
  }
  return { emoji: '🔹', icon: 'bg-surface-subtle text-ink-muted border-border' };
});
</script>
