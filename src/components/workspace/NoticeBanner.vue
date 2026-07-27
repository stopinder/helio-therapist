<template>
  <div class="p-3 border rounded flex gap-3 mb-6" :class="bannerClasses">
    <span class="text-lg" aria-hidden="true">{{ icon }}</span>
    <div class="space-y-1">
      <p class="text-caption leading-relaxed font-medium">
        {{ message }}
      </p>
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (val) => ['info', 'warning', 'success', 'danger', 'reflection'].includes(val)
  },
  message: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'ℹ️'
  }
});

const bannerClasses = computed(() => {
  switch (props.type) {
    case 'warning': return 'bg-state-warning-surface border-state-warning/20 text-state-warning';
    case 'danger': return 'bg-state-danger-surface border-state-danger/20 text-state-danger';
    case 'success': return 'bg-state-success-surface border-state-success/20 text-state-success';
    case 'reflection': return 'bg-surface-reflection border-border-reflection text-ink-secondary';
    default: return 'bg-surface border-border text-ink-secondary';
  }
});
</script>
