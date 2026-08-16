<template>
  <nav class="bg-surface-subtle border-b border-border-muted" aria-label="Session workspace navigation">
    <div class="max-w-6xl mx-auto px-inline-lg overflow-x-auto no-scrollbar" ref="scrollContainer">
      <div class="flex items-center py-2 min-w-max md:min-w-0 gap-4 lg:gap-8">
        <div v-for="(stage, index) in stages" :key="stage" class="flex items-center gap-2 group min-w-0">
          <button
            @click="$emit('select-stage', stage)"
            class="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-pill transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected min-w-0"
            :class="activeStage === stage ? 'bg-state-selected text-action-link font-semibold' : 'text-ink-muted hover:bg-surface hover:text-ink'"
            :aria-current="activeStage === stage ? 'step' : undefined"
            :ref="el => { if (activeStage === stage) activeStepRef = el }"
          >
            <span class="text-caption w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border transition-colors"
                  :class="[
                    activeStage === stage ? 'border-action-link bg-action-link text-white' : 'border-border text-ink-subtle',
                    isCompleted(index) ? 'bg-state-success border-state-success text-white' : ''
                  ]">
              <template v-if="isCompleted(index)">✓</template>
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="text-body-sm truncate md:overflow-visible md:whitespace-nowrap">{{ stage }}</span>
          </button>
          <span v-if="index < stages.length - 1" class="text-ink-subtle mx-1 sm:mx-2 flex-shrink-0 hidden xs:inline" aria-hidden="true">→</span>
        </div>

        <span class="h-5 w-px bg-border-muted flex-shrink-0" aria-hidden="true"></span>
        <button
          type="button"
          class="px-3 py-1 rounded-pill text-body-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected"
          :class="activeStage === 'CPD' ? 'bg-state-selected text-action-link font-semibold' : 'text-ink-muted hover:bg-surface hover:text-ink'"
          :aria-current="activeStage === 'CPD' ? 'page' : undefined"
          :ref="el => { if (activeStage === 'CPD') activeStepRef = el }"
          @click="$emit('select-stage', 'CPD')"
        >CPD</button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({ activeStage: { type: String, required: true } });
defineEmits(['select-stage']);

const scrollContainer = ref(null);
const activeStepRef = ref(null);
const stages = ['Session Capture', 'Notes', 'Reflection', 'Clinical Record'];

function isCompleted(index) {
  const activeIndex = stages.indexOf(props.activeStage);
  return activeIndex >= 0 && index < activeIndex;
}

watch(() => props.activeStage, () => {
  nextTick(() => {
    if (activeStepRef.value && scrollContainer.value) {
      activeStepRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
});
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
