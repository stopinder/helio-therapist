<template>
  <nav class="bg-surface-subtle border-b border-border-muted overflow-x-auto no-scrollbar" aria-label="Workflow Stages">
    <div class="max-w-6xl mx-auto px-inline-lg flex items-center justify-between py-2 min-w-max">
      <div 
        v-for="(stage, index) in stages" 
        :key="stage"
        class="flex items-center gap-2 group"
      >
        <div 
          class="flex items-center gap-2 px-3 py-1 rounded-pill transition-colors whitespace-nowrap"
          :class="activeStage === stage ? 'bg-state-selected text-action-link font-semibold' : 'text-ink-muted'"
          :aria-current="activeStage === stage ? 'step' : undefined"
        >
          <span class="text-caption w-5 h-5 flex items-center justify-center rounded-full border" 
                :class="activeStage === stage ? 'border-action-link bg-action-link text-white' : 'border-border text-ink-subtle'">
            {{ index + 1 }}
          </span>
          <span class="text-body-sm">{{ stage }}</span>
        </div>
        <span v-if="index < stages.length - 1" class="text-ink-subtle mx-2" aria-hidden="true">→</span>
      </div>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  activeStage: {
    type: String,
    required: true
  }
});

const stages = [
  'Transcript',
  'Notes',
  'Reflection',
  'Clinical Record',
  'Supervision'
];
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
