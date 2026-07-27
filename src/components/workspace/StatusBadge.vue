<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-pill text-caption font-medium uppercase tracking-wide border"
    :class="statusClasses"
  >
    {{ displayLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: null
  }
});

const displayLabel = computed(() => props.label || props.status);

const statusClasses = computed(() => {
  const s = props.status.toLowerCase();
  switch (s) {
    // Client Status
    case 'active':
      return 'bg-state-success-surface text-state-success border-state-success/20';
    case 'inactive':
      return 'bg-surface-muted text-ink-muted border-border';
    case 'pending':
      return 'bg-state-warning-surface text-state-warning border-state-warning/20';
    
    // Document Status
    case 'draft':
      return 'bg-surface-muted text-ink-secondary border-border';
    case 'final':
      return 'bg-state-success-surface text-state-success border-state-success/10';
    case 'superseded':
      return 'bg-surface-subtle text-ink-muted border-border italic opacity-70';
    case 'amended':
      return 'bg-state-selected text-action-link border-action-link/20';
    
    // Clinical Attention Categories
    case 'upcoming':
    case 'success':
      return 'bg-state-success-surface text-state-success border-state-success/20';
    case 'homework':
    case 'warning':
      return 'bg-state-warning-surface text-state-warning border-state-warning/20';
    case 'measure':
    case 'info':
      return 'bg-state-selected text-action-link border-action-link/20';
    case 'supervision':
    case 'action':
      return 'bg-surface-muted text-ink-secondary border-ink-secondary/20';

    // Priority
    case 'priority':
    case 'high':
      return 'bg-state-danger-surface text-state-danger border-state-danger/20 font-bold';
    case 'medium':
      return 'bg-state-warning-surface text-state-warning border-state-warning/20';
    case 'low':
      return 'bg-state-success-surface text-state-success border-state-success/10';
      
    default:
      return 'bg-surface-subtle text-ink-secondary border-border';
  }
});
</script>
