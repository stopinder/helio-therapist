<template>
  <div class="bg-surface-subtle border-l-4 border-l-action-link border-y border-r border-border-muted rounded-panel overflow-hidden shadow-sm">
    <div class="px-inline-lg py-stack-sm border-b border-border-muted bg-surface/50">
      <h3 class="text-body font-bold text-ink flex items-center gap-2">
        <span class="text-action-link">✨</span> Clinical Attention
      </h3>
    </div>
    <div class="p-inline-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-inline-lg gap-y-stack-md">
      <div v-for="item in attentionItems" :key="item.label" class="flex justify-between items-start group">
        <div class="flex flex-col min-w-0">
          <span class="text-[10px] font-bold text-ink-subtle uppercase tracking-widest">{{ item.label }}</span>
          <span class="text-body-sm text-ink mt-0.5 truncate" :class="{ 'text-state-danger font-semibold': item.urgent }">
            {{ item.value }}
          </span>
        </div>
        <div 
          v-if="item.urgent" 
          class="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-state-danger-surface text-[10px] font-bold text-state-danger border border-state-danger/20"
        >
          Priority
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  client: {
    type: Object,
    required: true
  }
});

const attentionItems = computed(() => [
  { label: 'Next Appointment', value: props.client.next_appointment, urgent: false },
  { label: 'Latest Measures', value: props.client.latest_measures, urgent: false },
  { label: 'Outstanding Homework', value: props.client.outstanding_homework, urgent: false },
  { label: 'Open Supervision Actions', value: props.client.supervision_actions, urgent: true },
  { label: 'Risk Review Status', value: props.client.risk_status, urgent: false },
  { label: 'Documents Awaiting Review', value: props.client.docs_awaiting_review === 0 ? 'None' : `${props.client.docs_awaiting_review} pending`, urgent: props.client.docs_awaiting_review > 0 }
]);
</script>
