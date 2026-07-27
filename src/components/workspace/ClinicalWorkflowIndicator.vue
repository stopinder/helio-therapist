<template>
  <div class="flex items-center gap-2 mb-6" aria-label="Clinical Record Workflow Stage">
    <div 
      v-for="(label, stage) in workflowStages" 
      :key="stage"
      class="flex items-center gap-2"
    >
      <div 
        class="flex items-center gap-1.5 px-3 py-1 rounded-pill transition-colors"
        :class="isActive(stage) ? 'bg-state-selected text-action-link font-semibold' : 'text-ink-subtle opacity-60'"
      >
        <span class="text-caption">{{ label }}</span>
      </div>
      <span v-if="!isLast(stage)" class="text-ink-subtle opacity-30" aria-hidden="true">→</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  state: {
    type: String,
    required: true
  }
});

const workflowStages = {
  draft: 'Draft',
  review: 'Review',
  record: 'Clinical Record',
  amendment: 'Amendment'
};

const isActive = (stage) => {
  if (stage === 'draft') return props.state === 'draft';
  if (stage === 'review') return props.state === 'ready_for_review';
  if (stage === 'record') return props.state === 'approved_record';
  if (stage === 'amendment') return props.state.startsWith('amendment_');
  return false;
};

const isLast = (stage) => stage === 'amendment';
</script>
