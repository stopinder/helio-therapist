<template>
  <section class="p-4 bg-surface border border-border rounded-panel">
    <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-4">Workflow Progress</h4>
    <div class="space-y-4">
      <div v-for="item in workflowItems" :key="item.label" class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="text-body-sm font-medium" :class="activeStage === item.label ? 'text-action-link' : 'text-ink'">
            {{ item.label }}
          </span>
          <StatusBadge :status="item.status" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import StatusBadge from './StatusBadge.vue';

defineProps({
  workflowItems: {
    type: Array,
    required: true,
    // Expected structure: [{ label: 'Recording', status: 'In Progress' }, ...]
  },
  activeStage: {
    type: String,
    default: ''
  }
});
</script>
