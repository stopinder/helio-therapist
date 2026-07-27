<template>
  <div 
    class="flex items-start gap-3 p-3 rounded-lg border transition-all duration-300"
    :class="[
      isActive ? 'border-action-link bg-state-selected shadow-sm scale-105' : 'border-border bg-surface-subtle',
      speaker === 'Therapist' ? 'ml-4' : 'mr-4'
    ]"
  >
    <div class="flex flex-col items-center gap-1 shrink-0 pt-1">
      <span class="text-caption font-mono text-ink-muted leading-none">{{ timestamp }}</span>
    </div>
    <div class="flex flex-col gap-1 min-w-0 flex-1">
      <div class="flex items-center justify-between">
        <span 
          class="text-xs font-bold uppercase tracking-wider"
          :class="speaker === 'Therapist' ? 'text-action-link' : 'text-state-info'"
        >
          {{ speaker }}
        </span>
        <div v-if="isActive" class="flex items-center gap-1">
          <span class="flex gap-0.5">
            <span class="w-1 h-3 bg-action-link animate-[bounce_1s_infinite_0ms]"></span>
            <span class="w-1 h-4 bg-action-link animate-[bounce_1s_infinite_200ms]"></span>
            <span class="w-1 h-2 bg-action-link animate-[bounce_1s_infinite_400ms]"></span>
          </span>
          <span class="text-overline font-bold text-action-link tracking-tighter">Speaking</span>
        </div>
      </div>
      <p class="text-body-sm text-ink leading-relaxed">{{ text }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  speaker: String,
  timestamp: String,
  text: String,
  isActive: {
    type: Boolean,
    default: false
  }
});
</script>
