<template>
  <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
    <div class="px-inline-lg py-stack-md border-b border-border-muted bg-surface-subtle">
      <h3 class="text-h3 font-semibold text-ink">Clinical Attention</h3>
    </div>
    <div class="p-inline-lg space-y-stack-md">
      <div v-for="item in attentionItems" :key="item.label" class="flex justify-between items-start gap-4">
        <div class="flex flex-col">
          <span class="text-caption font-medium text-ink-muted uppercase tracking-wider">{{ item.label }}</span>
          <span class="text-body text-ink mt-0.5" :class="{ 'text-state-danger font-medium': item.urgent }">
            {{ item.value }}
          </span>
        </div>
        <div v-if="item.urgent" class="shrink-0 h-2 w-2 rounded-pill bg-state-danger mt-6"></div>
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
