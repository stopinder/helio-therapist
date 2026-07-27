<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-pill text-caption font-medium uppercase tracking-wide border"
    :class="statusClasses"
  >
    {{ status }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true
  }
});

const statusClasses = computed(() => {
  switch (props.status.toLowerCase()) {
    case 'active':
      return 'bg-state-success-surface text-state-success border-state-success/20';
    case 'inactive':
      return 'bg-surface-muted text-ink-muted border-border';
    case 'pending':
      return 'bg-state-warning-surface text-state-warning border-state-warning/20';
    default:
      return 'bg-surface-subtle text-ink-secondary border-border';
  }
});
</script>
